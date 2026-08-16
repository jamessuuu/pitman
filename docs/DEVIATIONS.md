# Deviations from SPEC.md

Running log of every place the implementation departs from `docs/pitman-SPEC.md`'s
literal text, or from house convention where a judgment call had to be made, and
why. Per the build brief: "repo truth wins over any doc" — this file is the record
of *why* the repo made the call it did, appended milestone by milestone as work
happens (see `git log` for exactly which commit introduced each one), not written
in one pass.

---

## M0 — framework choice: Vite + React, not Next.js

House convention on this machine's other batch-2 projects (provenote, sluice,
snapgauge) is Next.js (static export) for `apps/web`. pitman uses **Vite + React +
TypeScript** instead, for three concrete reasons:

1. Neither `pitman-SPEC.md` nor `BATCH-2-STANDARDS.md` mandates a specific
   framework — the house Next.js usage in sibling repos is itself
   static-export-only (a `zero-functions` build check proves no serverless
   functions exist), i.e. Next is used purely as a router/bundler there, not for
   any server capability.
2. pitman has **zero server surface by construction**: mic capture, file-drop,
   and on-device inference are all client-side state. There is nothing for SSR/RSC
   to do here that a plain SPA bundler doesn't already do.
3. `next dev`'s own injected `AGENTS.md` (seen in the sibling `swage` repo) warns
   that the pinned Next version (`^16.3.0`) has training-data-breaking API/
   convention changes. Given the hard rule of stopping after 2 distinct failed
   attempts on a repeating failure, spending those attempts on unfamiliar
   App-Router semantics for a feature that gains nothing from them was judged the
   wrong risk to take. Vite's dev/build model is stable, well-understood, and
   produces a plain static bundle — the same deployable shape Next's static
   export would have produced anyway.

The `apps/web` + `packages/core` split (pure, unit-testable TS in `core`; DOM/
browser code in `web`) is kept identical to the house pattern — only the bundler
changed, not the architecture.

---

## M2 — D2 finding: wasm cannot run the q8 decoder graph; routes to fp32 instead

D2's literal text anticipates a quality gap ("whisper-tiny.en at q8 IN THE
BROWSER cannot transcribe... at quality comparable to the probe's Node
numbers... degrade to base.en or STOP and report"). What was actually found
during M2 verification is a different, more fundamental failure: **q8
session construction throws outright on the wasm execution provider**, for
every quantized dtype tried, on both models. This is the honest-effort
trail, in order:

1. **webgpu + q8: WORKS.** Manually verified in a real Chrome profile
   (`mcp__agent-browser`) on `common_voice_en_187059.mp3`: exact-match
   transcript ("Young boy running outside on the pavement."), provider
   readback confirmed `webgpu` via real `GPUQueue.submit()` counts (not
   trusted from config), load 8.8s cold / 1.65s warm, 41.0MB downloaded
   (read from transformers.js's own `progress_callback`, byte-accurate).
2. **wasm + q8: FAILS.** `Can't create a session. ERROR_CODE: 1,
   ERROR_MESSAGE: qdq_actions.cc:137 TransposeDQWeightsForMatMulNBits
   Missing required scale: model.decoder.embed_tokens.weight_merged_0_scale
   for node: model.decoder.embed_tokens.weight_transposed_DequantizeLinear`.
   Reproduced identically with `dtype: "int8"` and `"uint8"` (2 distinct
   fix attempts, both failed the same way) — not a wrong-artifact-selection
   mistake, a real onnxruntime-web WASM-backend limitation with this model
   family's MatMulNBits+QDQ quantized decoder graph. `onnxruntime-web`
   version pinned by `@huggingface/transformers@4.2.0`:
   `1.26.0-dev.20260416-b7804b056c`.
3. **wasm + q8 on whisper-base.en: FAILS identically.** D2's own prescribed
   remedy ("degrade to base.en") does not fix a backend/graph
   incompatibility — tried, same exact error text.
4. **wasm + fp32: WORKS** (no MatMulNBits/QDQ ops in an unquantized graph).
   Verified via a fresh Playwright e2e run: 9/9 tests green, including
   exact-match transcription on the WER=0 fixture clip.
5. **A try-then-catch fallback (q8 first, fp32 on catch) does NOT work**: a
   failed q8 session-creation attempt leaves onnxruntime-web/WASM state
   corrupted such that a same-page fp32 retry afterward *also* throws the
   identical q8 error. Reproduced once, not re-attempted a second way
   (2-attempt cap) — the fix instead routes dtype by device **up front**
   (`src/lib/asr-pipeline.ts`: `device === "wasm" ? "fp32" : "q8"`), never
   attempting the doomed construction at all.

**Why this is not "papering over with fp32-only defaults" (D2's actual
warning):** q8 still loads on every provider that can run it — webgpu,
unconditionally. The fp32 route engages ONLY on wasm, where q8 cannot
construct a session at all (not a convenience choice, a hard failure), and
the fact is surfaced live in the model panel
(`data-testid="dtype-fallback-note"`) and asserted in the e2e suite
(`e2e/transcribe.spec.ts`: on `CI`, asserts `model-dtype` contains `fp32`
and the fallback note is visible) — never silently hidden.

**Second, distinct finding — in-browser audio-decode divergence on the
hardest fixture clip.** With wasm+fp32 routing fixed, the class-A
("Cebanu" OOV) fixture clip transcribes notably worse in-browser (WER
0.500, "Dr. and President is Pavel Sebanov.") than the probe's own Node
q8 measurement for that clip (WER 0.167). The other two fixture clips are
exact-match or comparable. Plausible cause, not fully isolated (would need
a dedicated audio-diffing investigation to confirm — out of scope for M2):
the browser path decodes the MP3 via the Web Audio API
(`src/lib/decode-audio.ts`, `AudioContext.decodeAudioData` +
`OfflineAudioContext` resample) while the probe decoded via `ffmpeg` to
WAV first — different MP3-decoder encoder-delay handling and resampling
algorithms can shift the exact samples Whisper sees, and Whisper's
autoregressive decoding is known to be sensitive to such shifts, especially
on short/ambiguous clips. Per `fixtures/README.md`'s own framing ("the
in-browser numbers... reported alongside [the probe's] for comparison,
never substituted for them"), the e2e suite (`e2e/transcribe.spec.ts`)
does NOT assert tight equivalence to the probe's number — it asserts
against outright breakage (WER ≤ 0.75) and logs both numbers for the
record. This divergence is real, disclosed content for `/docs/limitations`
(M5), not a defect masked by a loosened test.

**Also fixed during M2 (found via the zero-upload-network e2e assertion,
not anticipated in the spec):** `@huggingface/transformers` sets
`env.backends.onnx.wasm.wasmPaths` to a `cdn.jsdelivr.net` URL as a
module-load-time side effect unless overridden — a real violation of
"nothing leaves the device" for the inference engine's own WASM runtime
bootstrap (model weights and audio were already same-origin/local; the ORT
runtime itself was not). Fixed by copying onnxruntime-web's WASM runtime
files from `node_modules` into `apps/web/public/ort/` at dev/build time
(`scripts/copy-ort-assets.mjs`, wired as a `predev`/`prebuild` hook;
directory gitignored, same rationale as `/apps/web/public/models/`) and
pointing `wasmPaths` there before any `pipeline()` call
(`src/lib/asr-pipeline.ts`). Verified: the zero-upload e2e assertion is
green with an explicit `blob:`/`data:` exemption (in-page synthesized
resources, e.g. a Worker built from a Blob for threaded WASM — never real
network egress) added after that showed up as a false positive.

---

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

**## M5 — brand assets (favicon/OG), scripts/brand.mjs finished

`scripts/brand.mjs` (M0's presence-check stub) is now the real thing: it
requires `favicon.svg` / `favicon-32.png` / `og.png` to exist, then
rasterizes the favicon at 16px (via `sharp`, added as a root
devDependency) and checks glyph-pixel coverage against a near-blank
threshold — a mechanical regression guard for BATCH-2-STANDARDS.md's
"favicon VERIFIED BY RASTERIZING AT 16px AND LOOKING" requirement. The
"and looking" part was a real manual visual check during this session
(favicon rasterized to 16px, then nearest-neighbor-upscaled to 256px and
inspected directly — a bold cream "p" mark, closed bowl + stem, on a warm
brown badge — clearly legible, no mush at tab size); the script is what
keeps that from silently regressing on a later logo change.

Assets are hand-authored SVG (`apps/web/public/brand/favicon.svg`,
`og.svg`), not AI-generated images — deliberately simple geometry (thick
strokes, no fine detail) specifically so they hold up at 16px, and
avoiding the house style's banned generic-AI-UI tells (no gradient blobs,
no side-tab accent borders). `og.png` is 1200×630, rasterized from
`og.svg` at build time via the same `sharp` dependency; both were visually
reviewed as rendered PNGs before being wired into `index.html`
(`<link rel="icon">` + `og:image`).

## M3 — confidence data doesn't exist in transformers.js's public API; recovered via a teacher-forcing pass

docs/pitman-SPEC.md Surfaces §1 requires "per-word confidence visualization."
transformers.js's `pipeline()` for ASR never provides this, at any settings:
its default sampler (greedy, deterministic — what `pipeline()` uses) hardcodes
the returned token "score" to 0 (`src/generation/logits_sampler.js`'s
`GreedySampler`: *"score is meaningless in this context, since we are
performing greedy search (p = 1 => log(p) = 0)"*), and the
`output_scores`/`return_dict_in_generate` generation-config flags exist in
the schema but are never wired into a scores-collection code path in this
package version (checked `src/models/modeling_utils.js`'s `generate()` loop
— only `output_attentions` is actually collected). This is a real gap in
the library, not a misconfiguration on this app's part.

**Fix (`src/lib/confidence.ts`):** one extra forward pass in teacher-forcing
mode — `model.forward({ input_features, decoder_input_ids: <the full
already-generated sequence> })` with no `past_key_values` (the same
"prefill" code path `generate()`'s own first step already uses, just
extended to the whole sequence) — returns `logits` for every position;
`log_softmax` + look up the actual next token's probability recovers the
model's real, contemporaneous per-token confidence. Verified first via a
standalone Node script (not committed) against
`common_voice_en_187061.mp3`: real, varying probabilities (0.024-0.979),
matching what the model actually got right vs. wrong (e.g. "truck" — the
wrong-but-confident word that replaced "track" — scored 0.964; "so", part
of the garbled opening, scored 0.100). This reaches into the pipeline's
own public `.model`/`.tokenizer`/`.processor` properties and one
internal-but-stable method (`tokenizer._decode_asr`, the exact method the
pipeline calls internally for chunk decoding — used unchanged here so the
displayed transcript text matches character-for-character what a plain
`pipeline()` call would produce). Pinned to `@huggingface/transformers@^4.2.0`;
flagged in `confidence.ts` to re-verify against the fixture clips on any
future major bump.

## M3 — mic permission prompt can hang forever with no error

Found via manual verification (`mcp__agent-browser`, a real Chrome profile):
`getUserMedia({audio:true})`'s promise never settled — no error, no
timeout — when the browser's native permission prompt was never answered
(no real microphone device, no auto-answer policy). Confirmed by directly
awaiting the call in-page: it was still pending after 30 minutes. Left
un-timeboxed, this would strand the mic button on "Requesting microphone
access…" indefinitely with no recovery except a page reload — its own
small dead end, even though D3's actual requirement (file-drop stays
usable) already held throughout, since the Dropzone is never gated by mic
state. Fixed in `src/lib/use-mic-recorder.ts`: races `getUserMedia()`
against a 15s timeout, surfaces an actionable "timeout" status
(re-enabled button, dropzone untouched), and stops any track from a
late-arriving grant so no orphaned microphone stream lingers after
giving up. Manually re-verified: recovers to the timeout state at 15-17s,
both controls still enabled throughout.

Also fixed during M2 (found via the zero-upload-network e2e assertion,
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

## Post-M5 -- CI fix: NavBar .nav-links overflow at 320px, Linux-runner-only

e2e/viewport.spec.ts ("320px no horizontal scroll") failed on the ubuntu
GitHub Actions runner only, identically on all four routes (/, /reference,
/method, /docs/limitations) -- document.documentElement.scrollWidth (346)
exceeds clientWidth (320). Passed 13/13 locally on Windows both before and
after investigating, confirming a platform-specific layout difference rather
than a flaky test.

**Root cause**, isolated by measuring the actual rendered nav box (not
guessed): NavBar's `.nav-links` (`<ul>`, the 4 primary links) is
`display: flex` with the browser default `flex-wrap: nowrap`, inside a plain
`<nav>` block that is itself a flex item of `.nav-inner` (which does have
`flex-wrap: wrap`). Because the `<ul>` never wraps, its rendered width is the
full unwrapped sum of "listen" / "reference cards" / "method" / "limitations"
plus gaps -- sized to content, not clamped to the available row. On Windows
with Segoe UI, that unwrapped row measured 292px against a 280px available
track at 320px viewport (nav.right landed at 312px -- only 8px of headroom
before the 320px document edge; verified directly via getBoundingClientRect()
in a throwaway Playwright diagnostic, not guessed). Ubuntu's Chromium has no
Segoe UI installed; the font-family stack ("Segoe UI", system-ui,
-apple-system, sans-serif) falls through to whatever generic sans the runner
image provides, which renders the same words wider -- enough to eat the 8px
margin and overflow by the reported 26px (346 - 320), identically on every
route because NavBar is the only element those four pages share unchanged.

**Fix** (`apps/web/src/styles.css`, `.nav-inner nav` and `.nav-links`):
`flex-wrap: wrap` on `.nav-links` (links wrap onto a second line instead of
being held to a single unwrapped row) plus `min-width: 0` on both
`.nav-links` and its `<nav>` parent (overrides the flex default
`min-width: auto`, which was flooring both elements at their unwrapped
content width and preventing them from ever shrinking to the actual row
width regardless of the wrap setting). This makes the layout robust to
font-metric variance itself, rather than fitting inside a specific pixel
budget measured on one platform's font stack -- verified by locally
stress-testing with `page.addStyleTag` forcing every nav link to
"Courier New", monospace at 18px (deliberately wider than any real fallback
sans) across all four routes at 320px: zero document-level overflow. Re-ran
`CI=true pnpm run ci` after the fix: 13/13 e2e green, including
viewport.spec.ts on all four routes.

---

# pitman

Shows exactly what a browser speech model heard on your speech — full transcript, per-word confidence, the diff
against what you meant to say — entirely on-device. No accent scores. No pronunciation grades. ASR confidence was
never built to measure that.

pitman is built on a real measurement: an 18-clip probe of Filipino-accented English against Whisper tiny.en and
base.en, with a US-tagged control group run through the identical pipeline. Full writeup:
[`docs/batch2-asr-probe.md`](docs/batch2-asr-probe.md) (verdict: **VIABLE-INTERESTING**), summarized in-app at
`/method`. The binding rule that verdict came with — the product never attributes a mismatch to how someone speaks
— is enforced by an automated test, not just a style guideline: see
[`packages/core/test/evidence-classes.test.ts`](packages/core/test/evidence-classes.test.ts).

## Quickstart

```bash
pnpm install
pnpm run dev          # apps/web on http://localhost:5173
```

## Verify

Every command below is the exact one used to produce the numbers in this README and in `docs/DEVIATIONS.md`.

```bash
pnpm run typecheck    # tsc --noEmit across packages/core + apps/web
pnpm run lint         # eslint .
pnpm run unit         # vitest — packages/core's WER/alignment/evidence-class suite
pnpm run build        # brand check + vite build
pnpm run e2e:smoke    # fast Playwright subset (@smoke-tagged)
pnpm run e2e:full     # full Playwright suite (real model download + transcription)
pnpm run ci           # the above, in order — what CI runs
```

Last full run (`CI=true pnpm run ci`, sequential/`workers:1` — see
[why](apps/web/playwright.config.ts)):

- **Unit:** 72/72 passed (5 test files — `align`, `normalize`, `wer`, `evidence-classes`, `provider-readback`).
- **Build:** green.
- **e2e:** 12/12 passed (~4.3 min), against the `wasm`+`fp32` path GitHub-hosted runners actually get (no GPU —
  see [D2 finding](docs/DEVIATIONS.md) below).

## What's real here, not estimated

- **WER numbers** on `/method` are copied verbatim from `docs/batch2-asr-probe.md`'s own Node.js measurements —
  never recomputed or rounded differently.
- **Per-word confidence** is the model's actual token-level probability, recovered via a teacher-forcing forward
  pass (`apps/web/src/lib/confidence.ts`) — transformers.js's high-level `pipeline()` API has no way to surface
  this (its greedy sampler hardcodes the returned score to 0). Verified against real fixture audio before
  shipping: confidence varied 0.024-0.979 and tracked what the model actually got right vs. wrong.
- **Execution provider** (`webgpu` vs `wasm`) is read back from real `GPUQueue.submit()` call counts
  (`apps/web/src/lib/instrument.ts`), never trusted from the config that was requested — a pipeline asked for
  `webgpu` that silently falls back to CPU is exactly the failure mode this catches.
- **Download size** is read from transformers.js's own byte-accounted `progress_callback`, not the browser's
  Resource Timing API — Hugging Face's CDN doesn't send `Timing-Allow-Origin`, so `transferSize` reads 0 there
  regardless of real transfer size (found and worked around during build — see `docs/DEVIATIONS.md`).

## Two real findings from building this

1. **The quantized (q8) model — what a real browser deployment ships — cannot construct a session on the `wasm`
   execution provider in this app's pinned `onnxruntime-web` build.** A specific, reproduced error
   (`qdq_actions.cc:137 TransposeDQWeightsForMatMulNBits`), not a guess, present on both `tiny.en` and `base.en`.
   `webgpu` runs q8 correctly (verified: exact-match transcription). `wasm` — including every CI/GitHub-hosted
   runner, which has no GPU — gets the full-precision (fp32) model instead, and the app's model panel says so
   every time it happens, live.
2. **`@huggingface/transformers` defaults its WASM runtime to a `jsdelivr.net` CDN fetch** as a module-load-time
   side effect, discovered by this project's own zero-upload e2e assertion catching the request. Fixed by copying
   the runtime into `apps/web/public/ort/` at build time (`scripts/copy-ort-assets.mjs`) so the "nothing leaves
   your device" claim holds for the inference engine's own bootstrap, not just model weights and audio.

Full technical writeups for both, milestone by milestone, in [`docs/DEVIATIONS.md`](docs/DEVIATIONS.md).

## Structure

```
packages/core/   Pure TS: WER/alignment engine, evidence-class routing, execution-provider readback logic.
                 Zero DOM dependencies — unit-testable without a browser.
apps/web/        Vite + React + TS. On-device ASR pipeline, mic/file-drop, confidence + diff UI,
                 reference cards, /method, /docs/limitations.
fixtures/        3 CC0 Common Voice clips + their probe-measured reference data, reused as e2e fixtures.
docs/            The spec, the gating probe, and the running deviations log.
```

## License

See [`LICENSE`](LICENSE). Fixture audio is CC0-1.0 — see [`fixtures/README.md`](fixtures/README.md) for
provenance.

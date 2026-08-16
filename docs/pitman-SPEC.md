# SPEC — pitman (on-device ASR honesty tool)

2026-08-16. Batch-2 slot E (strategist 49/70, keep-firm, gated — GATE PASSED:
research/batch2-asr-probe.md, verdict VIABLE-INTERESTING). Binds to
BATCH-2-STANDARDS.md. Name: **pitman** (research/naming.md batch-2 — the
verbatim shorthand system; the machine's value is that it can't lie about
what it heard).

## Positioning

Shows exactly what a browser speech model heard on your speech — full
transcript, per-word confidence, the diff against what you meant to say —
entirely on-device. Built first for Filipino-accented English speakers
(probe-measured: tiny.en mean WER 0.18, 39% of clips perfect, a real tail
of systematic misses), honest for everyone. NO accent scores. NO
pronunciation grades. ASR confidence was never built to measure that.

## THE FRAMING LAW (D1 — violating it anywhere means the build is not done)

The product NEVER judges the speaker. Every mismatch is framed as MODEL
behavior: "the model heard X." Failure explanations use only the probe's
two evidenced classes: (A) "the model doesn't know this word/name" (general
OOV — the probe's US-accent CONTROL GROUP proved this class is not
accent-specific) and (B) "this confusion is documented across multiple
speakers" (multi-datapoint only; the probe's track→truck evidence). No
surface may attribute an error to "your accent." This is the
construct-validity discipline that killed the earlier phoneme-feedback
concept; pitman exists because it refuses that claim.

## Other death conditions

- D2: whisper-tiny.en at q8 IN THE BROWSER cannot transcribe the committed
  fixture clips at quality comparable to the probe's Node numbers after
  honest effort — that gap is itself a finding: degrade to base.en or STOP
  and report; never paper over with fp32-only defaults (q8 is what browsers
  actually ship — the probe's own correction).
- D3: mic-denied/no-mic must land on a fully functional file-drop path,
  never a dead end.

## Surfaces

1. **Listen mode**: record a short utterance (mic) OR drop a WAV/MP3 →
   on-device transcription (transformers.js; whisper-tiny.en q8 default,
   base.en selectable) → transcript with per-segment/word confidence
   visualization. Optionally type what you MEANT to say → word-level
   alignment diff (S/D/I coloring). Nothing leaves the device — Network-tab
   verifiable.
2. **Reference cards**: short practice sentences with known reference text,
   probe-informed: includes OOV-name cards (class A demonstrated honestly:
   "watch it miss this name for everyone") and documented-confusion cards
   (class B, multi-datapoint pairs only). Card copy teaches the two classes.
3. **Model panel** (shipgauge craft applied): model + precision, execution
   provider READ BACK at runtime (webgpu/wasm actual, never config), cold vs
   warm load time, true download size.
4. **/method** (the probe story: dataset provenance, the control group that
   broke our own first proxy, per-model numbers) and **/docs/limitations**
   (claims ceiling, q8-vs-fp32, register/sample caveats). Copy the probe
   report into `docs/` for provenance.

## Verification plan

- Unit: WER/alignment engine (normalized word-level Levenshtein with S/D/I
  backtrace — port the probe's method) against known-answer fixtures;
  confidence-viz data mapper; evidence-class copy selector (class A/B
  routing has fixtures so the framing law is TESTED, not vibes).
- e2e (Playwright): file-drop path transcribes 2-3 committed CC0 Common
  Voice fixture clips (≤150KB total, provenance + license recorded) →
  transcript renders with confidence + diff; mic path via fake-device flags
  where the runner allows (env-gate with reason if not); zero-upload
  network assertion; mic-denied → file-drop fallback; 320px; keyboard/SR
  walkthrough. Provider readback asserted (wasm on runners; webgpu locally
  — env-gated split per house convention).
- CI green ON ACTIONS post-publication.

## Milestones

M0 scaffold + brand + copy this spec and the probe report into docs/.
M1 alignment/WER lib + tests (known-answer fixtures).
M2 on-device pipeline: model load (q8), provider readback, cold/warm
metrics, fixture-clip transcription e2e (D2 gate).
M3 listen mode: mic + file-drop (D3), transcript + confidence + diff UI.
M4 reference cards (evidence-classed, framing-law-tested) + model panel.
M5 method/limitations pages, README (real numbers with provenance),
docs/DRAFT-WRITEUP.md (finding-first: "we built the control group that
broke our own hypothesis — what honest ASR feedback for Filipino English
actually looks like"), DEVIATIONS.md, OG/favicon (16px proof).

## Limitations page must state

Numbers come from an 18-clip probe + its US-accent control (small n,
stated); q8 quantization is the shipped default and differs from fp32
benchmarks; confidence is the model's self-report, not truth; the tool
measures the model, not the speaker — restate the framing law verbatim.

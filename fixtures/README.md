# Fixture clips — provenance and license

Three short speech clips, reused verbatim (not re-recorded) from the batch-2
ASR probe (`docs/batch2-asr-probe.md`) that gated this project. Total size:
140,367 bytes (137.1 KiB), under the 150KB budget in `docs/pitman-SPEC.md`.

## Source and license

**Source:** Mozilla Common Voice, English, version 22.0, via the
`fsicoli/common_voice_22_0` mirror on Hugging Face
(https://huggingface.co/datasets/fsicoli/common_voice_22_0) — the same
Mozilla-released data as the gated (non-ungated) official repos, republished
without a click-through/token wall.

**License: CC0-1.0** (public domain dedication), confirmed via the dataset
card's own front-matter metadata (`license: cc0-1.0`). CC0 permits reuse
with no attribution requirement; provenance is recorded here anyway, per
house style (`BATCH-2-STANDARDS.md`: "prior art is credited by name").

**Selection:** all 3 clips were part of the probe's 18-clip Filipino-accented
English selection (`test.tsv` split, self-reported `accents` column
containing "Filip" as the primary tag, `down_votes==0`, `up_votes>=2`,
4-25 word sentences, max 2 clips/speaker — full filter in
`docs/batch2-asr-probe.md` §2). Audio was streamed out of Common Voice's
per-language tar shard (`audio/en/test/en_test_0.tar`) without downloading
the full 706MB archive; these 3 files are the original MP3 bytes extracted
by that process, unmodified.

## Why these 3, out of the probe's 18

Chosen to demonstrate the framing law's two evidence classes plus the clean
case, using the probe's own measured results (`docs/batch2-asr-probe.md`
§5-§7) — not cherry-picked for a flattering number:

| File | Reference sentence | Why chosen |
|---|---|---|
| `common_voice_en_187059.mp3` (43,425 B) | "Young boy running outside on the pavement." | WER = 0 in all 4 probe runs (tiny/base × fp32/q8). The "the model got this exactly right" case — most clips are this, not the tail. |
| `common_voice_en_187061.mp3` (63,201 B) | "Muzzled greyhounds are racing along a dog track." | Contains the probe's flagship **class B** case: `track` → `truck`, a recurring, phonetically-grounded confusion (§6 bucket B) that appears in this clip and one other, across 2 speakers and both models, absent from the probe's US-accent control group. |
| `common_voice_en_38102497.mp3` (33,741 B) | "The current president is Pavel Cebanu." | Contains a **class A** case: `Cebanu` (a rare surname) → `Sebano`/`Cebano`, a general out-of-vocabulary/proper-noun miss (§6 bucket A) — the probe's control group broke on equally rare *non-Filipino* names the same way, which is exactly why this class is never framed as accent-related. |

## Reference data

`reference.json` in this directory carries, per clip: the reference
transcript, the probe's measured hypothesis/WER/S/D/I counts for
`whisper-tiny.en` and `whisper-base.en` at both `fp32` and `q8`, and the
evidence class this clip demonstrates. `packages/core`'s alignment engine is
tested against these as known-answer fixtures (M1), and the app's e2e suite
(M2/M3) diff-checks the live in-browser transcription against them.

These numbers are Node.js measurements (`@huggingface/transformers` on
`onnxruntime-node`), not browser measurements — the in-browser numbers this
project produces are a fresh, separate measurement (M2's D2 gate), reported
alongside these for comparison, never substituted for them.

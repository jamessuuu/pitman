# Batch-2 pre-build gate: on-device ASR honesty tool (Filipino-accented English probe)

Date: 2026-08-16. Gate discipline per HANDOFF.md/BATCH-2-STANDARDS.md — measure before
spec'ing, same posture that caught swage's missing classifier. This document is the
measurement; no spec exists yet and none should until this verdict is read.

**Candidate product, restated:** an on-device tool that shows exactly what a
browser speech model heard, with confidence, on Filipino-accented English —
explicitly **not** an accent-scoring app. It does not grade the speaker. It exposes
the machine's behavior on the speaker's real speech, word for word.

**Verdict: VIABLE-INTERESTING, with a construct-validity condition that must
survive into the spec** (see §8-9). The error pattern is frequent enough to matter
(11/18 clips, 61%, contain at least one error) and split into two honestly
explainable, differently-actionable buckets (rare/foreign proper-noun failure vs.
recurring phonetic-plausible confusion) rather than either near-perfect
transcription or unstructured garbage. Full reasoning in §9.

---

## 1. What was measured and why

Per the brief: find real open-licensed Filipino-accented English speech with
reference transcripts, transcribe it with the actual on-device model family
(transformers.js + Whisper), compute real WER, and build a qualitative error
taxonomy — before writing a single line of spec. This program already validated
the underlying tech choice independently, twice, before this probe existed:

- `research/phase2-creative-tech.md:46`: *"ASR (whisper-tiny/base, 40-150MB) ...
  Yes, honestly — a short recorded clip transcribed in 5-15s with a real progress
  bar is the correct design, not a lie about 'live.'"*
- `research/phase2-convergence.md:19,48`: *"NOT live captioning ... A recorded
  clip with a real progress bar is the honest design"* (line 19); a related
  speech-feedback concept was scoped as *"VIABLE IF SCOPED"* specifically
  because *"phoneme/ASR is not live and must be a recorded clip"* (line 48).
- `SELECTION-2.md:115-117`: *"Live ASR captioning as a headline feature"* was cut
  from Batch/Phase 2 for the same reason — recorded-clip transcription with a
  progress bar remains the honest design, and is exactly what this probe used.

This probe does not re-litigate that call; it reuses it. What it does test fresh:
whether Whisper's actual output on real Filipino-accented speech is interesting
enough, and honestly explainable enough, to build a product around.

**Relationship to the previously-cut concept.** `SELECTION-2.md:162-167` records
that a "phoneme/accent feedback" concept was cut from Batch 2's three because it
*"stake[s] a claim on phonetic 'truth' in domains that are either contested or
actively harmful when wrong for the exact audience relying on them."* That cut
concept scored the **speaker's pronunciation**. This candidate is different in
construct: it reports the **model's transcription**, a mechanically verifiable
fact (this ASR model, run on this exact audio, produced this exact text) with no
claim about whether the speaker's English is "correct." That distinction is real,
but it is a framing distinction, not a free pass — §9 states the condition under
which it holds.

---

## 2. Dataset — provenance, license, exact selection

**Source:** Mozilla Common Voice, English, version 22.0, accessed via the
`fsicoli/common_voice_22_0` mirror on Hugging Face
(https://huggingface.co/datasets/fsicoli/common_voice_22_0) rather than the
official `mozilla-foundation/common_voice_*` repos, because the latter are
click-through-gated behind an HF token/login. The `fsicoli` mirror republishes
the same Mozilla-released data **ungated**.

**License:** confirmed via the dataset card's own metadata —
`license: cc0-1.0` (fetched directly:
`curl -sL https://huggingface.co/datasets/fsicoli/common_voice_22_0/raw/main/README.md`,
front-matter line 1). This matches Mozilla Common Voice's standing public-domain
(CC0) dedication for both audio and transcript text. CC0 permits research use
with no attribution requirement, which this document provides anyway.

**Why the `test.tsv` split, not `validated.tsv`:** the full validated-clips TSV is
592MB of metadata alone; `dev.tsv` and `test.tsv` are ~4.9MB each and are
themselves community-validated subsets (all rows already passed Common Voice's
peer-validation flow). Used `test.tsv` only (16,402 rows) to keep the working set
small and to avoid pulling two multi-hundred-MB audio shards (see next).

**Selection filter, exactly as run** (`cv_test.tsv`, self-reported `accents`
column):

1. Split `accents` on commas; keep rows whose **first/primary** self-reported tag
   contains "Filip" (catches `Filipino`, and combination tags where Filipino is
   listed first).
2. Reject rows with more than 3 accent tags at all (drops kitchen-sink/joke rows —
   one candidate listed 15 different accents including "just like us accent" and
   was excluded on this basis).
3. `down_votes == 0` (no community disagreement on transcript accuracy).
4. `up_votes >= 2`.
5. Sentence length 4-25 words (avoids single-word clips and outlier long reads).
6. Max 2 clips per `client_id` (speaker diversity).

**Result: 18 clips from 12 unique speakers.** Accent-tag breakdown: 16×
`Filipino`, 1× `Filipino English`, 1× `Filipino,Waray-waray dialect` (Waray-waray
is a Philippine regional language — consistent, not noise). Full list with
sentences is in `selected_clips.json` (reproduced in §7/§10 for the clips actually
quoted).

**Audio acquisition.** Common Voice packages each split's audio as one large
per-language tar (`audio/en/test/en_test_0.tar` = 706,425,856 bytes on this
mirror) rather than as individually addressable files, so downloading it whole
would have blown the 200MB clip budget by 3.5x for one split alone. Instead, a
small Python script (`extract_tar.py`) opened the tar as an HTTP stream
(`urllib.request` + `tarfile.open(fileobj=..., mode='r|')`, sequential/streaming
mode, no local copy of the tar) and pulled out only the 18 target filenames as
their headers were encountered, stopping the instant all 18 were found.

- Streamed 614.5MB of the 706MB tar (files were scattered roughly in ID order;
  the highest-ID targets forced reading most of the shard) to extract 18 files
  totaling **796KB**.
- Converted to 16kHz mono PCM16 WAV via `ffmpeg` (needed by the WAV reader in the
  Node pipeline): **3.6MB** total.
- **Total dataset payload actually kept: well under 1% of the 200MB budget**
  (796KB raw + 3.6MB decoded WAV). 18 clips, 114.7 seconds of audio total, mean
  6.4s/clip.

Commands (reproducible in order):

```bash
curl -sL -o cv_test.tsv "https://huggingface.co/datasets/fsicoli/common_voice_22_0/resolve/main/transcript/en/test.tsv"
# filter script -> selected_clips.json (18 rows)
python3 extract_tar.py selected_clips.json audio_raw extract_report.json
# streams https://huggingface.co/datasets/fsicoli/common_voice_22_0/resolve/main/audio/en/test/en_test_0.tar
for f in audio_raw/*.mp3; do
  ffmpeg -y -i "$f" -ar 16000 -ac 1 -c:a pcm_s16le "audio_wav/$(basename "$f" .mp3).wav"
done
```

**Bonus control group (for §8, not part of the core ask):** an 18-clip,
18-speaker set tagged single-tag `United States English` was pulled from the same
`test.tsv`/same tar with the same filters, to give the taxonomy something to be
measured against instead of asserted in isolation. See `control_clips.json`.

---

## 3. Transcription pipeline

- **Runtime:** Node v24.15.0, package `@huggingface/transformers@4.2.0` (the
  current official successor to `@xenova/transformers`, same model family/repo
  namespace), `wavefile@11` for PCM decode into the `Float32Array` the pipeline
  expects.
- **Models:** `Xenova/whisper-tiny.en`, `Xenova/whisper-base.en` — the exact
  browser-deployable quality ladder named in the brief and the same family
  already measured (for latency, not WER) in `research/phase2-creative-tech.md`.
- **Two precision passes, and why both matter:**
  1. **Default (`pipeline(...)` with no `dtype`)** — this turned out to fetch
     **full fp32 weights**, confirmed by inspecting the cache:
     `encoder_model.onnx` (32.9MB) + `decoder_model_merged.onnx` (118.5MB) for
     tiny.en alone (~151MB combined for one model). That is **not** what ships to
     a browser; it is a best-case quality ceiling.
  2. **`dtype: 'q8'`** — the quantized ONNX variant (`*_quantized.onnx`) that
     transformers.js browser demos actually ship. Loaded in 6.4s vs. tiny.en
     fp32's 29.1s, consistent with a much smaller download.
  Running both is the same honesty move the brief asked for when a fallback is
  needed ("say so, and bound the story less tightly") — Node ASR worked fine on
  the first attempt, but the *default* artifact was silently the wrong one for a
  browser claim, so both are reported rather than only the flattering one.
- **Compute:** CPU via `onnxruntime-node` (Node's default backend). This is a
  **quality**-equivalence run, not a latency benchmark — per-clip latency is
  logged (300-1000ms/clip) but Tier A/B browser latency for this model family was
  already established in `research/phase2-creative-tech.md` and is out of scope
  here.

---

## 4. WER methodology

Implemented from scratch in `node/wer.js` (not a library), per the brief's
"implement WER properly" instruction:

1. **Normalize:** lowercase; strip all punctuation except apostrophes (so
   contractions survive as single tokens); collapse whitespace.
2. **Tokenize** on whitespace.
3. **Word-level Levenshtein alignment** with full DP backtrace — not just an edit
   distance count — yielding explicit Substitution/Deletion/Insertion operations
   per clip (`{op, ref, hyp}` list), which is what makes the error taxonomy in §6
   possible at all.
4. `WER = (S + D + I) / N` where `N` = reference word count.

**Explicitly not implemented:** OpenAI Whisper's full `EnglishTextNormalizer`
(number-word ⟷ digit unification, filler-word removal, extensive contraction/
spelling canonicalization). This is a scope cut, stated here rather than left
implicit, and it has a measurable, honest cost: two recurring non-error patterns
inflate the raw WER numbers below —

- `four` (ref) vs `4` (hyp) — correct transcription, different number format.
- `its` (ref) vs `it's` (hyp) — identical pronunciation, an orthographic
  distinction no listener could make by ear either.

Both are tagged programmatically (`analyze.py`) and both a **raw** and an
**artifact-adjusted** WER are reported in §5 so neither number is presented
without the other.

---

## 5. Results — per-model WER, mean/median/distribution

### fp32 (full precision — quality ceiling, not shippable as-is)

| Model | n | mean WER | median WER | stdev | min | max | p25 | p75 |
|---|---|---|---|---|---|---|---|---|
| whisper-tiny.en | 18 | 0.1795 | 0.1111 | 0.2062 | 0.000 | 0.636 | 0.000 | 0.333 |
| whisper-base.en | 18 | 0.1852 | 0.1181 | 0.2666 | 0.000 | 1.125 | 0.000 | 0.222 |

### q8 (quantized — the artifact a real browser build would actually ship)

| Model | n | mean WER | median WER | stdev | min | max | p25 | p75 |
|---|---|---|---|---|---|---|---|---|
| whisper-tiny.en | 18 | 0.2076 | 0.1458 | 0.2170 | 0.000 | 0.636 | 0.000 | 0.333 |
| whisper-base.en | 18 | 0.1574 | 0.1181 | 0.1789 | 0.000 | 0.625 | 0.000 | 0.222 |

### Artifact-adjusted (excluding the two non-error patterns named in §4)

| Model / dtype | raw mean | raw median | adjusted mean | adjusted median | clips affected |
|---|---|---|---|---|---|
| tiny.en fp32 | 0.1795 | 0.1111 | 0.1664 | 0.0357 | 2/18 |
| base.en fp32 | 0.1852 | 0.1181 | 0.1721 | 0.0500 | 2/18 |
| tiny.en q8 | 0.2076 | 0.1458 | 0.1945 | 0.0833 | 2/18 |
| base.en q8 | 0.1574 | 0.1181 | 0.1443 | 0.0500 | 2/18 |

**Distribution shape (identical story across all four runs, this is the load-bearing
finding):** **7/18 clips (39%) are perfect, WER = 0**, in *every one* of the four
model/precision combinations. The remaining 11 clips are not clustered just above
zero — they spread across a real tail out to 0.5-1.125. Bucketed (fp32 tiny.en):
7 perfect, 4 "good" (0-0.15], 3 "moderate" (0.15-0.4], 4 "bad" (>0.4). This
bimodal-ish shape — a solid cluster of clean transcriptions plus a genuine,
non-trivial tail of real breakage — is exactly the shape that supports
"interesting," as opposed to either a flat near-zero distribution (boring) or a
flat high distribution (not viable).

**Model-size and quantization effects are not monotonic on this sample, stated
plainly rather than smoothed over:** base.en's fp32 mean (0.1852) is
*slightly worse* than tiny.en's (0.1795), driven by one clip
(`common_voice_en_187061`) where base.en produced *more* garbled output than
tiny.en (WER 1.125 vs 0.500 — see §7). Quantizing tiny.en made its mean *worse*
(0.1795 → 0.2076); quantizing base.en made its mean *better* (0.1852 → 0.1574).
At n=18 these deltas are inside noise (stdev ~0.2-0.27) — the honest claim is
"model size and quantization shift *which* clips fail, not a clean better/worse
ranking at this sample size," not a specific ranking claim.

---

## 6. Error taxonomy (qualitative)

**Method and its limit, stated up front:** classification is done on the
**spelling** of substituted words (`analyze.py`), pattern-matching for documented
Philippine English features — th-stopping (θ/ð → t/d), f/p and v/b confusion,
final-consonant devoicing — sourced from published phonology work: Th-stopping
(https://en.wikipedia.org/wiki/Th-stopping), and Philippine English phonological
feature inventories (Journal of the International Phonetic Association, "Philippine
English (Metro Manila acrolect)"; UAL/HKIEd Philippine-English pronunciation
feature list). **This is a grapheme-level proxy, not a phoneme-level or
forced-alignment analysis** — no phonetic recognizer was used, so a tag like
`th-stopping-proxy` means "the spelling pattern is consistent with th-stopping,"
not "phonetic evidence confirms th-stopping occurred." Flagged here rather than
only in a footnote, per house style.

### Tag counts

| Category | tiny.en (fp32) | base.en (fp32) |
|---|---|---|
| Substitutions, total | 25 | 26 |
| — unrelated-content-word (garbled/unrelated) | 14 | 13 |
| — function-word substitution | 7 | 6 |
| — near-miss-spelling (phonetically close) | 3 | 6 |
| — number-format-artifact (non-error) | 1 | 1 |
| — th-stopping-proxy (spelling-level) | 1 | 0 |
| Deletions, total | 1 | 1 |
| Insertions, total | 5 | 6 |

### The two buckets that actually explain the tail

**(A) Rare/foreign proper-noun failure — present in both models alike, likely
general-ASR not accent-specific.** Every clip containing an uncommon proper noun
broke, in both models, in similar ways:

- `Leclercq` (French surname) → tiny: `Lickler` / base: `Lickler` (both models
  land on the same wrong word)
- `Penelakut` (a real, rare Canadian First Nations place name) → tiny:
  `vanilla group` / base: `vanilla cook` — both models independently hallucinate
  "vanilla," a clear language-model prior taking over on an out-of-vocabulary
  token, not a mishearing of a specific sound
- `Cebanu` (Moldovan surname) → tiny: `Sebano` / base: `Cebano` (base gets one
  more letter right; neither is exact)
- `Hawk's` → tiny: `House` / base: `house` (both models miss it, converging on
  the same wrong word); the surrounding rare word `soundtrack` also breaks in
  both, differently: tiny.en substitutes it (`soundtrack`→`san`, `for`→`trakport`)
  while base.en drops it outright (`soundtrack`→∅) and separately mangles
  `tony`→`portoni` — tiny.en gets plain `Tony` exactly right in this same clip,
  so the breakage is uneven even within one sentence, not a blanket failure

Because these break similarly for a foreign/rare word regardless of which model,
and there is no native-speaker baseline in this probe reading the *same* rare
names, this bucket **cannot be honestly attributed to the speaker's accent** — a
native English speaker saying "Penelakut" cold would plausibly also trip
Whisper's language-model prior. This is the single most important honesty
constraint on the eventual product framing (see §9).

**(B) Recurring, phonetically-grounded confusion — the strongest evidence of a
real, systematic (not just random) pattern.** The word `track` (ref) is
mis-transcribed in **every one of the 4 clip×model combinations** it appears
in, across **two different speakers**, and **3 of those 4** land on the exact
same wrong word, `truck`:

- `common_voice_en_187061`, "a dog **track**": tiny.en → `truck`, base.en →
  `truck`
- `common_voice_en_21786428`, "The **track** 'Remedy'": tiny.en → `trap`
  (a different substitution — same vowel, different final consonant),
  base.en → `truck`

A `/æ/`-vs-`/ʌ/` (TRAP-vs-STRUT) vowel substitution recurring across two
independent speakers and converging on the identical wrong word in 3 of 4
attempts is a qualitatively different kind of finding than the proper-noun
bucket: it recurs across *different speakers* on an ordinary, non-rare word,
which a pure language-model-prior/OOV effect (bucket A) would not predict.
This is presented as **one real, repeatable, data-grounded example**, not as
proof of a general phonological rule at n=18 — the sample is nowhere near large
enough to claim a population-level Philippine English vowel-merger finding, and
this document does not claim that. (tiny.en's `trap` miss on the second clip is
itself consistent with the same vowel being unstable — `track` and `trap`
share /æ/ — even though it didn't converge on `truck` that one time.)

**Everything else is smaller-stakes:** function-word substitutions
(`through`→`to`, `and`↔`on` swapped in both directions on different clips) and the
two non-error artifacts already isolated in §4/§5.

---

## 7. Ten real example pairs (reference vs. whisper-tiny.en heard, fp32)

Spans the full observed range, 0.000 to 0.636, in ascending WER order:

| WER | Reference | whisper-tiny.en heard |
|---|---|---|
| 0.000 | Young boy running outside on the pavement. | Young boy running outside on the pavement. |
| 0.000 | Chile is today one of South America's most stable and prosperous nations. | Chile is today one of South America's most stable and prosperous nations. |
| 0.071 | It is also funded through the National Lottery, Creative Scotland and Northern Ireland Screen. | It is also funded to the National Lottery, Creative Scotland and Northern Ireland, Screen. |
| 0.111 | Enemies killed by beam attack won't drop any orbs. | Enemies killed by beam attack won't drop any olives. |
| 0.111 | Its inhabitants emigrated and were replaced by Greek refugees. | It's inhabitants emigrated and were replaced by Greek refugees. |
| 0.125 | The album eventually sold over four million records. | The album eventually sold over 4 million records. |
| 0.167 | The current president is Pavel Cebanu. | The current president is Pavel Sebano. |
| 0.222 | The present comprehensive school is run by the Penelakut. | The present comprehensive school is run by the vanilla group. |
| 0.455 | Leclercq instead opted to record live choirs and solo gospel singers. | Lickler is instead opted to record live choirs on solo gospelsiness. |
| 0.636 | After this, Bow's hideaway is rebuilt and Rand rejoins the party. | After this, both hideaway is revealed and you're on screen-join the park. |

Reading down this table is the honesty case in miniature: two flawless
transcriptions of ordinary sentences, three trivial/non-error edge cases (a
missed function word, a rare-gaming-noun LM bias, a punctuation-only
"error"), then a real, escalating slide into genuine breakage on foreign names
and phonetically dense phrases, topping out at a clip that is genuinely hard to
follow. That range is the product's honest raw material.

---

## 8. Control group — is this accent-attributable or general-ASR-attributable?

Built and run: an 18-clip, 18-speaker control group, same `test.tsv`, same tar,
same extraction/conversion/transcription/WER pipeline, same filters (single
clean accent tag, `down_votes==0`, 4-25 words, max 1/speaker), tag = single-tag
`United States English` instead of `Filipino`. This is the comparison that
separates "the model is bad at rare words for everyone" from "the model is worse
on this speech specifically."

### Headline numbers (fp32, same pipeline, same day)

| Model | Filipino mean WER | Control mean WER | Absolute delta | Relative delta | Filipino median | Control median |
|---|---|---|---|---|---|---|
| whisper-tiny.en | 0.1795 | 0.1258 | +0.0537 | +42.7% | 0.1111 | 0.0000 |
| whisper-base.en | 0.1852 | 0.0840 | +0.1012 | +120.6% | 0.1181 | 0.0000 |

| Model | Filipino buckets (perfect/good/mod/bad) | Control buckets (perfect/good/mod/bad) |
|---|---|---|
| whisper-tiny.en | 7 / 4 / 3 / 4 | 10 / 3 / 3 / 2 |
| whisper-base.en | 7 / 4 / 4 / 3 | 11 / 4 / 2 / 1 |

| Model | Filipino total error-ops (S+D+I) | Control total error-ops (S+D+I) |
|---|---|---|
| whisper-tiny.en | 31 | 16 |
| whisper-base.en | 32 | 10 |

A real, consistent gap in every one of these cuts: **more errors, more error
operations, a lower "perfect" share, and a strictly higher median** on the
Filipino-tagged set than on the control, in both models, measured with the
identical pipeline on the same day. base.en shows the larger gap (mean WER more
than doubles), which is itself interesting since base.en is nominally the
"better" model — whatever is driving the gap does not just wash out with more
model capacity.

### The two things this does NOT prove, stated as plainly as the things it does

1. **Not a matched-pairs design.** The two groups read *different* sentences
   (Common Voice assigns sentences per-contributor; this is an unmatched-groups
   comparison, not the same paragraph read by both a Filipino- and a
   US-accented speaker). Some of the gap could be sentence-difficulty variance
   rather than accent. This is a real limitation of an 18-vs-18 opportunistic
   sample, named rather than hidden.
2. **The rare-proper-noun failure mode (§6 bucket A) is confirmed present in
   BOTH groups, not unique to the Filipino set.** The control set independently
   broke on `Vlachos` → `Blachel`/`Blachos` (tagged `v-to-b-proxy` by the same
   heuristic used on the Filipino set — the *identical* spelling-pattern proxy
   that looked like a Filipino-accent signal in §6 fires here on a nominally
   native-English speaker misreading a Greek surname), `Erlewine` →
   `Erwin`/`Erlouin`, and `Iberian` → `eberian`. **This is the single most
   important check this probe ran on itself:** it directly disproves treating a
   spelling-proxy accent tag as accent evidence by itself, exactly the caution
   §6 stated in advance. The rare-word/OOV failure mode is a general Whisper
   weakness, present at a third to half the rate (tiny.en 16 vs 31, base.en 10
   vs 32 error-ops) in the control set — lower, but not zero, and not absent.

### What the gap plausibly is, honestly bounded

Given (1) the rare-word failure mode is confirmed general (present in both
groups) but (2) a real, substantial residual gap remains even so (control's
error-op count is 31-52% of the Filipino set's (base.en 10/32, tiny.en 16/31), not comparable), the most honest
reading is: **some of the gap is generic ASR weakness on uncommon words that any
accent would trigger at similar rates give or take sentence luck, and some
residual gap is not explained by that alone.** The one recurring, non-proper-noun,
common-word confusion in the Filipino set with no control-group counterpart —
`track` → `truck`, independently in two different Filipino-tagged speakers, in
both models (§6 bucket B) — is the cleanest single piece of evidence for that
residual, precisely because it survived the same "does this also happen to
non-Filipino speech" question the proxy tags did not. One recurring word-pair at
n=18 is suggestive, not proof of a general phonological effect, and this
document does not claim more than that.

---

## 9. Verdict and reasoning

**VIABLE-INTERESTING**, conditioned on one framing requirement that is not
optional.

**Why not VIABLE-BORING:** transcription is not near-perfect. 11/18 clips (61%)
contain at least one real error; the tail runs to WER 0.636-1.125. A product that
only ever shows a perfect transcript would have nothing to show; this dataset
does not do that.

**Why not NOT-VIABLE:** the errors are not unstructured garbage either. 39% of
clips are flawless in every one of four model/precision runs, and the failures
resolve into two named, evidenced, explainable buckets (§6) rather than a wall of
noise. There is a real, honest story to tell on every single clip in this
sample — "the model got this exactly right," "the model stumbled on this
specific rare name, and that's a model-vocabulary limit, not a judgment on your
speech," or "the model consistently mis-hears this specific vowel here" are all
sentences the tool could print truthfully.

**The binding condition:** §6 bucket (A) is the majority of the observed errors
(14/25 and 13/26 substitutions tagged `unrelated-content-word` — largely rare
proper nouns), and §8's control group confirms this bucket **cannot** be
attributed to the speaker's accent — the identical failure mode (including one
of the identical spelling-proxy tags, `v-to-b-proxy`, on `Vlachos`→`Blachel`)
shows up on a nominally native-English speaker misreading an unfamiliar surname.
A product that implies "the model mishears *you*" when the measured cause is
"the model has never seen this name, for anyone" would be making exactly the
kind of unverified phonetic-truth claim `SELECTION-2.md` already ruled out once
— and this probe now has the control data to prove that conflation would be
wrong, not just risky. At the same time, §8 also found a real, substantial
residual gap (control error-ops run 31-52% of the Filipino set's, base.en's mean
WER more than doubles) that the general-OOV explanation alone does not cover,
anchored by one recurring, non-proper-noun confusion (`track`→`truck`) absent
from the control set entirely. Both findings are real; neither cancels the
other. The fix is cheap and is a framing requirement, not a research blocker:
**never present a single per-clip result as attributable to the speaker's
accent.** Label word-rarity/OOV-ness and phonetic-confusion as two different,
separately-evidenced explanations, offered only when the evidence (§6's
method, checked against a control the way §8 did) actually supports each one —
and keep running that check as the tool's own dataset grows, not just once here.

---

## 10. What this means for a spec, if greenlit

- **Reaffirm the non-goal in the product, not just in this doc:** no phonetic
  "correctness" claim, no accent score, no implication that a transcription
  failure is the speaker's fault. The tool explains the model, not the speaker.
- **Ship q8 numbers, not fp32 numbers.** The default pipeline call in this
  probe silently pulled full-precision weights (~151MB+ for tiny.en alone) that
  no browser build would ship. Any number that reaches a spec or a page must be
  measured on the actual quantized (or lower) artifact that ships, per §3/§5 —
  this probe's own first pass is the cautionary example.
- **Separate the two failure explanations in the UI, because they're different
  claims with different evidence:** "this word is rare/foreign to the model"
  (bucket A, §6) is a vocabulary-coverage fact; "this sound is consistently
  misheard" (bucket B, §6) is a phonetic-pattern fact and needs more than one
  data point per claim before the tool asserts it about any specific sound.
  Never collapse the two into a single generic "accent affected this" message.
- **An honest limits surface is mandatory per BATCH-2-STANDARDS**, and this
  probe hands it real content: state the model, the precision/quantization,
  that WER is measured against one specific reference transcript (not a
  population), and that word-rarity and accent are not disentangled by this tool
  for any individual clip unless the eventual spec adds the control mechanism
  §8 sketches.
- **Recorded clip only, never live**, per the program's own prior-art finding
  (§1) — this probe changes nothing about that.

---

## Appendix: reproduction

All work for this probe lives under the session scratchpad (not committed
anywhere, per the brief — "touch nothing else outside temp"): `asr-probe/`
containing `cv_test.tsv`, `select_filipino.py` → `selected_clips.json`,
`select_control.py` → `control_clips.json`, `extract_tar.py`, `audio_raw/` +
`audio_wav/` (Filipino set), `audio_raw_control/` + `audio_wav_control/`
(control set), `node/` (the transformers.js pipeline: `transcribe.js`,
`wer.js`), `analyze.py`, and `results/` (`results.json` = Filipino set fp32,
`results_q8.json` = Filipino set quantized, `results_control.json` = control
set fp32, `taxonomy.json` / `taxonomy_control.json` = tagged substitutions per
group). Every number in this document was read from these files, not
hand-typed from the console log.

```bash
# 1. dataset metadata + selection (both groups, same source TSV)
curl -sL -o cv_test.tsv "https://huggingface.co/datasets/fsicoli/common_voice_22_0/resolve/main/transcript/en/test.tsv"
python3 select_filipino.py        # -> selected_clips.json (18 clips, 12 speakers)
python3 select_control.py         # -> control_clips.json (18 clips, 18 speakers)

# 2. audio, streamed out of the single 706MB shard, no full download
python3 extract_tar.py selected_clips.json audio_raw extract_report.json
python3 extract_tar.py control_clips.json audio_raw_control control_extract_report.json
for f in audio_raw/*.mp3; do
  ffmpeg -y -i "$f" -ar 16000 -ac 1 -c:a pcm_s16le "audio_wav/$(basename "$f" .mp3).wav"
done
for f in audio_raw_control/*.mp3; do
  ffmpeg -y -i "$f" -ar 16000 -ac 1 -c:a pcm_s16le "audio_wav_control/$(basename "$f" .mp3).wav"
done

# 3. transcription (Node, real weights, no mocks)
cd node && npm install @huggingface/transformers wavefile
node transcribe.js                                          # Filipino set, fp32 (default pipeline dtype)
DTYPE=q8 node transcribe.js                                 # Filipino set, quantized (browser-realistic)
WAV_DIR=audio_wav_control CLIPS_JSON=control_clips.json \
  OUT_NAME=results_control.json node transcribe.js          # control set, fp32

# 4. WER + taxonomy
python3 analyze.py results.json taxonomy.json
python3 analyze.py results_control.json taxonomy_control.json
```

# We built the control group that broke our own hypothesis

*Draft for review — not posted anywhere yet.*

We set out to build a tool that shows Filipino-accented English speakers exactly what a browser speech model
heard when they talked to it. Not an accent score. Not a pronunciation grade. Just the model's own transcript,
with confidence, and a diff against what you meant to say. The pitch behind it was simple: ASR confidence was
never built to measure how "correct" someone's English is, so a tool that pretends otherwise is lying by
implication, even if every individual number in it is real.

Before writing a line of product code, we ran the measurement the pitch depended on: 18 real, CC0-licensed clips
of Filipino-accented English from Mozilla Common Voice, transcribed with the actual model family we planned to
ship (Whisper tiny.en and base.en, via transformers.js), scored with a real word-error-rate implementation we
wrote from scratch. 61% of clips had at least one error. That's frequent enough to be interesting, and the errors
weren't noise — they split cleanly into two buckets. Rare proper nouns the model has never seen (a Moldovan
surname, a Canadian First Nations place name) broke in both models, converging on the same wrong guesses. And one
ordinary word — "track" — turned into "truck" in three of four attempts, across two different speakers, in both
models.

That second bucket looked, for about a day, like our headline finding: a real, repeatable phonetic pattern. Then
we did the thing a construct-validity discipline is supposed to make you do even when you don't want to: we built
a control group. Same filters, same pipeline, same day — but 18 clips tagged as US-accented English instead.
And the "rare proper noun" bucket showed up there too. A nominally native English speaker misread an unfamiliar
Greek surname ("Vlachos") the same way our Filipino-tagged speakers misread unfamiliar names — same failure
shape, same wrong-guess pattern, different speaker population entirely. The bucket we were about to write up as
"the model struggles with this accent" turned out to be "the model struggles with any name it's never seen,"
full stop. If we'd shipped a tool that showed a Filipino speaker "the model heard X instead of Y" on a rare
surname without that context, we'd have been making an unearned claim — exactly the kind of thing an earlier,
now-abandoned concept on this project got cut for.

The "track" → "truck" confusion held up under the same scrutiny. It has no counterpart anywhere in the 18-clip
control set. That's the one finding in this whole probe we're willing to call a real, evidenced pattern — and we
built pitman so it can never blur that line again: every mismatch the tool shows is classified into exactly one
of those two buckets, or it says "no established pattern yet" and stops. That's not a copywriting choice. It's a
regression test (`packages/core/test/evidence-classes.test.ts`) that fails the build if the string "accent" ever
shows up in a live mismatch explanation.

Building the actual product surfaced two more findings in the same spirit — smaller, but the same discipline.
First: the quantized model we planned to ship — because quantized is what a real browser deployment actually
downloads, not the full-precision weights research demos quietly default to — turned out to be unable to even
construct an inference session on the CPU/WASM execution path, in the exact ONNX Runtime build this project is
pinned to. Not a quality problem. An outright crash, reproduced on both models, with a specific, verifiable error
in the ONNX graph's quantized decoder. WebGPU runs it fine. WASM — which is what every GPU-less CI runner and a
meaningful slice of real users get — silently can't, so we route it to the larger fp32 model instead, and the
model panel says so, every time, rather than pretending nothing happened.

Second: we wanted real per-word confidence, and it turns out the convenient high-level ASR API this whole
ecosystem is built on doesn't expose it. Its default decoder is deterministic (greedy search), and greedy search
doesn't need real probabilities to pick a token, so the library just hardcodes the "confidence" it would have
reported to zero. Getting an honest number meant one extra forward pass — feeding the model's own already-decided
transcript back through itself and reading what probability it would have assigned each word, after the fact.
That's not an estimate. It's the same arithmetic the model already did once; we just made sure the number wasn't
discarded on the way out. We checked it against real audio before shipping it: a wrong word the model was
*confident* about (the "truck" misfire, again) scored 96%. A model can be certain and wrong. That's the whole
thesis of this tool restated as one data point.

None of this changes the verdict from the original probe — VIABLE-INTERESTING, on the condition that the tool
never says more than the evidence supports. What changed is that we now have two more places where we caught
ourselves about to ship something less honest than the app's own premise, and fixed it before it shipped.

**Reproduce the core measurement:**

```bash
pnpm install
pnpm run unit    # packages/core: WER/alignment engine against the probe's own known-answer fixtures — 72/72 passing
pnpm run e2e:full  # full in-browser transcription of the 3 committed reference clips, WER reported live
```

Full probe methodology and every number: [`docs/batch2-asr-probe.md`](batch2-asr-probe.md). Every deviation this
build made from the original spec, and why: [`docs/DEVIATIONS.md`](DEVIATIONS.md).

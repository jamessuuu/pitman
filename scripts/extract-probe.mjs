#!/usr/bin/env node
/**
 * extract-probe: turn the committed probe document into a typed module the
 * app imports at BUILD time.
 *
 * Why this exists. Every number pitman shows about its own measurement used
 * to be hand-typed into a JSX table on a secondary route, which is two
 * failure modes at once: the page drifts from the artifact silently, and a
 * page that fetched the artifact at runtime could deploy green and render
 * empty. Parsing the artifact at build time removes both — the numbers are
 * in the bundle, and `--check` fails CI the moment the document and the
 * generated module disagree.
 *
 *   node scripts/extract-probe.mjs           # write the module
 *   node scripts/extract-probe.mjs --check   # fail if it would change
 *
 * Source of truth: docs/batch2-asr-probe.md (+ fixtures/reference.json for
 * the three clips shipped as playable audio). If the two ever disagree, the
 * documents win and this script is what proves it.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOC = path.join(ROOT, "docs", "batch2-asr-probe.md");
const REFERENCE = path.join(ROOT, "fixtures", "reference.json");
const OUT = path.join(ROOT, "apps", "web", "src", "data", "probe.generated.ts");

const doc = readFileSync(DOC, "utf-8");
const lines = doc.split(/\r?\n/);

/** Fail loudly. A silent fallback here would ship a page of blanks. */
function must(value, what) {
  if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
    throw new Error(`extract-probe: could not find ${what} in docs/batch2-asr-probe.md`);
  }
  return value;
}

/** Row cells of the first markdown table appearing at or after `fromLine`. */
function tableAfter(anchor, what) {
  const start = lines.findIndex((l) => l.includes(anchor));
  if (start === -1) throw new Error(`extract-probe: anchor not found: ${anchor}`);
  const rows = [];
  let seenHeader = false;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith("|")) {
      if (rows.length > 0 || seenHeader) break;
      continue;
    }
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) {
      seenHeader = true;
      continue;
    }
    if (!seenHeader) continue; // this is the header row itself
    rows.push(cells);
  }
  return must(rows, what);
}

const num = (s) => Number(String(s).replace(/[^0-9.+-]/g, ""));

// ---- §5 per-model distributions, both precisions ------------------------
function distTable(anchor, precision) {
  return tableAfter(anchor, `${precision} distribution table`).map((r) => ({
    model: r[0],
    precision,
    n: num(r[1]),
    mean: num(r[2]),
    median: num(r[3]),
    stdev: num(r[4]),
    min: num(r[5]),
    max: num(r[6]),
    p25: num(r[7]),
    p75: num(r[8]),
  }));
}
const fp32 = distTable("### fp32 (full precision", "fp32");
const q8 = distTable("### q8 (quantized", "q8");

// ---- §5 raw vs artifact-adjusted ---------------------------------------
const adjusted = tableAfter("### Artifact-adjusted", "artifact-adjusted table").map((r) => ({
  label: r[0],
  rawMean: num(r[1]),
  rawMedian: num(r[2]),
  adjustedMean: num(r[3]),
  adjustedMedian: num(r[4]),
  clipsAffected: r[5],
}));

// ---- §6 error taxonomy --------------------------------------------------
const taxonomy = tableAfter("### Tag counts", "taxonomy tag counts").map((r) => ({
  // The document indents sub-categories with an em dash; keep that structure
  // so the page can render them as children rather than as nine flat rows.
  category: r[0].replace(/^—\s*/, ""),
  isSub: r[0].startsWith("—"),
  tiny: num(r[1]),
  base: num(r[2]),
}));

// ---- §7 the ten example pairs — the most persuasive asset in the repo ---
const examples = tableAfter("## 7. Ten real example pairs", "the ten example pairs").map((r) => ({
  wer: num(r[0]),
  reference: r[1],
  heard: r[2],
}));

// ---- §8 control group ---------------------------------------------------
const controlHeadline = tableAfter("### Headline numbers (fp32", "control headline table").map((r) => ({
  model: r[0],
  filipinoMean: num(r[1]),
  controlMean: num(r[2]),
  absoluteDelta: num(r[3]),
  relativeDelta: r[4],
  filipinoMedian: num(r[5]),
  controlMedian: num(r[6]),
}));

// The bucket and error-op tables follow the headline table directly; find
// them by their own distinctive header cells rather than by position.
function tableWithHeader(match, what) {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith("|") && match.test(lines[i])) {
      return tableAfter(lines[i], what);
    }
  }
  throw new Error(`extract-probe: no table header matching ${match} (${what})`);
}
const controlBuckets = tableWithHeader(/Filipino buckets/, "control bucket table").map((r) => ({
  model: r[0],
  filipino: r[1].split("/").map((s) => num(s)),
  control: r[2].split("/").map((s) => num(s)),
}));
const controlErrorOps = tableWithHeader(/total error-ops/, "control error-op table").map((r) => ({
  model: r[0],
  filipino: num(r[1]),
  control: num(r[2]),
}));

// ---- headline counts, read out of the prose rather than retyped ---------
const perfectMatch = must(
  doc.match(/\*\*(\d+)\/(\d+) clips \((\d+)%\) are perfect, WER = 0\*\*/),
  "the '7/18 clips are perfect' sentence",
);
const withErrorMatch = must(doc.match(/(\d+)\/(\d+) clips \((\d+)%\)\s*\n?\s*contain at least one real error/), "the '11/18 contain an error' sentence");
const bucketMatch = must(
  doc.match(/Bucketed \(fp32 tiny\.en\):\s*\n?(\d+) perfect, (\d+) "good"[^,]*, (\d+) "moderate"[^,]*, (\d+) "bad"/),
  "the fp32 tiny.en bucket breakdown",
);
const speakersMatch = must(doc.match(/\*\*Result: (\d+) clips from (\d+) unique speakers\.\*\*/), "the dataset size sentence");
const audioMatch = must(
  doc.match(/(\d+) clips, ([\d.]+) seconds of audio total, mean\s+([\d.]+)s\/clip/),
  "the audio duration sentence",
);
const verdictMatch = must(doc.match(/\*\*Verdict: ([A-Z-]+)/), "the verdict");
const dateMatch = must(doc.match(/^Date: ([\d-]+)\./m), "the probe date");

// ---- the class-B finding, stated exactly as the document states it ------
// The old /method page said "recurs in 3 of the 4 clip×model combinations".
// The document says it is mis-transcribed in EVERY one of the 4, and that 3
// of those 4 land on the identical wrong word. Extracting both numbers is
// what stops that drift from happening a second time.
const classB = {
  combinations: num(must(doc.match(/in \*\*every one of the (\d+) clip×model combinations\*\*/), "class-B combination count")[1]),
  convergent: num(must(doc.match(/\*\*(\d+) of those 4\*\* land on the exact\s*\n?\s*same wrong word/), "class-B convergence count")[1]),
  speakers: 2,
  ref: "track",
  hyp: "truck",
};

const reference = JSON.parse(readFileSync(REFERENCE, "utf-8"));

const payload = {
  source: "docs/batch2-asr-probe.md",
  probeDate: dateMatch[1],
  verdict: verdictMatch[1],
  dataset: {
    clips: num(speakersMatch[1]),
    speakers: num(speakersMatch[2]),
    controlClips: 18,
    controlSpeakers: 18,
    audioSeconds: num(audioMatch[2]),
    meanClipSeconds: num(audioMatch[3]),
    corpus: "Mozilla Common Voice English v22.0",
    license: "CC0-1.0",
    measuredWith: reference.provenance.measuredWith,
  },
  headline: {
    perfect: num(perfectMatch[1]),
    total: num(perfectMatch[2]),
    perfectPct: num(perfectMatch[3]),
    withError: num(withErrorMatch[1]),
    withErrorPct: num(withErrorMatch[3]),
  },
  buckets: {
    perfect: num(bucketMatch[1]),
    good: num(bucketMatch[2]),
    moderate: num(bucketMatch[3]),
    bad: num(bucketMatch[4]),
  },
  distributions: [...fp32, ...q8],
  adjusted,
  taxonomy,
  examples,
  control: { headline: controlHeadline, buckets: controlBuckets, errorOps: controlErrorOps },
  classB,
  clips: reference.clips,
  clipProvenance: reference.provenance,
};

// ---- sanity gates: a parse that half-worked must not ship silently ------
const assertions = [
  [payload.examples.length === 10, `expected 10 example pairs, parsed ${payload.examples.length}`],
  [payload.distributions.length === 4, `expected 4 distribution rows, parsed ${payload.distributions.length}`],
  [payload.adjusted.length === 4, `expected 4 adjusted rows, parsed ${payload.adjusted.length}`],
  [payload.control.headline.length === 2, `expected 2 control rows, parsed ${payload.control.headline.length}`],
  [payload.taxonomy.length >= 8, `expected >=8 taxonomy rows, parsed ${payload.taxonomy.length}`],
  [payload.clips.length === 3, `expected 3 fixture clips, got ${payload.clips.length}`],
  [
    payload.buckets.perfect + payload.buckets.good + payload.buckets.moderate + payload.buckets.bad === payload.headline.total,
    "bucket counts do not sum to the clip total",
  ],
  [payload.headline.perfect + payload.headline.withError === payload.headline.total, "perfect + with-error != total"],
  [payload.examples.every((e) => e.reference.length > 0 && e.heard.length > 0), "an example pair has an empty side"],
];
for (const [ok, message] of assertions) {
  if (!ok) throw new Error(`extract-probe: ${message}`);
}

const banner = `// GENERATED by scripts/extract-probe.mjs — do not edit by hand.
// Source: docs/batch2-asr-probe.md + fixtures/reference.json.
// Regenerate with \`pnpm run probe\`; \`pnpm run probe:check\` fails CI on drift.
// Parsed at build time so these numbers are in the bundle: a page that fetched
// its own evidence could deploy green and render nothing.
`;
const body = `${banner}
export interface ProbeExample { wer: number; reference: string; heard: string }
export interface Distribution {
  model: string; precision: string; n: number; mean: number; median: number;
  stdev: number; min: number; max: number; p25: number; p75: number;
}
export interface ProbeRun { hypothesis: string; wer: number; substitutions: number; deletions: number; insertions: number }
export interface FixtureClip {
  id: string; file: string; reference: string; refWordCount: number;
  evidenceClass: "none" | "A" | "B"; note: string;
  probe: { "tiny.en": { fp32: ProbeRun; q8: ProbeRun }; "base.en": { fp32: ProbeRun; q8: ProbeRun } };
}

export const probe = ${JSON.stringify(payload, null, 2)} as const;

export type Probe = typeof probe;
`;

if (process.argv.includes("--check")) {
  if (!existsSync(OUT)) {
    console.error("extract-probe --check: generated module is missing. Run `pnpm run probe`.");
    process.exit(1);
  }
  if (readFileSync(OUT, "utf-8") !== body) {
    console.error("extract-probe --check: apps/web/src/data/probe.generated.ts is stale.");
    console.error("The probe document changed and the page did not. Run `pnpm run probe`.");
    process.exit(1);
  }
  console.log(`extract-probe --check: in sync (${payload.examples.length} pairs, ${payload.distributions.length} distributions).`);
  process.exit(0);
}

// The three probe clips ship as playable audio so the page's worked example
// is the real recording, not a description of one. 137 KiB total, already
// committed under fixtures/ — copied rather than duplicated in the repo.
const AUDIO_OUT = path.join(ROOT, "apps", "web", "public", "fixtures");
mkdirSync(AUDIO_OUT, { recursive: true });
let copiedBytes = 0;
for (const clip of payload.clips) {
  const from = path.join(ROOT, "fixtures", "audio", clip.file);
  if (!existsSync(from)) throw new Error(`extract-probe: fixture audio missing: ${from}`);
  copyFileSync(from, path.join(AUDIO_OUT, clip.file));
  copiedBytes += statSync(from).size;
}

writeFileSync(OUT, body);
console.log(`extract-probe: copied ${payload.clips.length} fixture clips (${(copiedBytes / 1024).toFixed(1)} KiB) into apps/web/public/fixtures/`);
console.log(
  `extract-probe: wrote ${path.relative(ROOT, OUT)} — ` +
    `${payload.examples.length} example pairs, ${payload.distributions.length} distributions, ` +
    `${payload.control.headline.length} control rows, ${payload.clips.length} clips.`,
);

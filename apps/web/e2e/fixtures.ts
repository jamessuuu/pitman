// Shared fixture-clip data loader for e2e specs. Reads fixtures/reference.json
// directly from disk (not a bundled import) so the Playwright Node-side test
// runner never needs to resolve it through the browser bundler.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const FIXTURES_DIR = path.resolve(here, "..", "..", "..", "fixtures");

export interface ProbeRun {
  hypothesis: string;
  wer: number;
  substitutions: number;
  deletions: number;
  insertions: number;
}

export interface FixtureClip {
  id: string;
  file: string;
  reference: string;
  refWordCount: number;
  evidenceClass: "none" | "A" | "B";
  note: string;
  probe: {
    "tiny.en": { fp32: ProbeRun; q8: ProbeRun };
    "base.en": { fp32: ProbeRun; q8: ProbeRun };
  };
}

export interface ReferenceData {
  provenance: Record<string, string>;
  clips: FixtureClip[];
}

export function loadReferenceData(): ReferenceData {
  const raw = readFileSync(path.join(FIXTURES_DIR, "reference.json"), "utf-8");
  return JSON.parse(raw) as ReferenceData;
}

export function clipPath(clip: FixtureClip): string {
  return path.join(FIXTURES_DIR, "audio", clip.file);
}

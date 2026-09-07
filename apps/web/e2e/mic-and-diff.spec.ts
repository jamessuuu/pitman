// D3 (docs/pitman-SPEC.md): mic-denied/no-mic must land on a fully
// functional file-drop path, never a dead end.
//
// A full "deny the permission prompt" flow needs Chromium fake-device
// flags (--use-fake-device-for-media-stream / --use-fake-ui-for-media-
// stream) to be deterministic in headless CI, and even then Chromium's
// auto-answer behavior for a *denied* prompt varies by flag combination —
// fragile enough that the spec's own verification plan explicitly allows
// "env-gate with reason if not [supported by the runner]" for this exact
// case. This suite instead asserts the STRUCTURAL guarantee (the actual
// D3 requirement): file-drop is never gated behind mic state, because the
// Dropzone always renders unconditionally (src/pages/Listen.tsx) and is
// never disabled by mic status (src/lib/use-mic-recorder.ts only affects
// its own status text). The mic-permission-timeout recovery itself
// (getUserMedia() hanging forever when the prompt goes unanswered — a
// real failure mode found via manual verification, mcp__agent-browser,
// docs/DEVIATIONS.md) was manually verified: the mic button recovers to
// an actionable "timeout" state after 15s with the dropzone still fully
// enabled throughout, rather than automated here.
import { test, expect } from "@playwright/test";
import { loadReferenceData, clipPath } from "./fixtures";

const reference = loadReferenceData();
const clip187059 = reference.clips.find((c) => c.id === "common_voice_en_187059")!;
const clip187061 = reference.clips.find((c) => c.id === "common_voice_en_187061")!;

// Model load + real network download can be slow on a cold cache (matches transcribe.spec.ts).
test.setTimeout(120_000);

test.describe("D3 — mic is additive, file-drop never gated @smoke", () => {
  test("mic button and file-drop both render on load, independent of mic state", async ({ page }) => {
    await page.goto("/");
    // Assert the affordance a person can actually SEE, not the input element.
    // The real <input type="file"> is a transparent full-size overlay on the
    // styled label (src/components/Dropzone.tsx), so asserting `toBeVisible`
    // on the input would pass on a technicality — Playwright ignores opacity —
    // while telling us nothing about whether the control is on screen. The
    // label is the thing D3 actually promises is never gated behind mic state.
    await expect(page.getByTestId("file-control")).toBeVisible();
    await expect(page.getByTestId("file-input")).toBeEnabled();
    await expect(page.getByRole("button", { name: "Record a clip" })).toBeVisible();
  });

  test("file-drop transcription works without ever touching the mic control", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("file-input").setInputFiles(clipPath(clip187059));
    await expect(page.getByTestId("asr-status")).toHaveText("Done.", { timeout: 100_000 });
    await expect(page.getByTestId("transcript")).toContainText("Young boy running outside on the pavement.");
  });
});

test.describe("diff view (S/D/I alignment against what the user meant to say) @smoke", () => {
  test("typing a meant-to-say sentence renders a classified diff, never mentioning accent", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("file-input").setInputFiles(clipPath(clip187061));
    await expect(page.getByTestId("asr-status")).toHaveText("Done.", { timeout: 100_000 });

    await page.getByTestId("meant-input").fill(clip187061.reference);
    const diff = page.getByTestId("diff-result");
    await expect(diff).toBeVisible();

    const diffText = await diff.innerText();
    expect(diffText.toLowerCase()).not.toContain("accent");
  });
});

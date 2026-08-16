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

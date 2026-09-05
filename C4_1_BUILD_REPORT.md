# C4.1 — Pattern & Teaching Clarity Build Report

## Goal
Remove ambiguity between the pattern required by the current exercise and later transfer/orchestration ideas.

## Implemented
- Guided Practice now labels the active exercise sticking as **Required Pattern — Play this now**.
- Counting is labeled as the subdivision/counting method for the required pattern.
- Entry/exit cards use **Required Pattern** instead of **Vocabulary Fill** for non-fill challenges.
- Transfer accent maps and orchestration are separated into a clearly labeled transfer layer.
- Canonical timing foundations no longer receive generic spatial-transfer models.
- `time-quarter-pulse` now resolves to `R R R R`; eighth-subdivision and 4/4 foundation fallbacks are also explicit.
- Placement exercises derive sticking/counting/subdivision from canonical teaching definitions when available.
- Quarter-Note Pulse one-beat placement uses one quarter-note target stroke rather than the previous generic `R L K` fallback.
- Quarter-Note Pulse warm-up and calibration remain quarter-note based rather than silently switching to eighth/sixteenth patterns.
- Quarter-Note Pulse placement language now says pulse/target stroke instead of incorrectly describing the skill as a fill.
- Spatial transfer generation is restricted to rudiments, fills, coordination and dynamics.

## Progression integrity
No C4 readiness, verification, certification, evidence, C3.3 mission, or curriculum prerequisite rules were changed. Existing localStorage progress remains compatible.

## API
`/api/health` reports `apiVersion: c4.1`.

## Validation
- TypeScript compiler parsing completed; only expected missing dependency/type errors occur because node_modules is unavailable in this build environment.
- No new non-dependency TypeScript diagnostics were detected.
- Relative import validation: performed before packaging.
- Vercel API route conflict check: only `.js` route files retained.
- ZIP integrity: checked after packaging.

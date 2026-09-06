# C5 BUILD REPORT — Verified Placement & Profile Calibration

## Objective
Close the gap between self-reported/estimated level and practical placement while preserving C4 canonical progression integrity.

## Implemented
- Added explicit `selfReportedLevel` and optional `yearsPlaying` fields to Learner Profile.
- Profile estimate is now clearly non-certifying and is only used to select an appropriate placement target.
- Replaced monolithic placement battery behavior with staged calibration:
  - Foundation Gate: 4 Beginner anchors
  - Intermediate Confirmation: 3 Intermediate anchors
  - Advanced Confirmation: 3 Advanced anchors
- Placement results are merged by test ID and persisted after every test, so partial batteries survive closing/reloading.
- Failed anchors can be retried without erasing prior passes.
- Existing C4 canonical verification of the exact anchor competency also satisfies that placement anchor, preventing duplicate proof.
- Overall placement status now has three explicit states: Not Tested, Calibrating, Verified.
- Path now shows Foundation / Intermediate / Advanced anchor progress separately.
- Per-strand badges show UNVERIFIED until that strand has practical anchor evidence rather than defaulting every strand to Beginner.
- Placement does not bypass canonical curriculum order; it only writes verification for the exact competency attached to a passed anchor.
- Placement test modal now shows required equipment and meter.
- Removed early `Finish & Grade`; the complete timed run is required before the self-check rubric unlocks.
- Corrected placement metronome parameter order so stated BPM is the actual click tempo.
- Corrected the 6/8 anchor to two dotted-quarter pulses per bar.
- API version bumped to `c5.0`.

## Migration / persistence
- Existing C4.2 learner profile, skill evidence, canonical verifications, C3.3 mission evidence and advancement history are preserved.
- Existing placement assessment storage is reconciled to version 2 on read rather than deleted.
- Existing profiles without `selfReportedLevel` inherit the current Intermediate default estimate and can edit it in Profile.

## Validation performed
- TypeScript syntax parse: 59 TS/TSX files, 0 syntax errors.
- Core placement engine type compilation: passed with TypeScript 5.8.3.
- Relative import scan: 0 missing relative imports.
- Vercel API JavaScript syntax checks: passed.
- Placement logic simulation:
  - Intermediate estimate starts at Foundation Gate 0/4.
  - Existing Quarter-Note canonical verification marks placement as Calibrating but does not falsely satisfy the 8th-note placement anchor.
  - One Foundation anchor persists and leaves only the remaining three.
  - 4/4 Foundation completion advances to Intermediate Confirmation with exactly three remaining tests.
  - 4/4 + Intermediate anchors complete yields Intermediate Verified.
- Full `npm install` was attempted but timed out in this environment, so Vercel remains the final production bundle check.

## Deployment smoke test
After deployment `/api/health` should report `apiVersion: "c5.0"`.

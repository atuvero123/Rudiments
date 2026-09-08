# C7.14 — Canonical Verification Transport Authority

## Why this build exists
The Groove Stability & Pocket readiness gate correctly reached READY TO VERIFY, but the formal standard exposed a transport contradiction:

- Canonical requirement: 16 bars in 4/4 at 75 BPM
- Legacy verifier duration: 48 seconds
- Correct duration: 16 × 4 × 60 / 75 = **51.2 seconds**

A certification test must not be allowed to finish because a stale wall-clock value expires before the authored musical structure is complete.

## Changes

### 1. Added one canonical verification transport authority
New `src/lib/verificationTransportEngine.ts` derives verification transport from the canonical curriculum competency.

For simple bar-based standards it derives:
- canonical BPM
- required bars
- metronome pulses per bar
- total required pulses
- exact implied duration

Teaching definitions now provide musical rendering metadata; they no longer outrank the canonical curriculum for verification BPM/length.

### 2. Bar-based verification now ends by musical structure, not timer expiry
`CompetencyVerificationModal` now counts required metronome pulses/bars for bar-governed tests.

For Groove Stability & Pocket:
- 16 bars
- 4 quarter-note pulses per bar
- 64 required pulses
- 75 BPM
- 51.2 seconds implied duration

The result screen is scheduled only after the 64th pulse receives its full pulse duration. A 48-second wall clock cannot end the test early.

### 3. Formal verification UI now exposes the governed length
Bar-based tests display:
- authored bar count
- approximate derived duration
- live `BAR n / total` progress

The progress bar for these tests is also driven by required pulses, not elapsed seconds.

### 4. Canonical standard now controls readiness/outcome metadata
`competencyAdvancementEngine` now obtains BPM, standard wording, and required duration from the canonical verification transport.

Checkpoint audit text distinguishes:
- bar-governed verification
- ordinary timed verification

### 5. Learning and readiness surfaces use the same authority
Updated runtime surfaces now use the canonical transport when showing the formal target:
- Understand stage Verification Goal
- C4 Advancement Readiness card
- Curriculum Progress Overview
- Today formal verification CTA

### 6. Groove legacy mirror corrected
The older teaching-definition mirror for Groove Stability was changed from 48s to 51.2s so no remaining direct consumer can display the old contradictory value.

### 7. Compound-meter transport prepared correctly
When the canonical BPM is explicitly a dotted-quarter/compound pulse, the transport derives macro-pulses rather than incorrectly treating every eighth note as one BPM pulse.

Example validation:
- 6/8, 16 bars, 60 dotted-quarter BPM -> 2 pulses/bar -> 32 seconds

## Files changed
- `src/lib/verificationTransportEngine.ts` (new)
- `src/lib/competencyAdvancementEngine.ts`
- `src/lib/teachingDefinitions.ts`
- `src/components/CompetencyVerificationModal.tsx`
- `src/components/UnderstandStageView.tsx`
- `src/components/AdvancementReadinessCard.tsx`
- `src/components/CurriculumProgressOverview.tsx`
- `src/components/TodayPracticeView.tsx`
- `C7_14_BUILD_REPORT.md`

## Validation performed

### Pure TypeScript compile
Compiled the canonical curriculum, pedagogy definitions and verification transport engine successfully with TypeScript 5.8.

### Transport checks
Confirmed:
- Understanding 4/4 Bar Structure -> 16 bars @ 80 BPM -> 64 pulses -> 48.0s
- Drum Notation Basics -> 8 bars @ 70 BPM -> 32 pulses -> ~27.4s, bar-governed
- Groove Stability & Pocket -> 16 bars @ 75 BPM -> 64 pulses -> **51.2s**
- 6/8 Compound Meter -> 16 bars @ 60 dotted-quarter BPM -> 32 macro-pulses -> 32.0s

### Changed TS/TSX syntax check
Focused TypeScript parsing of all changed TS/TSX files produced no diagnostics after excluding expected missing dependency/module-resolution errors from the dependency-less source package.

### Full Vite dependency build
`npm install` was attempted but timed out in the container before dependencies were installed, so a full Vite build could not be run here. No package dependencies were changed.

## Expected manual verification after deploy
For Groove Stability & Pocket, the verification modal should now show:
- 75 BPM
- 16 bars
- approximately 51.2 seconds
- 4/4

After the count-in, the live header should advance `BAR 1 / 16` through `BAR 16 / 16`. The self-check must not appear before the final pulse of Bar 16 has completed.

# C7.15 — Canonical Phrase Transport UI

## Why this build exists
C7.14 established canonical bar/pulse completion, but the deployed verification screenshots still presented the formal run as a duration countdown. For a bar-authored certification test, the drummer must be able to see the musical phrase position directly and the UI must not imply that wall-clock time is the governing completion rule.

C7.15 makes the canonical phrase transport unmistakable and derives every bar-progress surface from the same pulse counter that governs completion.

## Changes

### 1. One phrase-position authority
Added `deriveVerificationTransportPosition()` to `src/lib/verificationTransportEngine.ts`.

For a bar-governed test it derives, from emitted canonical pulses only:
- current 1-based bar
- current 1-based pulse within the bar
- completed canonical pulse count
- phrase progress percentage
- completion state

This prevents the bar label, progress rail, and completion rule from calculating progress independently.

### 2. Prominent live canonical phrase transport
`CompetencyVerificationModal` now displays a dedicated **CANONICAL PHRASE TRANSPORT** panel for every bar-governed verification.

For Groove Stability & Pocket the live panel shows:
- `BAR n / 16`
- `Current pulse n / 4`
- a 16-segment bar rail
- `x / 64 canonical pulses`
- `51.2s derived only`

The derived duration is deliberately secondary information. It is not a countdown and does not control completion.

### 3. Formal-start card now says Bars, not Duration
For bar-governed tests, the middle verification summary card now uses **BARS** and displays the authored bar requirement. The derived duration appears only as secondary text.

Expected Groove Stability presentation:
- Tempo: 75 BPM
- Bars: 16 bars
- secondary: 51.2s derived
- Meter: 4/4

### 4. Count-in announces phrase ownership
After count-in the UI explicitly transitions into `BAR 1 / total` rather than describing the run as a verification clock.

### 5. Bar-governed progress has no wall-clock progress bar
The old generic elapsed-time progress bar is now rendered only for truly seconds-governed tests. Bar-governed tests use the canonical segmented phrase rail and pulse-derived progress exclusively.

### 6. Sight-reading also receives bar position
Notation verification keeps the staff as the performance instruction, but its live header now also identifies the current bar (`BAR n / 8 · SIGHT-READ`) so the bar transport remains explicit across all bar-governed formal tests.

### 7. Canonical completion wording retained
The self-check state continues to use authored musical completion wording such as:
- `Required 16-bar run completed.`
- `Required 8-bar chart completed.`

A bar-governed test should never report merely `Required timed run completed.`

## Files changed
- `src/lib/verificationTransportEngine.ts`
- `src/components/CompetencyVerificationModal.tsx`
- `C7_15_BUILD_REPORT.md`

## Validation performed

### Pure TypeScript compile
`verificationTransportEngine.ts` compiles successfully with TypeScript 5.8.

### Focused TSX syntax validation
Focused TypeScript parsing of the changed modal produced no syntax/type-structure diagnostics. The only reported diagnostics were the expected missing local React/lucide packages in the dependency-less source package.

### Canonical position checks
Validated Groove Stability & Pocket:
- 16 bars @ 75 BPM
- 4 canonical pulses/bar
- 64 total canonical pulses
- derived duration 51.2s
- pulse 1 -> Bar 1 / Pulse 1
- pulse 4 -> Bar 1 / Pulse 4
- pulse 5 -> Bar 2 / Pulse 1
- pulse 64 -> Bar 16 / Pulse 4 / 100%

Also validated:
- Understanding 4/4 Bar Structure -> 16 bars, 64 pulses, 48.0s
- Drum Notation Basics -> 8 bars, 32 pulses, ~27.4s

## Deployment note
The C7.14 screenshots showed the new 51.2-second canonical value but the old countdown-style verifier, which means the deployed `CompetencyVerificationModal.tsx` did not reflect the full C7.14 modal change. C7.15 therefore ships the complete modal file again, plus the transport authority it depends on.

## Expected manual acceptance after deploy
Open Groove Stability & Pocket -> Run Verification.

Before starting, confirm the middle summary card reads **Bars — 16 bars** (with `51.2s derived` secondary), not `Duration — 51.2s`.

After count-in, confirm:
1. A visible `CANONICAL PHRASE TRANSPORT` panel appears.
2. It begins at `BAR 1 / 16`.
3. Pulse advances 1 -> 2 -> 3 -> 4 within each bar.
4. The next downbeat advances to `BAR 2 / 16`.
5. The segmented rail advances with the phrase.
6. No seconds countdown is used as the primary progress indicator.
7. The result screen cannot appear before Bar 16 Pulse 4 receives its full pulse duration.
8. The self-check says `Required 16-bar run completed.`

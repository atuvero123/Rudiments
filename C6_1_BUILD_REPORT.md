# C6.1 BUILD REPORT — Curriculum Purity & Structure-Teaching Fix

## Why this patch exists
Production screenshots validated the C6 bar/beat visualizer and governed mission flow, but also exposed residual assumptions from the older groove/fill placement trainer inside the 4/4 Bar Structure lesson. Those assumptions were pedagogically wrong for a concept-focused competency.

## Production issues observed
- The WATCH demo could show `LAND CRASH`, `FILL NOW`, and `RECOVER` language even though the mission was only teaching bar structure.
- Stage 6 could ask for `Beat 1 Landing Resolution` and surface `Lost the groove after the fill` as a friction tag.
- The static reference still called the four beats a sticking reference rather than a bar/pulse reference.
- `Either` equipment was rendered as `Full Kit` in Stage 1.
- C6 structure exercises could write generic one-beat-fill placement evidence because the shared tutor defaulted unknown placement metadata to a fill model.

## C6.1 corrections
- Re-authored `comp-meter-44` as a neutral steady-pulse competency:
  - one relaxed quarter-note pulse per beat;
  - Beat 1 is a bar-start landmark, not a crash landing;
  - no groove/fill choreography;
  - structure-specific mistakes and diagnostics only.
- Added a structure-mission mode to `VisualRhythmTutor`:
  - transport cues now say `BAR X — BEAT Y`;
  - Beat 1 is labelled as a bar start;
  - no `FILL NOW`, `LAND CRASH`, or recovery language in C6 structure missions;
  - static visual reference is labelled as bar/beat pulse information rather than sticking;
  - follow-cue and independent self-checks now test barline, bar-number, pulse, and phrase-group awareness.
- Prevented C6 bar-structure missions from writing fake `one_beat_fill` placement evidence into the placement ledger.
- Corrected Stage 1 equipment display so `Either` renders as `Pad or Kit`.
- API health version bumped to `c6.1` for deployment identification.

## What remains unchanged
- Existing placement calibration and verified Intermediate placement data.
- Canonical curriculum order and competency locks.
- C6 evidence ledger and C4 formal verification authority.
- Mission sequence, tempos, phrase visualizer, adaptive progression, and persistence keys.
- Fill-specific language remains available for real fill/transition competencies where it is appropriate.

## Validation performed in this environment
- TypeScript compiler parse/type pass was run; only expected missing-package errors were present because npm dependency installation timed out in this sandbox.
- No additional TypeScript errors remained after filtering missing dependency/runtime type errors.
- Vercel API JavaScript syntax remains valid.
- Diff scope is limited to four runtime source files plus this report.

## Production validation after deploy
1. `/api/health` should report `apiVersion: "c6.1"`.
2. Open Path → Understanding 4/4 Bar Structure → Practice This Competency.
3. In Stage 1, equipment should read `Pad or Kit` and the audio should be a simple steady pulse with a Beat-1 accent, not crash/fill choreography.
4. In WATCH, the pulse grid should label Beat 1 as `BAR n START` and the other beats as `PULSE`.
5. No `FILL NOW`, `LAND CRASH`, `RECOVER`, or `Lost the groove after the fill` text should appear anywhere in this competency.
6. Stage 6 should show only structure-relevant friction choices: bar number, beat 4, barline, and pulse.
7. Completing the mission should still update the C6 Curriculum Evidence Ledger without changing formal competency verification automatically.

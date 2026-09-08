# C7.13 — Groove Long-Form Integrity & Musical-Transfer Fidelity

## Why this build exists
The first fresh Groove Stability & Pocket journey proved that the canonical stage governance is working (Understand → Count → Watch → Follow → Independent → Musical Application), but the screenshots exposed three integrity gaps:

1. Mission 5 said to sustain the groove for 16 bars while its governed structure was only 8 bars.
2. Mission 6 showed a 16-bar curriculum visualizer, while the master transport still used the shorter generic teaching loop and displayed a 2-bar phrase cycle.
3. “Serve the Song” asked the learner to respond to section dynamics, but no Verse/Chorus responsibilities existed, so musical-application evidence could be earned by repeating the same technical groove.

There was also a UX mismatch: groove missions used the generic “How did the phrase feel?” evaluation copy even for conceptual/listening stages.

## Changes

### 1. Canonical mission length now governs the master transport
`VisualRhythmTutor` expands the canonical teaching event template across each mission's authored structure, not only the 4/4 bar-structure competency.

- Mission 1 Groove Stability: 2 bars
- Mission 2: 4 bars
- Mission 3: 4 bars
- Mission 4: 8 bars
- Mission 5: **16 bars**
- Mission 6: **16 bars**

Long 8/16-bar canonical missions default to a single complete pass before evaluation so a 16-bar assignment is not accidentally doubled to 32 bars by the old 2x default.

### 2. Mission 6 is now a real song-form transfer task
Groove Stability Mission 6 now carries a 16-bar form:

- Bars 1–4: VERSE — controlled / restrained
- Bars 5–8: CHORUS — lift energy without speeding up
- Bars 9–12: VERSE RETURN — settle the volume without losing pulse
- Bars 13–16: FINAL CHORUS — lift again and finish without rushing

The active section responsibility is shown both in the curriculum structure visualizer and inside the main musical-practice panel while the learner plays.

### 3. Canonical criterion wording corrected
The Groove Stability musical criterion no longer says “identical limb volumes” while also asking for dynamic section changes. It now requires consistent limb balance and micro-timing across 16 bars while allowing controlled section-level dynamics.

### 4. Groove evaluation copy is stage-aware
Stage 6 now asks a question that matches what the mission actually taught:

- Mission 1: limb-map understanding
- Mission 2: counting + coordination
- Mission 3: pocket listening
- Mission 4: reduced-cue groove stability
- Mission 5: independent pocket stability
- Mission 6: song-form transfer / dynamic responsibility

### 5. Integrity migration without relearning Missions 1–4
Old Groove Stability Mission 5/6 evidence created before the corrected long-form transport is quarantined from C7/C4 readiness. Valid Missions 1–4 remain banked.

When those earlier stages are already complete, Path and Today's Practice show a **Corrected Long-Form Continuation** containing only the missing corrected Mission 5 and/or Mission 6. The learner does not restart the whole journey.

Migration boundary: `2026-09-08T09:00:00Z` for `comp-grv-stability` Missions 5–6 only.

### 6. Domain terminology cleanup
The bottom “Required Pattern” helper now calls groove material a **limb/voice map**, rudiments a **sticking pattern**, and coordination material a **limb sequence** instead of using one generic “limb/sticking pattern” label everywhere.

## Files changed
- `src/types.ts`
- `src/data/canonicalCurriculum.ts`
- `src/lib/curriculumPracticeIntelligence.ts`
- `src/lib/todayPracticeEngine.ts`
- `src/components/VisualRhythmTutor.tsx`
- `src/components/CurriculumPhraseVisualizer.tsx`
- `src/components/EvaluateStageView.tsx`
- `src/components/GuidedPracticeSession.tsx`
- `src/components/PathView.tsx`

## Validation performed

### TypeScript — pure curriculum/evidence engines
Passed focused `tsc --noEmit` compilation for:
- types
- canonical curriculum
- curriculum pedagogy
- curriculum practice intelligence
- competency advancement
- Today's Practice routing

### TSX syntax validation
The changed TSX files were parsed with TypeScript using `--noResolve`; after excluding expected missing-module diagnostics (dependencies are not installed in the package), there were no syntax diagnostics.

### Runtime logic checks
Using compiled curriculum/evidence modules with mocked localStorage:
- Old pre-C7.13 Groove Stability Mission 5/6 records are filtered while Missions 1–4 remain.
- Ledger falls to 3/6 rather than accepting invalid long-form evidence.
- `needsC7GrooveIntegrityContinuation()` returns true.
- Continuation initially contains Missions `[5, 6]`, both at 16 bars.
- After a corrected Mission 5 record, continuation contains only Mission `[6]`.
- After corrected Mission 5 + 6 records, continuation is no longer required.

### Transport structure simulation
For Groove Stability:
- Mission 5 → 16-bar timeline, 128 teaching events, last event in Bar 16.
- Mission 6 → 16-bar timeline, 128 teaching events, with Verse/Chorus section metadata.

### Full dependency build
A full `npm install` / Vite build could not be completed in the container because dependency installation timed out. No dependencies were changed.

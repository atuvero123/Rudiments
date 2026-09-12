# C7.17 — Canonical Fill Orchestration Integrity

## Purpose
C7.17 fixes a pedagogical integrity gap exposed while testing **Eighth-Note Descending Fills**. The progression/evidence engine was functioning, but the learner-facing pattern could collapse to hand sticking only (`R L R L R L R L`) and therefore did not preserve the required drum-surface path during reduced/independent practice or verification.

## Canonical Eighth-Note Fill
The competency now has one explicit eight-stroke descending orchestration:

- Beat 1: Snare — R L
- Beat 2: High Tom — R L
- Beat 3: Floor Tom — R L
- Beat 4: Floor Tom — R L
- Next Beat 1: Crash + Kick landing

Count: `1 & 2 & 3 & 4 & -> [CRASH 1]`

The machine-readable sticking remains `R L R L R L R L` so existing placement and progression code that tokenizes sticking is not broken. Surface orchestration is carried by the authored teaching events and `limbPattern`.

## Changes

### `src/lib/teachingDefinitions.ts`
- Corrected the Eighth-Note Descending Fill event map from the inconsistent 4-snare / 2-high / 2-floor distribution to the canonical 2-snare / 2-high / 4-floor descent.
- Added explicit hand + surface descriptions for every stroke.
- Updated the limb pattern and pedagogical explanations so the crash/kick landing is part of the performance requirement.

### `src/data/canonicalCurriculum.ts`
- Corrected the previously incomplete requirement (`2 snare + 2 high + 2 floor`) which accounted for only six eighth notes.
- Canonical requirement now states 2 Snare + 2 High Tom + 4 Floor Tom + next-bar Crash/Kick.

### `src/components/UnderstandStageView.tsx`
- Fill Stage 1 now renders only one authored fill cycle even when the transport definition has been expanded to multiple mission bars.
- Each fill stroke visibly retains its drum surface (`SNARE`, `HIGH TOM`, `FLOOR TOM`).
- The summary beneath the event map uses the canonical fill orchestration rather than hand sticking alone.

### `src/components/VisualRhythmTutor.tsx`
- Fill Watch / Follow / Independent memory chips now derive from the canonical authored events rather than splitting the sticking string.
- Every independent stroke therefore continues to show both hand and required surface after tutor help is removed.

### `src/components/GuidedPracticeSession.tsx`
- The large **Required Pattern** card now shows the canonical surface-aware fill path for fill/transition competencies instead of a hand-only mnemonic.

### `src/components/CompetencyVerificationModal.tsx`
- Formal fill verification retains the count + sticking line and adds the canonical orchestration requirement beneath it.
- Verification therefore cannot visually reduce an orchestration competency to hand sticking only.

## Regression Protection
- Did **not** change evidence thresholds, readiness rules, session separation, verification pass logic, persistence, or competency advancement.
- Did **not** replace the machine-readable sticking tokens used by placement logic.
- Changes are scoped to fill orchestration content/presentation plus the corrected Eighth-Note Fill canonical event map.

## Validation
- TypeScript syntax transpilation: **PASS** for all 6 changed TS/TSX files.
- Canonical Eighth-Note Fill event count: **8 strokes**.
- Canonical surface distribution: **Snare 2 / High Tom 2 / Floor Tom 4**.
- Formal count remains: **1 & 2 & 3 & 4 & -> [CRASH 1]**.
- Full dependency build was not run in this environment because package installation was unavailable/timed out; the project also retains pre-existing duplicate-case source folders and undeclared legacy server dependencies that make a dependency-free global `tsc` unsuitable as a clean project build check.

## Test target after deployment
1. Open **Eighth-Note Descending Fills**.
2. Mission 1 should show exactly 8 fill-event cards, not a duplicated 16-card pattern.
3. Surface path should read: Snare R/L -> High Tom R/L -> Floor Tom R/L/R/L.
4. In Missions 3-6, the pattern chips should preserve surface names even as assistance fades.
5. The large Required Pattern card should describe the descending surface path.
6. After readiness reaches 6/6, **Run Verification** should show the same orchestration beneath the verification count/sticking standard.
7. Completing and passing verification should advance to the next competency exactly as before.

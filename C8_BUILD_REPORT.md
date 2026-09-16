# C8 Build Report — Rudiment Application & Evidence Integrity

## Goal
C8 separates **technical rudiment execution** from **musical rudiment application**. In C7.21, Rudiment Mission 6 had a musical label but still reused the same pad-first PLAY renderer as Mission 5. That meant a clean technical run could satisfy the C7 criterion **“Rudiment applied musically”** without actually placing the rudiment inside a groove or kit phrase.

C8 corrects the renderer, evidence contract, migration behavior, and verification gate together.

## What changed

### 1. Dedicated rudiment musical-application authority
New file: `src/lib/rudimentApplicationEngine.ts`

Mission 6 now receives an authored **groove → rudiment fill → Beat-1 landing** phrase instead of reusing the pad-only technical timeline.

The transfer contract is versioned as:

`C8_RUDIMENT_ORCHESTRATION_V1`

The current authored application phrase uses:
- Bars 1–3: stable kick/snare/closed-hi-hat groove.
- Bar 4 Beats 1–2: groove continues unchanged.
- Bar 4 Beats 3–4: the canonical rudiment sticking becomes a two-beat fill.
- Next Beat 1: Crash + Kick landing and immediate recovery.

Rudiment-specific mappings are data-driven. C8 currently has explicit orchestration behavior for:
- Double Stroke Roll.
- Single Stroke Roll.
- Single Paradiddle.
- A safe generic fallback for later rudiments.

For Double Stroke Roll, the two-beat fill is:
- Beat 3: Snare **RR** → High Tom **LL**.
- Beat 4: Mid Tom **RR** → Floor Tom **LL**.
- Next Beat 1: Crash + Kick.

For Single Paradiddle, the original `RLRR LRLL` remains intact while accented lead notes move to the toms and inner notes remain controlled on snare.

### 2. Mission 6 now owns a real APPLICATION / ORCHESTRATE renderer
Updated: `src/components/VisualRhythmTutor.tsx`

For qualified rudiment Mission 6 exercises:
- The stage is displayed as **APPLICATION / ORCHESTRATE**.
- Step 5 is labelled **ORCHESTRATE** rather than INDEPENDENT.
- The launch action is **START MUSICAL APPLICATION**.
- Evaluation unlock copy refers to completion of the groove → fill → landing phrase.
- The pattern grid is generated from the musical application definition rather than the technical pad definition.

The internal canonical transport remains PLAY/assistance NONE, preserving the existing low-assistance timing engine without creating a second transport implementation.

### 3. Musical evidence can only come from the C8 application contract
Updated: `src/lib/curriculumPracticeIntelligence.ts`, `src/types.ts`

Rudiment Mission 6 now carries:
- `applicationKind: RUDIMENT_ORCHESTRATION`
- `applicationEvidenceVersion: C8_RUDIMENT_ORCHESTRATION_V1`
- `challengeType: kit-orchestration`

A rudiment attempt satisfies **“Rudiment applied musically”** only when all of those conditions identify the corrected C8 musical application exercise.

Mission 5 technical independent play can still prove independent rudiment control, but it cannot prove musical application.

### 4. Legacy evidence migration is conservative
Older rudiment Mission 6 evidence is **not deleted**. Session history and technical evidence remain available.

However, pre-C8 Mission 6 records that lack the C8 orchestration contract no longer satisfy the musical-application criterion. This prevents the prior pad-only Mission 6 from being grandfathered in as musical evidence.

A targeted continuation builder now creates only the corrected Mission 6 for learners who already completed Missions 1–5:

`buildC8RudimentMusicalApplicationSession(...)`

This avoids forcing the learner to repeat valid technical learning.

### 5. Evidence reconstruction now preserves exercise semantics
Updated: `src/components/GuidedPracticeSession.tsx`

Generic practice attempts now persist:
- `progressionStage`
- `challengeType`

If the dedicated curriculum ledger write is ever missing, reconstructed evidence can still distinguish a C8 kit-orchestration attempt from a legacy pad-only Mission 6 attempt.

### 6. Evaluation language now grades transfer, not pad mechanics
Updated: `src/components/EvaluateStageView.tsx`

C8 Mission 6 evaluation explicitly checks whether:
- the groove remained settled,
- the original sticking survived the surface changes,
- the fill entered without rushing,
- the next Beat 1 landed cleanly,
- the groove recovered immediately.

The application evaluation also persists explicit independent PLAY / NONE-assistance semantics for downstream evidence logic.

### 7. Formal verification now requires complete C7 curriculum coverage
Updated: `src/components/PathView.tsx`

The formal **Run Verification** action is now exposed only when:
- C4 readiness is `READY_TO_VERIFY`, **and**
- C7 curriculum coverage is `6/6`.

If the only meaningful missing rudiment evidence is musical application, the Path screen offers **Complete Musical Application** and launches the targeted C8 Mission 6 continuation instead of opening the formal verifier early.

## Validation performed

### Pure TypeScript authority check
Passed:

`tsc --noEmit --skipLibCheck --moduleResolution bundler --module esnext --target es2022 src/lib/rudimentApplicationEngine.ts src/lib/curriculumPracticeIntelligence.ts src/types.ts`

### Functional C8 authority test
Passed for both Double Stroke Roll and Single Paradiddle:
- Mission 5 remains `precision-mechanics` and is not application-qualified.
- Mission 6 is `kit-orchestration` and is C8 application-qualified.
- Targeted repair contains Mission 6 only.
- Authored application phrase is 4 bars / 36 events before governed phrase expansion.
- Double Stroke fill preserves `RR LL RR LL` over Snare → High Tom → Mid Tom → Floor Tom.
- Single Paradiddle preserves `RLRR LRLL` while moving accents to toms.

### Evidence migration test
Passed:
- Legacy rudiment Mission 6 with `musicalApplication: true` but no C8 orchestration version = **0** valid musical applications.
- New C8 Mission 6 clean run = **1** valid musical application.

### React/TSX static check
The modified TSX tree produced no C8-specific TypeScript diagnostics. The extracted source package does not contain `node_modules`, so package-resolution diagnostics for React / lucide-react / `react/jsx-runtime` remain expected in this local container.

A complete `vite build` therefore cannot be executed from this extracted source without installing project dependencies. No dependency or package manifest changes were made by C8.

## Deployment test
After deploying C8:

1. Open **Double Stroke Roll (Rebound Mechanics)** on Path.
2. Existing technical evidence should remain; if musical application is missing, the action should become **Complete Musical Application** rather than requiring Missions 1–5 again.
3. The Mission 6 screen should show **APPLICATION / ORCHESTRATE** and **START MUSICAL APPLICATION**.
4. Confirm the phrase is groove first, then the Double Stroke fill:
   - Snare RR
   - High Tom LL
   - Mid Tom RR
   - Floor Tom LL
   - next Beat 1 Crash + Kick
5. Complete and save a Clean & Relaxed application run.
6. Return to Path. **Rudiment applied musically** should now be satisfied from the fresh C8 evidence.
7. Confirm formal verification is offered only once C4 is ready and C7 coverage is 6/6.
8. Then test **Single Paradiddle** as the second proof that orchestration is competency-driven rather than hard-coded only for Double Stroke Roll.

## Files changed
- `src/lib/rudimentApplicationEngine.ts` (new)
- `src/lib/curriculumPracticeIntelligence.ts`
- `src/types.ts`
- `src/components/VisualRhythmTutor.tsx`
- `src/components/EvaluateStageView.tsx`
- `src/components/GuidedPracticeSession.tsx`
- `src/components/PathView.tsx`
- `C8_BUILD_REPORT.md`

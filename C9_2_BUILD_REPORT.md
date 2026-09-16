# C9.2 — Musical Application Evidence & Progression Bridge

## Baseline
C9.2 is built on top of `Rudiments-C9.1-full`.

C9.1 locked the live five-bar rudiment musical-application phrase:

1. Bars 1–3 — GROOVE
2. Bar 4 Beats 1–2 — HANDOFF
3. Bar 4 Beats 3–4 — RUDIMENT FILL
4. Bar 5 Beat 1 — LAND (Crash + Kick)
5. Bar 5 Beats 2–4 — RECOVER

C9.2 does **not** redesign that phrase. It makes a completed Mission 6 run trustworthy curriculum evidence and keeps it separated from formal C4 verification evidence.

## What C9.2 changes

### 1. Completed phrase transport now travels with the evaluation result
`VisualRhythmTutor` now attaches a C9 application evidence envelope only after the governed PLAY transport has completed its required phrase cycles:

- `applicationKind = RUDIMENT_ORCHESTRATION`
- `applicationEvidenceVersion`
- `applicationEvidenceQualified`
- stable `applicationRunKey`
- `applicationCompletedLoops`
- `applicationRequiredLoops`

Opening Mission 6, entering Stage 6, or leaving a run unfinished is not enough to qualify the musical application.

The loop requirement follows the run the learner actually selected. The normal five-bar Mission 6 default remains 2x; long-form missions keep their existing one-pass behavior.

### 2. C9.2 Stage 6 copy is explicitly about musical application
For a qualified rudiment Mission 6, the evaluation screen now identifies itself as **Musical Application Evidence Check** and asks the learner to judge the complete musical phrase rather than isolated pad mechanics.

The evidence check focuses on:

- settled groove before the fill;
- intact / recognizable rudiment sticking during orchestration;
- clean Beat-1 landing;
- immediate groove recovery;
- authored Mission 6 friction options from the C9 teaching definition.

This remains self-assessed curriculum learning evidence, not formal certification.

### 3. C7 Musical Uses only increments from a qualified application run
The curriculum evidence ledger now requires all of the following before a rudiment Mission 6 can set `musicalApplication = true`:

- the exercise is the canonical C9 rudiment orchestration mission;
- the C9 application version matches;
- the PLAY run reports `applicationEvidenceQualified = true`;
- a stable application run key exists;
- completed phrase cycles meet or exceed the required phrase cycles.

Pre-C9.2 rudiment Mission 6 records that do not contain this transport proof remain historical practice records but are not upgraded into C7 musical-use evidence.

### 4. Refresh / duplicate protection
The dedicated curriculum evidence `runId` now uses the stable application run key when one exists. Re-saving the same completed musical run therefore resolves to the same evidence record instead of farming duplicate Musical Uses.

The generic attempt store already had session / skill / exercise / attempt-number idempotency. C9.2 also preserves the new application metadata when `finalizeSessionEvidence()` reconciles the session, preventing the richer immediate record from being overwritten by a poorer finalization record.

### 5. C4 formal-readiness boundary is hardened
A clean Mission 6 musical application is valuable practice breadth, but it no longer counts as one of the dedicated **Independent clean execution** runs in C4.

This means Mission 6 can support curriculum breadth without replacing:

- genuine independent-clean execution;
- near-verification-tempo evidence;
- separate qualifying sessions;
- formal verification.

The C4 authority therefore remains intact.

### 6. Session completion now shows when a Musical Use was banked
When a qualified application is saved, the session exercise summary displays:

- `Musical use banked`
- completed / required governed phrase cycles

The diagnostic issue tags also continue into the existing adaptive recommendation system, so handoff, orchestration, landing, pulse or recovery friction can influence the next practice recommendation.

## Files changed

- `src/types.ts`
- `src/components/VisualRhythmTutor.tsx`
- `src/components/EvaluateStageView.tsx`
- `src/components/GuidedPracticeSession.tsx`
- `src/lib/curriculumPracticeIntelligence.ts`
- `src/lib/competencyAdvancementEngine.ts`
- `src/lib/evidenceEngine.ts`
- `C9_2_BUILD_REPORT.md`

## Validation performed

### TypeScript syntax / transpilation
Passed TypeScript 5.8.3 `transpileModule` for all changed TS/TSX source files.

### Source-level C9.2 assertions
Verified that the build contains:

- stable per-run C9 application keys;
- completed/required phrase-cycle metadata;
- explicit application qualification gating;
- C7 musical-use validation using the completed transport proof;
- C4 exclusion of musical-application records from the independent-clean pool;
- final session reconciliation preserving C9.2 metadata;
- session-summary Musical Use confirmation.

### Full `tsc` / Vite note
The supplied source archive does not include `node_modules`. A project-wide `tsc --noEmit` therefore reports the baseline missing-package errors (`react`, `lucide-react`, etc.) and the pre-existing duplicate `Components` / `components` case warnings. No additional changed-file TypeScript diagnostics were found beyond those baseline environment issues.

## Deployment test
After deploying C9.2, use **Single Paradiddle — Mission 6** first.

1. Start Musical Application and allow the complete governed phrase cycle(s) to finish.
2. Confirm evaluation stays locked before the required run completes.
3. Enter **Musical Application Evidence Check**.
4. Save a Clean & Relaxed or Mostly Clean result.
5. Finish the session.
6. Confirm the session summary shows **Musical use banked** with the completed/required phrase cycles.
7. Return to Path and confirm C7 **Musical Uses** increments for Single Paradiddle.
8. Confirm C4 **Independent clean execution** does **not** gain an extra independent run merely because Mission 6 was banked.
9. Refresh the page and confirm the Musical Use count does not duplicate.
10. Repeat on Double Stroke Roll to verify the evidence is competency-specific and does not leak between rudiments.

If all ten checks pass, C9.2 can be locked and the next build can move to the adaptive coaching layer (C9.3).

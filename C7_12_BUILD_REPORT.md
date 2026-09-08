# C7.12 — Targeted Verification Repair & Repair-Plan Authority

## Field result that triggered this pass
After a corrected Drum Notation Basics formal verification was graded **Inconsistent**, C7.10/C7.11 correctly:
- kept Drum Notation Basics active;
- preserved C7 learning coverage at 6/6;
- moved C4 readiness to `REPAIR_REQUIRED`;
- created a formal-verification repair plan.

However, pressing **Practice This Competency** still launched **Mission 1 — Decode the Symbols** and restarted the normal six-mission curriculum journey.

That is incorrect for a learner whose curriculum learning coverage is already complete. A failed certification attempt should create a focused remediation loop, not erase the distinction between *learning the competency* and *repairing a failed formal attempt*.

## Changes

### 1. Dedicated C7 verification-repair session
`src/lib/curriculumPracticeIntelligence.ts`

Added `buildC7VerificationRepairSession()`.

When a formal verification has failed and an active repair plan exists:
- previous C7 learning coverage is preserved;
- Understand / Count / Hear / Follow are not replayed;
- only the genuine no-assistance end stages are repeated;
- repair runs occur at a relaxed near-target tempo, not at the formal ceiling;
- the session remains canonical and continues to write stage-aware C7 evidence.

For **Drum Notation Basics at 70 BPM**, the repair session is expected to contain:
1. `Mission 5 — Sight-Read Independently`
2. `Mission 6 — Read in Musical Context`

Both run at **63 BPM**, with `PLAY` / `NONE` assistance.

### 2. Canonical repair session is bound to the active repair plan
`src/lib/gapClosureEngine.ts`

Added `bindCanonicalRepairSessionToPlan()`.

The targeted C7 repair exercises are mapped directly to the failed C4 verification criterion and persisted into the existing gap-closure plan. This ensures that:
- Clean & Relaxed repair self-checks count as remediation evidence;
- inconsistent repair attempts do not clear the blocker;
- the repair plan reaches `isReadyForReassessment` only after the required targeted evidence succeeds.

This closes the previous disconnect where C4 created a repair plan but Path practice ignored it.

### 3. Path gives repair authority priority
`src/components/PathView.tsx`

When C4 is `REPAIR_REQUIRED` and the active repair plan is unresolved, the primary action is now:

**Repair Before Retest**

instead of `Practice This Competency`.

The launcher now prioritizes the targeted repair session before protocol-revalidation, separate-session revisit, stabilization or full teaching sessions.

### 4. A remediated plan no longer blocks readiness
`src/lib/competencyAdvancementEngine.ts`

C4 now distinguishes:
- an **unresolved** active repair plan, which blocks formal retesting;
- a repair plan whose targeted evidence is already fully remediated, which no longer counts as an active blocker.

The existing post-failure rule still requires fresh clean near-target evidence after the failed formal attempt. Therefore a learner cannot clear the failure merely because the plan object exists or because old evidence was already present.

On a subsequent successful formal verification, a remediated repair plan is formally completed/dismissed so it cannot linger into later Today practice.

### 5. Today's Practice obeys the same repair authority
`src/lib/todayPracticeEngine.ts`

The same failed-verification state can no longer be bypassed by starting Today's Practice.

If the active primary competency has an unresolved formal-verification repair plan, Today launches the same canonical targeted repair rather than a generic placement-style session or a full curriculum replay.

A repair plan that is already ready for reassessment is no longer shown as a blocking supporting-repair lane.

## Expected current-field behavior
With the user's present Drum Notation state:
- C7 learning coverage remains **6/6**;
- C4 remains **Repair Before Testing** until repair evidence is earned;
- the main button becomes **Repair Before Retest**;
- the repair session contains only **2 exercises** at **63 BPM**;
- both exercises retain real drum-notation staff reading and no-assistance mission governance;
- two Clean & Relaxed post-failure runs clear the failed-verification evidence requirement;
- Path then returns to **Run Verification** without redoing the six-stage curriculum.

## Validation
- Focused TypeScript compilation of `curriculumPracticeIntelligence.ts`, `gapClosureEngine.ts`, `competencyAdvancementEngine.ts`, `todayPracticeEngine.ts`, canonical curriculum data and shared types: **PASS**.
- TypeScript/TSX syntax transpilation across all **65** source files: **PASS** (0 syntax errors).
- Runtime repair-builder test for Drum Notation Basics: **PASS**.
  - generated exactly 2 exercises;
  - both assistance targets = `NONE`;
  - both tempos = **63 BPM** for a 70 BPM formal standard;
  - session marked as gap-closure remediation.
- Runtime repair-plan binding test: **PASS**.
  - both repair drills mapped to the formal failed criterion;
  - two Clean & Relaxed completions moved the plan to `isReadyForReassessment = true`.
- Full dependency build was not completed because dependency installation timed out; no package/dependency versions were changed.

## Field validation checklist
1. Deploy C7.12 without clearing browser storage.
2. Open Path.
3. Drum Notation Basics should remain active with C7 6/6 and C4 repair state preserved.
4. The main action should read **Repair Before Retest**.
5. Start repair.
6. Confirm only Mission 5 and Mission 6 are present — not Mission 1.
7. Confirm both run at approximately **63 BPM**, with `PLAY` and assistance `NONE`.
8. Complete both honestly.
9. If both are Clean & Relaxed, return to Path and confirm C4 becomes **READY TO VERIFY / 6 of 6**.
10. Run a fresh corrected 8-bar notation verification. The chart must be newly generated and the prior failed result must not certify the competency.

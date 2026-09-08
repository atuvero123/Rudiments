# C7.9 — Targeted Revisit & Direct Verification Action

## Field result that triggered this pass
C7.8 passed its required-supporting handoff test on the live device:

- **Understanding 4/4 Bar Structure** remained formally verified.
- **Drum Notation Basics (Kick, Snare, Hats)** became the active Unit 1 competency.
- Unit 1 correctly returned to **IN PROGRESS** and Unit 2 relocked.
- Previously banked notation learning evidence was preserved at **5/6** rather than resetting.
- C4 formal readiness showed **4/6** with 2 clean independent runs at the 70 BPM standard.

The only remaining learning-coverage criterion is a second distinct curriculum session (`Learning revisited separately`, 1/2). C4 is missing the matching repeatability requirements: practice evidence across a second session and a second qualifying independent session.

## Problem found
C7.7 only shortened practice after learning coverage had already reached 6/6. In the exact 5/6 state above, pressing **Practice This Competency** would still send the learner through the complete six-mission teaching journey even though all substantive learning dimensions had already been demonstrated.

That is redundant and weakens the evidence model: the learner needs a fresh independent repeat, not another full introduction/count/watch/follow sequence.

A second small UX inconsistency also remained: after C4 reaches `READY_TO_VERIFY`, the top primary action could still describe more practice while the formal-readiness card separately offered **Run Verification**.

## Changes

### 1. Targeted second-session revisit
`src/lib/curriculumPracticeIntelligence.ts`

Added `buildC7SecondSessionRevisitSession()`.

When the only missing C7 coverage criterion is **Learning revisited separately**, the app now creates a fresh short session containing only the canonical no-assistance missions:

- Mission 5 — genuine independent execution / sight-reading;
- Mission 6 — musical transfer.

Both run at the competency's formal target tempo. Existing evidence is preserved and the learner does not repeat already-earned guided stages.

For Drum Notation Basics this resolves to **2 exercises at 70 BPM**.

A clean independent result in the new session can simultaneously satisfy:
- C7 separate-session learning coverage;
- C4 repeated practice across separate sessions;
- C4 separate qualifying independent-session control.

### 2. Path action reflects the actual next governed action
`src/components/PathView.tsx`

The primary competency button now has four deterministic states:

- ordinary incomplete learning → **Practice This Competency**;
- only separate-session revisit missing → **Revisit for Verification**;
- 6/6 coverage but C4 still needs stabilization → **Stabilize for Verification**;
- C4 `READY_TO_VERIFY` → **Run Verification** and open the formal verification modal directly.

The stabilization path no longer activates after formal readiness is already complete.

## Validation
- Focused TypeScript compilation of the C7 curriculum/evidence engine and dependencies: **PASS**.
- Full project TypeScript scan: only expected missing installed-package/type-resolution errors (`react`, `react/jsx-runtime`, `lucide-react`, Vite/Node types) were present; **no additional source errors** were introduced.
- Runtime generation test for `comp-reading-notation`: **PASS**.
  - generated exercises: **2**;
  - missions: **5 and 6**;
  - assistance: **NONE / NONE**;
  - tempo: **70 / 70 BPM**;
  - Mission 6 retained musical-application tagging.
- No dependency or package-version changes.

## Field validation checklist
1. Deploy C7.9 without clearing browser storage.
2. Open Path and confirm Drum Notation Basics remains active with the existing 5/6 evidence.
3. Confirm the primary button says **Revisit for Verification**.
4. Press it and confirm the session contains only **2 exercises**, not the full six-mission journey.
5. Confirm both exercises run at **70 BPM**, with the first being genuine independent sight-reading and the second musical transfer.
6. Complete the independent exercise honestly as Clean & Relaxed only if it genuinely is.
7. Return to Path.
8. Expected if the new session qualifies: C7 becomes **6/6**, C4 becomes **6/6 READY TO VERIFY**, and the top primary button changes to **Run Verification**.
9. Run the notation formal verification only after those gates are green.

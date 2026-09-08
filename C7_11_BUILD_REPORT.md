# C7.11 — Legacy C4 Protocol Revalidation Bridge

## Field result that triggered this pass
After C7.10 correctly invalidated pre-v2 C4 checkpoint certifications, the Path returned to **Quarter-Note Pulse Stability** rather than directly to Understanding 4/4 Bar Structure.

That rollback is technically correct: Quarter-Note Pulse Stability had also been certified by the old C4 verifier and therefore cannot remain canonically verified under the corrected `c4-verifier-v2` protocol.

However, the field state exposed a migration UX problem:
- Quarter-Note Pulse Stability still had substantial historical practice evidence (21 attempts, four clean independent runs and control above the 80 BPM target),
- C4 readiness was already 5/6, with only one new separate qualifying session missing,
- but the newer C7 learning ledger showed 0/6 because that competency had been completed before the C7 curriculum evidence ledger existed.

Without a migration bridge, pressing Practice would unnecessarily send the learner through the full six-mission teaching journey again merely because the newer coverage ledger did not exist at the time.

## Changes

### 1. Detect retired pre-v2 C4 checkpoint records
`src/lib/canonicalProgressEngine.ts`

Added `getLegacyInvalidC4Checkpoint()`.

The helper identifies a preserved historical `checkpoint` record whose protocol is not `c4-verifier-v2`. The record remains non-authoritative for certification, but the UI can now distinguish **protocol revalidation** from genuinely unlearned curriculum content.

### 2. Short corrected-clock revalidation session
`src/lib/curriculumPracticeIntelligence.ts`

Added `buildC7ProtocolRevalidationSession()`.

For a competency that was previously checkpoint-certified under the retired verifier:
- prior learning/practice history is preserved;
- the learner is not forced through Understand / Count / Hear / Follow again;
- the session keeps only no-assistance independent and musical-transfer exercises;
- practice runs on the corrected clock at a safe current tempo, capped at the formal target;
- the fresh session can satisfy C4's missing separate-session requirement.

For the current Quarter-Note Pulse Stability field state, the expected revalidation session is **2 exercises at 80 BPM**.

### 3. Path primary action recognizes protocol migration
`src/components/PathView.tsx`

When the active competency has a retired pre-v2 checkpoint and is not yet Ready to Verify, the main action now becomes:

**Revalidate on Corrected Clock**

instead of `Practice This Competency`.

Once the fresh evidence closes the remaining C4 requirement, the button becomes `Run Verification` as usual.

### 4. Migration explanation shown in the active competency card
The Path now explains that:
- old learning/practice history has not been deleted;
- only the old formal certification was retired;
- the full teaching journey does not need to be repeated;
- the next task is a short corrected-clock revalidation followed by the formal test.

This prevents the C7 `0/6` historical-coverage display from being mistaken for lost skill progress.

## Why C7 coverage may still show 0/6 for an old competency
C7 learning coverage was introduced after some earlier competencies had already been completed. C7.11 deliberately does **not fabricate** missing historical stage records. Certification is restored through fresh corrected-protocol evidence instead.

After the competency passes verifier-v2, canonical progression no longer depends on the absent historical C7 stage ledger for that already-completed skill.

## Validation
- Focused TypeScript compilation of `canonicalProgressEngine.ts` and `curriculumPracticeIntelligence.ts`: **PASS**.
- TypeScript/TSX syntax transpilation across all 65 source files: **PASS** (0 syntax errors).
- Static flow check: a legacy checkpoint at C4 5/6 routes to protocol revalidation rather than the full C7 journey.
- Revalidation tempo is capped at the formal competency target.
- New v2 formal verification remains the only route back to canonical VERIFIED status.
- No dependencies or package versions changed.

## Field validation checklist
1. Deploy C7.11 without clearing browser storage.
2. Open Path.
3. Quarter-Note Pulse Stability should remain the active competency because its old certification was genuinely pre-v2.
4. The primary action should now read **Revalidate on Corrected Clock**, not Practice This Competency.
5. A migration notice should explain that learning history is preserved.
6. Start revalidation. Expect only the no-assistance end-stage work (normally two exercises), at no more than 80 BPM for Quarter-Note Pulse Stability.
7. Complete the session honestly.
8. Return to Path. C4 should reach 6/6 and the primary action should become **Run Verification**.
9. Pass the corrected Quarter-Note formal verification.
10. The path should then advance to the next remaining retired checkpoint (expected Understanding 4/4 Bar Structure), which already has its own evidence and should be ready for immediate corrected verification.

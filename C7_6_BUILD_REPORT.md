# C7.6 — Canonical Evidence Unification & Formal-Readiness Hardening

## Why this pass was needed
C7.5 field validation confirmed that the active canonical competency was routed correctly and the legacy placement ledger no longer appeared for notation. The new Path screenshots also exposed a deeper evidence-authority mismatch:

- **C4 Formal Readiness** reported `Independent Clean = 2` and `Readiness = 5/6` for **Understanding 4/4 Bar Structure**;
- the C7 curriculum ledger for that same competency reported `Independent Clean = 0` and only `3/6` learning-stage evidence;
- the two stored attempts were full/guided curriculum work, but C4 could classify them as independent simply because the generic attempt record said `instructionMode: PLAY`;
- valid post-C7.4 **Drum Notation Basics** work could be present in the generic attempt store while the dedicated C7 ledger had no matching record, so the Path did not always surface its banked evidence badge.

This meant the app could eventually unlock a formal test from evidence that the curriculum itself still regarded as guided. C7.6 makes the canonical mission evidence stream authoritative for canonical progression.

## Changes

### 1. Canonical mission assistance now controls independence
`src/lib/competencyAdvancementEngine.ts`

C4 no longer treats a canonical C6/C7 exercise as independent merely because its generic screen mode was `PLAY`.

For canonical sessions:
- `FULL` and `REDUCED` mission evidence remains guided/reduced evidence;
- only `MINIMAL` or `NONE` with **Clean & Relaxed** can count as independent;
- canonical generic attempt duplicates are excluded from formal-readiness counting;
- genuine non-canonical practice and genuine placement evidence can still contribute where appropriate.

This prevents a guided lesson from falsely satisfying the independent-clean, near-tempo, or separate-independent-session gates.

### 2. C4 now reads the same canonical evidence stream as C7
`src/lib/competencyAdvancementEngine.ts`
`src/lib/curriculumPracticeIntelligence.ts`

A new `getCurriculumEvidenceRecords()` helper exposes the stage-aware curriculum records used by the C7 ledger. C4 consumes these records directly for canonical competencies.

Formal readiness still retains its own stricter purpose—prerequisites, breadth, independent control, near-target tempo, separate qualifying sessions, and friction state—but its underlying canonical evidence is now the same evidence shown by C7.

### 3. Valid older C6/C7 attempts are reconstructed safely
`src/lib/curriculumPracticeIntelligence.ts`

Some older builds wrote the generic practice attempt but did not write the dedicated curriculum-ledger record. C7.6 reconstructs those valid mission records at read time using:
- canonical exercise ID;
- mission number;
- canonical assistance stage;
- self-assessment;
- tempo;
- session/date;
- musical-application and conceptual flags.

Direct curriculum records always take precedence, so the same mission/session is not double-counted.

For **Drum Notation Basics**, the existing C7.4 correction boundary is preserved: notation evidence from before the corrected staff/transport build is excluded from both direct and reconstructed canonical evidence.

### 4. Learning coverage and formal readiness are labelled separately
`src/components/CurriculumEvidenceLedgerCard.tsx`
`src/components/AdvancementReadinessCard.tsx`

The two cards now state their different jobs explicitly:
- **C7 Curriculum Learning Coverage** = which teaching stages have actually been evidenced;
- **C4 Formal Verification Readiness** = whether evidence is strong enough to unlock the formal certification test.

The C4 card also states that canonical mission assistance levels are authoritative and guided PLAY screens do not count as independent evidence.

### 5. Banked notation evidence becomes visible again
Because C7.6 can reconstruct valid post-C7.4 canonical attempts from the generic attempt store, the Path can show the existing compact `Evidence x/6` badge for **Drum Notation Basics** even when that competency is not yet the active canonical target.

## Expected result for the current learner state
After deployment, on the existing saved data:

1. **Understanding 4/4 Bar Structure** remains the active competency.
2. Its C4 card should no longer claim two independent clean runs if the only recorded curriculum work was FULL/guided.
3. The C7 card remains stage-specific and is labelled **Learning Coverage**, not formal readiness.
4. Valid post-C7.4 Drum Notation Basics practice should appear as banked `Evidence x/6` in the Unit 1 map when reconstructable from the saved generic attempts.
5. Formal verification will unlock only after true independent canonical evidence at the required near-target standard has been earned across qualifying sessions.

## Validation completed
- TypeScript/TSX syntax transpilation across all 65 source files: **PASS**.
- Focused TypeScript type-check of `curriculumPracticeIntelligence.ts` and `competencyAdvancementEngine.ts` with internal dependencies: **PASS**.
- Canonical C6/C7 generic records are excluded from duplicate C4 counting: **PASS by source inspection**.
- Canonical independence is based on `MINIMAL` / `NONE`, not generic `instructionMode: PLAY`: **PASS by source inspection**.
- C7.4 notation validity boundary applies to direct and reconstructed canonical records: **PASS by source inspection**.
- Existing C7.5 placement quarantine remains unchanged.

A full `npm run build` was not completed because dependency installation exceeded the available installation window. No package or dependency versions were changed.

## Field validation checklist
1. Deploy C7.6 without clearing browser storage.
2. Open **Path** and inspect **Understanding 4/4 Bar Structure**.
3. Confirm C4 no longer shows guided work as `Independent Clean`.
4. Confirm the blue card says **C7 Curriculum Learning Coverage** and the amber/green readiness card says **C4 Formal Verification Readiness**.
5. Expand Unit 1 and check whether **Drum Notation Basics** now shows an `Evidence x/6` badge from the valid C7.4 session.
6. Continue 4/4 practice until the **Independent Phrase Test / Musical Transfer** stages are completed cleanly.
7. Confirm C4 independent evidence increases only after those true independent stages, not after FULL or REDUCED missions.
8. Once all formal-readiness requirements are satisfied, run the formal 4/4 verification and confirm Drum Notation Basics becomes the next canonical active competency automatically.

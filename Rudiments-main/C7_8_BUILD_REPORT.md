# C7.8 — Required-Supporting Competency Handoff & Unit-Completion Integrity

## Why this pass was needed
C7.7 field validation passed the formal-verification workflow itself. The learner completed the 48-second 4/4 certification run at 80 BPM, graded it Clean & Relaxed with no friction, and the canonical verification record was saved correctly.

The post-verification Path then exposed a deeper sequencing defect:

- **Understanding 4/4 Bar Structure** became verified correctly.
- The app immediately marked **Unit 1: Pulse & Subdivision Foundation** complete.
- It advanced into **Unit 2**, making **Groove Stability & Pocket** the active target because Backbeat Concept & Placement was already verified from earlier evidence.
- **Drum Notation Basics**, which is the fourth authored Unit 1 competency and already holds banked C7 evidence, was skipped.

The root cause was in `canonicalProgressEngine.ts`: unit completion and next-competency selection treated only `CORE` competencies as required. `SUPPORTING` competencies were therefore displayed in the canonical unit but silently ignored by the progression gate.

That contradicted the Path UI's own checkpoint wording (verify all authored competencies), and more importantly contradicted the intended curriculum sequence.

## Fix

### 1. CORE + SUPPORTING are now required canonical unit content
`src/lib/canonicalProgressEngine.ts`

For ordered canonical units:
- `CORE` competencies are required.
- `SUPPORTING` competencies are also required.
- only `ELECTIVE` competencies are optional for ordered canonical progression.

`isUnitComplete()` now checks every non-elective competency in the unit instead of filtering to CORE only.

This means Unit 1 cannot complete until all four authored Unit 1 competencies are formally verified, including **Drum Notation Basics**.

### 2. Active competency selection uses the same rule
The active-competency resolver now selects the first unverified **required** competency (CORE or SUPPORTING) in authored order.

A backward-compatible `getFirstUnverifiedCoreCompetency()` alias remains so no older caller is broken, but it now delegates to the corrected required-competency rule.

### 3. Existing evidence is preserved; no reset or migration is required
The 4/4 verification record remains valid.

After deploying C7.8 with existing browser storage:
- Quarter-Note Pulse Stability remains Verified.
- Eighth-Note Subdivision Counting remains Verified.
- Understanding 4/4 Bar Structure remains Verified.
- Unit 1 returns to **IN PROGRESS**, because Drum Notation Basics is not yet formally verified.
- **Drum Notation Basics becomes the active canonical competency.**
- Its banked C7 evidence remains available; it should not restart at zero.
- Unit 2 becomes locked again until Unit 1 is genuinely complete.
- Any already-verified Unit 2 competency evidence remains banked and will reappear when Unit 2 is legitimately reached.

## Why this is broader than a one-off notation patch
The same CORE-only bug could have skipped later supporting competencies such as:
- Musical Balance & Cymbal Sensitivity,
- Song Arrangement Awareness,
- Counting Aloud with Notation,
- Reading 8th & 16th Rhythm Charts,
- Controlled Crescendo Without Rushing,
- 3/4 Waltz Time Signature,
- Double Paradiddle in 6/8,
and other supporting steps authored inside the ordered curriculum.

C7.8 fixes the progression rule globally so future units cannot be falsely completed while a required SUPPORTING competency remains unverified.

## Validation completed
- TypeScript/TSX syntax transpilation across all **65 source files**: **PASS (0 errors)**.
- Focused TypeScript compile of `types.ts`, `canonicalCurriculum.ts`, and `canonicalProgressEngine.ts`: **PASS**.
- Runtime scenario 1: Pulse + Eighths + 4/4 verified, notation unverified → **Unit 1 incomplete, Unit 2 locked, Drum Notation Basics active: PASS**.
- Runtime scenario 2: all Unit 1 required competencies verified + Backbeat already verified → **Unit 1 complete, Unit 2 unlocked, Groove Stability & Pocket active: PASS**.
- Runtime scenario 3: Unit 2 core skills verified but supporting Musical Balance unverified → **Unit 2 remains incomplete and Musical Balance becomes active: PASS**.
- Full project `tsc --noEmit` was checked; after filtering the expected missing React/Vite/Lucide/Node dependency-resolution errors in this dependency-free workspace, **no additional TypeScript errors remained**.
- No package versions or dependencies were changed.

## Field validation checklist
1. Deploy C7.8 **without clearing browser storage**.
2. Open Path.
3. Confirm Unit 1 is back to **IN PROGRESS**, not Complete.
4. Confirm **Drum Notation Basics (Kick, Snare, Hats)** is now the primary active competency.
5. Confirm its previously banked evidence is still present (expected from the current device state: approximately 5/6 C7 coverage rather than 0/6).
6. Confirm Unit 2 is locked again until notation is formally verified.
7. Open Drum Notation Basics and continue only the missing learning/readiness work rather than redoing valid evidence.
8. After Drum Notation Basics eventually passes formal verification, confirm Unit 1 then becomes Complete and the canonical path advances into Unit 2, where already-verified Backbeat evidence remains preserved.

# C7.5 — Canonical Evidence Routing & Completion-State Hardening

## Why this pass was needed
Mobile validation of C7.4 confirmed that notation staff rendering, bar counts and transport synchronization were correct. The end-of-session screenshots then exposed a separate evidence/UI problem:

- a canonical Drum Notation Basics session was showing the legacy **Placement Practice Complete** ledger (phrase insertion, downbeat landing, groove return), even though the lesson was not a placement exercise;
- older VisualRhythmTutor builds had emitted default placement evidence for canonical C6/C7 lessons without a `musicalPlacement` contract;
- older pre-C7.4 notation attempts could still influence formal readiness even though those sessions used the previously mismatched notation/drill presentation;
- a non-active canonical competency could report “formal verification next” even while the Path still had an earlier competency as the true active target;
- the Path only surfaced the C7 evidence ledger for the 4/4 structure competency, so valid notation evidence was not visible when notation later became active.

## Changes

### 1. Placement evidence is now contract-gated
`src/components/VisualRhythmTutor.tsx`

Follow and Independent modes only emit placement evidence when the exercise actually has a `musicalPlacement` definition. Canonical reading, timing and other non-placement missions no longer create synthetic one-beat-fill placement records.

### 2. Legacy synthetic C6/C7 placement records are quarantined
`src/lib/placementEngine.ts`

On load, historical placement attempts whose exercise IDs belong to C6/C7 canonical missions are removed from placement-memory calculations. Genuine placement-session records remain intact.

### 3. Formal readiness ignores invalid pre-fix notation evidence
`src/lib/competencyAdvancementEngine.ts`

For `comp-reading-notation`, canonical C7 practice attempts from before the C7.4 corrected staff/transport build are excluded from formal-readiness calculations. The learner's validated post-C7.4 notation work remains eligible.

Placement attempts created by canonical C6/C7 mission IDs are also excluded from readiness as a second safety layer.

### 4. Session completion now shows the correct curriculum ledger
`src/components/GuidedPracticeSession.tsx`

C7 canonical sessions now show `CurriculumEvidenceLedgerCard` for the competency actually trained. The legacy phrase-placement completion card appears only when at least one exercise genuinely contains `musicalPlacement`.

### 5. Canonical order now controls “what is next” messaging
`src/components/GuidedPracticeSession.tsx`

A competency practiced ahead of the current active canonical target can still bank useful evidence, but the completion screen no longer claims that its formal verification is the immediate next progression action.

Instead it explicitly says that evidence is banked and identifies the earlier active canonical competency that must be completed first. Formal-verification priority is shown only when the practiced competency is also the current canonical active competency.

### 6. Evidence ledger generalized across the Path
`src/components/PathView.tsx`

The active competency always receives a C7 curriculum evidence ledger, not only `Understanding 4/4 Bar Structure`.

Unlocked competencies that already contain C7 evidence also show a compact `Evidence x/6` badge inside the unit map, so practice work is visible even before that competency becomes the canonical active target.

## Expected result after deployment
For the current learner state shown in the validation screenshots:

1. `Understanding 4/4 Bar Structure` remains the canonical active target until it is formally verified.
2. The clean Drum Notation Basics session remains saved as notation evidence.
3. Drum Notation Basics no longer shows phrase-insertion/downbeat/groove-return placement metrics.
4. Historical synthetic C7 placement evidence no longer inflates readiness.
5. Old notation attempts from the mismatched pre-C7.4 implementation do not qualify for formal notation readiness.
6. The Path will show an evidence badge for Drum Notation Basics while 4/4 remains active; once notation becomes active its own C7 ledger will be shown.

## Validation performed
- TypeScript syntax transpilation passed for all five changed source files.
- Full dependency build could not be executed in the sandbox because package installation did not complete within the available environment timeout; no package/dependency versions were changed in this pass.

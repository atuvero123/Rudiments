# C7 — Curriculum Expansion & Cross-Competency Intelligence

## Baseline
C6.1 Curriculum Purity build.

## Integrated changes
- Added a curriculum pedagogy engine that classifies every canonical competency into one of ten teaching domains: pulse/subdivision, meter/form, reading, groove, rudiment, fill/transition, coordination, dynamics, performance, and style.
- Added domain-specific teaching intent, listening targets, diagnostics, pattern-display rules, equipment preference, mission labels, musical-transfer logic, and evidence labels.
- Added dynamic canonical teaching-definition derivation so canonical competencies without a hand-authored C2 definition no longer silently fall back to Quarter-Note Pulse.
- Generalized governed curriculum practice from only `comp-meter-44` to all canonical competencies.
- Preserved the validated C6.1 4/4 Bar Structure journey unchanged inside the C7 builder.
- Removed the Path screen's old generic phrase-insertion fallback for canonical competencies.
- Added competency-specific mission sequencing: understand -> count/internalize -> hear -> reduced-cue follow -> independent control -> musical application.
- Added pedagogy-domain metadata to curriculum missions and evidence records.
- Made C7 readiness labels competency-family-aware instead of showing the same generic evidence language for every skill.
- Updated the evidence ledger heading to C7.

## Regression protections
- Formal C4 verification remains separate from practice evidence.
- Placement still changes starting depth/tempo only; it does not skip canonical competency order.
- Existing C6 evidence storage is retained so prior learning evidence is not discarded.
- C6.1 4/4 musical-structure purity remains the special authored path.
- Existing authored teaching definitions continue to take priority; C7 derivation only fills canonical coverage gaps.

## Validation
- TypeScript was run against the edited source. The C7-edited modules produced no TypeScript errors after the C7 journey-version type update.
- The local environment did not have npm dependencies installed and package installation timed out, so a full local Vite bundle could not be produced here. `package.json` and dependencies are unchanged from the validated C6.1 baseline; Vercel/GitHub install should restore them normally.

## Changed files
- `src/lib/curriculumPedagogyEngine.ts` (new)
- `src/lib/curriculumPracticeIntelligence.ts`
- `src/lib/teachingDefinitions.ts`
- `src/components/PathView.tsx`
- `src/components/CurriculumEvidenceLedgerCard.tsx`
- `src/types.ts`
- `C7_BUILD_REPORT.md`

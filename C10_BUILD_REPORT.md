# C10 Build Report — Full Song Performance Architecture

## Baseline
C10 is rebased on the tested C9.2 codebase. It preserves the C8/C9 musical-application, evidence-ledger, canonical readiness, and formal-verification boundaries.

## C10 scope
- Adds a canonical **Full Song Play-Along & Pocket Maintenance** competency.
- Defines a real **60-bar / 3:00 arrangement at 80 BPM** rather than reusing the generic short practice loop.
- Adds section-aware full-song practice architecture and long-form Mission 5/6 requirements.
- Adds a dedicated canonical no-drum backing-track definition for the full-song competency.
- Makes evaluation language and evidence handling specific to the complete long-form run.
- Introduces a C10 evidence boundary so older short Full Song attempts cannot satisfy the new long-form independent/musical evidence requirements.
- Extends curriculum/type/pedagogy support for long-form performance work while preserving prior C9.2 behavior for other competencies.

## Files changed from C9.2
- `src/components/EvaluateStageView.tsx`
- `src/data/canonicalCurriculum.ts`
- `src/data/playAlongTracks.ts`
- `src/lib/curriculumPedagogyEngine.ts`
- `src/lib/curriculumPracticeIntelligence.ts`
- `src/types.ts`

## Validation
A structural diff against `Rudiments-C9.2-full.zip` confirms that C10 changes are limited to the six source files above plus this report.

The current execution environment does not contain this project's installed npm dependencies, so `npm run build` cannot be executed here without dependency installation (`vite` is not present locally). A raw `tsc --noEmit` invocation also reports the pre-existing missing dependency/type and duplicate-case tree issues from the repository. These are environment/repository-level checks rather than C10-specific compile findings.

## Deployment
Use the full package as the GitHub replacement package, or copy the changed-files package over an already-correct C9.2 repository while preserving paths.

# Rudiment Drum Coach — C4 Assessment, Advancement & Daily Coaching Hardening

## Objective
Close the coaching loop so ordinary practice evidence can make a competency **ready for verification**, but only an explicit practical verification at the canonical curriculum standard can certify it and advance the learner's path.

## Core changes

### 1. Canonical advancement readiness engine
Added `src/lib/competencyAdvancementEngine.ts`.

For the active curriculum competency it now derives:
- prerequisite state
- practice breadth across sessions
- clean independent PLAY evidence
- near-target tempo evidence (85% readiness floor)
- repeatability across separate sessions/days
- recurring friction / repair blockers
- musical-application evidence remains separate from technical readiness so curriculum prerequisites cannot deadlock; play-along evidence is preserved as musical-transfer evidence, while formal verification independently tests the canonical competency standard
- formal verification target BPM, duration and standard

Readiness states:
- `BLOCKED`
- `DEVELOPING`
- `NEARLY_READY`
- `READY_TO_VERIFY`
- `REPAIR_REQUIRED`
- `VERIFIED`

### 2. Practice no longer silently certifies curriculum
`isCompetencyVerified()` is hardened so mutable skill status or self-reported/legacy `assessment` / `practice_log` provenance cannot silently satisfy canonical prerequisites.

Canonical certification now requires an explicit record written by:
- practical placement verification, or
- formal competency verification/checkpoint.

### 3. Independent evidence provenance
`PracticeAttemptEvidence` now retains:
- `instructionMode`
- `assistanceLevel`
- `evidenceCategory`

`GuidedPracticeSession` writes these values from the C2 structured PLAY/EVALUATE flow. This lets C4 distinguish independent execution from Full/Reduced cue practice.

Legacy C2 independent placement evidence is also read by C4, grouped by calendar day so a single historical practice sitting cannot falsely count as multiple sessions.

### 4. Formal Competency Verification
Added `src/components/CompetencyVerificationModal.tsx`.

The test:
- uses the canonical/teaching-definition certification BPM
- uses the canonical certification duration
- provides a metronome count-in
- requires the full timed run
- does not allow an early "pass"
- requires `Clean & Relaxed` with no reported friction for a pass
- records a deterministic checkpoint result
- records canonical verification only on a valid pass

A failed verification:
- does not remove existing progress
- leaves the competency active
- creates/reuses a focused Gap Closure pathway
- blocks immediate retesting until repair evidence is rebuilt

### 5. Automatic curriculum advancement
After a successful verification the app recalculates:
- active competency
- active unit
- unit completion
- curriculum unlocks
- Today target
- musical-development availability

The UI gives an immediate notice showing the next competency or that the unit advanced.

### 6. Today coaching hardening
Today now includes a C4 Advancement Readiness card for the canonical active competency.

When readiness is `READY_TO_VERIFY`, a **Run Verification** CTA appears automatically.

The primary Today lane also changes its coaching language depending on state:
- developing
- nearly ready
- verification ready
- repair required

### 7. Path integration
Path now shows the same canonical advancement-readiness state and can launch the same formal verification test. This prevents Today and Path from becoming separate progression systems.

### 8. Progress/Profile overview
Added `src/components/CurriculumProgressOverview.tsx` to Profile & Progress.

It shows:
- current unit
- current competency
- current verification readiness
- formal test standard
- canonical verified competency count
- completed unit count
- recent formal curriculum advancement events

Musical-application evidence remains separate from technical certification.

## Persistence added
- `RUDIMENT_COMPETENCY_VERIFICATION_ATTEMPTS_V1`
- `RUDIMENT_CURRICULUM_ADVANCEMENT_EVENTS_V1`

Existing C1–C3.3.1 localStorage keys are preserved.

## Vercel/API
API version bumped to `c4.0`.
Only the four JavaScript handlers remain under `/api`; no conflicting `.ts` routes were added.

## Validation performed
- 59 TS/TSX source files parsed through TypeScript transpilation: 0 syntax errors
- TypeScript semantic output filtered for unavailable external-package declarations: 0 project-specific errors
- Relative import resolution: 0 missing imports
- Vercel API JavaScript syntax: passed
- API route conflict check: passed (4 `.js` handlers, 0 `.ts` handlers)
- Full `npm install` / Vite production bundle attempted, but dependency installation timed out in this environment; Vercel remains the final production bundle validation.

## Recommended validation after deployment
1. `/api/health` reports `apiVersion: "c4.0"`.
2. Open Today and confirm the C4 Advancement Readiness card matches the same active competency shown on Path.
3. Complete independent PLAY/EVALUATE practice on the active competency in at least two qualifying sessions; verify readiness moves from Developing → Nearly Ready → Ready to Verify.
4. Confirm ordinary practice does **not** mark the competency Verified.
5. Run the formal verification test at the displayed curriculum BPM/duration.
6. On a clean pass, confirm the competency becomes verified and Today/Path move to the next canonical competency automatically.
7. Confirm the C3.3 musical-development evidence remains intact and later musical stages unlock only when their own prerequisites are genuinely verified.
8. Optional failure-path test: fail a verification and confirm the competency stays active, a repair state appears, and no curriculum advancement occurs.

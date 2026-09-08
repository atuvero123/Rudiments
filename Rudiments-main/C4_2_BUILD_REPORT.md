# C4.2 — Advancement Authority Integration

## Purpose
C4.2 makes the canonical competency advancement engine the single progression authority once a skill approaches certification, and especially once it reaches `READY_TO_VERIFY`.

## Behaviour changes
- Ordinary pre-verification practice is capped at the competency's formal certification BPM.
- `READY_TO_VERIFY` changes the primary Today action to the formal verification test.
- Guided practice remains available only as optional warm-up / consolidation and is explicitly labelled as such.
- Adaptive `Clean & Relaxed` decisions cannot push the remaining exercise queue above the certification BPM.
- End-of-session working-range and next-session guidance point to formal verification rather than more speed progression when verification priority is active.
- Legacy Curriculum Decision / Roadmap `Vary / Extend` guidance is suppressed while canonical verification has priority.
- Placement / APPLICABLE checkpoint metrics remain visible as supporting evidence, but their old "more evidence required" message no longer competes with the C4 canonical readiness gate.
- Existing verification evidence, musical-development evidence, and learner history are not migrated or rewritten.

## Important authority rule
For an unverified canonical competency, the formal certification tempo is a hard ceiling for ordinary adaptive practice. Once the competency is verified, that pre-verification ceiling is removed for later maintenance/stretch work.

## Files changed
- `src/lib/competencyAdvancementEngine.ts`
- `src/lib/adaptiveEngine.ts`
- `src/lib/continuityEngine.ts`
- `src/lib/todayPracticeEngine.ts`
- `src/components/GuidedPracticeSession.tsx`
- `src/components/TodayPracticeView.tsx`
- `api/health.js`
- `api/chat.js`
- `api/generate-plan.js`
- `api/checkpoint-assessment.js`
- `README.md`
- `VERCEL_DEPLOY.md`

## Validation
- Core non-React C4.2 TypeScript engines compile with global TypeScript 5.8.3: PASS.
- 59 TS/TSX source files syntax-transpiled: 0 syntax errors.
- Relative import resolution scan: 0 missing relative imports.
- Four Vercel API JavaScript routes pass `node --check`.
- API route conflict scan: only `chat.js`, `checkpoint-assessment.js`, `generate-plan.js`, `health.js` exist under `/api`.
- `/api/health` version bumped to `c4.2`.

## Deployment verification
After Vercel deploys, `/api/health` should report `apiVersion: "c4.2"`.

When a competency later reaches `READY_TO_VERIFY`, Today should show:
1. C4.2 Advancement Authority message.
2. Primary `RUN FORMAL VERIFICATION` button.
3. Secondary `OPTIONAL WARM-UP / CONSOLIDATION — NO SPEED CHASING` button.
4. No competing Vary/Extend roadmap card.
5. Any optional guided session capped at the formal verification BPM.

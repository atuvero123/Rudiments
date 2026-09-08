# C7.7 — Mission Governance, Verification Stabilization & Tempo-Ceiling Continuity

## Why this pass was needed
C7.6 field validation passed the evidence-authority test: guided work no longer counted as independent, and the 4/4 curriculum ledger reached 6/6 only after genuine independent and musical-transfer evidence. The next screenshots exposed three workflow issues that were now visible because the evidence model was finally correct:

1. **Nested-stage bypass / duplication:** every canonical mission still exposed the complete Understand → Count → Watch → Follow → Play → Evaluate ladder. A learner could therefore be on **Mission 6 — Reduced Guidance** while the inner screen showed **Independent Play**, even though the mission's canonical evidence contract was REDUCED.
2. **Unnecessary full-journey repeats:** once curriculum coverage reached 6/6, the only remaining C4 requirement could be a second qualifying independent session, but `Practice This Competency` still rebuilt all eight 4/4 missions.
3. **Pre-verification tempo contradiction:** the completion recommendation could still say “challenge +5 BPM” after a clean session even though C4 capped the unverified competency at the formal 80 BPM standard.

C7.7 resolves these as one integrated progression-hardening pass.

## Changes

### 1. Canonical missions now govern the inner teaching stage
`src/components/VisualRhythmTutor.tsx`
`src/components/UnderstandStageView.tsx`
`src/components/CountingTutorView.tsx`

Canonical C6/C7 missions no longer behave like free-form six-stage playgrounds.

For governed curriculum sessions:
- Mission 1 opens only its authored **UNDERSTAND** target, then evaluates that mission.
- Mission 2 opens only **COUNT**, then evaluates that mission.
- HEAR missions use **WATCH** only.
- FOLLOW / REDUCED missions use **FOLLOW** only at the authored assistance level.
- INDEPENDENT / MUSICAL APPLICATION missions use **PLAY** only and still require a completed independent run before evaluation.
- Stage 6 **EVALUATE** becomes available only after the authored target stage has been completed.

The six-stage strip remains visible as a learning map, but non-authoritative stages are disabled for canonical missions. A small mission-governance banner states the active stage and assistance contract.

This removes the contradiction where a “Reduced Guidance” mission could be performed and assessed as an Independent screen.

### 2. Canonical musical sub-mode buttons can no longer bypass the mission
`src/components/VisualRhythmTutor.tsx`

Inside the black audio-practice panel:
- WATCH is selectable only for a canonical WATCH mission;
- FOLLOW is selectable only for a canonical FOLLOW mission;
- INDEPENDENT is selectable only for a canonical PLAY mission.

The assistance selector is also locked to the mission's authored assistance target. A REDUCED mission therefore stays REDUCED rather than allowing FULL/MINIMAL to silently change the actual practice while the ledger still records REDUCED.

Legacy / exploratory exercises retain their free stage and assistance controls.

### 3. Canonical Watch / Follow missions complete directly into evaluation
`src/components/VisualRhythmTutor.tsx`

A governed WATCH or FOLLOW mission now requires at least one completed playback cycle, then exposes **Evaluate This Mission** instead of forcing the learner into a later assistance stage.

The legacy Follow quick-reflection modal is suppressed for governed canonical missions so there is one evidence path: authored target → evaluation → canonical mission record.

### 4. Completed curriculum coverage now gets a short verification-stabilization session
`src/lib/curriculumPracticeIntelligence.ts`
`src/components/PathView.tsx`

When C7 learning coverage is already 6/6, prerequisites are clear, and there is no repair blocker, `Practice This Competency` no longer repeats the whole teaching journey.

It builds a short **Verification Stabilization** session containing only the canonical no-assistance missions:
- 4/4: Independent Phrase Test + Musical Transfer;
- generalized C7 competencies: their independent + musical-transfer missions.

Those exercises run at the formal target tempo and create a fresh session boundary, which is exactly what C4 needs when the remaining requirement is another qualifying independent session.

The active Path CTA changes to **Stabilize for Verification** while this state applies.

### 5. C7 coverage wording now distinguishes ordinary session breadth from C4 qualifying sessions
`src/lib/curriculumPracticeIntelligence.ts`

The sixth C7 coverage item is renamed from **Control repeated separately** to **Learning revisited separately** and explicitly states that this is coverage only. C4 still separately requires qualifying near-target independent sessions.

This explains why the learner can have 3/2 curriculum sessions while C4 still shows only 1/2 qualifying independent sessions.

### 6. Canonical pre-verification guidance obeys the formal tempo ceiling
`src/lib/adaptiveEngine.ts`
`src/components/GuidedPracticeSession.tsx`

For an unverified canonical competency:
- the completion summary now identifies a **Canonical pre-verification range**;
- next-session guidance explicitly says not to add +5 BPM above the certification ceiling;
- the continuation recommendation names the actual unmet C4 readiness requirement(s);
- the legacy “ready to progress / +5 BPM” curriculum card is replaced by a C4 canonical-readiness card until verification is unlocked.

Once all C4 requirements are met, the existing formal-verification-priority state takes over.

## Expected result for the current 4/4 state
The field screenshots show:
- C7 learning coverage = **6/6**;
- independent clean = **2**;
- musical uses = **2**;
- clean tempo = **80 BPM**;
- C4 has all requirements met except **Control repeated on separate days/sessions**, currently 1 qualifying session / target 2.

After C7.7 deployment:
1. `Practice This Competency` should read **Stabilize for Verification**.
2. Starting it should produce a short 2-exercise session, not the full 8-mission journey.
3. The first exercise should open directly in the canonical Independent stage; the other teaching modes should be visibly locked.
4. A clean 80 BPM independent run in this new session should create the second qualifying C4 session.
5. C4 should then become **Ready to Verify** and expose **Run Verification**.
6. No completion message should recommend 85 BPM before the 80 BPM formal verification is passed.

## Validation completed
- TypeScript project check was run with TypeScript 5.8.3.
- The environment lacks installed React/Vite/Lucide dependencies, so expected module-resolution errors (`TS2307`, `TS2875`, `TS2580`) remain.
- After filtering those dependency-only errors, **no additional TypeScript errors were reported**, including in all C7.7 changed files.
- Static source checks confirm canonical mode buttons, assistance buttons, and stage tabs are governed by the mission contract.
- Static source checks confirm 6/6 coverage routes to the no-assistance verification-stabilization session.
- Static source checks confirm canonical pre-verification completion guidance no longer uses the generic +5 BPM recommendation path.
- `npm run build` could not run because Vite/dependencies are not installed in the workspace; the attempted dependency install exceeded the available window. No package versions were changed.

## Field validation checklist
1. Deploy C7.7 without clearing browser storage.
2. Open Path. 4/4 should remain active, with C7 coverage 6/6 and C4 still showing 1/2 qualifying sessions until new evidence is earned.
3. Confirm the main button says **Stabilize for Verification**.
4. Start it. It should show only **2 exercises**, not 8.
5. On the independent mission, confirm only the Independent stage is available before evaluation; WATCH/FOLLOW cannot be selected.
6. Complete a clean 80 BPM independent run and evaluate it honestly.
7. Complete the musical-transfer mission.
8. Return to Path. C4 should show 2 qualifying sessions and become **Ready to Verify**.
9. Confirm the completion screen never recommends +5 BPM / 85 BPM before formal verification.
10. Run the formal 4/4 verification. If it passes, confirm **Drum Notation Basics** becomes the active canonical competency and its banked 5/6 evidence remains intact.

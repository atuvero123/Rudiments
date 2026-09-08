# Rudiment AI Drum Coach — C3.3 Groove Development & Creativity

## Purpose
C3.3 deepens the existing curriculum-gated musical-development pathway without changing canonical curriculum certification. Each unlocked musical stage now teaches ownership progressively rather than presenting one play-along challenge as the whole stage.

## Added
- Sequential micro-missions inside all seven 4/4 musical-development stages.
- Mission progress stored in the existing play-along history as optional `developmentMissionId` evidence.
- Backward-compatible migration: a successful pre-C3.3 C3.2 step attempt is grandfathered as that step's prior musical-application completion.
- Audible one-bar previews for available groove/fill/rudiment vocabulary using the existing local Web Audio drum engine.
- A new sixteenth-note transition-burst variation, gated by the canonical sixteenth-fill competency.
- Creator missions for one-element kick changes, rudiment orchestration and controlled musical ideas.
- Creator plan controls: choose what to change and where to use it before starting the play-along.
- Musical-ownership reflection: copied the model / chose it / created it.
- Creator missions only count as mission-complete when the learner reports `I created it`; other attempts are still saved as useful practice evidence.
- Mission-specific recommended coaching visibility (Guided → Reduced → Performance).
- Mission-specific application modes and constraints; the generic application-mode grid is hidden during a structured development mission so the learner cannot simply skip ahead.
- Continue-to-next-mission action after qualifying evidence is saved.
- Songs pathway cards now show mission-level progress and the next mission.

## 4/4 stage depth
1. Pulse in music: lock pulse → internal eighth grid → dynamics without extra notes → full-form pulse ownership.
2. Backbeat & pocket: base groove → sustain pocket → cross sections without fills → section dynamics → pocket performance.
3. Kick variations: establish Groove A → copy Variation B → alternate A/B → create one safe kick change → choose variation by section.
4. Fill phrasing: quarter 3+1 → eighth 3+1 → sixteenth half-bar burst → 7+1 → half-bar → beat-4 → fill/no-fill judgement.
5. Rudiment application: singles → doubles → paradiddle → orchestration → shortening → musical placement → learner-created rudimental variation.
6. Creativity: no-fill → dynamics-only → groove choice → two-fill limit → create one musical idea → prompt-free creative performance.
7. Full arrangement: Guided → Reduced → Performance.

## Curriculum safety
- Canonical competency verification remains the only authority for curriculum unlocking/certification.
- Mission evidence does not certify prerequisites.
- Each mission may add competency requirements on top of its parent stage.
- Locked vocabulary remains visible only as later vocabulary and is not forced into the play-along.

## Validation
- TypeScript/TSX syntax transpilation: 0 syntax errors across source files.
- Relative-import scan: 0 missing imports.
- Vercel API JS syntax: checked.
- Mission/variation/curriculum reference validator: included in build QA; no intended unresolved C3.3 references.
- Full local npm/Vite production build could not be completed because dependency installation timed out in this execution environment. Vercel remains the final bundle test.

# Rudiment AI Drum Coach — C3.3.1 Progress Integrity Repair

## Scope
Focused repair only. No curriculum, play-along, mission content, audio, or certification rules were redesigned.

## Root cause
C3.3 used successful legacy C3.2 step-level play-along evidence as a signal that every newly introduced mission in that step was complete. This made all four Step-1 missions display DONE even though only the older single Step-1 application had actually been performed.

## Fix
- Legacy successful C3.2 step evidence now credits only the first mission of that step.
- Explicit C3.3 mission evidence is merged on top of the legacy Mission-1 credit.
- Creator missions still require ownership === CREATED.
- Mission 2+ remains incomplete until its own qualifying attempt exists.
- The same rule is used by both Songs path progress and PlayAlongStudio mission cards.
- API version bumped to c3.3.1 for deployment verification.

## Expected migration examples
- Legacy C3.2 Step 1 only -> Mission 1 DONE, Missions 2–4 not done.
- Legacy C3.2 Step 1 + explicit Mission 2 success -> Missions 1–2 DONE, Missions 3–4 not done.
- No legacy + explicit Mission 1 success -> Mission 1 DONE only.
- Creator mission with COPIED/CHOSE ownership -> evidence retained, mission not completed.

## Data safety
No history is deleted or rewritten. Completion is derived from existing localStorage history using the corrected interpretation.

# C7.15.1 — Canonical Evaluation Completion Latch Hotfix

## Symptom
A governed WATCH/FOLLOW mission could finish its complete authored guided cycle while **Evaluate This Mission** remained disabled with the message “Complete at least one full guided cycle before evaluating this mission.”

This was reproduced conceptually by the 8/16-bar canonical transport path introduced/strengthened in C7.15, where a 1x long-form run can auto-stop immediately at the end of the cycle.

## Root cause
`VisualRhythmTutor` rendered the governed WATCH/FOLLOW evaluation gate from its local `completedLoops` React state. That state was normally copied from `masterTransport.getState()` by the animation-frame polling loop.

At the exact end of a finite 1x run, the master transport can stop before the next animation frame executes. The polling function then exits early because the transport is no longer running, so the final completed-loop count is never copied into local state. The transport's `onLoopComplete` callback was already receiving the authoritative completion count, but the tutor used that callback only for independent PLAY evidence.

## Fix
- Latch `completedLoops` directly in `onLoopComplete` for every instruction mode.
- Use `Math.max(previous, completed)` so duplicate/final transport callbacks cannot regress the count.
- Preserve the existing PLAY evidence logic and all canonical governance rules.
- Apply the same guard to both casing copies of `VisualRhythmTutor.tsx` to keep the source tree consistent.

## Expected behavior
After one complete governed WATCH or FOLLOW cycle:
1. playback may auto-stop normally;
2. `completedLoops` remains at least `1`;
3. the footer changes to the completed guidance text;
4. **Evaluate This Mission →** becomes enabled immediately;
5. clicking it opens the authored Stage 6 evaluation.

No previously verified competency is reset and no evidence thresholds are weakened.

# Rudiment AI Drum Coach — C2.1 Follow-Cues & API Hardening

## Purpose
This pass responds to deployed-phone testing of C2. It makes the three Follow assistance levels materially different and repairs Coach Chat response handling.

## Follow assistance contract

### FULL — Play Along With Tutor
- Tutor drum pattern remains audible through the complete phrase.
- Learner is expected to play simultaneously with the tutor.
- Transport ownership is reported as ENSEMBLE.
- Legacy learner-space silence is overridden during FULL Follow so the tutor does not unexpectedly disappear.

### REDUCED — Tutor Bar / Your Bar
- Strict call-and-response.
- Tutor plays one complete bar with full target drum audio.
- Next complete bar is learner-owned: tutor target audio is silent and only metronome time remains.
- Repeats Tutor -> Learner -> Tutor -> Learner.
- For a one-bar exercise, successive loops become Tutor Bar then Learner Bar.
- If REDUCED is selected on a one-bar exercise while loop mode is 1x, the UI promotes the run to at least 2x so both roles occur.

### MINIMAL — Metronome Only
- No tutor target drum audio.
- Learner performs from memory with click/pulse reference.

### PLAY
- Independent execution remains separate from Follow.
- Count-in/timing reference only; tutor pattern is silent.
- Evaluation remains gated by completion of the required independent run.

## Additional lesson consistency fixes
- Canonical teaching-definition sticking now overrides generic parent-exercise sticking in the static tutor reference.
- Landing/crash target is only shown when the active canonical timeline actually contains a landing event.
- This prevents Quarter-Note Pulse from displaying unrelated R-L alternating warm-up notation or a false crash landing target.

## Coach Chat hardening
- Frontend no longer blindly calls `response.json()`.
- It reads the raw response, validates JSON, and produces a useful deployment diagnostic when `/api/chat` is an old/plain-text function.
- `/api/chat` now returns `X-Rudiment-API-Version: c2.1` and an `apiVersion` field.
- Coach UI label updated from Gemini 3.6 to Gemini 3.8.

## Files changed
- `src/lib/masterTransportEngine.ts`
- `src/components/VisualRhythmTutor.tsx`
- `src/App.tsx`
- `src/components/CoachChat.tsx`
- `api/chat.ts`

## Validation
- TypeScript/TSX parse-transpile check: 56 files, 0 syntax errors.
- Relative import integrity check: 0 missing imports.
- Critical Vercel files present, including `src/components/Header.tsx` and `api/chat.ts`.
- Reduced sequencing model verified:
  - 1-bar exercise: TUTOR -> LEARNER -> TUTOR -> LEARNER
  - 2-bar exercise: TUTOR -> LEARNER -> TUTOR -> LEARNER
- Full `npm install` could not complete inside the sandbox before timeout, so a local Vite bundle could not be executed here. Vercel remains the production build verification environment.

## Phone test target
1. Open the same Quarter-Note Pulse lesson.
2. Follow -> FULL: hear tutor continuously while playing along.
3. Follow -> REDUCED: hear one tutor bar, then one tutor-silent learner bar with metronome.
4. Follow -> MINIMAL: hear metronome only.
5. PLAY: independent run remains tutor-silent and unlocks Evaluate only after completion.
6. Coach Chat: send a short message and confirm either a Gemini reply or a clear API diagnostic rather than the previous `Unexpected token ... not valid JSON` parsing error.

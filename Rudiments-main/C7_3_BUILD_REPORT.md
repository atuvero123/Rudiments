# C7.3 — Notation Learning Progression & Sight-Reading Depth

## Base
Built from validated `rudiment-ai-drum-coach-C7.2-clock-sync-follow-bars-vercel-ready.zip`.

## Purpose
Turn the notation competency into a genuine reading pathway rather than replaying one memorized groove or converting notation into R/L sticking.

## Changes
- Added `src/lib/notationProgression.ts`.
- `comp-reading-notation` now receives mission-specific written material:
  1. identify kick/snare/closed-hat voices on one bar;
  2. count one written 8th-note bar;
  3. track two bars including written silence/rest space;
  4. read a two-bar phrase with simultaneous voices and an off-beat kick;
  5. sight-read four changing bars with metronome only;
  6. read a short four-bar musical chart continuously.
- The master transport now uses the notation pattern assigned to the current notation mission, so audio and staff stay sourced from the same authored events.
- Rebuilt `DrumNotationStaff` for multi-bar reading.
- Added bar labels and current-bar highlighting.
- Empty written slots are shown as rests and produce no authored drum event.
- Legend now includes written silence/rest behavior.
- Notation screens continue to suppress generic sticking references.

## C7.2 protections retained
- Spoken count/master-clock sync logic unchanged.
- Tutor/learner follow-bar controls unchanged.
- Existing evidence and verification gates unchanged.

## Validation
Static TypeScript invocation was attempted, but this isolated container does not contain the project's npm dependencies (`react`, `lucide-react`, Vite, etc.) and package installation cannot reach npm in this environment. The only TypeScript diagnostics returned were missing dependency/module diagnostics. No source-level diagnostic from the C7.3 files was surfaced before dependency resolution stopped.

Recommended deployment validation:
1. Open Drum Notation Basics.
2. Confirm Mission 1 is one-bar symbol/voice recognition.
3. Advance through missions and verify the staff expands to 2 then 4 bars.
4. Confirm rests are silent and visible.
5. Confirm Watch/Follow/Play play exactly the voices displayed on the active staff bar.
6. Confirm Independent Play has no R/L sticking prompt and evaluation still requires a completed independent run.

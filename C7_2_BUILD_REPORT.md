# C7.2 Build Report — Clock-Locked Count Voice + Adjustable Follow-Cue Bars

## Goal
Address two field-test findings from the notation-first C7.1 build:

1. Browser spoken counting could begin correctly but drift behind the groove and then catch up later.
2. Reduced Follow Cues was hard-coded to one tutor bar followed by one learner bar, which is too short for learners who need a longer model/response window.

## Changes

### 1. Clock-locked count voice
- Added a small local spoken-count sample bank under `public/audio/counts/`.
- Count words are decoded into `AudioBuffer`s and scheduled with `AudioBufferSourceNode.start(absoluteAudioTime)`.
- Spoken count, click, clap and drum events therefore share the same `AudioContext` clock.
- Browser `speechSynthesis` is retained only as a compatibility fallback if a local sample cannot be loaded.
- Fallback speech is requested slightly early and stale requests are discarded instead of being allowed to build a delayed catch-up queue.
- Count Tutor UI now identifies the spoken voice as clock-locked to the groove.

### 2. Adjustable Reduced Follow exchange
- Added independent selectors for **Tutor model bars** and **Your-turn bars**: 1, 2 or 4 bars each.
- Settings persist locally between exercises.
- The transport now uses an explicit tutor/learner ownership cycle rather than `absoluteBar % 2`.
- The existing `1x / 2x / 4x / ∞` selector becomes **Cycles** in Reduced Follow: it repeats the entire tutor→learner exchange, not raw internal phrase loops.
- Live ownership labels show tutor/learner block progress such as `MODEL BAR 1/2` or `YOUR TURN — BAR 2/4`.
- Works for both one-bar and multi-bar teaching timelines.

## Pattern examples
- 1 tutor / 1 learner: `T L | T L ...`
- 2 tutor / 2 learner: `T T L L | T T L L ...`
- 4 tutor / 2 learner: `T T T T L L | ...`
- 2 tutor / 4 learner: `T T L L L L | ...`

## Files changed
- `src/lib/audioEngine.ts`
- `src/lib/masterTransportEngine.ts`
- `src/components/VisualRhythmTutor.tsx`
- `src/components/CountingTutorView.tsx`
- `public/audio/counts/*.wav` (local count-word sample bank)
- `C7_2_BUILD_REPORT.md`

## Validation
- TypeScript/TSX syntax transpilation: PASS for all changed source files.
- WAV asset integrity/header read: PASS.
- Reduced Follow ownership cycle truth-table: PASS for 1/1, 2/2, 4/2 and 2/4 patterns.
- Full `npm run lint` could not be completed in the build container because project npm dependencies were not installed and package installation was unavailable within the execution window. No syntax diagnostics were produced for the changed files by the available TypeScript compiler.

## Field test checklist
1. Open Stage 2 Count and run an eighth-note count for at least 30–60 seconds. The spoken count should stay aligned and must not audibly queue/catch up.
2. Enter Follow Cues → Reduced.
3. Try `2 tutor → 2 you`, then `4 tutor → 2 you`.
4. Confirm the tutor stays audible for exactly the selected model-bar block, becomes silent for exactly the selected response block, and the metronome continues throughout.
5. Confirm the staff/playhead remains the visual source of truth for notation missions.

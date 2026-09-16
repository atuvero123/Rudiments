# C12 Build Report — Song Transport Reliability + Explicit Fill Teaching

## Why this build exists
C11 established the dedicated 11-stage song-learning pathway, but mobile testing exposed two important issues:

1. Pausing a song window changed the UI to Resume, but playback could not actually resume until Reset.
2. The song form and groove changes worked, but authored fills were too easy to miss and some tutor/student handoff patterns placed transition-fill bars inside learner-only windows.

C12 hardens the song system rather than replacing it.

## C12 transport repair
- Pause no longer closes/destroys the Web Audio `AudioContext`.
- Pause now suspends the Web Audio clock, freezing already-scheduled backing, click and tutor events at the exact musical position.
- Resume reuses the same audio context and continues from the same bar/beat.
- A paused transport snapshot is emitted so the UI can show `Resume Song Window` while preserving progress and section position.
- Reset/Stop still closes the graph and returns the window to the beginning.
- Added an explicit `hasStarted` transport invariant so a song that began at Web Audio time `0` cannot be mistaken for a fresh run after pausing.

## C12 fill-learning repair
### Stage 5 is now a true transition lab
`Connect Verse → Chorus` is no longer a long generic Verse+Chorus pass. It is an 8-bar focused learning window:

- Bars 1–2: final two bars of Verse A — tutor demonstration
- Bars 3–4: first two bars of Chorus A — tutor landing/recovery
- Bars 5–6: same Verse ending — learner response
- Bars 7–8: same Chorus landing/recovery — learner response

Tutor/learner ownership is therefore `Tutor 4 bars → You 4 bars`, ensuring the authored Verse exit fill is heard before the learner reproduces it.

### Authored fill vocabulary is now visible
The current canonical arrangement exposes:
- Verse A: Beat-4 eighth-note fill (`4 & → LAND 1`)
- Bridge Build: two-beat build fill (`3 e & a 4 e & a → LAND 1`)
- Final Chorus: Beat-4 sixteenth-note fill (`4 e & a → LAND 1`)

Guided stages display fill labels in the song-form map and show live `TRANSITION COMING`, `FILL NOW`, and `LANDING NOW` coaching around the actual section boundary.

### Assistance now fades musically
- Guided stages: authored fill information is visible and spoken coaching can announce the transition.
- Stage 7 uses 4-bar tutor / 4-bar learner windows so the Bridge and Final-Chorus fill events are audibly demonstrated in context.
- Stage 8: full-song guided handoffs keep visible transition coaching while the learner increasingly owns the fills.
- Stage 9: tutor drums are removed; light fill cues remain.
- Stage 10: backing-track-only rehearsal hides fill coaching; fills must come from memory.
- Stage 11: performance remains memory/choice driven.

## Curriculum/structure consistency
- Added `SongTransitionFocus` and `SongFillTeachingMode` to the song-learning contract.
- Stage 5 curriculum structure now matches the actual focused 8-bar transport instead of displaying the original 24-bar Verse+Chorus span.
- Stage duration estimation now respects focused transition windows.
- C12 sessions are tagged `C12_ADAPTIVE_SONG_LEARNING` and `journeyVersion: C12`.
- The C11 song-performance evidence version is intentionally preserved so C12 transport hardening does not unnecessarily invalidate the evidence boundary already introduced by C11.

## Changed files
- `src/types.ts`
- `src/lib/playAlongEngine.ts`
- `src/lib/songLearningEngine.ts`
- `src/components/SongLearningStageView.tsx`
- `C12_BUILD_REPORT.md`

## Validation performed
### Static transpilation
All four modified TypeScript/TSX source files were passed through TypeScript `transpileModule` with zero syntax/transpile errors.

### Focused TypeScript compilation
The song transport/data/learning-engine subset compiled successfully with the global TypeScript compiler.

### Pause/resume transport test
A fake Web Audio clock test verified:
- Pause suspends rather than closes the context.
- Resume uses the same context.
- Bar and beat are unchanged immediately after resume.
- Progress continues after resume.
- Result: PASS.

### Fill demo/response scheduling test
A focused Verse→Chorus 8-bar test verified:
- The tutor pass schedules the authored Verse fill.
- The learner response pass does not leak tutor drums into the learner fill window.
- Result: PASS.

### Song blueprint test
Verified:
- 11 song stages remain intact.
- Stage 5 uses the 2-bar lead-in + 2-bar landing focus, repeated twice.
- Stage 5 uses Tutor 4 → Learner 4 and `DEMO_RESPONSE` fill teaching.
- Stage 7 exposes authored transition fills through Tutor 4 → Learner 4.
- Stage 9 uses light cue-only support.
- Stage 10 requires fill memory.
- Result: PASS.

## Repository environment note
A full project `tsc --noEmit` still reports the repository's pre-existing environment issues: missing installed React/lucide/@google-genai packages in this container and the parallel `src/components` / `src/Components` casing collisions. No new semantic errors were reported from the C12 files after the C12-specific type correction.

## Mobile deployment test priority
After Vercel deployment, test Stage 5 first:
1. Start the transition lab.
2. Pause during the tutor demo, wait several seconds, then Resume.
3. Confirm audio + bar/beat + progress all continue without Reset.
4. Hear the Tutor's Beat-4 fill on the first Verse ending.
5. Confirm the second pass becomes YOUR TURN and tutor drums stay silent while the same fill cue is shown.
6. Then test Stage 7 to hear the larger Bridge-build and Final-Chorus fill vocabulary.
7. Finally test Stage 10 to confirm the backing-only run hides fill coaching and requires memory.

# Rudiment AI Drum Coach — C2 Integrated Teaching Build

## Baseline
Built directly from the user-provided C1R2 Google AI Studio codebase (`rudiment_-ai-drum-coach (3).zip`).

## Goal
Complete the partially implemented C2 teaching experience without changing the canonical C1R2 curriculum architecture:

**Understand → Count → Watch → Follow → Play → Evaluate**

## Main changes

### 1. Canonical teaching definitions now drive the tutor
- `VisualRhythmTutor` prefers exact C2 teaching definitions when building its rhythm timeline.
- Unknown legacy/explore exercises no longer silently inherit Quarter-Note Pulse teaching content.
- Canonical definitions cover 20 key competencies, including all required beginner examples plus triplets, 6/8, R-L-K, six-stroke, and 32nd-note subdivision.
- 32nd-note teaching was expanded to a complete four-beat, 32-position visual/count grid.

### 2. Understand stage
- Correctly uses typed `CompetencyTeachingDefinition` data.
- Demonstration preview is driven by the shared master transport instead of independent timeout scheduling.
- Explicitly distinguishes **Working Tempo** from **Verification Goal**.

### 3. Count & Clap
- COUNT is now a distinct transport stage.
- Count stage plays neutral metronome pulse + optional clap + optional spoken count.
- Target drum demonstration is suppressed during COUNT so counting cannot be confused with WATCH.
- 1-bar / 2-bar count-in, voice toggle, and clap toggle are passed into the master transport at start.
- Visual token highlighting uses beat + subdivision index rather than matching duplicate token strings such as `&`.

### 4. Drum audio vocabulary
- Sound routing distinguishes kick, snare, ghost snare, closed hi-hat, open hi-hat, high/mid/floor toms, crash, ride, clap, and metronome.
- Ride is explicitly routed to the ride voice rather than closed hi-hat.
- Canonical rhythm events can carry simultaneous surfaces (for example Kick + Hi-Hat or Snare + Hi-Hat).
- Crash + Kick landing events no longer double-trigger when represented as simultaneous voices.
- Added `DrumSoundCheck` to the Practice/Metronome & Pad area.

### 5. Watch / Follow / Play
- WATCH: full target phrase demonstration with synchronized visual timeline.
- FOLLOW FULL: complete target drum guidance.
- FOLLOW REDUCED: removes meaningful inner cues while retaining musical anchors.
- FOLLOW MINIMAL: tutor phrase removed; main pulse remains.
- PLAY: target drum demonstration is silent; count-in and timing reference remain.
- Coach-Then-You continues to use the shared master transport and alternates coach and learner loops.

### 6. Evidence gate
- Canonical structured lessons hide the legacy parent timer/completion shortcut.
- Evaluation is locked until a complete independent PLAY run has occurred.
- Stage 6 evaluation sends its result directly into the existing adaptive/evidence pipeline.
- The duplicate second parent questionnaire has been removed for structured C2 lessons.
- Legacy/unmapped exercises retain the old parent timer/check-in path.

### 7. Evaluation
- Diagnostic issue choices come from the current teaching competency when available.
- Beat-1 landing question is shown only for fill/recovery/landing-relevant lessons.
- A clean attempt is logged as practice evidence; deterministic curriculum rules remain responsible for verification/certification.

## Validation performed

### Source syntax
- Parsed/transpiled all `.ts`/`.tsx` files with TypeScript 5.8 parser.
- Result: **0 syntax diagnostics**.

### Canonical curriculum integrity
- Units: **20**
- Competencies: **62**
- Known granular skills: **68**
- Missing curriculum references: **0**
- Duplicate/broken curriculum validation errors: **0**
- `validateCurriculumIntegrity(...)`: **PASS**

### C2 teaching coverage
- Teaching definitions: **20**
- Required C2 definitions missing: **0**
- Quarter-note grid: 4 positions
- Eighth-note grid: 8 positions
- Sixteenth-note full-grid example: 16 positions
- Triplet grid: 12 positions
- 6/8 grid: 6 positions with 1/4 emphasis metadata
- 32nd-note grid: 32 positions / 8 subdivisions per quarter beat

### Type/build limitation in this environment
A normal `npm install` was attempted, but external dependency installation timed out in the execution environment. Therefore a full Vite production build could not be run here. Global TypeScript checking showed only missing-package / JSX-type cascade errors caused by absent `node_modules`; no additional project-specific TypeScript diagnostic remained after filtering those dependency errors.

After downloading the project, run:

```bash
npm install
npm run lint
npm run build
```

or deploy/import it into an environment that installs `package.json` dependencies automatically.

## Recommended phone test
1. Current curriculum target → open **Practice This Competency**.
2. Verify **Understand** explains the correct competency.
3. Verify **Count** gives spoken count + clap without target drum voices.
4. Verify **Watch** demonstrates the target sounds.
5. Compare Follow **Full / Reduced / Minimal**.
6. Verify **Play** does not play the target drum pattern over the learner.
7. Confirm **Evaluate** remains locked until the Play run finishes.
8. Submit evaluation once and confirm the app shows the adaptive response without asking the same rating twice.
9. Open Practice / Metronome & Pad → **Drum Sound Check** and compare all voices.

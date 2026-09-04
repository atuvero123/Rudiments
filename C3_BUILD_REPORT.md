# Rudiment Drum Coach — C3 Musical Application Build Report

## Build target
C3 converts the working C2.1 teaching system into musical application. The canonical curriculum remains authoritative; play-along work cannot bypass prerequisites or automatically certify a curriculum unit.

## New C3 architecture

### Original curriculum play-alongs
Four no-drum backing tracks are generated locally with Web Audio harmonic pads, bass landmarks and optional metronome click:

1. Slow 4/4 Ballad — 64 BPM — 24 bars
2. 4/4 Worship Ballad — 68 BPM — 40 bars
3. Medium 4/4 Worship — 78 BPM — 36 bars
4. 6/8 Worship Ballad — 58 BPM dotted-quarter pulse — 32 bars

No commercial song audio is bundled or redistributed.

### Coaching modes
- GUIDED: musical backing + visual section map + spoken section/transition coaching.
- REDUCED: musical backing + visual coaching only; spoken prompts removed.
- PERFORMANCE: backing music with minimal coaching so the drummer owns the arrangement.

### Application challenges
- Groove only
- 3 bars groove + 1 bar fill
- 7 bars groove + 1 bar fill
- Half-bar fill
- Beat-4 fill
- Musical choice / fill-or-no-fill judgement
- Free application

Fill-specific challenge modes are locked until the required fill-entry / Beat-1 recovery competencies are verified.

### Musical arrangement engine
Each backing track contains named sections with:
- bar count
- energy level
- chord progression
- groove focus
- transition cue
- coaching note

Transition cues include deliberate NO FILL moments so restraint is taught as a skill.

### Curriculum integration
The Songs screen recommends a play-along from the learner's current canonical competency.
Today's Musical Application lane now directly opens the recommended play-along.
Suggested groove/fill/dynamic vocabulary is filtered by canonical competency verification.
Locked vocabulary can be seen as future material but is not presented as currently usable.

### Play-along review
Completed tracks unlock a musical review covering:
- overall control
- section-transition reliability
- fill/no-fill musical judgement

Reviews are stored locally as application history. They do not independently unlock curriculum prerequisites.

## Coach API hardening
The Vercel AI functions no longer import the @google/genai SDK at runtime. They use Google's HTTPS Gemini generateContent endpoint through server-side fetch.

Benefits:
- removes a possible serverless SDK/module invocation failure
- GEMINI_API_KEY remains server-side
- GOOGLE_API_KEY is accepted as a fallback environment name
- missing key now returns an explicit 503 JSON diagnostic rather than a generic function crash
- /api/health reports aiConfigured, model, transport and API version without exposing the key

API version: c3.0

## Files added
- src/data/playAlongTracks.ts
- src/lib/playAlongEngine.ts
- src/components/PlayAlongStudio.tsx
- C3_BUILD_REPORT.md

## Main files changed
- src/components/SongVaultView.tsx
- src/components/TodayPracticeView.tsx
- src/App.tsx
- serverlib/rudiment.ts
- api/chat.ts
- api/generate-plan.ts
- api/checkpoint-assessment.ts
- api/health.ts
- package.json
- VERCEL_DEPLOY.md

## Verification performed
- 58 TS/TSX source files syntax-transpiled: 0 syntax errors
- relative import audit: 0 missing relative imports
- C3 curriculum competency references: 22 referenced, 0 missing
- play-along data validated: 4 tracks / 21 sections / 132 arrangement bars total
- package.json parses successfully
- vercel.json parses successfully
- @google/genai removed from production dependencies after REST migration

## Environment limitation
A complete local `npm install` did not finish within the container network timeout, so the final Vite bundle could not be executed locally. Vercel remains the final dependency-install and production-bundle verification environment.

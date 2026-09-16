# C11 Build Report — Adaptive Song Learning & Play-Along Engine

## Purpose
C11 separates song learning from the fixed six-mission competency renderer. Song work now follows the arrangement itself: hear the form, learn section-specific parts, exchange phrases with the tutor, connect transitions, chain sections, remove assistance, and finish with a backing-only performance run.

## Main changes
- Added a dedicated 11-stage song-learning journey rather than forcing full-song work through the standard six-stage competency template.
- Added section-aware song blueprints for Intro, Verse, Chorus, Verse Return, Bridge/Build, Final Chorus and Outro.
- Added authored drum behavior per section: kick/snare placement, closed/open hi-hat texture, crashes, fills, tom movement, dynamic lift and recovery.
- Added continuous no-drum backing accompaniment as the musical bed for song learning.
- Added Tutor → Student handoffs where the backing continues while tutor drums drop out for the learner response bars.
- Added progressive assistance removal: tutor drums, spoken cues and click can be reduced across later stages.
- Added transition stages and chained-form stages so fills and section changes are learned in context rather than as isolated rudiments.
- Added backing-only and final performance stages.
- Added C11 versioned song-performance evidence so old generic song attempts do not count as new C11 musical-application evidence.
- Song learning now requests Full Drum Kit equipment instead of inheriting pad-only practice assumptions.

## C11 journey
1. Hear & Map the Song
2. Build the Intro + Verse Pocket
3. Tutor 2 Bars → You 2 Bars
4. Learn the Chorus Lift
5. Connect Verse → Chorus
6. Chain the First Half
7. Learn Return + Build + Ending
8. Full Guided Song
9. Minimal-Cue Full Song
10. Backing Track Only
11. Performance Run

The journey is intentionally not limited to six stages. Future tracks can use the same adaptive engine with a different number of stages when their arrangement or learning demands require it.

## Changed files
- `src/types.ts`
- `src/data/playAlongTracks.ts`
- `src/lib/playAlongEngine.ts`
- `src/lib/curriculumPracticeIntelligence.ts`
- `src/lib/songLearningEngine.ts` *(new)*
- `src/components/SongLearningStageView.tsx` *(new)*
- `src/components/GuidedPracticeSession.tsx`

## Validation
A TypeScript pass was run against the working tree. No C11-specific semantic/type errors surfaced in the new song engine logic. The repository still reports its existing environment/build issues in this container, principally:
- dependencies such as React/lucide/@google-genai are not installed in the runtime;
- the repository contains parallel `src/components` and `src/Components` trees, which triggers TypeScript casing-collision diagnostics.

Those issues pre-date C11 and are not introduced by this package.

## Deployment note
Use `Rudiments-C11-full.zip` as the complete GitHub/Vercel replacement package. `Rudiments-C11-changed-files.zip` contains only the files changed by C11 plus this report.

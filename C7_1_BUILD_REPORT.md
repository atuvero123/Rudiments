# C7.1 — Notation-First Pedagogy & Pattern Truth Lock

## Why this build exists
Validation of C7 exposed a semantic mismatch in Drum Notation Basics: the audio was demonstrating a basic kit groove while the visual layer still presented a motor-sticking sequence (`R K R L ...`) and the lesson reused the same generic motor-drill shell used for other competencies. That made the learner memorize a sequence instead of learning to read drum notation.

## What changed

### 1. New NOTATION curriculum display mode
Reading competencies now use a dedicated `NOTATION` display mode. They no longer inherit the generic required-sticking card.

### 2. Real staff-based reading surface
Added `DrumNotationStaff.tsx`, a responsive five-line drum staff that renders:
- closed hi-hat as x-shaped noteheads above the staff,
- snare in the middle staff area,
- kick in the low staff area,
- count tokens under the written bar,
- a moving playhead/highlight during Count, Watch, Follow and Independent playback.

The staff is now the source of truth for reading lessons.

### 3. Drum Notation Basics truth correction
The authored Drum Notation Basics teaching definition now represents simultaneous voices correctly:
- kick + hi-hat on beats 1 and 3,
- snare + hi-hat on beats 2 and 4,
- hi-hat on the eighth-note offbeats.

The false `R K R L R K R L` sticking string has been removed from the notation lesson. Diagnostic friction is now notation-specific: wrong staff voice, missed note/rest, lost place, timing drift.

### 4. Reading-specific six-stage journey
The C7 session generator now gives reading missions reading-specific purposes and instructions:
1. identify staff voices,
2. count underneath the written bar,
3. hear the written rhythm while following the playhead,
4. read with cues,
5. sight-read independently,
6. read in musical context.

Reading missions no longer receive `exercise.sticking` or a required sticking label.

### 5. Reading-specific evaluation
Evaluation language now checks staff-reading accuracy instead of generic sticking/phrase quality.

### 6. Domain-aware pattern labels
The app no longer calls every execution reference a “sticking”. Depending on the competency, the UI now uses labels such as:
- Sticking (rudiments)
- Limb / Voice Map (grooves/styles)
- Limb Sequence (coordination)
- Fill Pattern (fills)
- Accent Pattern (dynamics)
- Pulse Pattern (pulse/subdivision)
- Staff Notation (reading)

This prevents terminology from silently changing the actual learning objective.

## Validation performed
Static truth checks passed for:
- NOTATION mode registration,
- reading profile routing,
- staff component integration in Understand/Count/Watch/Follow/Play,
- removal of reading sticking from generated missions,
- removal of the erroneous notation `R K R L ...` sequence,
- simultaneous kick/hat and snare/hat event definitions.

TypeScript syntax parsing was run on all changed TypeScript/TSX files. No syntax diagnostics were produced. The environment did not have project dependencies installed, so full Vite bundle compilation could not be completed locally in this pass; deployment remains the final integration check.

## Recommended validation after deploy
Open **Drum Notation Basics** and verify:
1. Stage 1 shows a five-line drum staff instead of a sticking grid.
2. The written bar shows HH, snare and kick in distinct vertical staff positions.
3. Count stage keeps the staff visible while 1-&-2-&-3-&-4-& is counted.
4. Watch stage highlights the written position while the matching audio plays.
5. Follow/Independent keep the staff visible rather than showing `R K R L ...`.
6. Evaluation friction options refer to reading errors, not sticking errors.

# C7.4 — Notation Phrase Synchronization & Reading-Language Cleanup

## Scope
C7.4 is a focused hardening pass after validating all six Drum Notation Basics missions on mobile. It does not redesign the notation curriculum. It synchronizes the already-working notation staff, master transport, phrase visualizer, bar counters, and instructional labels so they all describe the same written material.

## Changes

### 1. Reading mission structure now matches authored notation length
`src/lib/curriculumPracticeIntelligence.ts`

The six reading missions now use the same bar progression as `notationProgression.ts`:

- Mission 1: 1 bar
- Mission 2: 1 bar
- Mission 3: 2 bars
- Mission 4: 2 bars
- Mission 5: 4 bars
- Mission 6: 4 bars

Other curriculum domains retain the broader generic phrase ladder.

This removes the previous mismatch where the pale-blue phrase visualizer could show 8 or 16 bars while the notation staff and transport were presenting only 2 or 4 written bars.

### 2. Meter/progression label derives from the actual notation phrase
`src/components/VisualRhythmTutor.tsx`

Notation lessons now show labels such as:

- `1-Bar Reading Phrase`
- `2-Bar Reading Phrase`
- `4-Bar Reading Phrase`

instead of the generic hard-coded `2-Bar Phrase Cycle`.

### 3. Groove/fill language no longer leaks into notation lessons
The four-beat progression grid previously inherited generic labels such as `GROOVE`, `FILL NOW`, and the Bar-2 `LAND CRASH` rule.

Notation missions now use:

- `BAR n START` on Beat 1
- `READ` on Beats 2–4

and never mark a notation bar as a crash-landing target.

## Preserved behavior

- C7.3 staff notation progression remains unchanged.
- Written staff remains the source of truth.
- Watch / Follow / Independent reading modes remain unchanged.
- 1/2/4-bar tutor and learner response controls remain available.
- Master-clock audio, voice clock-locking, repeat modes, evidence gating, and evaluation logic are untouched.

## Validation target
After deployment, Mission 4 should show a 2-bar phrase consistently across the phrase visualizer, staff and meter panel. Missions 5 and 6 should show 4 bars consistently across all three surfaces, with no `GROOVE`, `FILL NOW`, or `LAND CRASH` labels in the notation branch.

### 4. Phrase visualizer naming is now curriculum-aware
The pale-blue visualizer is no longer hard-coded as `C6 Phrase Visualizer`. Reading missions display `Reading Phrase Visualizer`, while bar-structure and other curriculum families receive appropriate generic labels.

### 5. Notation beat-grid styling no longer inherits fill-state emphasis
Notation reading no longer turns the beat grid amber because an underlying generic phrase stage happens to be named `FILL`, and Beat 4 no longer receives the old fill-preparation accent. The visual emphasis now follows the staff/playhead rather than groove/fill semantics.

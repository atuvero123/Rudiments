# C7.20 — Canonical Mixed-Grid Transport Repair

## Why this build exists
C7.19 authored **Groove-to-Fill Entry Timing** correctly, but the live C7 mission resolver was still able to select a generic derived teaching definition before it reached the authored `comp-fill-entry` definition.

The canonical curriculum skill id is `fill-groove-transition`, while the authored definition still advertised the older alias `fill-entry`. In `VisualRhythmTutor`, skill ids were checked before the canonical mission competency id. That caused the canonical skill id to resolve through the generic pedagogy generator, which expanded the lesson into a uniform 16th-note fill. The screenshots therefore showed:

- Mission 2: `1 e & a 2 e & a 3 e & a 4 e & a` instead of `1 & 2 & 3 & 4 e & a`.
- Watch / Follow / Independent: generic 16-note snare/tom maps instead of the groove-to-fill handoff.
- The written mission instructions were correct while the interactive transport underneath them was teaching a different phrase.

## Repairs

### `src/lib/teachingDefinitions.ts`
- Aligned the authored `comp-fill-entry` skill id with the canonical curriculum id: `fill-groove-transition`.
- Hardened `findTeachingDefinition()` so that when any canonical id / skill id resolves to a canonical competency, an authored definition for that competency id is preferred before generic derivation.
- This protects all future authored competencies from being silently replaced by generic pedagogy when old and canonical skill aliases differ.

### `src/components/VisualRhythmTutor.tsx`
- Canonical `curriculumMission.competencyId` is now the first identity used to resolve teaching content.
- `exercise.skillId` is checked next, followed by legacy `skillIds`, exercise id and title.
- A governed C7 mission can therefore no longer select a generic skill interpretation before its canonical authored competency definition.

### `src/components/GuidedPracticeSession.tsx`
- Applied the same canonical-first teaching-definition resolution used by the tutor.
- The parent session and the tutor now agree on which authored competency owns the six-stage flow.

### `src/components/CountingTutorView.tsx`
- Hardened sparse / mixed-grid counting.
- When the fastest transport grid contains intentional empty slots, the authored first-bar events become the count-strip source of truth.
- Count tokens, spoken tokens, active highlighting and accents now follow actual event positions rather than expanding a uniform subdivision grid.
- For Groove-to-Fill Entry Timing this produces exactly:
  - `1 & 2 & 3 & 4 e & a`
  - positions `1:0, 1:2, 2:0, 2:2, 3:0, 3:2, 4:0, 4:1, 4:2, 4:3`.

## Canonical phrase after C7.20
One 4/4 bar:

- Beat 1: `K+HH`, then `HH` on `&`
- Beat 2: `S+HH`, then `HH` on `&`
- Beat 3: `K+HH`, then `HH` on `&`
- Beat 4: Snare `R L R L` on `4 e & a`

Count: `1 & 2 & 3 & 4 e & a`

## Verification / transport checks
Compiled and executed the non-React canonical transport modules directly with TypeScript 5.8.3.

Confirmed:

- `findTeachingDefinition('fill-groove-transition')` resolves to authored `comp-fill-entry`.
- Authored event count: **10**.
- Authored count: **`1 & 2 & 3 & 4 e & a`**.
- Event split: **6 groove events + 4 fill events**.
- Timeline positions preserve the 16th-note master grid while leaving Beats 1–3 `e/a` slots silent.
- Simultaneous voices preserved: `KICK+HI-HAT`, `SNARE+HI-HAT`.
- Formal verification remains **6 bars at 70 BPM**, approximately **20.57 seconds**.
- Changed and transport-related TypeScript files passed syntax transpilation.

A full repository `tsc --noEmit` remains blocked by pre-existing repository conditions unrelated to C7.20: dependencies are not installed in the working container, and the repository contains both `src/components` and legacy `src/Components` copies that TypeScript flags as case-duplicate files. C7.20 does not add or modify those legacy duplicates.

## Deployment test
After deploying C7.20, test **Groove-to-Fill Entry Timing** only:

1. Mission 1 should show exactly ten authored events: `K+HH, HH, S+HH, HH, K+HH, HH, R, L, R, L`.
2. Mission 2 must show exactly `1 & 2 & 3 & 4 e & a`; there must be no `e` or `a` on Beats 1–3.
3. Mission 3 Watch must audibly keep the final `3-&` hi-hat and enter snare on Beat 4 with no gap.
4. Mission 4 Follow memory map must show the same ten-event Groove → Fill map, not a 16-note tom fill.
5. Mission 5 Independent memory map must remain the same ten-event handoff while tutor audio is removed.
6. Once readiness is 6/6, formal verification must still be a governed **6-bar / 70 BPM** test.
7. Passing verification should advance to **Fill-to-Groove Beat-1 Recovery**.

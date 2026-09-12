# C7.19 — Groove-to-Fill Entry Timing

## Purpose
C7.19 turns **Groove-to-Fill Entry Timing** into a real transition lesson rather than a generic four-note fill. The competency now teaches and tests the exact handoff from an 8th-note groove through `3-&` into a 16th-note snare fill on `4-e-&-a`, without a pause, pickup or tempo jump.

## Canonical Transition Cycle
One governed cycle is one 4/4 bar:

- Beat 1: Kick + closed hi-hat, then hi-hat on `&`
- Beat 2: Snare + closed hi-hat, then hi-hat on `&`
- Beat 3: Kick + closed hi-hat, then hi-hat on `&`
- Beat 4: Snare `R L R L` on `4 e & a`

Count: `1 & 2 & 3 & 4 e & a`

The key skill is the seam between `3-&` and `4`: the final hi-hat upbeat must remain present, then the right hand moves directly to snare for the first fill stroke exactly on Beat 4.

## Changes

### `src/lib/teachingDefinitions.ts`
- Rebuilt `comp-fill-entry` as a mixed-grid groove-to-fill phrase.
- Added six real groove events across Beats 1–3 and four 16th-note fill events on Beat 4.
- Added simultaneous Kick+Hi-Hat and Snare+Hi-Hat voices instead of reducing the groove to single drum hits.
- Added explicit `groove` and `fill` roles so the transport preserves the musical handoff.
- Rewrote the learning explanation, listening target, mistakes and diagnostics around the `3-& -> 4` transition.
- Aligned the teaching certification description to six consecutive transition cycles at 70 BPM.

### `src/data/canonicalCurriculum.ts`
- Re-authored the canonical count as `1 & 2 & 3 & 4 e & a`.
- Replaced the generic "6 cycles" length with `6 bars (1 groove-to-fill cycle per bar)`.
- This lets the existing C4 verification transport count the six cycles directly instead of falling back to a wall-clock-only test.
- Updated the standard, duration criterion, musical application requirement and required limb pattern.

### `src/components/CountingTutorView.tsx`
- Added mixed-grid counting support.
- When a competency does not occupy every subdivision slot, count tokens are now bound to their authored beat/subdivision positions instead of being forced into a uniform mathematical grid.
- Groove-to-Fill therefore speaks/highlights `1 & 2 & 3 & 4 e & a` correctly while keeping 16th-note transport accuracy on Beat 4.

### `src/components/VisualRhythmTutor.tsx`
- Preserves simultaneous groove voices in Watch, Follow and Independent memory maps.
- `BOTH` events now show meaningful labels such as `K+HH` and `S+HH` rather than collapsing to a generic limb symbol.
- Surface labels show combinations such as `KICK + HI-HAT`.
- The motor reference is named **Groove → Fill Map** for this competency.

### `src/components/UnderstandStageView.tsx`
- Stage 1 now explains the mixed subdivision honestly: **8ths on Beats 1–3 • 16ths on Beat 4**.
- Simultaneous groove voices are visible in the clickable execution reference.
- The reference heading is now **Required Groove → Fill Handoff — Play This**.

### `src/lib/curriculumPracticeIntelligence.ts`
- Added six transition-specific mission labels and instructions:
  1. Map the Handoff
  2. Count the Handoff
  3. Hear the Seam
  4. Follow the Transition
  5. Enter the Fill Alone
  6. Repeat It Musically
- Each mission explicitly protects the final `3-&`, the right-hand move to snare and the unchanged quarter-note pulse.

## Regression Protection
- No readiness thresholds were changed.
- No evidence persistence rules were changed.
- No verification pass/fail self-check rules were changed.
- No earlier fill orchestration was rewritten.
- **Fill-to-Groove Beat-1 Recovery remains a separate next competency**, so C7.19 does not prematurely merge recovery/landing certification into entry timing.

## Validation
- TypeScript syntax transpilation: **PASS** for all six changed source files.
- Static canonical invariant checks: **PASS**.
- Verified transition event split: **6 groove events + 4 fill events**.
- Verified mixed count: **`1 & 2 & 3 & 4 e & a`**.
- Verified formal transport: **6 bars at 70 BPM ≈ 20.6 seconds**, bar-governed rather than timer-only.
- Verified simultaneous voice labels are preserved in Stage 1 and Watch/Follow/Independent.
- A full dependency install/build was attempted, but dependency installation timed out in the container; no dependency files were changed.

## Test target after deployment
1. Open **Groove-to-Fill Entry Timing** and start Mission 1.
2. Mission title should be **Map the Handoff**.
3. Stage 1 should show a real groove: `K+HH`, `HH`, `S+HH`, `HH`, `K+HH`, `HH`, followed by Snare `R L R L` on Beat 4.
4. The subdivision card should say **8ths on Beats 1–3 • 16ths on Beat 4**.
5. Mission 2 should show/speak exactly `1 & 2 & 3 & 4 e & a`; it must not insert `e/a` syllables into Beats 1–3.
6. Watch and Follow should audibly keep the hi-hat through `3-&`, then move to snare on Beat 4 with no silent gap.
7. Independent Play should retain the Groove → Fill memory map even though tutor audio is removed.
8. After the normal evidence requirements reach 6/6, **Run Verification** should show a **6-bar** governed test at **70 BPM**.
9. Passing formal verification should advance to **Fill-to-Groove Beat-1 Recovery**.

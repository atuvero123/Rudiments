# C7.18 — Basic Sixteenth-Note Fill Orchestration

## Purpose
C7.18 gives **Basic Sixteenth-Note Fills** its own complete canonical performance phrase instead of teaching the competency as only a four-stroke Beat-4 burst. The curriculum standard already describes a full-bar 16th-note stream; the teaching definition now matches that standard from Stage 1 through independent play and formal verification.

## Canonical Sixteenth-Note Fill
The competency now uses one explicit 16-stroke full-bar orchestration:

- Beat 1 (`1 e & a`): Snare — R L R L
- Beat 2 (`2 e & a`): High Tom — R L R L
- Beat 3 (`3 e & a`): Mid Tom — R L R L
- Beat 4 (`4 e & a`): Floor Tom — R L R L
- Next Beat 1: Crash + Kick landing

Count: `1 e & a 2 e & a 3 e & a 4 e & a -> [CRASH 1]`

The machine-readable sticking remains `R L` repeated 8 times so existing evidence and progression code continues to receive clean hand tokens. Surface movement is authored independently through the teaching events and `limbPattern`.

## Changes

### `src/lib/teachingDefinitions.ts`
- Replaced the old one-beat, four-note Beat-4 fill with a complete one-bar 16th-note phrase.
- Added all 16 authored events with exact beat/subdivision, hand, surface, accent and description.
- Added a four-zone descending path: Snare → High Tom → Mid Tom → Floor Tom.
- Preserved the next-bar Crash + Kick as the required landing.
- Updated learning explanation, listening target, mistakes and diagnostics for full-bar 16th-note control.
- Aligned the teaching certification tempo to the canonical 65 BPM standard.

### `src/data/canonicalCurriculum.ts`
- Replaced the generic "execute 16ths" application requirement with the exact full-bar surface path and next-bar landing requirement.
- Tempo, readiness, evidence thresholds and competency order are unchanged.

## Reuse of C7.17 Integrity Layer
No new UI fork was added. C7.18 intentionally reuses the generic fill-integrity work already locked in C7.17:

- Stage 1 renders only the authored fill cycle and shows a surface label on every stroke.
- Watch / Follow / Independent memory chips preserve hand + drum surface.
- The large Required Pattern card shows `limbPattern`, not hand sticking alone.
- Formal verification shows the same orchestration beneath the count/sticking standard.

This keeps the curriculum architecture generic while making the new competency content-specific.

## Regression Protection
- No changes to readiness thresholds, session-separation rules, verification pass logic, persistence or advancement.
- No changes to the C7.17 Eighth-Note Descending Fill.
- No change to the machine-readable 16-note sticking token sequence.
- Groove-to-Fill Entry remains a separate later competency; C7.18 teaches the full-bar fill itself rather than replacing that transition skill.

## Validation
- TypeScript syntax transpilation: **PASS** for both changed TS files.
- Static canonical invariant check: **PASS**.
- Full dependency install/build could not be completed in this container because `npm install` timed out; no dependency files were added or changed.

Validated canonical invariants:

- Event count: **16**
- Count tokens: **1 e & a 2 e & a 3 e & a 4 e & a**
- Surface distribution: **Snare 4 / High Tom 4 / Mid Tom 4 / Floor Tom 4**
- Sticking: **R L** × 8
- Formal tempo authority: **65 BPM**
- Landing requirement: **Crash + Kick on the next Beat 1**

## Test target after deployment
1. Open **Basic Sixteenth-Note Fills** and start Mission 1.
2. Stage 1 title should read **Basic Sixteenth-Note Fill & Orchestration**.
3. Exactly 16 authored stroke cards should appear, grouped naturally by the beat count.
4. Surface order should be Snare ×4 → High Tom ×4 → Mid Tom ×4 → Floor Tom ×4.
5. Mission 2 should count the full `1 e & a ... 4 e & a` grid.
6. Missions 3–6 must keep the surface labels in Watch, Follow and Independent modes.
7. The Required Pattern card should show the same full-bar surface path and next-1 landing.
8. When readiness reaches 6/6, Run Verification should show the full orchestration and use the canonical 65 BPM standard.
9. Passing verification should advance to **Groove-to-Fill Entry Timing** / the next governed competency exactly as before.

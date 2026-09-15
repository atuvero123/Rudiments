# C7.21 — Mixed-Grid Semantics & Verification Display Cleanup

## Why this build exists
C7.20 repaired the Groove-to-Fill transport itself, but two presentation details still made the correct behavior look less trustworthy:

1. the authored teaching card could still label the mixed phrase simply as **16th Notes**, even though Beats 1–3 are an 8th-note groove and only Beat 4 opens into 16ths;
2. a derived 6-bar verification length could surface as the raw recurring decimal `20.571428...s` in legacy/readiness rendering.

## Repairs

### `src/types.ts`
- Added optional `subdivisionDisplay` to `CompetencyTeachingDefinition`.
- This is deliberately presentation-only: transport math still uses the canonical `subdivision` and `subdivisionCount` fields.

### `src/lib/teachingDefinitions.ts`
- Groove-to-Fill Entry Timing now advertises the semantic display label:
  - **8th-note groove → 16ths on Beat 4**
- Its underlying master grid remains 16ths so the sparse mixed-grid transport introduced in C7.20 is unchanged.

### Teaching-facing UI
Updated:
- `src/components/UnderstandStageView.tsx`
- `src/components/CountingTutorView.tsx`
- `src/components/DrumNotationStaff.tsx`

Each now prefers `subdivisionDisplay` when present, while all ordinary competencies continue showing the original subdivision label.

### `src/lib/verificationTransportEngine.ts`
- Bar-governed derived seconds are rounded to one decimal at the transport authority boundary.
- Example: 6 bars × 4 pulses at 70 BPM now exposes **20.6s**, not `20.571428571428573s`.
- Completion remains governed by exact canonical pulse/bar count, not by the rounded wall-clock estimate.

## Expected C7.21 behavior
For **Groove-to-Fill Entry Timing**:

- teaching cards should read **4/4 · 8th-note groove → 16ths on Beat 4**;
- Mission 2 remains exactly `1 & 2 & 3 & 4 e & a`;
- Watch / Follow / Independent retain the 10-event C7.20 handoff;
- readiness/verifier length should present **6 bars (~20.6s)** (or **20.6s derived** where seconds are shown);
- the second qualifying separate-session requirement remains the only gate if readiness is still 5/6;
- formal verification still completes by **6 bars / 24 quarter-note pulses at 70 BPM**.

## Scope
C7.21 is a semantic/display cleanup only. It does not alter evidence rules, readiness thresholds, mission-stage authority, progression gates, or the C7.20 mixed-grid phrase.

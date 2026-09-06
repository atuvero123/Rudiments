# C6 BUILD REPORT — Curriculum Practice Intelligence

## Objective
Connect verified placement, canonical curriculum, teaching assistance, phrase awareness, musical transfer, and evidence collection into one governed competency-learning loop without skipping or auto-certifying curriculum skills.

## Implemented
- Preserves C5 placement calibration and all prior canonical verification storage.
- Adds a C6-specialized canonical learning journey for **Understanding 4/4 Bar Structure**.
- Intermediate verified placement now personalizes the starting tempo/depth while keeping every canonical mission available.
- Adds eight governed missions:
  1. Feel One Bar
  2. Hear the Barline
  3. Four-Bar Phrase
  4. Eight-Bar Structure
  5. Section Awareness
  6. Reduced Guidance
  7. Independent Phrase Test
  8. Musical Transfer
- Adds live C6 phrase/bar visualizer with current bar, current beat, phrase landmarks, and musical-section labels.
- Expands the master transport timeline to the real mission bar count instead of looping a two-bar definition.
- Mission metadata selects the appropriate entry stage and assistance target (Full / Reduced / Independent) while preserving the existing six-stage C2 teaching continuum.
- Contextual pattern presentation: 4/4 Bar Structure no longer presents arbitrary sticking as the learning target; it shows beat/bar structure instead.
- Adds persistent C6 Curriculum Evidence Ledger with unique run IDs, timestamps, assistance level, conceptual/execution flags, musical application evidence, separate-session counts, and readiness criteria.
- C6 ordinary practice evidence never automatically certifies the competency; C4 formal verification remains authoritative.
- Path view now shows C6 evidence readiness for the active 4/4 Bar Structure competency.
- API version bumped to `c6.0`.

## Evidence safeguards
- Evidence records are written only from evaluated exercise runs.
- Each record has a unique run ID and session ID.
- Separate-session readiness cannot be satisfied by repeated taps in one run.
- Full Tutor, Reduced Tutor, and Independent evidence remain distinguishable.
- Musical application is tracked separately from conceptual and independent execution evidence.

## Validation performed
- TypeScript core C6 engine + shared types compile: passed.
- Full TS/TSX syntax transpile scan: passed.
- Relative import scan: 0 missing imports.
- Vercel API JavaScript syntax checks: passed.
- Full npm dependency install was attempted but timed out in the execution environment, so final production bundling remains Vercel's deployment check.

## First production validation
After deployment:
1. Confirm `/api/health` reports `apiVersion: "c6.0"`.
2. Confirm Path still shows the existing **Intermediate verified** placement.
3. Open Path → Understanding 4/4 Bar Structure → Practice This Competency.
4. Confirm Mission 1 opens as **Feel One Bar** with the C6 bar/beat visualizer.
5. Confirm the primary structure display is beat/bar structure rather than an arbitrary R/L sticking pattern.
6. Do not complete the whole journey yet; capture Mission 1 and evidence-ledger screenshots first.

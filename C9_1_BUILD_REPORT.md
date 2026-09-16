# C9.1 Lock Patch — Live Section Responsibility Sync

## Baseline
C9.1 is a narrow lock patch on top of `Rudiments-C9-Rebase`.

C9 already made Single Paradiddle / Double Stroke Mission 6 a real five-bar musical application:

- Bars 1–3: GROOVE
- Bar 4: HANDOFF + FILL
- Bar 5: LAND + RECOVER

The remaining issue exposed by deployment was visual/live-instruction drift: the transport could be on Bar 4 or Bar 5 while the large responsibility card and beat subtitles still inherited the generic `GROOVE` label.

## What C9.1 changes

Updated: `src/components/VisualRhythmTutor.tsx`

### 1. Canonical curriculum section now owns the live Mission 6 cue
During independent PLAY for a rudiment musical-application mission, the large live instruction now follows the authored five-bar section:

- Bars 1–3: `GROOVE: Stay in Time with Relaxed Pulse`
- Bar 4, Single Paradiddle: `HANDOFF + FILL: Keep the Paradiddle Intact`
- Bar 4, other rudiments: `HANDOFF + FILL: Keep the Rudiment Intact`
- Bar 5: `LAND + RECOVER: Crash + Kick, Then Re-enter the Groove`

This is derived from the canonical curriculum structure using the live transport bar, not inferred from the older generic `phraseStage` alone.

### 2. Beat-card responsibility labels follow the active section
The four beat cards no longer remain labelled `GROOVE` for the whole five-bar phrase.

- Groove section: all four beat cards show `GROOVE`.
- Bar 4: Beats 1–2 show `HANDOFF`; Beats 3–4 show `FILL`.
- Bar 5: Beat 1 shows `LAND`; Beats 2–4 show `RECOVER`.

### 3. C9 landing no longer inherits the legacy Bar-2 landing marker
For a qualified rudiment musical-application mission, landing detection now comes from the canonical `LAND + RECOVER` section. The generic legacy `Bar 2 / Beat 1` landing marker is bypassed.

This keeps the visible transport consistent with the C9 authored phrase where the real Crash + Kick landing occurs on Bar 5 Beat 1.

### 4. Regression protection for Double Stroke Roll
The Bar-4 cue is competency-safe: Paradiddle gets the specific `Keep the Paradiddle Intact` wording; other rudiments use `Keep the Rudiment Intact` rather than incorrectly inheriting Paradiddle language.

## Validation performed

### TSX syntax / transpilation
Passed using TypeScript 5.8.3 `transpileModule` for:

- `src/components/VisualRhythmTutor.tsx`

### C9.1 source assertions
Passed checks for:

- Groove live cue
- Paradiddle handoff cue
- Generic rudiment handoff cue
- Land + recover cue
- Bar-4 HANDOFF/FILL beat-role split
- Bar-5 LAND/RECOVER beat-role split
- C9-specific suppression of the old Bar-2 landing assumption

### Existing C9 canonical structure rechecked
Confirmed in `curriculumPracticeIntelligence.ts`:

- totalBars = 5
- GROOVE = Bars 1–3
- HANDOFF + FILL = Bar 4
- LAND + RECOVER = Bar 5

### Full Vite production build note
The source archive does not contain `node_modules`. A dependency installation attempt timed out in this environment, so the full Vite production build was not completed here. The changed TSX file passed syntax/transpilation validation.

## Deployment check
After deploying C9.1, test **Single Paradiddle — Mission 6** and let the Musical Application run through all five bars.

Expected live responsibility sequence:

1. Bars 1–3: `GROOVE`
2. Bar 4 Beats 1–2: `HANDOFF`
3. Bar 4 Beats 3–4: `FILL`
4. Bar 5 Beat 1: `LAND`
5. Bar 5 Beats 2–4: `RECOVER`

The large live banner should change at the same section boundaries. Then repeat Mission 6 with Double Stroke Roll to confirm its Bar-4 cue says `Keep the Rudiment Intact` and does not mention Paradiddle.

## Files changed
- `src/components/VisualRhythmTutor.tsx`
- `C9_1_BUILD_REPORT.md`

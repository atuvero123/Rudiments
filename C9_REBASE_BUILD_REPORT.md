# C9 Rebase Build Report — Rudiment Musical Phrase Authority

## Baseline
This build is rebased directly on the corrected C8 code package supplied by the user. It does not apply the older C9 package over C8.

## Goal
C8 correctly separated rudiment technical execution from musical application, but the corrected deployment exposed two remaining transfer problems:

1. Mission 6 could still inherit the generic C7 16-bar structure even though the rudiment application itself was authored as a much shorter groove → fill → landing task.
2. The independent-memory grid could render the long instructional sentence in `teachingDef.sticking` as fake playable cells (for example: `Bars`, `1–3`, `groove`, `Beat`, `parad...`).

C9 makes the authored musical phrase authoritative from transport through display and evidence.

## What changed

### 1. Real five-bar rudiment application phrase
Updated: `src/lib/rudimentApplicationEngine.ts`

New evidence contract:

`C9_RUDIMENT_ORCHESTRATION_V2`

Mission 6 now owns one canonical five-bar phrase:

- Bars 1–3: settled kick/snare/closed-hi-hat groove.
- Bar 4 Beats 1–2: groove continues unchanged.
- Bar 4 Beats 3–4: the canonical rudiment becomes the fill.
- Bar 5 Beat 1: Crash + Kick landing.
- Bar 5 remainder: immediate groove recovery.

The Beat-1 landing is now a real authored event at Bar 5, rather than being implied by text or borrowed from the beginning of the phrase.

For Single Paradiddle, C9 preserves `RLRR LRLL`; the accented lead notes move to toms while the inner notes remain controlled on snare.

### 2. Mission 6 no longer becomes a generic 16-bar form
Updated: `src/lib/curriculumPracticeIntelligence.ts`, `src/components/VisualRhythmTutor.tsx`

Rudiment musical application receives a dedicated 5-bar curriculum structure with three sections:

- GROOVE — Bars 1–3
- HANDOFF + FILL — Bar 4
- LAND + RECOVER — Bar 5

The generic C7 structure-expansion path explicitly skips the qualified rudiment application renderer, so the transport, bar visualizer, authored events and phrase length remain aligned.

### 3. Independent-memory display now shows playable musical information
Updated: `src/components/VisualRhythmTutor.tsx`

C9 no longer splits the application instruction sentence into playable cells.

The Mission 6 memory map now displays:

- `GROOVE ×3` for Bars 1–3,
- the actual Bar-4 groove and rudiment-fill events with count positions and drum surfaces,
- explicit `CRASH + KICK` on Bar 5 Beat 1,
- `RECOVER` for the remainder of Bar 5.

This keeps the map compact enough for mobile while preserving the actual performance task.

### 4. Landing language and transport cue are aligned
Updated: `src/components/VisualRhythmTutor.tsx`

The live landing cue now names Bar 5 Beat 1 for C9 application missions and explicitly instructs immediate groove recovery.

The separate generic landing chip is suppressed for C9 Mission 6 because the landing is already represented inside the canonical application map.

### 5. C9 evidence cannot be inferred from older generic attempts
Updated: `src/types.ts`, `src/lib/evidenceEngine.ts`, `src/components/GuidedPracticeSession.tsx`, `src/lib/curriculumPracticeIntelligence.ts`

Generic attempt evidence now persists:

- `applicationKind`
- `applicationEvidenceVersion`

Fallback curriculum-evidence reconstruction accepts rudiment musical application only when the attempt explicitly carries:

- `challengeType: kit-orchestration`
- `applicationKind: RUDIMENT_ORCHESTRATION`
- `applicationEvidenceVersion: C9_RUDIMENT_ORCHESTRATION_V2`

This prevents a C8 or pre-C8 generic attempt from being silently upgraded into C9 evidence.

### 6. Targeted continuation is rebased to C9
Updated: `src/lib/curriculumPracticeIntelligence.ts`, `src/components/PathView.tsx`

`buildC9RudimentMusicalApplicationSession(...)` replaces the C8 continuation entry point.

The continuation still preserves Missions 1–5 and asks only for the corrected Mission 6 transfer task when musical-application evidence is the remaining gap.

## Validation performed

### Pure TypeScript authority check
Passed:

`npx tsc --noEmit --skipLibCheck --moduleResolution bundler --module esnext --target es2022 src/lib/rudimentApplicationEngine.ts src/lib/curriculumPracticeIntelligence.ts src/lib/evidenceEngine.ts src/types.ts`

### TSX syntax check
Passed for:

- `src/components/VisualRhythmTutor.tsx`
- `src/components/GuidedPracticeSession.tsx`
- `src/components/PathView.tsx`

### Functional phrase test
Passed for Double Stroke Roll and Single Paradiddle:

- Exactly 5 authored bars are present.
- Total authored event count: 44.
- Exactly 8 rudiment-fill events occur on Bar 4 Beats 3–4.
- Exactly one landing event occurs on Bar 5 Beat 1.
- Landing surfaces are Crash + Kick.
- Seven subsequent Bar-5 events are marked as groove recovery.
- Double Stroke fill maps `RR / LL / RR / LL` across Snare → High Tom → Mid Tom → Floor Tom.
- Single Paradiddle preserves `RLRR LRLL`; only accented lead notes move to toms.

### Full Vite build note
The uploaded source package contains no `node_modules`. Dependency installation timed out in this container, so a complete Vite production build was not executed here. The modified pure TypeScript authority files pass type-checking and the modified TSX files pass TypeScript syntax transpilation.

## Deployment test
After deploying C9-Rebase, test **Single Paradiddle — Mission 6** first:

1. Mission 6 should still read `APPLICATION / ORCHESTRATE`.
2. The curriculum phrase visualizer should describe a 5-bar application phrase, not a 16-bar song form.
3. The independent-memory map must no longer show sentence fragments such as `Bars`, `1–3`, `groove`, `Beat`, `parad...`.
4. It should show `GROOVE ×3`, the Bar-4 handoff/fill, `CRASH + KICK`, and `RECOVER`.
5. Start Musical Application and confirm the phrase reaches Bar 5 Beat 1 before the loop completes.
6. Confirm the Crash + Kick landing is followed immediately by the groove recovery bar.
7. Save a Clean & Relaxed Mission 6 result and confirm `Rudiment applied musically` is satisfied from fresh C9 evidence.
8. Then repeat Mission 6 with Double Stroke Roll as the regression check.

## Files changed
- `src/lib/rudimentApplicationEngine.ts`
- `src/lib/curriculumPracticeIntelligence.ts`
- `src/lib/evidenceEngine.ts`
- `src/types.ts`
- `src/components/VisualRhythmTutor.tsx`
- `src/components/GuidedPracticeSession.tsx`
- `src/components/PathView.tsx`
- `C9_REBASE_BUILD_REPORT.md`

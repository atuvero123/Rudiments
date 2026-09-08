# C7.10 — Formal Verification Integrity & True Notation Sight-Read

## Field result that triggered this pass
The live C7.9 notation-verification screenshots exposed two certification-critical defects:

1. **The notation test did not display a notation chart during the live run.** The modal showed only generic beat boxes, so a learner could complete and self-pass a "sight-reading" verification without any written music to read.
2. **The C4 metronome was wired with its arguments reversed.** `audioEngine.startMetronome()` expects `(bpm, beatsInBar, subdivision)`, but the verifier passed `(bpm, 1, beatsPerBar)`. In 4/4 this generated subdivision-rate clicks instead of a true 70/80 BPM quarter-note pulse.

Because the same verifier was used by the earlier 4/4 formal test, old C4 checkpoint passes from that verifier cannot be treated as authoritative certification evidence.

## Changes

### 1. Correct C4 metronome timing
`src/components/CompetencyVerificationModal.tsx`

Formal verification now calls:

`startMetronome(targetBpm, beatsPerBar, 1, ...)`

A displayed 70 BPM or 80 BPM verification therefore produces a genuine quarter-note click at that tempo.

### 2. True eight-bar notation verification stimulus
`src/lib/notationProgression.ts`
`src/components/CompetencyVerificationModal.tsx`

Added a dedicated eight-bar formal notation chart built from changing basic, rest-awareness, syncopated and mixed-reading bars.

For `comp-reading-notation`:
- the chart remains hidden before Start and throughout the count-in;
- it appears only during LIVE VERIFICATION;
- only four bars are shown at once on mobile, then the second four-bar page appears automatically at bar 5;
- no count labels are shown;
- no moving playhead is shown;
- no HH/S/K voice-position labels are shown;
- no legend/sticking guide is shown;
- no tutor drum performance is played;
- the metronome is the only timing aid.

The notation verifier is governed by **eight completed bars**, not by an arbitrary visible countdown. After the final written beat, the test stops before introducing another unnotated downbeat.

### 3. Staff renderer can remove teaching assistance
`src/components/DrumNotationStaff.tsx`

Added optional display controls while preserving existing lesson defaults:
- `showCounts`
- `showPlayhead`
- `showVoiceLabels`
- `showBarLabels`
- `showInstruction`

Ordinary C7 lessons retain their existing guidance. Formal notation verification disables all of the above assistance.

### 4. C4 verification protocol versioning
`src/lib/canonicalProgressEngine.ts`
`src/lib/competencyAdvancementEngine.ts`

Added protocol marker:

`c4-verifier-v2`

New C4 checkpoint passes are recorded with that protocol. Historical `checkpoint` records without the v2 marker remain in local storage for audit but no longer count as canonical verification.

`placement_test` verification records are unaffected because the placement engine did not use the broken C4 verifier.

### 5. Automatic integrity rollback without deleting practice evidence
On first load after C7.10, any competency whose only canonical verification came from the pre-v2 C4 modal becomes unverified again. Existing C7 learning evidence, independent-clean runs, musical-use evidence and readiness are preserved.

For the field state that triggered this build, this means:
- **Understanding 4/4 Bar Structure** returns to the formal-verification gate but keeps its 6/6 learning/readiness evidence;
- after re-verifying 4/4 with the corrected 80 BPM click, **Drum Notation Basics** becomes active again with its existing 6/6 evidence and can immediately take the corrected notation verification;
- no full curriculum-practice journey needs to be repeated.

### 6. Notation terminology cleanup restored
`src/components/PathView.tsx`
`src/data/canonicalCurriculum.ts`

The active notation card no longer labels `K / S / HH` as a "Required Pattern — Play This". It now presents a **Notation Voice Map**, avoiding the implication that notation should be memorized as a sticking sequence.

### 7. Readiness card uses bar-based notation wording
`src/components/AdvancementReadinessCard.tsx`

The notation C4 card now reports **Test Length: 8 bars** instead of framing sight-reading as an arbitrary seconds-only test.

## Files changed
- `src/components/CompetencyVerificationModal.tsx`
- `src/components/DrumNotationStaff.tsx`
- `src/components/AdvancementReadinessCard.tsx`
- `src/components/PathView.tsx`
- `src/lib/notationProgression.ts`
- `src/lib/canonicalProgressEngine.ts`
- `src/lib/competencyAdvancementEngine.ts`
- `src/data/canonicalCurriculum.ts`
- `C7_10_BUILD_REPORT.md`
- `README.md`

## Validation
- Focused TypeScript compilation of canonical curriculum, teaching definitions, notation progression, canonical progress and C4 advancement engines: **PASS**.
- Full source TypeScript scan: no source/syntax errors beyond expected missing installed dependency/type-resolution errors (`react`, `lucide-react`, Vite/Node types) in this dependency-free workspace.
- Static verifier integrity checks: **PASS**.
  - corrected metronome argument order;
  - eight authored notation bars;
  - notation chart rendered only in LIVE VERIFICATION;
  - formal staff has no count labels/playhead/voice labels/legend/instruction;
  - old unversioned C4 checkpoint records no longer certify progression;
  - new passes write `c4-verifier-v2`;
  - Path notation terminology uses `Notation Voice Map`.
- No dependency or package-version changes.

## Field validation checklist
1. Deploy C7.10 **without clearing browser storage**.
2. Open Path. Because the previous C4 verifier was invalid, expect **Understanding 4/4 Bar Structure** to become the active verification gate again. Its accumulated learning/readiness evidence should remain intact and it should be ready to verify without repeating lessons.
3. Run the 4/4 verification. Confirm the click now feels like a true **80 BPM quarter-note pulse**, not the fast subdivision-rate click from the previous build.
4. Save the result honestly. On a pass, Drum Notation Basics should become active again with its existing 6/6 evidence and Ready to Verify state.
5. Run notation verification.
6. Before Start and during count-in: **no chart visible**.
7. During LIVE VERIFICATION: written staff appears, four bars at a time, with no counts, playhead, voice labels or sticking guide; the second page appears at bar 5.
8. Confirm the metronome is a true **70 BPM quarter-note pulse** and no tutor drum performance is heard.
9. After all eight bars, self-assess honestly and save.
10. On a pass, Unit 1 should complete and Unit 2 should unlock, preserving any previously banked Unit 2 evidence.

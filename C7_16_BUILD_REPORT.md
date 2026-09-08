# C7.16 Build Report — Musical Balance & Cymbal Sensitivity

## Purpose
C7.16 gives **Musical Balance & Cymbal Sensitivity** its own canonical teaching journey instead of letting it fall through the generic dynamics fallback. The competency now teaches an actual three-voice groove relationship: **soft closed hi-hat on all 8ths, firm snare on 2 & 4, and punchy kick on 1 & 3**.

This build starts from the validated **C7.15.1** codebase. The C7.15/C7.15.1 governed mission-completion and verification fixes are preserved.

## Canonical standard preserved
- Competency: `comp-dyn-song-balance`
- Target: CLEAN
- Meter: 4/4
- Tempo: 75 BPM
- Subdivision: 8th notes
- Certification length: 8 bars
- Canonical standard: `8 bars demonstrating soft cymbals and firm backbeat at 75 BPM`
- Verification transport remains bar-governed: 8 bars × 4 pulses = 32 pulses = 25.6 seconds at 75 BPM.

## What changed

### 1. Canonical pattern corrected
`src/data/canonicalCurriculum.ts`

The generic text was replaced with an executable musical pattern:
- Count: `1 & 2 & 3 & 4 &`
- Required voice map: `Soft HH on all 8ths • firm Snare on 2 & 4 • punchy Kick on 1 & 3`

### 2. Authored teaching definition added
`src/lib/teachingDefinitions.ts`

The competency now owns an 8-event one-bar teaching source:
- Beat 1: Kick + soft closed hi-hat
- 1 &: soft closed hi-hat
- Beat 2: Snare + soft closed hi-hat
- 2 &: soft closed hi-hat
- Beat 3: Kick + soft closed hi-hat
- 3 &: soft closed hi-hat
- Beat 4: Snare + soft closed hi-hat
- 4 &: soft closed hi-hat

It also has competency-specific explanations, listening targets, musical application, common mistakes and diagnostic issue tags.

### 3. Dedicated DYNAMICS pedagogy profile
`src/lib/curriculumPedagogyEngine.ts`

The pattern is now **REQUIRED**, not an optional generic dynamics suggestion. The journey explicitly teaches:
- volume hierarchy,
- pulse stability while dynamics change,
- recognition of cymbal wash,
- guided balance,
- independent balance,
- musical dynamics that serve a song.

### 4. Six-mission C7.16 journey
`src/lib/curriculumPracticeIntelligence.ts`

The competency now receives this progression:
1. **Map the Volume Hierarchy** — 2 bars — FULL
2. **Count Without Swelling** — 4 bars — FULL
3. **Hear the Balance** — 4 bars — FULL
4. **Follow the Dynamic Shape** — 8 bars — REDUCED
5. **Balance the Kit Alone** — 8 bars — NONE
6. **Shape Verse & Chorus** — 8 bars — NONE

Mission 6 is an authored 8-bar form:
- Bars 1–4: VERSE — controlled cymbals with kick/snare clearly above them
- Bars 5–8: CHORUS — lift kick/snare intent while cymbals remain controlled and tempo stays unchanged

The 8-bar journey intentionally matches this competency's actual certification standard; it does not inherit the 16-bar Groove Stability transport.

### 5. Simultaneous-voice teaching preview
`src/components/UnderstandStageView.tsx`

A teaching event with multiple voices now auditions the whole authored event rather than only its primary surface. This means the learner can hear kick + hi-hat and snare + hi-hat relationships in the Understand stage.

For this competency the execution reference is labelled **Required Dynamic Voice Map — Play This**.

### 6. Dynamic voice map in the visual tutor
`src/components/VisualRhythmTutor.tsx`

The generic word-split dynamics display is replaced by the authored 8-event voice map. The learner sees the real sequence and the intended hierarchy using **STRONG / SOFT** semantics rather than a meaningless split of the descriptive sentence.

## Evidence and progression rules intentionally unchanged
C7.16 does **not** weaken certification governance. In particular:
- guided work still does not count as independent evidence,
- readiness still requires the governed C4 criteria,
- independent evidence remains session/day controlled,
- formal verification remains a separate certification attempt,
- the C7.15.1 completion latch remains intact,
- previously verified competencies are not reset or reclassified.

## Validation performed

### Core TypeScript compile
Passed for the changed curriculum/intelligence logic and its core dependencies using TypeScript ES2022/bundler resolution.

### TSX syntax validation
Passed for:
- `src/components/UnderstandStageView.tsx`
- `src/components/VisualRhythmTutor.tsx`

### Runtime assertions
Passed for the C7.16 canonical path:
- six missions generated,
- bar ladder = `[2, 4, 4, 8, 8, 8]`,
- assistance ladder = `[FULL, FULL, FULL, REDUCED, NONE, NONE]`,
- authored teaching definition = 8 events,
- dynamics pattern display = REQUIRED,
- Mission 6 contains VERSE + CHORUS sections,
- formal verification derives 8 bars / 32 pulses / 25.6 seconds at 75 BPM.

A complete Vite production build was not run in this workspace because project npm dependencies are not installed here. No claim is made that an npm/Vite build was executed; the source-level compile, syntax and runtime logic checks above did pass.

## Suggested deployment test
After deploying C7.16:
1. Open **Musical Balance & Cymbal Sensitivity**.
2. Confirm Mission 1 displays the real soft-HH / firm-snare / punchy-kick voice map rather than a generic snare-only dynamics pattern.
3. Tap individual teaching events and confirm combined kick+hat / snare+hat events sound together.
4. Work through Missions 1–4 and confirm the journey changes from FULL to REDUCED assistance.
5. Confirm Missions 5 and 6 are 8-bar independent/musical tasks.
6. In Mission 6, confirm the visual form changes from VERSE (Bars 1–4) to CHORUS (Bars 5–8).
7. Finish the session and confirm evidence accumulates normally without bypassing readiness.
8. Once readiness reaches 6/6, confirm formal verification is an 8-bar, 75 BPM bar-governed test and that a pass advances to the next canonical competency.

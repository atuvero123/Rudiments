import {
  PracticeExercise,
  RhythmTimeline,
  RhythmEvent,
  LimbAssignment,
  InstrumentSurface,
  RhythmEventRole,
  CompetencyTeachingDefinition,
} from '../types';

/**
 * RHYTHM TIMELINE ENGINE
 * Generates structured, musically accurate rhythmic event graphs for placement exercises,
 * rudiments, fills, downbeat landings, and groove returns.
 */

export function buildRhythmTimeline(exercise: PracticeExercise): RhythmTimeline {
  const isPad = exercise.equipmentRequired === 'Practice Pad';
  const equipment = isPad ? 'Practice Pad' : 'Full Drum Kit';
  const title = exercise.title;
  const timeSignature = exercise.timeSignature || '4/4';
  const beatsPerBar = 4;

  // Detect phrase layout
  const isOneBeatFill = title.includes('1 beat') || exercise.musicalPlacement?.phraseLength === '1 beat';
  const isTwoBeatFill = title.includes('2 beats') || exercise.musicalPlacement?.phraseLength === '2 beats';
  const isSixStrokeRoll = exercise.skillIds?.some(id => id.includes('six-stroke')) || title.includes('Six Stroke Roll');
  const isParadiddle = exercise.skillIds?.some(id => id.includes('paradiddle')) || title.includes('Paradiddle');
  const isRLK = exercise.skillIds?.some(id => id.includes('rlk')) || title.includes('RLK');
  const isTransferOrReturn = exercise.progressionStage === 'TRANSFER' || title.includes('Downbeat Landing') || title.includes('Groove Return');
  const isWarmup = exercise.phase === 'WARM UP' || exercise.exerciseType === 'warmup';
  const isCalibration = title.includes('Calibration') || exercise.phase === 'FOUNDATION' || (!isOneBeatFill && !isTwoBeatFill && !isTransferOrReturn && !isWarmup);

  // We build a standard canonical 2-bar cycle for placement and transfer:
  // Bar 1: Groove (Beats 1-3) -> Fill (Beat 4) [or Beats 1-2 Groove -> Beats 3-4 Fill]
  // Bar 2: Beat 1 Landing (Crash + Kick) -> Beats 2-4 Groove Return
  const totalBars = isCalibration || isWarmup ? 1 : 2;
  const totalBeats = totalBars * beatsPerBar; // 8 beats for 2 bars

  const events: RhythmEvent[] = [];

  if (isWarmup) {
    // 1 bar of steady 8th-note groove pulse
    for (let beat = 1; beat <= 4; beat++) {
      for (let sub = 0; sub < 2; sub++) {
        const countLabel = sub === 0 ? `${beat}` : '&';
        const isDownbeat = beat === 1 && sub === 0;
        const hand = (beat % 2 === 1 ? (sub === 0 ? 'R' : 'L') : (sub === 0 ? 'R' : 'L')) as 'R' | 'L';
        const globalBeatOffset = (beat - 1) + sub * 0.5;
        const timeOffset = globalBeatOffset / 4.0;
        
        events.push({
          id: `warmup-b${beat}-s${sub}`,
          barNumber: 1,
          beatNumber: beat,
          subdivisionIndex: sub,
          totalSubdivisionsInBeat: 2,
          countLabel,
          role: 'groove',
          limb: hand,
          hand,
          surface: isPad ? 'center' : (sub === 0 && (beat === 1 || beat === 3) ? 'kick' : sub === 0 && (beat === 2 || beat === 4) ? 'snare' : 'hihat'),
          surfaceLabel: isPad ? 'Pad Center' : (beat === 1 || beat === 3 ? 'Kick + Hat' : 'Snare + Hat'),
          isAccented: isDownbeat,
          velocity: isDownbeat ? 0.85 : 0.6,
          noteLabel: hand,
          description: isDownbeat ? 'Steady downbeat pulse' : 'Alternating groove tap',
          timeOffsetInPhrase: timeOffset,
          durationFraction: 0.5 / 4.0,
        });
      }
    }

    return {
      id: `timeline-${exercise.id}`,
      title: exercise.title,
      timeSignature: '4/4',
      beatsPerBar: 4,
      totalBars: 1,
      subdivisionType: '8th Notes',
      totalEvents: events.length,
      events,
      grooveSummary: 'Beats 1–4: Steady alternating 8th-note pulse to align micro-timing',
      fillSummary: 'N/A (Steady pulse training)',
      landingSummary: 'Beat 1: Relaxed downbeat anchor',
      grooveReturnSummary: 'Continuous steady pulse loop',
      equipment,
    };
  }

  if (isCalibration) {
    // 2-bar Call & Response structure for isolated rudiment calibration:
    // Bar 1: Tutor Demonstration (audible dynamic balance & clean spacing)
    // Bar 2: Intentional Learner Space (student executes matching phrase with metronome timekeeper)
    const calibTotalBars = 2;
    const calibTotalBeats = calibTotalBars * beatsPerBar; // 8 beats

    if (isSixStrokeRoll) {
      // Six Stroke Roll: >R L L R R >L (6 notes per beat in 16th-note sextuplets)
      const ssrPattern = [
        { hand: 'R' as const, accented: true, surface: 'right_zone' as const, label: '>R', countName: '' },
        { hand: 'L' as const, accented: false, surface: 'center' as const, label: 'L', countName: 'e' },
        { hand: 'L' as const, accented: false, surface: 'center' as const, label: 'L', countName: '&' },
        { hand: 'R' as const, accented: false, surface: 'center' as const, label: 'R', countName: 'a' },
        { hand: 'R' as const, accented: false, surface: 'center' as const, label: 'R', countName: 'ta' },
        { hand: 'L' as const, accented: true, surface: 'left_zone' as const, label: '>L', countName: 'la' },
      ];

      // BAR 1: Tutor Audible Demonstration across 4 Beats
      for (let beat = 1; beat <= 4; beat++) {
        ssrPattern.forEach((st, idx) => {
          const globalBeat = (beat - 1) + (idx / 6);
          const timeOffset = globalBeat / calibTotalBeats;
          const countLabel = idx === 0 ? `${beat}` : idx === 1 ? 'e' : idx === 2 ? '&' : idx === 3 ? 'a' : idx === 4 ? 'ta' : 'la';

          events.push({
            id: `calib-tutor-b${beat}-n${idx}`,
            barNumber: 1,
            beatNumber: beat,
            subdivisionIndex: idx,
            totalSubdivisionsInBeat: 6,
            countLabel,
            role: 'fill',
            limb: st.hand,
            hand: st.hand,
            surface: isPad ? st.surface : (st.accented ? (st.hand === 'R' ? 'tom_high' : 'snare') : 'snare'),
            surfaceLabel: isPad ? (st.surface === 'center' ? 'Center Doubles' : st.surface === 'right_zone' ? 'Right Accent' : 'Left Accent') : 'Snare / Tom',
            isAccented: st.accented,
            velocity: st.accented ? 0.95 : 0.45,
            noteLabel: st.label,
            description: st.accented ? `Bar 1 Beat ${beat}: Accent ${st.hand}` : `Bar 1 Beat ${beat}: Inner double ${st.hand}`,
            timeOffsetInPhrase: timeOffset,
            durationFraction: (1 / 6) / calibTotalBeats,
            isTutorAudible: true,
            assistanceContract: {
              audibleAt: st.accented ? ['FULL', 'REDUCED'] : ['FULL'],
              visuallyActiveAt: st.accented ? ['FULL', 'REDUCED', 'MINIMAL'] : ['FULL'],
              showHandGuidanceAt: ['FULL'],
              cueType: st.accented ? 'accent' : 'inner_note',
            },
          });
        });
      }

      // BAR 2: Intentional Learner Space (Student Repetition with Metronome Reference)
      for (let beat = 1; beat <= 4; beat++) {
        ssrPattern.forEach((st, idx) => {
          const globalBeat = 4 + (beat - 1) + (idx / 6);
          const timeOffset = globalBeat / calibTotalBeats;
          const countLabel = idx === 0 ? `${beat}` : idx === 1 ? 'e' : idx === 2 ? '&' : idx === 3 ? 'a' : idx === 4 ? 'ta' : 'la';

          events.push({
            id: `calib-learner-b${beat}-n${idx}`,
            barNumber: 2,
            beatNumber: beat,
            subdivisionIndex: idx,
            totalSubdivisionsInBeat: 6,
            countLabel,
            role: 'learner_space',
            limb: st.hand,
            hand: st.hand,
            surface: isPad ? st.surface : 'snare',
            surfaceLabel: isPad ? 'Pad Student Space' : 'Kit Student Space',
            isAccented: st.accented,
            velocity: st.accented ? 0.95 : 0.45,
            noteLabel: st.label,
            description: `Bar 2 Beat ${beat}: Learner Space (${st.label})`,
            timeOffsetInPhrase: timeOffset,
            durationFraction: (1 / 6) / calibTotalBeats,
            isLearnerSpace: true,
            learnerSpaceInfo: {
              purpose: 'Calibrate Six Stroke Roll dynamic balance and double stroke spacing independently',
              expectedLearnerAction: 'Play matching Six Stroke Roll with clean accents on >R and >L',
              durationBeats: 4,
              isIntentionalSilence: true,
            },
            isTutorAudible: false,
            assistanceContract: {
              audibleAt: [],
              visuallyActiveAt: ['FULL', 'REDUCED', 'MINIMAL'],
              showHandGuidanceAt: ['FULL'],
              cueType: 'learner_repetition',
            },
          });
        });
      }

      return {
        id: `timeline-${exercise.id}`,
        title: exercise.title,
        timeSignature: '4/4',
        beatsPerBar: 4,
        totalBars: 2,
        subdivisionType: 'Sextuplets (16th Triplets)',
        totalEvents: events.length,
        events,
        grooveSummary: 'Bar 1: Tutor Demonstration of Six Stroke Roll dynamic balance',
        fillSummary: 'Six Stroke Roll (>R L L R R >L) with distinctive accent heights',
        landingSummary: 'Bar 2: Intentional Learner Space for student calibrated execution',
        grooveReturnSummary: 'Seamless continuous Call & Response cycle',
        equipment,
        hasLearnerSpace: true,
        learnerSpaceSummary: 'Bar 2 provides intentional learner space for student calibration without tutor audio interference.',
      };
    } else {
      // Standard rudiment calibration (e.g. Single Paradiddle / 16ths)
      const defStrokes = [
        { hand: 'R' as const, accented: true, label: '>R' },
        { hand: 'L' as const, accented: false, label: 'L' },
        { hand: 'R' as const, accented: false, label: 'R' },
        { hand: 'R' as const, accented: false, label: 'R' },
      ];

      for (let beat = 1; beat <= 4; beat++) {
        defStrokes.forEach((st, idx) => {
          const globalBeat = (beat - 1) + (idx / 4);
          const timeOffset = globalBeat / calibTotalBeats;
          events.push({
            id: `calib-def-tutor-b${beat}-n${idx}`,
            barNumber: 1,
            beatNumber: beat,
            subdivisionIndex: idx,
            totalSubdivisionsInBeat: 4,
            countLabel: idx === 0 ? `${beat}` : idx === 1 ? 'e' : idx === 2 ? '&' : 'a',
            role: 'fill',
            limb: st.hand,
            hand: st.hand,
            surface: isPad ? (st.accented ? 'right_zone' : 'center') : 'snare',
            surfaceLabel: isPad ? (st.accented ? 'Accent Zone' : 'Center Tap') : 'Snare',
            isAccented: st.accented,
            velocity: st.accented ? 0.95 : 0.5,
            noteLabel: st.label,
            description: `Bar 1 Beat ${beat}: ${st.label}`,
            timeOffsetInPhrase: timeOffset,
            durationFraction: (1 / 4) / calibTotalBeats,
            isTutorAudible: true,
          });
        });
      }

      // Bar 2 Learner Space
      for (let beat = 1; beat <= 4; beat++) {
        defStrokes.forEach((st, idx) => {
          const globalBeat = 4 + (beat - 1) + (idx / 4);
          const timeOffset = globalBeat / calibTotalBeats;
          events.push({
            id: `calib-def-learner-b${beat}-n${idx}`,
            barNumber: 2,
            beatNumber: beat,
            subdivisionIndex: idx,
            totalSubdivisionsInBeat: 4,
            countLabel: idx === 0 ? `${beat}` : idx === 1 ? 'e' : idx === 2 ? '&' : 'a',
            role: 'learner_space',
            limb: st.hand,
            hand: st.hand,
            surface: isPad ? 'center' : 'snare',
            surfaceLabel: isPad ? 'Pad Student Space' : 'Kit Student Space',
            isAccented: st.accented,
            velocity: st.accented ? 0.95 : 0.5,
            noteLabel: st.label,
            description: `Bar 2 Beat ${beat}: Learner Space (${st.label})`,
            timeOffsetInPhrase: timeOffset,
            durationFraction: (1 / 4) / calibTotalBeats,
            isLearnerSpace: true,
            learnerSpaceInfo: {
              purpose: 'Practice rudiment timing in intentional learner space',
              expectedLearnerAction: 'Execute pattern against metronome',
              durationBeats: 4,
              isIntentionalSilence: true,
            },
            isTutorAudible: false,
          });
        });
      }

      return {
        id: `timeline-${exercise.id}`,
        title: exercise.title,
        timeSignature: '4/4',
        beatsPerBar: 4,
        totalBars: 2,
        subdivisionType: '16th Notes',
        totalEvents: events.length,
        events,
        grooveSummary: 'Bar 1: Tutor Demonstration of clean stick mechanics',
        fillSummary: 'Isolated rudiment balance and phrasing',
        landingSummary: 'Bar 2: Intentional Learner Space',
        grooveReturnSummary: 'Continuous Call & Response',
        equipment,
        hasLearnerSpace: true,
        learnerSpaceSummary: 'Bar 2 provides intentional learner space for student calibration.',
      };
    }
  }

  // ================= 2-BAR PLACEMENT / TRANSFER TIMELINE =================
  // Bar 1: Groove (Beats 1-3) -> Fill (Beat 4)  [or Beats 1-2 -> Beats 3-4]
  // Bar 2: Beat 1 Landing -> Beats 2-4 Groove Return
  const fillStartBeat = isTwoBeatFill ? 3 : 4; // Beat 4 for 1-beat fill, Beat 3 for 2-beat fill

  // BAR 1: Groove before fill
  for (let beat = 1; beat < fillStartBeat; beat++) {
    for (let sub = 0; sub < 2; sub++) {
      const countLabel = sub === 0 ? `${beat}` : '&';
      const isDownbeat = beat === 1 && sub === 0;
      const isBackbeat = beat === 2 && sub === 0;
      const globalBeat = (beat - 1) + sub * 0.5;
      const timeOffset = globalBeat / totalBeats;

      events.push({
        id: `b1-beat${beat}-s${sub}`,
        barNumber: 1,
        beatNumber: beat,
        subdivisionIndex: sub,
        totalSubdivisionsInBeat: 2,
        countLabel,
        role: 'groove',
        limb: sub === 0 ? 'R' : 'L',
        hand: sub === 0 ? 'R' : 'L',
        surface: isPad ? 'center' : (isDownbeat ? 'kick' : isBackbeat ? 'snare' : 'hihat'),
        surfaceLabel: isPad ? 'Pad Groove Tap' : (isDownbeat ? 'Kick + Hi-Hat' : isBackbeat ? 'Snare Backbeat' : 'Hi-Hat Pulse'),
        isAccented: isDownbeat || isBackbeat,
        velocity: isDownbeat ? 0.8 : isBackbeat ? 0.85 : 0.5,
        noteLabel: sub === 0 ? 'R' : 'L',
        description: `Bar 1 Beat ${beat} timekeeper pulse`,
        timeOffsetInPhrase: timeOffset,
        durationFraction: 0.5 / totalBeats,
        assistanceContract: {
          audibleAt: sub === 0 ? ['FULL', 'REDUCED'] : ['FULL'],
          visuallyActiveAt: ['FULL', 'REDUCED', 'MINIMAL'],
          cueType: 'pulse',
        },
      });
    }
  }

  // BAR 1: Fill on target beat(s)
  if (isSixStrokeRoll) {
    // Six Stroke Roll: >R L L R R >L (6 notes inside 1 beat if 1-beat, or 12 notes if 2-beat)
    const ssrStrokes = [
      { hand: 'R' as const, accented: true, surface: 'right_zone' as const, label: '>R', count: '4' },
      { hand: 'L' as const, accented: false, surface: 'center' as const, label: 'L', count: 'e' },
      { hand: 'L' as const, accented: false, surface: 'center' as const, label: 'L', count: '&' },
      { hand: 'R' as const, accented: false, surface: 'center' as const, label: 'R', count: 'a' },
      { hand: 'R' as const, accented: false, surface: 'center' as const, label: 'R', count: 'ta' },
      { hand: 'L' as const, accented: true, surface: 'left_zone' as const, label: '>L', count: 'la' },
    ];

    if (isTwoBeatFill) {
      // 2 repetitions across beats 3 and 4
      for (let rep = 0; rep < 2; rep++) {
        const beatNum = rep === 0 ? 3 : 4;
        ssrStrokes.forEach((st, idx) => {
          const globalBeat = (beatNum - 1) + (idx / 6);
          const timeOffset = globalBeat / totalBeats;

          events.push({
            id: `fill-ssr-b${beatNum}-n${idx}`,
            barNumber: 1,
            beatNumber: beatNum,
            subdivisionIndex: idx,
            totalSubdivisionsInBeat: 6,
            countLabel: idx === 0 ? `${beatNum}` : idx === 1 ? 'e' : idx === 2 ? '&' : idx === 3 ? 'a' : idx === 4 ? 'ta' : 'la',
            role: 'fill',
            limb: st.hand,
            hand: st.hand,
            surface: isPad ? st.surface : (st.accented ? (st.hand === 'R' ? 'tom_high' : 'snare') : 'snare'),
            surfaceLabel: isPad ? (st.surface === 'center' ? 'Center Doubles' : st.surface === 'right_zone' ? 'Right Accent Zone' : 'Left Accent Zone') : 'Snare / Tom',
            isAccented: st.accented,
            velocity: st.accented ? 0.95 : 0.45,
            noteLabel: st.label,
            description: st.accented ? `Accent ${st.hand} (${st.surface})` : `Inner double ${st.hand}`,
            timeOffsetInPhrase: timeOffset,
            durationFraction: (1 / 6) / totalBeats,
            assistanceContract: {
              audibleAt: (idx === 0 || st.accented) ? ['FULL', 'REDUCED'] : ['FULL'],
              visuallyActiveAt: st.accented ? ['FULL', 'REDUCED', 'MINIMAL'] : ['FULL', 'REDUCED'],
              showHandGuidanceAt: ['FULL'],
              cueType: idx === 0 ? 'fill_entry' : st.accented ? 'accent' : 'inner_note',
            },
          });
        });
      }
    } else {
      // 1-beat fill on Beat 4
      ssrStrokes.forEach((st, idx) => {
        const globalBeat = 3 + (idx / 6); // Beat 4 is index 3 (0, 1, 2, 3)
        const timeOffset = globalBeat / totalBeats;

        events.push({
          id: `fill-ssr-b4-n${idx}`,
          barNumber: 1,
          beatNumber: 4,
          subdivisionIndex: idx,
          totalSubdivisionsInBeat: 6,
          countLabel: idx === 0 ? '4' : idx === 1 ? 'e' : idx === 2 ? '&' : idx === 3 ? 'a' : idx === 4 ? 'ta' : 'la',
          role: 'fill',
          limb: st.hand,
          hand: st.hand,
          surface: isPad ? st.surface : (st.accented ? (st.hand === 'R' ? 'tom_high' : 'snare') : 'snare'),
          surfaceLabel: isPad ? (st.surface === 'center' ? 'Center Doubles' : st.surface === 'right_zone' ? 'Right Accent Zone' : 'Left Accent Zone') : 'Snare / Tom',
          isAccented: st.accented,
          velocity: st.accented ? 0.95 : 0.45,
          noteLabel: st.label,
          description: st.accented ? `Accent ${st.hand} (${st.surface})` : `Inner double ${st.hand}`,
          timeOffsetInPhrase: timeOffset,
          durationFraction: (1 / 6) / totalBeats,
          assistanceContract: {
            audibleAt: (idx === 0 || st.accented) ? ['FULL', 'REDUCED'] : ['FULL'],
            visuallyActiveAt: st.accented ? ['FULL', 'REDUCED', 'MINIMAL'] : ['FULL', 'REDUCED'],
            showHandGuidanceAt: ['FULL'],
            cueType: idx === 0 ? 'fill_entry' : st.accented ? 'accent' : 'inner_note',
          },
        });
      });
    }
  } else if (isRLK) {
    // RLK Linear Triplet Fill on beat 4
    const rlkStrokes = [
      { limb: 'R' as const, hand: 'R' as const, accented: true, surface: 'right_zone' as const, label: '>R', count: '4' },
      { limb: 'L' as const, hand: 'L' as const, accented: false, surface: 'center' as const, label: 'L', count: 'trip' },
      { limb: 'K' as const, hand: undefined, accented: true, surface: 'rim_edge' as const, label: 'K', count: 'let' },
    ];
    rlkStrokes.forEach((st, idx) => {
      const globalBeat = 3 + (idx / 3);
      const timeOffset = globalBeat / totalBeats;
      events.push({
        id: `fill-rlk-b4-n${idx}`,
        barNumber: 1,
        beatNumber: 4,
        subdivisionIndex: idx,
        totalSubdivisionsInBeat: 3,
        countLabel: st.count,
        role: 'fill',
        limb: st.limb,
        hand: st.hand,
        surface: isPad ? st.surface : (st.limb === 'K' ? 'kick' : st.limb === 'R' ? 'tom_high' : 'snare'),
        surfaceLabel: isPad ? (st.surface === 'rim_edge' ? 'Simulated Kick/Rim' : st.surface === 'center' ? 'Center Tap' : 'Right Accent') : (st.limb === 'K' ? 'Bass Drum' : 'Snare / Tom'),
        isAccented: st.accented,
        velocity: st.accented ? 0.95 : 0.5,
        noteLabel: st.label,
        description: `RLK Linear fill note ${st.label}`,
        timeOffsetInPhrase: timeOffset,
        durationFraction: (1 / 3) / totalBeats,
        assistanceContract: {
          audibleAt: (idx === 0 || st.accented) ? ['FULL', 'REDUCED'] : ['FULL'],
          visuallyActiveAt: ['FULL', 'REDUCED', 'MINIMAL'],
          showHandGuidanceAt: ['FULL'],
          cueType: idx === 0 ? 'fill_entry' : 'accent',
        },
      });
    });
  } else {
    // Check if Single Stroke Roll or standard alternating sticking
    const isSingleStroke =
      exercise.skillIds?.some(id => id.includes('single-stroke') || id.includes('single_stroke')) ||
      title.includes('Single Stroke') ||
      exercise.sticking?.replace(/\s+/g, '') === 'RLRL' ||
      exercise.sticking?.replace(/\s+/g, '') === '>RLRL';

    const defStrokes = isSingleStroke
      ? [
          { hand: 'R' as const, accented: true, label: '>R', count: '4' },
          { hand: 'L' as const, accented: false, label: 'L', count: 'e' },
          { hand: 'R' as const, accented: false, label: 'R', count: '&' },
          { hand: 'L' as const, accented: false, label: 'L', count: 'a' },
        ]
      : [
          { hand: 'R' as const, accented: true, label: '>R', count: '4' },
          { hand: 'L' as const, accented: false, label: 'L', count: 'e' },
          { hand: 'R' as const, accented: false, label: 'R', count: '&' },
          { hand: 'R' as const, accented: false, label: 'R', count: 'a' },
        ];

    defStrokes.forEach((st, idx) => {
      const globalBeat = 3 + (idx / 4);
      const timeOffset = globalBeat / totalBeats;
      events.push({
        id: `fill-def-b4-n${idx}`,
        barNumber: 1,
        beatNumber: 4,
        subdivisionIndex: idx,
        totalSubdivisionsInBeat: 4,
        countLabel: st.count,
        role: 'fill',
        limb: st.hand,
        hand: st.hand,
        surface: isPad ? (st.accented ? 'left_zone' : 'center') : (st.accented ? 'snare' : 'snare'),
        surfaceLabel: isPad ? (st.accented ? 'Accent Zone' : 'Center Tap') : 'Snare',
        isAccented: st.accented,
        velocity: st.accented ? 0.95 : 0.5,
        noteLabel: st.label,
        description: idx === 0 ? `Beat 4 Entry Landmark (${st.label})` : `Inner note ${st.label}`,
        timeOffsetInPhrase: timeOffset,
        durationFraction: (1 / 4) / totalBeats,
        assistanceContract: {
          audibleAt: idx === 0 ? ['FULL', 'REDUCED'] : ['FULL'],
          visuallyActiveAt: ['FULL', 'REDUCED', 'MINIMAL'],
          showHandGuidanceAt: ['FULL'],
          cueType: idx === 0 ? 'fill_entry' : 'inner_note',
        },
      });
    });
  }

  // BAR 2: BEAT 1 — LANDING TARGET (CRASH + KICK / ACCENT ON 1)
  const landingOffset = 4.0 / totalBeats; // Exactly Beat 1 of Bar 2 (beat 5 in 8-beat space)
  events.push({
    id: `bar2-beat1-landing`,
    barNumber: 2,
    beatNumber: 1,
    subdivisionIndex: 0,
    totalSubdivisionsInBeat: 1,
    countLabel: '1',
    role: 'landing',
    limb: 'BOTH',
    hand: 'R',
    surface: isPad ? 'rim_edge' : 'crash',
    surfaceLabel: isPad ? '🎯 Rim / Edge (Simulated Crash)' : '🎯 Crash Cymbal + Bass Drum',
    isAccented: true,
    velocity: 1.0,
    noteLabel: '💥 CRASH (1)',
    description: 'Downbeat Landing: Lock Beat 1 with clean crash + kick arrival',
    timeOffsetInPhrase: landingOffset,
    durationFraction: 1.0 / totalBeats,
    assistanceContract: {
      audibleAt: ['FULL', 'REDUCED', 'MINIMAL'],
      visuallyActiveAt: ['FULL', 'REDUCED', 'MINIMAL'],
      showHandGuidanceAt: ['FULL', 'REDUCED', 'MINIMAL'],
      cueType: 'landing',
    },
  });

  // BAR 2: BEATS 2–4 — GROOVE RETURN (Immediate recovery into steady timekeeping)
  for (let beat = 2; beat <= 4; beat++) {
    for (let sub = 0; sub < 2; sub++) {
      const countLabel = sub === 0 ? `${beat}` : '&';
      const isBackbeat = beat === 2 && sub === 0 || beat === 4 && sub === 0;
      const globalBeat = 4 + (beat - 1) + sub * 0.5;
      const timeOffset = globalBeat / totalBeats;

      events.push({
        id: `b2-beat${beat}-s${sub}`,
        barNumber: 2,
        beatNumber: beat,
        subdivisionIndex: sub,
        totalSubdivisionsInBeat: 2,
        countLabel,
        role: 'groove_return',
        limb: sub === 0 ? 'R' : 'L',
        hand: sub === 0 ? 'R' : 'L',
        surface: isPad ? 'center' : (isBackbeat ? 'snare' : beat === 3 && sub === 0 ? 'kick' : 'hihat'),
        surfaceLabel: isPad ? 'Pad Groove Return' : (isBackbeat ? 'Snare Backbeat' : 'Hi-Hat Timekeeper'),
        isAccented: isBackbeat,
        velocity: isBackbeat ? 0.85 : 0.55,
        noteLabel: sub === 0 ? 'R' : 'L',
        description: `Bar 2 Beat ${beat} groove recovery`,
        timeOffsetInPhrase: timeOffset,
        durationFraction: 0.5 / totalBeats,
        assistanceContract: {
          audibleAt: sub === 0 ? ['FULL', 'REDUCED'] : ['FULL'],
          visuallyActiveAt: ['FULL', 'REDUCED', 'MINIMAL'],
          cueType: 'recovery',
        },
      });
    }
  }

  return {
    id: `timeline-${exercise.id}`,
    title: exercise.title,
    timeSignature: '4/4',
    beatsPerBar: 4,
    totalBars: 2,
    subdivisionType: isSixStrokeRoll ? 'Sextuplets (Fill) & 8th Notes (Groove)' : '16th Notes & 8th Notes',
    totalEvents: events.length,
    events,
    grooveSummary: isTwoBeatFill ? 'Bar 1 Beats 1–2: Steady groove pulse' : 'Bar 1 Beats 1–3: Steady groove pulse',
    fillSummary: isTwoBeatFill ? `Bar 1 Beats 3–4: ${exercise.title} phrase insertion` : `Bar 1 Beat 4: ${exercise.title} phrase insertion`,
    landingSummary: 'Bar 2 Beat 1: Strong Crash + Kick downbeat arrival',
    grooveReturnSummary: 'Bar 2 Beats 2–4: Immediate seamless return to groove timekeeping',
    equipment,
  };
}

/**
 * Builds a precise RhythmTimeline directly from a CompetencyTeachingDefinition.
 */
export function buildTimelineFromTeachingDefinition(
  def: CompetencyTeachingDefinition,
  isPad: boolean = false
): RhythmTimeline {
  const totalBars = Math.max(1, def.bars || 1);
  const beatsPerBar = Math.max(1, def.beatsPerBar || (def.meter === '6/8' ? 6 : 4));
  const totalBeats = totalBars * beatsPerBar;
  const totalSubdivisionsInBeat = Math.max(1, def.subdivisionCount || 1);
  const equipment = isPad ? 'Practice Pad' : 'Full Drum Kit';

  const mapTeachingSurface = (raw: string): InstrumentSurface => {
    if (isPad) {
      if (raw === 'kick' || raw === 'crash' || raw === 'metronome') return 'rim_edge';
      if (raw === 'hihat_closed' || raw === 'hihat_open' || raw === 'ride') return 'right_zone';
      if (raw === 'tom_high' || raw === 'tom_mid' || raw === 'tom_floor') return 'left_zone';
      if (raw === 'pad_edge') return 'rim_edge';
      if (raw === 'pad_left') return 'left_zone';
      if (raw === 'pad_right') return 'right_zone';
      return 'center';
    }

    switch (raw) {
      case 'pad_center':
        return 'snare';
      case 'pad_edge':
        return 'crash';
      case 'pad_left':
        return 'tom_high';
      case 'pad_right':
        return 'tom_mid';
      default:
        return raw as InstrumentSurface;
    }
  };

  const events: RhythmEvent[] = def.events.map((ev, idx) => {
    const barNumber = Math.max(1, Math.min(totalBars, ev.bar || 1));
    const beatNumber = Math.max(1, Math.min(beatsPerBar, ev.beat));
    const subdivisionIndex = Math.max(0, Math.min(totalSubdivisionsInBeat - 1, ev.subdivision));

    const globalBeatOffset =
      (barNumber - 1) * beatsPerBar +
      (beatNumber - 1) +
      subdivisionIndex / totalSubdivisionsInBeat;
    const timeOffsetInPhrase = globalBeatOffset / totalBeats;
    const durationFraction = (1 / totalSubdivisionsInBeat) / totalBeats;

    const rawSurfaces = ev.surfaces?.length ? ev.surfaces : [ev.surface];
    const mappedSurfaces = Array.from(new Set(rawSurfaces.map((surface) => mapTeachingSurface(surface))));
    const primarySurface = mappedSurfaces[0] || mapTeachingSurface(ev.surface);

    const rawSurfaceNames = rawSurfaces.map(String);
    const isCrashLanding =
      rawSurfaceNames.includes('crash') && beatNumber === 1 && subdivisionIndex === 0;
    const titleLower = def.title.toLowerCase();

    let role: RhythmEventRole;
    if (ev.role) {
      role = ev.role;
    } else if (isCrashLanding) {
      role = 'landing';
    } else if (titleLower.includes('fill')) {
      role = 'fill';
    } else if (titleLower.includes('recovery') && beatNumber > 1) {
      role = 'groove_return';
    } else {
      role = 'groove';
    }

    const limb: LimbAssignment =
      ev.hand === 'K' ? 'RF' : ev.hand === 'BOTH' ? 'BOTH' : ev.hand === 'NONE' ? 'NONE' : ev.hand;

    const cueType: NonNullable<RhythmEvent['assistanceContract']>['cueType'] =
      role === 'landing'
        ? 'landing'
        : role === 'groove_return'
        ? 'recovery'
        : role === 'fill'
        ? ev.accent
          ? 'fill_entry'
          : 'inner_note'
        : ev.accent
        ? 'accent'
        : subdivisionIndex === 0
        ? 'pulse'
        : 'inner_note';

    return {
      id: `${def.id}-b${barNumber}-beat${beatNumber}-s${subdivisionIndex}-${idx}`,
      barNumber,
      beatNumber,
      subdivisionIndex,
      totalSubdivisionsInBeat,
      countLabel: ev.countToken,
      role,
      limb,
      hand: ev.hand === 'R' || ev.hand === 'L' ? ev.hand : undefined,
      surface: primarySurface,
      surfaces: mappedSurfaces,
      surfaceLabel: isPad
        ? mappedSurfaces.map((surface) => `Pad ${surface.replace('_', ' ')}`).join(' + ')
        : rawSurfaceNames.map((surface) => surface.replaceAll('_', ' ').toUpperCase()).join(' + '),
      isAccented: ev.accent ?? false,
      velocity: ev.accent ? 0.9 : 0.6,
      noteLabel: ev.label || ev.hand,
      description: ev.description || `${ev.label} on Beat ${beatNumber}`,
      timeOffsetInPhrase,
      durationFraction,
      assistanceContract: {
        audibleAt: ['FULL', 'REDUCED', 'MINIMAL'],
        visuallyActiveAt: ['FULL', 'REDUCED', 'MINIMAL'],
        showHandGuidanceAt: ['FULL', 'REDUCED'],
        cueType,
      },
    };
  });

  return {
    id: `timeline-${def.id}`,
    title: def.title,
    timeSignature: def.meter,
    beatsPerBar,
    totalBars,
    subdivisionType: def.subdivision,
    totalEvents: events.length,
    events,
    grooveSummary: `${def.title} — ${def.meter} (${def.subdivision})`,
    fillSummary: def.sticking || def.limbPattern,
    landingSummary: def.countTokens.join(' '),
    grooveReturnSummary: def.musicalExplanation.musicalApplication,
    equipment,
  };
}

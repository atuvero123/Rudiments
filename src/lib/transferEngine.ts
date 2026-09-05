import {
  GranularSkill,
  ProgressionStage,
  EquipmentOption,
  TransferInstructionModel,
  AccentNote,
  OrchestrationStep,
  TransferProgressionStep,
} from '../types';

/**
 * DERIVES STICKING PATTERN FOR ANY SKILL
 */
export function getStickingPatternForSkill(skillId: string, skillName: string): string {
  const id = skillId.toLowerCase();
  const name = skillName.toLowerCase();

  if (id === 'time-quarter-pulse' || name.includes('quarter note pulse')) return 'R R R R';
  if (id === 'time-8th-subdivision' || name.includes('8th note subdivision') || name.includes('eighth note subdivision')) return 'R L R L R L R L';
  if (id === 'time-44' || name.includes('4/4 bar structure')) return 'R R R R';
  if (id.includes('six-stroke') || name.includes('six stroke')) return 'R L L R R L';
  if (id.includes('single-paradiddle') || name.includes('single paradiddle')) return 'R L R R L R L L';
  if (id.includes('double-paradiddle') || name.includes('double paradiddle')) return 'R L R L R R L R L R L L';
  if (id.includes('triple-paradiddle') || name.includes('triple paradiddle')) return 'R L R L R L R R L R L R L R L L';
  if (id.includes('paradiddle-diddle') || name.includes('paradiddle-diddle')) return 'R L R R L L';
  if (id.includes('double-stroke') || name.includes('double stroke')) return 'R R L L R R L L';
  if (id.includes('single-stroke') || name.includes('single stroke')) return 'R L R L R L R L';
  if (id.includes('flam-accent') || name.includes('flam accent')) return 'lR L R rL R L';
  if (id.includes('flam-tap') || name.includes('flam tap')) return 'lR R rL L';
  if (id.includes('flam') || name.includes('flam')) return 'lR rL lR rL';
  if (id.includes('drag') || name.includes('drag')) return 'llR rrL llR rrL';
  if (id.includes('rlk') || name.includes('rlk') || name.includes('linear')) return 'R L K  R L K';
  if (id.includes('groove') || name.includes('beat')) return 'K H S H K H S H';
  if (id.includes('fill')) return 'R L R L R L K K';

  return 'R L R L R L R L';
}

/**
 * ACCENT MAP GENERATOR
 * Computes accented pattern and structured accent notes for any skill
 */
export function generateAccentNotesForSkill(
  skillId: string,
  baseSticking: string,
  isPad: boolean
): { accentPattern: string; accentNotes: AccentNote[] } {
  const tokens = baseSticking.split(/\s+/).filter(Boolean);
  const id = skillId.toLowerCase();

  let accentPattern = baseSticking;
  const accentNotes: AccentNote[] = [];

  if (id.includes('six-stroke')) {
    // R L L R R L -> >R L L R R >L
    accentPattern = '>R  L  L  R  R  >L';
    tokens.forEach((token, idx) => {
      const isAccented = idx === 0 || idx === 5;
      const hand = token.replace('>', '');
      let zone = isPad ? 'CENTER' : 'SNARE';
      if (isAccented) {
        zone = idx === 0 ? (isPad ? 'LEFT' : 'HIGH TOM') : (isPad ? 'RIGHT' : 'FLOOR TOM');
      }
      accentNotes.push({ noteIndex: idx, hand, isAccented, zone });
    });
  } else if (id.includes('single-paradiddle')) {
    // R L R R L R L L -> >R L R R >L R L L
    accentPattern = '>R  L  R  R  >L  R  L  L';
    tokens.forEach((token, idx) => {
      const isAccented = idx === 0 || idx === 4;
      const hand = token.replace('>', '');
      let zone = isPad ? 'CENTER' : 'SNARE';
      if (isAccented) {
        zone = idx === 0 ? (isPad ? 'LEFT' : 'HIGH TOM') : (isPad ? 'RIGHT' : 'FLOOR TOM');
      }
      accentNotes.push({ noteIndex: idx, hand, isAccented, zone });
    });
  } else if (id.includes('double-stroke')) {
    // R R L L R R L L -> >R R >L L >R R >L L
    accentPattern = '>R  R  >L  L  >R  R  >L  L';
    tokens.forEach((token, idx) => {
      const isAccented = idx % 2 === 0;
      const hand = token.replace('>', '');
      let zone = isPad ? 'CENTER' : 'SNARE';
      if (isAccented) {
        zone = hand.startsWith('R') ? (isPad ? 'LEFT' : 'HIGH TOM') : (isPad ? 'RIGHT' : 'FLOOR TOM');
      }
      accentNotes.push({ noteIndex: idx, hand, isAccented, zone });
    });
  } else if (id.includes('flam-accent') || id.includes('flam')) {
    accentPattern = '>lR  L  R  >rL  R  L';
    tokens.forEach((token, idx) => {
      const isAccented = token.toLowerCase().includes('r') && token.length > 1 || idx === 0 || idx === 3;
      const hand = token;
      let zone = isPad ? 'CENTER' : 'SNARE';
      if (isAccented) {
        zone = idx === 0 ? (isPad ? 'LEFT' : 'HIGH TOM') : (isPad ? 'RIGHT' : 'FLOOR TOM');
      }
      accentNotes.push({ noteIndex: idx, hand, isAccented, zone });
    });
  } else if (id.includes('rlk') || id.includes('linear')) {
    accentPattern = '>R  L  K  >R  L  K';
    tokens.forEach((token, idx) => {
      const isAccented = token.includes('R');
      const hand = token;
      let zone = 'CENTER';
      if (hand === 'R') zone = isPad ? 'RIGHT / RIM' : 'RIDE / TOM';
      if (hand === 'L') zone = isPad ? 'CENTER' : 'SNARE';
      if (hand === 'K') zone = isPad ? 'FOOT PULSE' : 'KICK DRUM';
      accentNotes.push({ noteIndex: idx, hand, isAccented, zone });
    });
  } else {
    // Generic fallback: accent downbeats (1st note of every 4)
    const formatted: string[] = [];
    tokens.forEach((token, idx) => {
      const isAccented = idx % 4 === 0;
      formatted.push(isAccented ? `>${token}` : token);
      let zone = isPad ? 'CENTER' : 'SNARE';
      if (isAccented) zone = isPad ? 'LEFT' : 'HIGH TOM';
      accentNotes.push({ noteIndex: idx, hand: token, isAccented, zone });
    });
    accentPattern = formatted.join('  ');
  }

  return { accentPattern, accentNotes };
}

/**
 * GENERATES COMPLETE STRUCTURED TRANSFER INSTRUCTION MODEL
 */
export function generateTransferInstructions(
  skill: GranularSkill,
  equipment: EquipmentOption,
  stage: ProgressionStage = 'TRANSFER',
  recurringFriction?: string | null
): TransferInstructionModel {
  const isPad = equipment === 'Practice Pad';
  const baseSticking = getStickingPatternForSkill(skill.id, skill.name);
  const { accentPattern, accentNotes } = generateAccentNotesForSkill(skill.id, baseSticking, isPad);

  // Derive Orchestration Map based on Equipment
  let orchestrationMap: OrchestrationStep[] = [];

  if (isPad) {
    orchestrationMap = [
      {
        zone: 'CENTER ZONE',
        notes: 'Unaccented Taps & Inner Doubles',
        instruction: 'Play low 2-inch wrist taps in the center of the pad.',
      },
      {
        zone: 'LEFT ZONE',
        notes: 'First Accented Stroke (>R or Lead)',
        instruction: 'Lift right stick to 8-10 inches and strike 3 inches to the left of center.',
      },
      {
        zone: 'RIGHT ZONE',
        notes: 'Second Accented Stroke (>L or Secondary)',
        instruction: 'Lift left stick to 8-10 inches and strike 3 inches to the right of center.',
      },
      {
        zone: 'RIM / EDGE',
        notes: 'Accent Displacement / Cymbal Voice',
        instruction: 'Play displaced accents on the pad rim or edge to simulate cymbal bell.',
      },
    ];
  } else {
    orchestrationMap = [
      {
        zone: 'SNARE DRUM',
        notes: 'Soft Ghost Taps & Inner Strokes',
        instruction: 'Keep inner notes soft in the center of the snare drumhead.',
      },
      {
        zone: 'HIGH TOM',
        notes: 'Accented Right (>R or High Voice)',
        instruction: 'Move right-hand accented stroke cleanly onto High Tom.',
      },
      {
        zone: 'FLOOR TOM',
        notes: 'Accented Left (>L or Low Voice)',
        instruction: 'Move left-hand accented stroke cleanly onto Floor Tom.',
      },
      {
        zone: 'HI-HAT / RIDE / KICK',
        notes: 'Timekeeping & Pedal Downbeats',
        instruction: 'Maintain solid pedal downbeat or ride cymbal pulse throughout pattern.',
      },
    ];
  }

  // Derive Transfer Progression Steps (5-round Transfer Cycle)
  const transferProgression: TransferProgressionStep[] = [
    {
      stepNumber: 1,
      label: isPad ? '1. Center Baseline' : '1. Snare Baseline',
      details: isPad
        ? `Play entire ${skill.name} pattern in the CENTER zone at a uniform dynamic level.`
        : `Play entire ${skill.name} pattern on the SNARE drum head at a uniform dynamic level.`,
    },
    {
      stepNumber: 2,
      label: isPad ? '2. Left Zone Displacement' : '2. High Tom Displacement',
      details: isPad
        ? `Move the 1st accented stroke (>R) to the LEFT pad zone while keeping doubles in the center.`
        : `Move the 1st accented stroke (>R) to the HIGH TOM while keeping ghost notes on the snare.`,
    },
    {
      stepNumber: 3,
      label: isPad ? '3. Right Zone Displacement' : '3. Floor Tom Displacement',
      details: isPad
        ? `Move the 2nd accented stroke (>L) to the RIGHT pad zone while keeping inner taps centered.`
        : `Move the 2nd accented stroke (>L) to the FLOOR TOM while maintaining snare ghost notes.`,
    },
    {
      stepNumber: 4,
      label: '4. Full Orchestration Cycle',
      details: isPad
        ? `Execute full zone shift (LEFT → CENTER → RIGHT → CENTER) without altering hand speed.`
        : `Orchestrate pattern across snare, high tom, and floor tom in continuous flow.`,
    },
    {
      stepNumber: 5,
      label: '5. Smooth Return & Dynamic Lock',
      details: isPad
        ? `Return to CENTER zone, locking in clear contrast between 2-inch taps and 10-inch accents.`
        : `Return to SNARE drum, maintaining solid pulse, relaxed wrists, and clear dynamic balance.`,
    },
  ];

  // Derive Execution Success Target
  let executionTarget = `Keep the required pattern relaxed and subdivision even while moving the accented notes between ${isPad ? 'pad zones' : 'kit voices'}.`;

  if (recurringFriction) {
    if (recurringFriction.includes('Tension') || recurringFriction.includes('Hard')) {
      executionTarget = `Maintain loose fulcrum grip and relaxed wrists during zone changes without tightening shoulders.`;
    } else if (recurringFriction.includes('Uneven') || recurringFriction.includes('Spacing')) {
      executionTarget = `Ensure unaccented notes remain strictly equal in volume and timing while moving accents.`;
    } else if (recurringFriction.includes('Rushed') || recurringFriction.includes('Too fast')) {
      executionTarget = `Lock every stroke into the click downbeats without rushing during spatial transitions.`;
    }
  } else if (skill.id.includes('rlk') || skill.id.includes('linear')) {
    executionTarget = `Keep hand voices moving smoothly between zones while maintaining a solid, un-rushed kick pulse.`;
  } else if (skill.id.includes('double-stroke') || skill.id.includes('six-stroke')) {
    executionTarget = `Keep unaccented double strokes low (2 inches) and relaxed while moving 10-inch accents across surfaces.`;
  }

  return {
    baseSticking,
    accentPattern,
    accentNotes,
    orchestrationMap,
    transferProgression,
    musicalCounting: `Count subdivision out loud: 1 & 2 & 3 & 4 & — align accents strictly with downbeats or target beats.`,
    executionTarget,
  };
}

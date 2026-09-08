import { LearnerProfile } from '../types';

export const INITIAL_LEARNER_PROFILE: LearnerProfile = {
  selfReportedLevel: 'Intermediate',
  typicalPracticeTime: '60–120 minutes (Sunday service song prep)',
  equipment: 'Both',
  primaryEquipmentNote: 'Practice Pad identified as primary daily tool; Full Drum Kit used occasionally & for worship team',
  mainMusicalContexts: [
    'Church / Worship Drumming',
    'Self-Directed Practice',
  ],
  mainGenres: ['Worship', 'Reggae', 'Jazz', 'Afrobeat'],
  musicalResponsibilities: 'Sunday morning worship team drummer & active pad student',
  personalGoals: [
    'Apply learned rudiments musically on the kit',
    'Develop movement and orchestration of singles around the drum kit',
    'Master R-L-K linear coordination across hands and feet',
    'Expand fill vocabulary beyond repeating familiar fills',
    'Develop 16th-note subdivision counting and 6/8 time signature confidence',
  ],
  favouriteSongs: [
    'What a Beautiful Name / What a Beautiful Name It Is',
    'Worthy Is Your Name',
    'Let Your Living Water — Spirit of Praise',
  ],
  favouriteArtists: ['Hillsong Worship', 'Spirit of Praise'],
  favouriteDrummers: ['Vincent Baynard'],
  practicePriority: 'Balanced',

  // Separate Coach Recommendations
  coachRecommendedDrummers: [
    'Larnell Lewis',
    'Carlton Barrett',
    'Tony Allen',
    'Calvin Rodgers',
  ],
  coachRecommendedSongs: [
    'Reckless Love (Worship 6/8)',
    'Three Little Birds (Reggae One-Drop)',
    'Water No Get Enemy (Afrobeat Coordination)',
  ],
};

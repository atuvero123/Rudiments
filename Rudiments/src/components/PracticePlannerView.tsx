import React from 'react';
import { PracticeSession, SkillTrack, SkillTrackId } from '../types';
import { TodayPracticeView } from './TodayPracticeView';

interface PracticePlannerViewProps {
  skillTracks: SkillTrack[];
  practiceSessions: PracticeSession[];
  onLogSession: (session: Omit<PracticeSession, 'id'>) => void;
  onGeneratePlan: (duration: number, trackId: SkillTrackId, focus: string) => Promise<string>;
}

export const PracticePlannerView: React.FC<PracticePlannerViewProps> = ({
  practiceSessions,
  onLogSession,
}) => {
  return (
    <TodayPracticeView
      practiceSessions={practiceSessions}
      onAddSession={(session) => {
        onLogSession(session);
      }}
    />
  );
};

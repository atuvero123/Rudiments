import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Headphones,
  Music2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Mic2,
  Drum,
  ArrowRight,
} from 'lucide-react';
import { ExerciseResult, InstructionMode, PracticeExercise, SelfCheckFeeling } from '../types';
import { PLAY_ALONG_TRACKS, PlayAlongTrack } from '../data/playAlongTracks';
import { PlayAlongTransport, PlayAlongTransportSnapshot } from '../lib/playAlongEngine';
import { C11_SONG_LEARNING_EVIDENCE_VERSION } from '../lib/songLearningEngine';

interface SongLearningStageViewProps {
  exercise: PracticeExercise;
  currentTempo: number;
  onCheckIn: (mode: InstructionMode, partialResult?: Partial<ExerciseResult>) => void;
}

const FEELINGS: { value: SelfCheckFeeling; label: string; detail: string }[] = [
  { value: 'CLEAN_AND_RELAXED', label: 'Clean & Relaxed', detail: 'The musical target stayed controlled for the whole stage.' },
  { value: 'MOSTLY_CLEAN', label: 'Mostly Clean', detail: 'The stage worked with only small drift or hesitation.' },
  { value: 'INCONSISTENT', label: 'Inconsistent', detail: 'The form, pocket, transition or dynamics broke more than once.' },
  { value: 'TOO_DIFFICULT', label: 'Too Difficult', detail: 'The current support/tempo is still too demanding.' },
];

const ISSUE_TAGS = [
  'Lost section position',
  'Pocket drift',
  'Rushed transition',
  'Missed Beat 1',
  'Dynamics too flat',
  'Overplayed',
  'Could not recover',
  'Tutor handoff felt unclear',
];

function selectTrack(trackId: string, sectionIds: string[], bpm: number): PlayAlongTrack | null {
  const source = PLAY_ALONG_TRACKS.find((track) => track.id === trackId);
  if (!source) return null;
  const wanted = new Set(sectionIds);
  const selectedSections = source.sections.filter((section) => wanted.has(section.id));
  return {
    ...source,
    bpm,
    title: `${source.title} — Learning Window`,
    sections: selectedSections.length ? selectedSections : source.sections,
  };
}

function totalBars(track: PlayAlongTrack | null): number {
  return track?.sections.reduce((sum, section) => sum + section.bars, 0) || 0;
}

export const SongLearningStageView: React.FC<SongLearningStageViewProps> = ({
  exercise,
  currentTempo,
  onCheckIn,
}) => {
  const config = exercise.curriculumMission?.songLearning;
  const track = useMemo(
    () => config ? selectTrack(config.trackId, config.sectionIds, currentTempo) : null,
    [config?.trackId, config?.sectionIds.join('|'), currentTempo]
  );

  const transportRef = useRef<PlayAlongTransport | null>(null);
  const [snapshot, setSnapshot] = useState<PlayAlongTransportSnapshot | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [activeTurn, setActiveTurn] = useState<'TUTOR' | 'LEARNER' | 'NONE'>('NONE');
  const [clickEnabled, setClickEnabled] = useState(config?.clickEnabled ?? true);
  const [spokenCues, setSpokenCues] = useState(config?.spokenCues ?? true);
  const [tutorDrums, setTutorDrums] = useState(config?.tutorDrumsEnabled ?? false);
  const [feeling, setFeeling] = useState<SelfCheckFeeling | null>(null);
  const [issues, setIssues] = useState<string[]>([]);

  useEffect(() => {
    setSnapshot(null);
    setIsRunning(false);
    setCompleted(false);
    setFeeling(null);
    setIssues([]);
    setClickEnabled(config?.clickEnabled ?? true);
    setSpokenCues(config?.spokenCues ?? true);
    setTutorDrums(config?.tutorDrumsEnabled ?? false);
  }, [exercise.id]);

  useEffect(() => {
    if (!track || !config) return;
    const transport = new PlayAlongTransport(track, {
      onSnapshot: (next) => {
        setSnapshot(next);
        setIsRunning(next.isRunning);
      },
      onComplete: () => {
        setIsRunning(false);
        setCompleted(true);
        setActiveTurn('NONE');
      },
      onTurnChange: (turn) => setActiveTurn(turn),
    });
    transport.setClickEnabled(clickEnabled);
    transport.setSpeechEnabled(spokenCues);
    transport.setCoachMode(spokenCues ? 'GUIDED' : 'PERFORMANCE');
    transport.setTutorHandoff({
      enabled: tutorDrums,
      tutorBars: config.tutorBars,
      learnerBars: config.learnerBars,
    });
    transportRef.current = transport;
    return () => {
      transport.stop();
      transportRef.current = null;
    };
  }, [track, config?.planId, config?.stageIndex]);

  useEffect(() => {
    transportRef.current?.setClickEnabled(clickEnabled);
  }, [clickEnabled]);

  useEffect(() => {
    transportRef.current?.setSpeechEnabled(spokenCues);
    transportRef.current?.setCoachMode(spokenCues ? 'GUIDED' : 'PERFORMANCE');
  }, [spokenCues]);

  useEffect(() => {
    if (!config) return;
    transportRef.current?.setTutorHandoff({
      enabled: tutorDrums,
      tutorBars: config.tutorBars,
      learnerBars: config.learnerBars,
    });
  }, [tutorDrums, config?.tutorBars, config?.learnerBars]);

  if (!config || !track) return null;

  const bars = totalBars(track);
  const progress = snapshot?.progress || 0;
  const currentSection = snapshot?.currentSection;
  const isTutorStudent = (config.tutorBars || 0) > 0 && (config.learnerBars || 0) > 0;

  const handlePlayPause = async () => {
    if (!transportRef.current) return;
    if (isRunning) {
      transportRef.current.pause();
      setIsRunning(false);
      return;
    }
    if (completed) {
      transportRef.current.stop();
      setSnapshot(null);
      setCompleted(false);
    }
    await transportRef.current.start();
    setIsRunning(true);
  };

  const handleReset = () => {
    transportRef.current?.stop();
    setSnapshot(null);
    setIsRunning(false);
    setCompleted(false);
    setActiveTurn('NONE');
  };

  const toggleIssue = (issue: string) => {
    setIssues((prev) => prev.includes(issue) ? prev.filter((item) => item !== issue) : [...prev, issue]);
  };

  const saveEvidence = () => {
    if (!feeling || !completed) return;
    const isPerformance = config.kind === 'PERFORMANCE';
    const runKey = isPerformance ? `${exercise.id}:${Date.now()}` : undefined;
    onCheckIn('PLAY', {
      selfCheck: feeling,
      issueTags: issues,
      tempoUsed: currentTempo,
      tempoChange: 0,
      completedAt: new Date().toISOString(),
      instructionMode: 'PLAY',
      assistanceLevel: exercise.curriculumMission?.assistanceTarget || 'NONE',
      evidenceCategory: 'SELF_ASSESSED_EXECUTION',
      visualTutorUsed: tutorDrums || spokenCues,
      applicationKind: isPerformance ? 'SONG_PLAY_ALONG' : undefined,
      applicationEvidenceVersion: isPerformance ? C11_SONG_LEARNING_EVIDENCE_VERSION : undefined,
      applicationEvidenceQualified: isPerformance ? true : undefined,
      applicationRunKey: runKey,
      applicationCompletedLoops: isPerformance ? 1 : undefined,
      applicationRequiredLoops: isPerformance ? 1 : undefined,
    });
  };

  return (
    <div className="bg-stone-950 text-white rounded-3xl border-2 border-stone-800 shadow-2xl overflow-hidden">
      <div className="p-4 sm:p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 border-b border-stone-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-violet-500/20 text-violet-200 border border-violet-400/30 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                C11 Song Learning • Stage {config.stageIndex}/{config.totalStages}
              </span>
              <span className="text-[10px] text-stone-400 font-mono uppercase">{config.kind.replace(/_/g, ' ')}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black leading-tight">{exercise.title.replace(/^Song Stage \d+ — /, '')}</h3>
            <p className="text-xs text-stone-300 leading-relaxed">{config.primaryGoal}</p>
          </div>
          <Music2 className="w-6 h-6 text-amber-400 shrink-0" />
        </div>

        {config.cueText && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 text-xs text-emerald-100 font-semibold">
            {config.cueText}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-stone-900 rounded-xl p-2.5 border border-stone-800">
            <span className="text-[9px] uppercase text-stone-500 font-black block">Backing</span>
            <span className="text-xs font-bold text-white">No-drum band</span>
          </div>
          <div className="bg-stone-900 rounded-xl p-2.5 border border-stone-800">
            <span className="text-[9px] uppercase text-stone-500 font-black block">Window</span>
            <span className="text-xs font-bold text-white">{bars} bars</span>
          </div>
          <div className="bg-stone-900 rounded-xl p-2.5 border border-stone-800">
            <span className="text-[9px] uppercase text-stone-500 font-black block">Tempo</span>
            <span className="text-xs font-bold text-amber-300">{currentTempo} BPM</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-black text-sky-300">Song Form</span>
            {snapshot && (
              <span className="text-[10px] font-mono text-stone-300">Bar {snapshot.currentBar}/{snapshot.totalBars} • Beat {snapshot.currentBeat}</span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {track.sections.map((section) => {
              const active = currentSection?.id === section.id;
              return (
                <div key={section.id} className={`rounded-xl border p-2.5 transition-all ${active ? 'bg-amber-400 text-stone-950 border-amber-300' : 'bg-stone-900 border-stone-800 text-stone-100'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-xs">{section.name}</span>
                    <span className="text-[9px] font-mono">{section.bars} bars</span>
                  </div>
                  <p className={`text-[10px] mt-1 leading-snug ${active ? 'text-stone-800' : 'text-stone-400'}`}>{section.grooveHint}</p>
                </div>
              );
            })}
          </div>
        </div>

        {isTutorStudent && (
          <div className={`rounded-2xl border-2 p-3 ${activeTurn === 'TUTOR' ? 'border-amber-400 bg-amber-400/10' : activeTurn === 'LEARNER' ? 'border-emerald-400 bg-emerald-500/10' : 'border-stone-700 bg-stone-900'}`}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-[9px] uppercase font-black text-stone-400 block">Continuous handoff</span>
                <span className="text-sm font-black">Tutor {config.tutorBars} bars → You {config.learnerBars} bars</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black ${activeTurn === 'TUTOR' ? 'bg-amber-400 text-stone-950' : activeTurn === 'LEARNER' ? 'bg-emerald-500 text-stone-950' : 'bg-stone-800 text-stone-300'}`}>
                {activeTurn === 'TUTOR' ? 'TUTOR PLAYING' : activeTurn === 'LEARNER' ? 'YOUR TURN' : 'READY'}
              </span>
            </div>
          </div>
        )}

        {(config.sectionGoal || config.transitionGoal || config.expectedSkills?.length) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(config.sectionGoal || config.transitionGoal) && (
              <div className="bg-stone-900 rounded-xl p-3 border border-stone-800">
                <span className="text-[9px] uppercase font-black text-amber-300 block mb-1">Current musical job</span>
                <p className="text-[11px] text-stone-200 leading-relaxed">{config.transitionGoal || config.sectionGoal}</p>
              </div>
            )}
            {config.expectedSkills?.length ? (
              <div className="bg-stone-900 rounded-xl p-3 border border-stone-800">
                <span className="text-[9px] uppercase font-black text-sky-300 block mb-1">Skills being transferred</span>
                <div className="flex flex-wrap gap-1.5">
                  {config.expectedSkills.map((skill) => <span key={skill} className="text-[9px] bg-stone-800 border border-stone-700 px-2 py-1 rounded-full">{skill}</span>)}
                </div>
              </div>
            ) : null}
          </div>
        )}

        <div className="bg-stone-900 rounded-2xl border border-stone-800 p-3 space-y-3">
          <div className="flex items-center gap-2 text-[10px] uppercase font-black text-stone-400">
            <Headphones className="w-4 h-4" /> Learning mix
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => setTutorDrums((v) => !v)} className={`rounded-xl p-2 border text-[10px] font-black ${tutorDrums ? 'bg-amber-400/15 border-amber-400 text-amber-200' : 'bg-stone-950 border-stone-700 text-stone-400'}`}>
              <Drum className="w-4 h-4 mx-auto mb-1" /> Tutor drums {tutorDrums ? 'ON' : 'OFF'}
            </button>
            <button type="button" onClick={() => setClickEnabled((v) => !v)} className={`rounded-xl p-2 border text-[10px] font-black ${clickEnabled ? 'bg-sky-500/15 border-sky-400 text-sky-200' : 'bg-stone-950 border-stone-700 text-stone-400'}`}>
              {clickEnabled ? <Volume2 className="w-4 h-4 mx-auto mb-1" /> : <VolumeX className="w-4 h-4 mx-auto mb-1" />} Click {clickEnabled ? 'ON' : 'OFF'}
            </button>
            <button type="button" onClick={() => setSpokenCues((v) => !v)} className={`rounded-xl p-2 border text-[10px] font-black ${spokenCues ? 'bg-violet-500/15 border-violet-400 text-violet-200' : 'bg-stone-950 border-stone-700 text-stone-400'}`}>
              <Mic2 className="w-4 h-4 mx-auto mb-1" /> Cues {spokenCues ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        <div className="h-2 rounded-full bg-stone-800 overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>

        <div className="grid grid-cols-12 gap-2">
          <button type="button" onClick={handlePlayPause} className={`col-span-9 rounded-2xl py-3.5 font-black text-sm flex items-center justify-center gap-2 ${isRunning ? 'bg-rose-700 text-white' : 'bg-emerald-500 text-stone-950'}`}>
            {isRunning ? <><Pause className="w-5 h-5 fill-current" /> Pause Song Window</> : <><Play className="w-5 h-5 fill-current" /> {completed ? 'Replay Song Window' : 'Start Song Window'}</>}
          </button>
          <button type="button" onClick={handleReset} className="col-span-3 rounded-2xl bg-stone-800 text-stone-200 border border-stone-700 flex items-center justify-center gap-1 text-xs font-black">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
        </div>

        {!completed && (
          <p className="text-[10px] text-stone-400 text-center">Complete this musical window before evidence can be saved. Backing accompaniment continues through tutor/student handoffs.</p>
        )}

        {completed && (
          <div className="border-t border-stone-800 pt-4 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-black text-sm">Song window completed — grade the musical result.</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FEELINGS.map((option) => (
                <button key={option.value} type="button" onClick={() => setFeeling(option.value)} className={`rounded-xl border p-3 text-left ${feeling === option.value ? 'bg-[#4a523a] border-[#7f8c61] text-white' : 'bg-stone-900 border-stone-800 text-stone-200'}`}>
                  <span className="text-xs font-black block">{option.label}</span>
                  <span className="text-[10px] opacity-70 leading-snug">{option.detail}</span>
                </button>
              ))}
            </div>
            <div>
              <span className="text-[10px] uppercase font-black text-stone-400 block mb-2">Any friction?</span>
              <div className="flex flex-wrap gap-1.5">
                {ISSUE_TAGS.map((issue) => (
                  <button key={issue} type="button" onClick={() => toggleIssue(issue)} className={`px-2.5 py-1.5 rounded-full border text-[10px] font-bold ${issues.includes(issue) ? 'bg-rose-500/20 border-rose-400 text-rose-200' : 'bg-stone-900 border-stone-700 text-stone-300'}`}>{issue}</button>
                ))}
              </div>
            </div>
            <button type="button" disabled={!feeling} onClick={saveEvidence} className="w-full rounded-2xl py-3.5 bg-amber-400 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 font-black text-sm flex items-center justify-center gap-2">
              Save Stage Evidence & Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

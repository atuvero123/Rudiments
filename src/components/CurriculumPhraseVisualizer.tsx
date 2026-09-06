import React from 'react';
import { CurriculumMissionMetadata } from '../types';
import { Layers, Target } from 'lucide-react';

interface CurriculumPhraseVisualizerProps {
  mission: CurriculumMissionMetadata;
  currentBar: number;
  currentBeat: number;
  isPlaying: boolean;
}

export const CurriculumPhraseVisualizer: React.FC<CurriculumPhraseVisualizerProps> = ({
  mission,
  currentBar,
  currentBeat,
  isPlaying,
}) => {
  const structure = mission.structure;
  if (!structure) return null;

  const totalBars = Math.max(1, structure.totalBars);
  const liveBar = ((Math.max(1, currentBar) - 1) % totalBars) + 1;
  const liveBeat = Math.max(1, currentBeat || 1);
  const activeSection = structure.sections?.find(
    (section) => liveBar >= section.startBar && liveBar < section.startBar + section.bars
  );
  const landmarks = new Set(structure.highlightLandmarkBars || [1]);

  return (
    <div className="rounded-2xl border border-sky-500/30 bg-sky-950/25 p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-300" />
          <div>
            <span className="text-[10px] uppercase tracking-wider font-black text-sky-300">C6 Phrase Visualizer</span>
            <p className="text-xs text-stone-300 font-semibold">{mission.missionTitle}</p>
          </div>
        </div>
        <div className="text-[11px] font-mono text-stone-300">
          {activeSection ? `${activeSection.label} • ` : ''}Bar {liveBar}/{totalBars} • Beat {liveBeat}/{structure.beatsPerBar}
        </div>
      </div>

      {structure.showBarNumbers !== false && (
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
          {Array.from({ length: totalBars }, (_, index) => index + 1).map((bar) => {
            const active = isPlaying ? bar === liveBar : bar === 1;
            const landmark = landmarks.has(bar);
            return (
              <div
                key={bar}
                className={`rounded-xl border px-2 py-2 text-center transition-all ${
                  active
                    ? 'bg-sky-400 text-stone-950 border-sky-300 shadow-md scale-[1.03]'
                    : landmark
                    ? 'bg-amber-400/10 text-amber-200 border-amber-400/40'
                    : 'bg-stone-900/70 text-stone-400 border-stone-800'
                }`}
              >
                <span className="text-[9px] uppercase font-bold block">{landmark ? 'LANDMARK' : 'BAR'}</span>
                <span className="text-sm font-mono font-black">{bar}</span>
              </div>
            );
          })}
        </div>
      )}

      {structure.showBeatNumbers !== false && (
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-300 shrink-0" />
          <div className="grid grid-cols-4 gap-2 flex-1">
            {Array.from({ length: structure.beatsPerBar }, (_, index) => index + 1).map((beat) => {
              const active = isPlaying ? beat === liveBeat : beat === 1;
              return (
                <div
                  key={beat}
                  className={`rounded-lg py-2 text-center font-mono font-black text-sm border ${
                    active
                      ? 'bg-amber-400 text-stone-950 border-amber-300'
                      : 'bg-stone-950 text-stone-400 border-stone-800'
                  }`}
                >
                  {beat}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="text-[11px] text-stone-400 font-medium">
        Beat numbers repeat inside every bar. Bar numbers track the larger phrase. Beat 1 is the reset point — do not confuse it with Bar 1.
      </div>
    </div>
  );
};

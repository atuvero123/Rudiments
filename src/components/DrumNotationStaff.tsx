import React, { useMemo } from 'react';
import { CompetencyTeachingDefinition } from '../types';

interface DrumNotationStaffProps {
  teachingDef: CompetencyTeachingDefinition;
  currentBar?: number;
  currentBeat?: number;
  currentSubdivision?: number;
  isPlaying?: boolean;
  compact?: boolean;
  showLegend?: boolean;
  showCounts?: boolean;
  showPlayhead?: boolean;
  showVoiceLabels?: boolean;
  showBarLabels?: boolean;
  showInstruction?: boolean;
  title?: string;
}

type StaffVoice = 'hihat_closed' | 'snare' | 'kick';

const VOICE_Y: Record<StaffVoice, number> = {
  hihat_closed: 24,
  snare: 55,
  kick: 79,
};

function isStaffVoice(value: string): value is StaffVoice {
  return value === 'hihat_closed' || value === 'snare' || value === 'kick';
}

function displayVoice(voice: StaffVoice) {
  if (voice === 'hihat_closed') return 'HH';
  if (voice === 'snare') return 'S';
  return 'K';
}

export const DrumNotationStaff: React.FC<DrumNotationStaffProps> = ({
  teachingDef,
  currentBar = 1,
  currentBeat = 1,
  currentSubdivision = 0,
  isPlaying = false,
  compact = false,
  showLegend = true,
  showCounts = true,
  showPlayhead = true,
  showVoiceLabels = true,
  showBarLabels = true,
  showInstruction = true,
  title = 'Read the Written Bar',
}) => {
  const slotsPerBar = Math.max(1, teachingDef.beatsPerBar * teachingDef.subdivisionCount);
  const totalBars = Math.max(1, teachingDef.bars || 1);

  const bars = useMemo(() => {
    return Array.from({ length: totalBars }, (_, barIndex) => {
      const bar = barIndex + 1;
      const slots = Array.from({ length: slotsPerBar }, (_, index) => {
        const beat = Math.floor(index / teachingDef.subdivisionCount) + 1;
        const subdivision = index % teachingDef.subdivisionCount;
        const events = teachingDef.events.filter(
          (event) => (event.bar || 1) === bar && event.beat === beat && event.subdivision === subdivision
        );
        const voices = new Set<StaffVoice>();
        for (const event of events) {
          const surfaces = event.surfaces?.length ? event.surfaces : [event.surface];
          for (const surface of surfaces) {
            if (isStaffVoice(surface)) voices.add(surface);
          }
        }
        return {
          index,
          beat,
          subdivision,
          token: teachingDef.countTokens[index] || '',
          voices: Array.from(voices),
          isRest: voices.size === 0,
        };
      });
      return { bar, slots };
    });
  }, [slotsPerBar, teachingDef, totalBars]);

  const width = 760;
  const left = 62;
  const right = 24;
  const usable = width - left - right;
  const step = usable / slotsPerBar;
  const activeIndex = Math.max(
    0,
    Math.min(slotsPerBar - 1, (Math.max(1, currentBeat) - 1) * teachingDef.subdivisionCount + Math.max(0, currentSubdivision))
  );

  return (
    <div className="bg-stone-950 border border-stone-800 rounded-2xl p-3 sm:p-4 space-y-3 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-sky-300">Drum Staff Reading</div>
          <div className="text-sm font-black text-white">{title}</div>
        </div>
        <div className="text-[10px] font-mono text-stone-400">
          {teachingDef.meter} • {teachingDef.subdivision} • {totalBars} bar{totalBars === 1 ? '' : 's'} • read left → right
        </div>
      </div>

      <div className="space-y-2">
        {bars.map(({ bar, slots }) => (
          <div key={bar} className="rounded-xl bg-white border border-stone-300 overflow-x-auto relative">
            {showBarLabels && (
              <div className={`absolute z-10 left-2 top-2 text-[9px] font-black px-2 py-1 rounded-full ${showPlayhead && isPlaying && currentBar === bar ? 'bg-amber-300 text-stone-950' : 'bg-stone-100 text-stone-600'}`}>
                BAR {bar}
              </div>
            )}
            <svg
              viewBox={`0 0 ${width} 126`}
              className={`${compact ? 'min-w-[560px]' : 'min-w-[660px]'} w-full h-auto block`}
              role="img"
              aria-label={`Drum notation staff bar ${bar} with hi-hat, snare and kick voices`}
            >
              <rect x="0" y="0" width={width} height="126" fill="#fafaf9" />

              {[35, 45, 55, 65, 75].map((y) => (
                <line key={y} x1={left - 22} x2={width - 10} y1={y} y2={y} stroke="#292524" strokeWidth="1.5" />
              ))}
              <line x1={left - 22} x2={left - 22} y1="35" y2="75" stroke="#292524" strokeWidth="2" />
              <line x1={width - 12} x2={width - 12} y1="35" y2="75" stroke="#292524" strokeWidth="2" />

              {showVoiceLabels && (
                <>
                  <text x="8" y="27" fontSize="11" fontWeight="700" fill="#57534e">HH</text>
                  <text x="10" y="58" fontSize="11" fontWeight="700" fill="#57534e">S</text>
                  <text x="12" y="82" fontSize="11" fontWeight="700" fill="#57534e">K</text>
                </>
              )}

              {slots.map((slot) => {
                const x = left + step * slot.index + step / 2;
                const active = showPlayhead && isPlaying && currentBar === bar && slot.index === activeIndex;
                return (
                  <g key={slot.index}>
                    {active && (
                      <rect
                        x={x - step * 0.42}
                        y="12"
                        width={step * 0.84}
                        height="94"
                        rx="8"
                        fill="#fef3c7"
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                      />
                    )}

                    {slot.voices.map((voice) => {
                      const y = VOICE_Y[voice];
                      if (voice === 'hihat_closed') {
                        return (
                          <g key={`${slot.index}-${voice}`}>
                            <line x1={x - 5} x2={x + 5} y1={y - 5} y2={y + 5} stroke="#111827" strokeWidth="2.3" />
                            <line x1={x + 5} x2={x - 5} y1={y - 5} y2={y + 5} stroke="#111827" strokeWidth="2.3" />
                            <line x1={x + 5} x2={x + 5} y1={y} y2={y - 20} stroke="#111827" strokeWidth="1.5" />
                          </g>
                        );
                      }
                      return (
                        <g key={`${slot.index}-${voice}`}>
                          <ellipse cx={x} cy={y} rx="6" ry="4.2" transform={`rotate(-14 ${x} ${y})`} fill="#111827" />
                          <line x1={x + 5} x2={x + 5} y1={y} y2={y - 22} stroke="#111827" strokeWidth="1.5" />
                        </g>
                      );
                    })}

                    {slot.isRest && (
                      <text x={x} y="60" textAnchor="middle" fontSize="17" fontWeight="700" fill="#78716c">𝄽</text>
                    )}

                    {showCounts && (
                      <>
                        <text
                          x={x}
                          y="102"
                          textAnchor="middle"
                          fontSize="12"
                          fontWeight={slot.subdivision === 0 ? 800 : 600}
                          fill={active ? '#92400e' : '#44403c'}
                        >
                          {slot.token}
                        </text>
                        {slot.subdivision === 0 && (
                          <text x={x} y="116" textAnchor="middle" fontSize="8" fontWeight="700" fill="#78716c">
                            beat {slot.beat}
                          </text>
                        )}
                      </>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        ))}
      </div>

      {showLegend && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px]">
          {([
            ['hihat_closed', 'x notehead above the staff', 'Closed hi-hat'],
            ['snare', 'middle staff position', 'Snare'],
            ['kick', 'low staff position', 'Kick / bass drum'],
          ] as Array<[StaffVoice, string, string]>).map(([voice, position, label]) => (
            <div key={voice} className="bg-stone-900 rounded-xl border border-stone-800 p-2.5 text-stone-300">
              <span className="font-black text-amber-300 mr-1.5">{displayVoice(voice)}</span>
              <span className="font-bold text-white">{label}</span>
              <div className="text-stone-400 mt-0.5">{position}</div>
            </div>
          ))}
          <div className="bg-stone-900 rounded-xl border border-stone-800 p-2.5 text-stone-300">
            <span className="font-black text-amber-300 mr-1.5">REST</span>
            <span className="font-bold text-white">Written silence</span>
            <div className="text-stone-400 mt-0.5">Do not invent a hit where the staff leaves space.</div>
          </div>
        </div>
      )}

      {showInstruction && (
        <p className="text-[11px] text-stone-400 leading-relaxed">
          The staff is the instruction. Do not convert it into an R/L sticking sequence. Read each written voice at its horizontal position, count underneath it, preserve rests, and let simultaneous noteheads sound together.
        </p>
      )}
    </div>
  );
};

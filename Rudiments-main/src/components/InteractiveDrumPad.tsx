import React, { useState, useEffect, useCallback } from 'react';
import { Drum, Volume2, Sparkles } from 'lucide-react';
import { InstrumentSurface } from '../types';
import { audioEngine } from '../lib/audioEngine';

interface InteractiveDrumPadProps {
  isPad: boolean;
  accentSurface?: InstrumentSurface;
}

interface PadVoice {
  id: string;
  name: string;
  key: string;
  surface: InstrumentSurface;
  isAccent?: boolean;
  color: string;
  description: string;
}

export const InteractiveDrumPad: React.FC<InteractiveDrumPadProps> = ({
  isPad,
  accentSurface,
}) => {
  const [activeHitId, setActiveHitId] = useState<string | null>(null);
  const [hitCounter, setHitCounter] = useState<number>(0);

  // Pad Voices configuration
  const padVoices: PadVoice[] = isPad
    ? [
        {
          id: 'pad-center',
          name: 'Pad Center',
          key: 'J',
          surface: 'center',
          color: 'from-amber-600 to-amber-700',
          description: 'Full rebound primary stroke (Right/Left)',
        },
        {
          id: 'pad-edge',
          name: 'Pad Edge',
          key: 'K',
          surface: 'left_zone',
          color: 'from-stone-600 to-stone-700',
          description: 'Softer tap / ghost note zone',
        },
        {
          id: 'pad-rim',
          name: 'Pad Rim / Accent',
          key: 'Space',
          surface: 'rim_edge',
          isAccent: true,
          color: 'from-amber-500 to-amber-600',
          description: 'Accented downbeat resolution (>R or >L)',
        },
      ]
    : [
        {
          id: 'snare',
          name: 'Snare Drum',
          key: 'J',
          surface: 'snare',
          color: 'from-amber-600 to-amber-700',
          description: 'Backbeat / Rudiment workhorse',
        },
        {
          id: 'kick',
          name: 'Bass Drum (Kick)',
          key: 'Space',
          surface: 'kick',
          color: 'from-rose-700 to-rose-800',
          description: 'Low-end pulse foundation',
        },
        {
          id: 'hihat',
          name: 'Closed Hi-Hat',
          key: 'K',
          surface: 'hihat_closed',
          color: 'from-yellow-600 to-yellow-700',
          description: 'Subdivision timekeeper',
        },
        {
          id: 'crash',
          name: 'Crash Cymbal',
          key: 'U',
          surface: 'crash',
          isAccent: true,
          color: 'from-amber-400 to-amber-500',
          description: 'Beat 1 phrase landing target',
        },
        {
          id: 'tom-high',
          name: 'High Tom',
          key: 'H',
          surface: 'tom_high',
          color: 'from-blue-600 to-blue-700',
          description: 'Fill melody voice',
        },
        {
          id: 'tom-floor',
          name: 'Floor Tom',
          key: 'N',
          surface: 'tom_floor',
          color: 'from-indigo-700 to-indigo-800',
          description: 'Deep resonant fill voice',
        },
      ];

  const triggerVoice = useCallback(
    (voice: PadVoice) => {
      audioEngine.playEventSound('groove', voice.surface, Boolean(voice.isAccent), isPad);
      setActiveHitId(voice.id);
      setHitCounter((c) => c + 1);

      setTimeout(() => {
        setActiveHitId((curr) => (curr === voice.id ? null : curr));
      }, 120);
    },
    [isPad]
  );

  // Keyboard hit listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing inside input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const keyUpper = e.key.toUpperCase();
      const voice = padVoices.find(
        (v) =>
          v.key.toUpperCase() === keyUpper ||
          (v.key === 'Space' && e.code === 'Space')
      );

      if (voice) {
        e.preventDefault();
        triggerVoice(voice);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [padVoices, triggerVoice]);

  return (
    <div className="bg-stone-900/90 rounded-2xl p-4 sm:p-5 border border-stone-800 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Drum className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-black uppercase tracking-wider text-stone-200">
            Interactive {isPad ? 'Practice Pad' : 'Acoustic Drum Kit'} (Click or Press Keys)
          </span>
        </div>
        <span className="text-[10px] font-mono text-stone-400">
          Hits: <strong className="text-amber-300">{hitCounter}</strong>
        </span>
      </div>

      <div
        className={`grid gap-2.5 ${
          isPad ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3'
        }`}
      >
        {padVoices.map((voice) => {
          const isHit = activeHitId === voice.id;

          return (
            <button
              key={voice.id}
              onClick={() => triggerVoice(voice)}
              className={`relative overflow-hidden p-3.5 rounded-2xl border text-left transition-all active:scale-95 cursor-pointer select-none ${
                isHit
                  ? 'bg-amber-400 text-stone-950 border-white ring-4 ring-amber-400/50 scale-102 shadow-2xl'
                  : 'bg-stone-950 hover:bg-stone-850 text-stone-200 border-stone-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-black ${
                    isHit ? 'text-stone-950' : 'text-white'
                  }`}
                >
                  {voice.name}
                </span>
                <span
                  className={`text-[10px] font-mono font-black px-2 py-0.5 rounded ${
                    isHit
                      ? 'bg-stone-950 text-amber-300'
                      : 'bg-stone-800 text-stone-300 border border-stone-700'
                  }`}
                >
                  [{voice.key}]
                </span>
              </div>
              <p
                className={`text-[10px] mt-1 line-clamp-1 ${
                  isHit ? 'text-stone-900 font-bold' : 'text-stone-400'
                }`}
              >
                {voice.description}
              </p>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-stone-400 text-center italic pt-1">
        Keyboard controls enabled. Use keys on your keyboard for low-latency acoustic response.
      </p>
    </div>
  );
};

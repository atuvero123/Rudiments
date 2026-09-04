import React, { useState } from 'react';
import { Drum, Volume2, CheckCircle2 } from 'lucide-react';
import { audioEngine } from '../lib/audioEngine';

interface SoundVoice {
  id: string;
  label: string;
  cue: string;
  accent?: boolean;
}

const SOUND_VOICES: SoundVoice[] = [
  { id: 'kick', label: 'Kick', cue: 'Low pulse / bass drum' },
  { id: 'snare', label: 'Snare', cue: 'Backbeat / main hand voice', accent: true },
  { id: 'ghost_snare', label: 'Ghost Snare', cue: 'Soft inner snare note' },
  { id: 'hihat_closed', label: 'Closed Hat', cue: 'Short timekeeper' },
  { id: 'hihat_open', label: 'Open Hat', cue: 'Longer wash / lift' },
  { id: 'tom_high', label: 'High Tom', cue: 'High fill voice' },
  { id: 'tom_mid', label: 'Mid Tom', cue: 'Middle fill voice' },
  { id: 'tom_floor', label: 'Floor Tom', cue: 'Deep fill voice' },
  { id: 'crash', label: 'Crash', cue: 'Section / Beat-1 landing', accent: true },
  { id: 'ride', label: 'Ride', cue: 'Metallic timekeeper' },
  { id: 'clap', label: 'Clap', cue: 'Counting tutor cue' },
  { id: 'metronome', label: 'Click', cue: 'Neutral timing reference', accent: true },
];

export const DrumSoundCheck: React.FC = () => {
  const [lastVoice, setLastVoice] = useState<string | null>(null);

  const play = async (voice: SoundVoice) => {
    await audioEngine.ensureAudioContextReady();
    audioEngine.playInstrumentSound(voice.id, Boolean(voice.accent));
    setLastVoice(voice.id);
    window.setTimeout(() => setLastVoice((current) => (current === voice.id ? null : current)), 220);
  };

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-amber-400" /> Drum Sound Check
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Learn the app's audio vocabulary. Every voice below must sound clearly different before using Watch or Follow.
          </p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full self-start">
          C2 Audio
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {SOUND_VOICES.map((voice) => {
          const active = lastVoice === voice.id;
          return (
            <button
              key={voice.id}
              type="button"
              onClick={() => play(voice)}
              aria-label={`Play ${voice.label} sound`}
              className={`min-h-[76px] p-3 rounded-xl border text-left transition-all active:scale-[0.98] ${
                active
                  ? 'bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-300/50'
                  : 'bg-slate-950 text-slate-200 border-slate-800 hover:border-amber-500/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-black text-xs">{voice.label}</span>
                {active ? <CheckCircle2 className="w-4 h-4" /> : <Drum className="w-4 h-4 opacity-60" />}
              </div>
              <p className={`text-[10px] mt-1 leading-snug ${active ? 'text-slate-800' : 'text-slate-400'}`}>
                {voice.cue}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
};

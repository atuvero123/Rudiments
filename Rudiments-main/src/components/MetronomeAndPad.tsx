import React, { useState, useEffect, useRef } from 'react';
import { audioEngine } from '../lib/audioEngine';
import { PRESET_RUDIMENTS } from '../data/initialData';
import { RudimentPattern } from '../types';
import { Play, Square, Volume2, Activity, Zap, Drum, RefreshCw, Layers } from 'lucide-react';
import { DrumSoundCheck } from './DrumSoundCheck';

interface MetronomeAndPadProps {
  initialStartBpm?: number;
  initialTargetBpm?: number;
}

export const MetronomeAndPad: React.FC<MetronomeAndPadProps> = ({
  initialStartBpm = 70,
  initialTargetBpm = 110,
}) => {
  // Metronome state
  const [bpm, setBpm] = useState(initialStartBpm);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beatsInBar, setBeatsInBar] = useState(4);
  const [subdivision, setSubdivision] = useState(1);
  const [currentBeatIndex, setCurrentBeatIndex] = useState(0);

  // Tempo ladder mode state
  const [isLadderActive, setIsLadderActive] = useState(false);
  const [ladderStartBpm, setLadderStartBpm] = useState(initialStartBpm);
  const [ladderStepBpm, setLadderStepBpm] = useState(10);
  const [ladderMaxBpm, setLadderMaxBpm] = useState(initialTargetBpm);
  const [ladderBarsPerStep, setLadderBarsPerStep] = useState(4);

  // Tap tempo tracking
  const tapTimesRef = useRef<number[]>([]);

  // Selected rudiment pattern for visual sticking play-along
  const [selectedPattern, setSelectedPattern] = useState<RudimentPattern>(PRESET_RUDIMENTS[2]); // Paradiddle
  const [activeStickingIndex, setActiveStickingIndex] = useState(0);

  // Active drum pad highlight states
  const [activePad, setActivePad] = useState<string | null>(null);

  // Keyboard shortcut listener for drum pads
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key.toLowerCase();
      switch (key) {
        case ' ':
        case 'a':
          triggerPad('kick');
          break;
        case 's':
        case 'd':
          triggerPad('snare');
          break;
        case 'j':
          triggerPad('hihat-closed');
          break;
        case 'k':
          triggerPad('hihat-open');
          break;
        case 'e':
          triggerPad('tom-high');
          break;
        case 'r':
          triggerPad('tom-mid');
          break;
        case 'f':
          triggerPad('tom-low');
          break;
        case 'u':
          triggerPad('crash');
          break;
        case 'i':
          triggerPad('ride');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync metronome state
  const togglePlay = () => {
    if (isPlaying) {
      audioEngine.stopMetronome();
      setIsPlaying(false);
      setCurrentBeatIndex(0);
    } else {
      audioEngine.startMetronome(
        bpm,
        beatsInBar,
        subdivision,
        (beat, currentBpm) => {
          setCurrentBeatIndex(beat);
          setBpm(currentBpm);

          // Advance sticking pattern index
          setActiveStickingIndex((prev) => (prev + 1) % selectedPattern.sticking.split(' ').length);
        },
        isLadderActive
          ? {
              startBpm: ladderStartBpm,
              stepBpm: ladderStepBpm,
              maxBpm: ladderMaxBpm,
              barsPerStep: ladderBarsPerStep,
              onStep: (newBpm) => {
                setBpm(newBpm);
              },
            }
          : undefined
      );
      setIsPlaying(true);
    }
  };

  const handleBpmChange = (newBpm: number) => {
    const clamped = Math.max(30, Math.min(300, newBpm));
    setBpm(clamped);
    audioEngine.setBpm(clamped);
  };

  const handleTapTempo = () => {
    const now = Date.now();
    const times = tapTimesRef.current;
    if (times.length > 0 && now - times[times.length - 1] > 2000) {
      times.length = 0; // reset if paused > 2 seconds
    }
    times.push(now);
    if (times.length > 5) times.shift();

    if (times.length >= 2) {
      const intervals = [];
      for (let i = 1; i < times.length; i++) {
        intervals.push(times[i] - times[i - 1]);
      }
      const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgMs);
      handleBpmChange(calculatedBpm);
    }
  };

  const triggerPad = (padId: string) => {
    setActivePad(padId);
    setTimeout(() => setActivePad(null), 150);

    switch (padId) {
      case 'kick':
        audioEngine.playKick();
        break;
      case 'snare':
        audioEngine.playSnare(true);
        break;
      case 'hihat-closed':
        audioEngine.playHiHatClosed();
        break;
      case 'hihat-open':
        audioEngine.playHiHatOpen();
        break;
      case 'tom-high':
        audioEngine.playTom('high');
        break;
      case 'tom-mid':
        audioEngine.playTom('mid');
        break;
      case 'tom-low':
        audioEngine.playTom('low');
        break;
      case 'crash':
        audioEngine.playCrash();
        break;
      case 'ride':
        audioEngine.playRide();
        break;
    }
  };

  const stickingLetters = selectedPattern.sticking.split(' ');

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-8">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
            Practice Tools
          </span>
          <h2 className="text-2xl font-black text-white mt-2 mb-1">
            Metronome, Automated Tempo Ladder & Audio Drum Pad
          </h2>
          <p className="text-sm text-slate-300">
            Precision audio engine with hands-free step-up ladder mode and keyboard-triggered drum pads.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="metronome-toggle-play-btn"
            onClick={togglePlay}
            className={`px-6 py-3.5 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center gap-2 ${
              isPlaying
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
            }`}
          >
            {isPlaying ? (
              <>
                <Square className="w-5 h-5 fill-white" />
                <span>Stop Click</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-slate-950" />
                <span>Start Click ({bpm} BPM)</span>
              </>
            )}
          </button>
        </div>
      </div>

      <DrumSoundCheck />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Metronome & Tempo Ladder Controls */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-md">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-400" /> Metronome Controls
              </h3>
              <button
                id="btn-tap-tempo"
                onClick={handleTapTempo}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold text-xs rounded-lg border border-slate-700 transition-all active:scale-95"
              >
                Tap Tempo
              </button>
            </div>

            {/* Big BPM Display */}
            <div className="text-center py-4 bg-slate-950 rounded-xl border border-slate-800 relative overflow-hidden">
              <span className="text-6xl font-black tracking-tight text-amber-400 font-mono">
                {bpm}
              </span>
              <span className="text-xs text-slate-400 block mt-1 uppercase tracking-widest font-semibold">
                Beats Per Minute
              </span>

              {/* Visual Beat Indicator Lights */}
              <div className="flex justify-center gap-2 mt-4 px-4">
                {Array.from({ length: beatsInBar * subdivision }).map((_, idx) => {
                  const isActive = isPlaying && currentBeatIndex === idx;
                  const isDownbeat = idx === 0;
                  return (
                    <div
                      key={idx}
                      className={`h-3 flex-1 rounded-full transition-all duration-75 ${
                        isActive
                          ? isDownbeat
                            ? 'bg-amber-400 shadow-lg shadow-amber-500/50 scale-110'
                            : 'bg-emerald-400 scale-105'
                          : 'bg-slate-800'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Slider & Adjusters */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                <span>30 BPM</span>
                <span>Tempo Slider</span>
                <span>300 BPM</span>
              </div>
              <input
                id="bpm-range-slider"
                type="range"
                min="30"
                max="300"
                value={bpm}
                onChange={(e) => handleBpmChange(Number(e.target.value))}
                className="w-full accent-amber-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-center gap-2 pt-1">
                {[-10, -1, +1, +10].map((delta) => (
                  <button
                    key={delta}
                    onClick={() => handleBpmChange(bpm + delta)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold rounded-lg border border-slate-700"
                  >
                    {delta > 0 ? `+${delta}` : delta}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Signature & Subdivision Selectors */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                  Time Signature
                </label>
                <select
                  value={beatsInBar}
                  onChange={(e) => setBeatsInBar(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white p-2.5 rounded-lg focus:outline-none focus:border-amber-500 font-medium"
                >
                  <option value={4}>4/4 (Common Time)</option>
                  <option value={3}>3/4 (Waltz Time)</option>
                  <option value={6}>6/8 (Compound Dual)</option>
                  <option value={5}>5/4 (Take Five)</option>
                  <option value={7}>7/8 (Odd Meter)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                  Subdivision
                </label>
                <select
                  value={subdivision}
                  onChange={(e) => setSubdivision(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white p-2.5 rounded-lg focus:outline-none focus:border-amber-500 font-medium"
                >
                  <option value={1}>Quarter Notes (1/4)</option>
                  <option value={2}>8th Notes (1/8)</option>
                  <option value={4}>16th Notes (1/16)</option>
                  <option value={3}>Triplets (1/3)</option>
                </select>
              </div>
            </div>

            {/* Automated Tempo Ladder Mode Toggle */}
            <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">Automated Tempo Ladder</span>
                </div>
                <input
                  type="checkbox"
                  checked={isLadderActive}
                  onChange={(e) => setIsLadderActive(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              {isLadderActive && (
                <div className="space-y-3 pt-2 text-xs border-t border-slate-800">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400 block mb-1">Start BPM:</span>
                      <input
                        type="number"
                        value={ladderStartBpm}
                        onChange={(e) => setLadderStartBpm(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">Target Max BPM:</span>
                      <input
                        type="number"
                        value={ladderMaxBpm}
                        onChange={(e) => setLadderMaxBpm(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400 block mb-1">Step Increase:</span>
                      <select
                        value={ladderStepBpm}
                        onChange={(e) => setLadderStepBpm(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded text-white"
                      >
                        <option value={5}>+5 BPM</option>
                        <option value={10}>+10 BPM</option>
                        <option value={15}>+15 BPM</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">Bars Per Step:</span>
                      <select
                        value={ladderBarsPerStep}
                        onChange={(e) => setLadderBarsPerStep(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded text-white"
                      >
                        <option value={2}>2 Bars</option>
                        <option value={4}>4 Bars</option>
                        <option value={8}>8 Bars</option>
                        <option value={16}>16 Bars</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-[11px] text-amber-400/90 italic">
                    The metronome will automatically increase by +{ladderStepBpm} BPM every {ladderBarsPerStep} bars with an audio cue until reaching {ladderMaxBpm} BPM.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Audio Drum Pad & Sticking Visualizer */}
        <div className="lg:col-span-7 space-y-6">
          {/* Audio Pad Synthesizer */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Drum className="w-5 h-5 text-amber-400" /> Synthesized Drum Kit Pad
              </h3>
              <span className="text-xs text-slate-400 hidden sm:inline">
                Click or use keyboard shortcuts
              </span>
            </div>

            {/* Kit Grid */}
            <div className="grid grid-cols-3 gap-3">
              {/* Cymbals row */}
              <button
                id="pad-crash"
                onClick={() => triggerPad('crash')}
                className={`p-4 rounded-xl border font-bold text-xs transition-all flex flex-col items-center justify-center gap-1 ${
                  activePad === 'crash'
                    ? 'bg-amber-400 text-slate-950 border-amber-300 scale-95 shadow-lg'
                    : 'bg-slate-950 border-slate-800 text-amber-300 hover:border-amber-500/50'
                }`}
              >
                <span>Crash Cymbal</span>
                <span className="text-[10px] opacity-60 font-mono">[U]</span>
              </button>

              <button
                id="pad-hihat-open"
                onClick={() => triggerPad('hihat-open')}
                className={`p-4 rounded-xl border font-bold text-xs transition-all flex flex-col items-center justify-center gap-1 ${
                  activePad === 'hihat-open'
                    ? 'bg-amber-400 text-slate-950 border-amber-300 scale-95 shadow-lg'
                    : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-amber-500/50'
                }`}
              >
                <span>Hi-Hat Open</span>
                <span className="text-[10px] opacity-60 font-mono">[K]</span>
              </button>

              <button
                id="pad-ride"
                onClick={() => triggerPad('ride')}
                className={`p-4 rounded-xl border font-bold text-xs transition-all flex flex-col items-center justify-center gap-1 ${
                  activePad === 'ride'
                    ? 'bg-amber-400 text-slate-950 border-amber-300 scale-95 shadow-lg'
                    : 'bg-slate-950 border-slate-800 text-blue-300 hover:border-amber-500/50'
                }`}
              >
                <span>Ride Cymbal</span>
                <span className="text-[10px] opacity-60 font-mono">[I]</span>
              </button>

              {/* Toms Row */}
              <button
                id="pad-tom-high"
                onClick={() => triggerPad('tom-high')}
                className={`p-4 rounded-xl border font-bold text-xs transition-all flex flex-col items-center justify-center gap-1 ${
                  activePad === 'tom-high'
                    ? 'bg-amber-400 text-slate-950 border-amber-300 scale-95 shadow-lg'
                    : 'bg-slate-950 border-slate-800 text-purple-300 hover:border-amber-500/50'
                }`}
              >
                <span>High Tom</span>
                <span className="text-[10px] opacity-60 font-mono">[E]</span>
              </button>

              <button
                id="pad-tom-mid"
                onClick={() => triggerPad('tom-mid')}
                className={`p-4 rounded-xl border font-bold text-xs transition-all flex flex-col items-center justify-center gap-1 ${
                  activePad === 'tom-mid'
                    ? 'bg-amber-400 text-slate-950 border-amber-300 scale-95 shadow-lg'
                    : 'bg-slate-950 border-slate-800 text-purple-300 hover:border-amber-500/50'
                }`}
              >
                <span>Mid Tom</span>
                <span className="text-[10px] opacity-60 font-mono">[R]</span>
              </button>

              <button
                id="pad-hihat-closed"
                onClick={() => triggerPad('hihat-closed')}
                className={`p-4 rounded-xl border font-bold text-xs transition-all flex flex-col items-center justify-center gap-1 ${
                  activePad === 'hihat-closed'
                    ? 'bg-amber-400 text-slate-950 border-amber-300 scale-95 shadow-lg'
                    : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-amber-500/50'
                }`}
              >
                <span>Hi-Hat Closed</span>
                <span className="text-[10px] opacity-60 font-mono">[J]</span>
              </button>

              {/* Core Snare / Kick / Floor Tom */}
              <button
                id="pad-snare"
                onClick={() => triggerPad('snare')}
                className={`p-5 rounded-xl border font-bold text-sm transition-all flex flex-col items-center justify-center gap-1 shadow-md ${
                  activePad === 'snare'
                    ? 'bg-amber-400 text-slate-950 border-amber-300 scale-95 shadow-lg'
                    : 'bg-slate-800 border-slate-700 text-white hover:border-amber-500'
                }`}
              >
                <span>Snare Drum</span>
                <span className="text-[10px] text-amber-400 font-mono">[S / D]</span>
              </button>

              <button
                id="pad-kick"
                onClick={() => triggerPad('kick')}
                className={`p-5 rounded-xl border font-bold text-sm transition-all flex flex-col items-center justify-center gap-1 col-span-1 shadow-md ${
                  activePad === 'kick'
                    ? 'bg-amber-400 text-slate-950 border-amber-300 scale-95 shadow-lg'
                    : 'bg-slate-800 border-slate-700 text-white hover:border-amber-500'
                }`}
              >
                <span>Bass Kick</span>
                <span className="text-[10px] text-amber-400 font-mono">[Space / A]</span>
              </button>

              <button
                id="pad-tom-low"
                onClick={() => triggerPad('tom-low')}
                className={`p-5 rounded-xl border font-bold text-xs transition-all flex flex-col items-center justify-center gap-1 ${
                  activePad === 'tom-low'
                    ? 'bg-amber-400 text-slate-950 border-amber-300 scale-95 shadow-lg'
                    : 'bg-slate-950 border-slate-800 text-purple-300 hover:border-amber-500/50'
                }`}
              >
                <span>Floor Tom</span>
                <span className="text-[10px] opacity-60 font-mono">[F]</span>
              </button>
            </div>
          </div>

          {/* Sticking Pattern Visualizer & Play-Along */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" /> Sticking Pattern Visualizer
              </h3>
              <select
                value={selectedPattern.id}
                onChange={(e) => {
                  const found = PRESET_RUDIMENTS.find((r) => r.id === e.target.value);
                  if (found) {
                    setSelectedPattern(found);
                    setActiveStickingIndex(0);
                  }
                }}
                className="bg-slate-950 border border-slate-800 text-xs text-amber-400 font-semibold p-2 rounded-lg focus:outline-none"
              >
                {PRESET_RUDIMENTS.map((rud) => (
                  <option key={rud.id} value={rud.id}>
                    {rud.name} ({rud.category})
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs text-slate-400">{selectedPattern.description}</p>

            {/* Visual Sticking Sequence Boxes */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Sticking Sequence ({selectedPattern.timeSignature})
              </div>
              <div className="flex flex-wrap gap-2">
                {stickingLetters.map((stroke, idx) => {
                  const isActive = isPlaying && activeStickingIndex === idx;
                  const isRight = stroke.toUpperCase().includes('R');
                  const isAccented = selectedPattern.accentIndices?.includes(idx);

                  return (
                    <div
                      key={idx}
                      className={`w-12 h-14 rounded-xl border flex flex-col items-center justify-center font-mono font-bold transition-all ${
                        isActive
                          ? 'bg-amber-500 border-amber-300 text-slate-950 scale-110 shadow-lg shadow-amber-500/30'
                          : isRight
                          ? 'bg-slate-900 border-slate-700 text-amber-400'
                          : 'bg-slate-900 border-slate-700 text-cyan-400'
                      }`}
                    >
                      <span className="text-lg">{stroke}</span>
                      {isAccented && (
                        <span className="text-[10px] text-rose-400 font-black uppercase">
                          ACCENT
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

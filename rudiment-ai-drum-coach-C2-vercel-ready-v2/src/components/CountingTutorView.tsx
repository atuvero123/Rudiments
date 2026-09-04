import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Clock,
  Mic,
  Music,
} from 'lucide-react';
import { PracticeExercise, RhythmTimeline, CompetencyTeachingDefinition } from '../types';
import { masterTransport } from '../lib/masterTransportEngine';
import { audioEngine } from '../lib/audioEngine';

interface CountingTutorViewProps {
  exercise: PracticeExercise;
  timeline: RhythmTimeline;
  teachingDef: CompetencyTeachingDefinition;
  currentTempo: number;
  onProceedToWatch: () => void;
  onTempoAdjust?: (delta: number) => void;
}

export const CountingTutorView: React.FC<CountingTutorViewProps> = ({
  exercise,
  timeline,
  teachingDef,
  currentTempo,
  onProceedToWatch,
  onTempoAdjust,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [voiceCount, setVoiceCount] = useState<boolean>(true);
  const [clapEnabled, setClapEnabled] = useState<boolean>(true);
  const [countInBars, setCountInBars] = useState<number>(1);
  const [activeSubdivision, setActiveSubdivision] = useState<number>(0);
  const [activeToken, setActiveToken] = useState<string | null>(null);
  const [currentBeat, setCurrentBeat] = useState<number>(1);
  const [currentBar, setCurrentBar] = useState<number>(1);
  const [countInBeat, setCountInBeat] = useState<number>(0);
  const [isCountIn, setIsCountIn] = useState<boolean>(false);

  // Sync settings into master transport
  useEffect(() => {
    masterTransport.setVoiceCountEnabled(voiceCount);
  }, [voiceCount]);

  useEffect(() => {
    masterTransport.setClapEnabled(clapEnabled);
  }, [clapEnabled]);

  useEffect(() => {
    masterTransport.setCountInBars(countInBars);
  }, [countInBars]);

  // Polling loop for visual token highlight
  useEffect(() => {
    let animFrame: number;

    const poll = () => {
      if (masterTransport.getIsRunning()) {
        const state = masterTransport.getState();
        setIsPlaying(state.status === 'running' || state.status === 'count_in');
        setIsCountIn(state.isCountIn);
        setCountInBeat(state.countInBeat);
        setCurrentBar(state.currentBar);
        setCurrentBeat(state.currentBeat);
        setActiveToken(state.activeCountToken);
        setActiveSubdivision(state.activeSubdivisionHighlight);
      } else {
        setIsPlaying(false);
        setIsCountIn(false);
        setCountInBeat(0);
        setActiveToken(null);
      }
      animFrame = requestAnimationFrame(poll);
    };

    animFrame = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(animFrame);
  }, []);

  const handleTogglePlay = async () => {
    if (isPlaying) {
      masterTransport.stop();
      setIsPlaying(false);
    } else {
      masterTransport.setTeachingStage('COUNT');
      masterTransport.setVoiceCountEnabled(voiceCount);
      masterTransport.setClapEnabled(clapEnabled);
      masterTransport.setCountInBars(countInBars);

      await masterTransport.start({
        timeline,
        bpm: currentTempo,
        instructionMode: 'WATCH',
        assistanceLevel: 'FULL',
        hasCountIn: true,
        countInBars,
        voiceCountEnabled: voiceCount,
        clapEnabled,
        teachingStage: 'COUNT',
        teachingDefinition: teachingDef,
        loopLimit: Infinity,
      });
      setIsPlaying(true);
    }
  };

  const handlePreviewToken = (token: string, spokenText: string) => {
    audioEngine.speakCountWord(spokenText, 1.0);
    if (clapEnabled) {
      audioEngine.playClap(undefined, 0.6);
    }
  };

  const tokens = teachingDef.countTokens || ['1', '&', '2', '&', '3', '&', '4', '&'];
  const spoken = teachingDef.spokenTokens || ['one', 'and', 'two', 'and', 'three', 'and', 'four', 'and'];

  return (
    <div className="bg-stone-950 text-white rounded-3xl p-5 sm:p-7 border-2 border-stone-800 shadow-2xl space-y-6">
      {/* Stage Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border border-amber-500/30">
              STAGE 2: COUNT
            </span>
            <span className="text-xs font-mono text-stone-400">
              {teachingDef.meter} • {teachingDef.subdivision}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
            Internalize the Subdivision with Voice & Claps
          </h2>
          <p className="text-xs text-stone-300 font-medium mt-0.5">
            If you can count it aloud steadily, you can play it effortlessly on the kit.
          </p>
        </div>

        {/* Action Button: Next Step */}
        <button
          onClick={() => {
            if (isPlaying) masterTransport.stop();
            onProceedToWatch();
          }}
          className="self-start sm:self-auto flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-stone-950 px-4 py-2.5 rounded-2xl font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <span>3. Watch Coach Demo</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Count-In Banner */}
      {isCountIn && (
        <div className="bg-amber-500/20 border-2 border-amber-500/50 rounded-2xl p-4 text-center space-y-1 animate-pulse">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">
            COUNT-IN (GET READY)
          </span>
          <div className="text-3xl sm:text-4xl font-black font-mono text-amber-400">
            COUNT: {countInBeat} OF {teachingDef.beatsPerBar}
          </div>
          <p className="text-xs text-amber-200/90 font-medium">
            Lock into {currentTempo} BPM tempo before phrase starts
          </p>
        </div>
      )}

      {/* Interactive Counting Syllables Strip */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-stone-400">
          <span className="font-bold uppercase tracking-wider text-[10px] text-stone-400">
            Subdivision Grid & Spoken Tokens (Click any token to hear speech):
          </span>
          <span className="text-[10px] font-mono text-stone-400">
            Bar {currentBar} • Beat {currentBeat}
          </span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {tokens.map((token, idx) => {
            const isDownbeat = /^[1-9]/.test(token);
            const isAccent = teachingDef.accentPositions?.includes(idx);
            const activeTokenIndex = Math.max(
              0,
              ((Math.max(1, currentBeat) - 1) * Math.max(1, teachingDef.subdivisionCount) + activeSubdivision) % Math.max(1, tokens.length)
            );
            const isCurrent = isPlaying && !isCountIn && activeTokenIndex === idx;

            return (
              <button
                key={idx}
                onClick={() => handlePreviewToken(token, spoken[idx] || token)}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all cursor-pointer select-none ${
                  isCurrent
                    ? 'bg-amber-400 text-stone-950 border-amber-300 scale-105 shadow-xl font-black ring-4 ring-amber-400/40'
                    : isDownbeat
                    ? 'bg-stone-900 hover:bg-stone-850 text-white border-stone-700 font-extrabold'
                    : 'bg-stone-900/60 hover:bg-stone-850 text-stone-300 border-stone-800 font-bold'
                }`}
              >
                <span
                  className={`text-xl sm:text-2xl font-mono font-black ${
                    isCurrent ? 'text-stone-950' : isAccent ? 'text-amber-300' : ''
                  }`}
                >
                  {isAccent && !isCurrent ? `>${token}` : token}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${
                    isCurrent ? 'text-stone-900 font-black' : 'text-stone-400'
                  }`}
                >
                  "{spoken[idx] || token}"
                </span>
                {isDownbeat && (
                  <span
                    className={`text-[8px] font-mono font-bold px-1.5 py-0.2 rounded mt-1 ${
                      isCurrent
                        ? 'bg-stone-900 text-amber-300'
                        : 'bg-stone-800 text-stone-300'
                    }`}
                  >
                    Beat {token}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Transport & Vocalizer Controls */}
      <div className="bg-stone-900/80 rounded-2xl p-4 sm:p-5 border border-stone-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Play / Stop Button */}
          <button
            onClick={handleTogglePlay}
            className={`flex-1 py-4 px-6 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-3 transition-all shadow-lg active:scale-98 cursor-pointer ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-amber-500/20'
                : 'bg-[#4a523a] hover:bg-[#5b6547] text-white shadow-stone-900/40'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-5 h-5 fill-current" />
                <span>STOP COUNT & CLAP</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>START COUNT & CLAP ({currentTempo} BPM)</span>
              </>
            )}
          </button>

          {/* Tempo Display & Quick Adjust */}
          <div className="flex items-center gap-2 bg-stone-950 p-2 rounded-2xl border border-stone-800">
            <div className="px-3 text-center">
              <span className="text-[10px] text-stone-400 font-bold block uppercase">Tempo</span>
              <span className="text-xl font-mono font-black text-amber-300">{currentTempo}</span>
              <span className="text-[10px] text-stone-400 font-bold ml-1">BPM</span>
            </div>
            {onTempoAdjust && (
              <div className="flex items-center gap-1 border-l border-stone-800 pl-2">
                {[-5, +5].map((delta) => (
                  <button
                    key={delta}
                    onClick={() => onTempoAdjust(delta)}
                    className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-mono font-bold border border-stone-700"
                  >
                    {delta > 0 ? `+${delta}` : delta}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Audio Layer Toggles: Speech & Claps */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-stone-800">
          {/* Voice Counting Toggle */}
          <button
            onClick={() => setVoiceCount(!voiceCount)}
            className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
              voiceCount
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-200 font-bold'
                : 'bg-stone-950 border-stone-800 text-stone-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-amber-400" />
              <div className="text-left">
                <span className="text-xs font-bold block">Spoken Voice</span>
                <span className="text-[10px] text-stone-400">Speaks "{tokens[0]}, {tokens[1]}…"</span>
              </div>
            </div>
            <span
              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                voiceCount ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 text-stone-400'
              }`}
            >
              {voiceCount ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Clap / Metronome Accent Toggle */}
          <button
            onClick={() => setClapEnabled(!clapEnabled)}
            className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
              clapEnabled
                ? 'bg-sky-500/20 border-sky-500/40 text-sky-200 font-bold'
                : 'bg-stone-950 border-stone-800 text-stone-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-sky-400" />
              <div className="text-left">
                <span className="text-xs font-bold block">Clap / Accent</span>
                <span className="text-[10px] text-stone-400">Crisp clap on pulse</span>
              </div>
            </div>
            <span
              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                clapEnabled ? 'bg-sky-400 text-stone-950' : 'bg-stone-800 text-stone-400'
              }`}
            >
              {clapEnabled ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Count-In Duration Selector */}
          <div className="p-3 bg-stone-950 border border-stone-800 rounded-xl flex items-center justify-between">
            <div className="text-left">
              <span className="text-xs font-bold block text-stone-300">Count-In</span>
              <span className="text-[10px] text-stone-400">Pre-roll clicks</span>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2].map((bars) => (
                <button
                  key={bars}
                  onClick={() => setCountInBars(bars)}
                  className={`px-2 py-1 rounded-lg text-xs font-mono font-bold ${
                    countInBars === bars
                      ? 'bg-amber-400 text-stone-950'
                      : 'bg-stone-800 text-stone-400 hover:text-white'
                  }`}
                >
                  {bars} bar{bars > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pedagogical Explanation for Counting */}
      <div className="bg-stone-900/60 rounded-2xl p-4 border border-stone-800 space-y-2">
        <div className="flex items-center gap-2 text-amber-400">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs font-black uppercase tracking-wider">
            Why Vocal Counting is Mandatory in Drumming
          </span>
        </div>
        <p className="text-xs text-stone-300 leading-relaxed font-medium">
          {teachingDef.musicalExplanation.howIsItCounted}
        </p>
        <p className="text-[11px] text-stone-400 italic border-t border-stone-800/80 pt-2">
          💡 Pro Tip: Count with an authoritative voice in time with the coach. Drumming with physical limb movement is guided by your internal sub-vocalization. Once your voice locks with the pulse, your hands cannot rush or drag.
        </p>
      </div>
    </div>
  );
};

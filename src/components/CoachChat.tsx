import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, SkillTrack } from '../types';
import { Send, Bot, User, Sparkles, Drum, Play, ShieldAlert, ArrowRight, RotateCcw } from 'lucide-react';

interface CoachChatProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => Promise<void>;
  isLoading: boolean;
  skillTracks: SkillTrack[];
  onOpenMetronomeWithLadder?: (startBpm: number, targetBpm: number) => void;
  onOpenCheckpoint?: (trackId: string) => void;
}

export const CoachChat: React.FC<CoachChatProps> = ({
  messages,
  onSendMessage,
  isLoading,
  skillTracks,
  onOpenMetronomeWithLadder,
  onOpenCheckpoint,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const text = inputText;
    setInputText('');
    await onSendMessage(text);
  };

  const handleChipClick = async (promptText: string) => {
    if (isLoading) return;
    await onSendMessage(promptText);
  };

  const quickPrompts = [
    {
      label: '⚡ 30-Min Practice Plan',
      prompt: 'Design a 30-minute practice plan for my Rudiments track starting at my current level.',
    },
    {
      label: '🥁 Paradiddle-Diddle Lesson',
      prompt: 'Teach me the Paradiddle-Diddle with a clear tempo ladder, sticking logic, and starting point variations.',
    },
    {
      label: '🎯 Checkpoint Assessment: Grooves',
      prompt: 'I want to see if I am ready to move from Beginner to Intermediate in Grooves & Beats. Run a Checkpoint Assessment.',
    },
    {
      label: '🛠️ Fix Double Stroke Unevenness',
      prompt: 'Why do my double stroke rolls sound uneven and weak on the second bounce, and how can I fix it?',
    },
    {
      label: '🎵 Ghost Note Song Recommendations',
      prompt: 'Recommend practice and stretch songs for learning 16th-note ghost note dynamics.',
    },
    {
      label: '⏱️ 7/8 Odd Meter Guide',
      prompt: 'How do I count and play a basic groove in 7/8 time without getting lost?',
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] max-w-5xl mx-auto p-2 sm:p-4">
      {/* Top Coach Info Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-3 flex items-center justify-between text-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              Rudiment AI Coach
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h2>
            <p className="text-xs text-slate-400">
              Personal curriculum & technique advisor • Powered by Gemini 3.8
            </p>
          </div>
        </div>

        {/* Track level badges summary */}
        <div className="hidden md:flex items-center gap-2 text-xs">
          {skillTracks.slice(0, 4).map((t) => (
            <span
              key={t.id}
              className="px-2 py-1 bg-slate-800 rounded border border-slate-700 text-slate-300"
            >
              <strong className="text-amber-400 font-medium">{t.name}:</strong> {t.currentLevel}
            </span>
          ))}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 sm:pr-2">
        {messages.length === 0 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center space-y-4 my-8">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
              <Drum className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-bold text-white mb-1">Welcome to Rudiment</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Your personal drumming coach. I teach every skill starting clean and slow with tempo ladders, track progress per skill, and evaluate readiness before you advance.
              </p>
            </div>

            {/* Quick action chips */}
            <div className="pt-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Select a topic to start coaching:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left max-w-2xl mx-auto">
                {quickPrompts.map((chip, idx) => (
                  <button
                    key={idx}
                    id={`quick-prompt-${idx}`}
                    onClick={() => handleChipClick(chip.prompt)}
                    className="p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 rounded-xl text-xs text-slate-200 transition-all flex items-center justify-between group"
                  >
                    <span>{chip.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
              }`}
            >
              {/* Message text with basic whitespace preservation */}
              <div className="whitespace-pre-wrap space-y-2 font-sans">
                {msg.content}
              </div>

              {/* Extra action cards if model output contains tempo ladders */}
              {msg.role === 'assistant' && msg.content.includes('Tempo ladder') && (
                <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between bg-slate-950/60 p-2.5 rounded-lg border">
                  <div className="text-xs text-slate-300">
                    <span className="font-semibold text-amber-400">Tempo Ladder Detected</span>
                    <p className="text-[11px] text-slate-400">Load this tempo progression into the metronome</p>
                  </div>
                  {onOpenMetronomeWithLadder && (
                    <button
                      onClick={() => onOpenMetronomeWithLadder(60, 100)}
                      className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-md flex items-center gap-1.5 transition-colors"
                    >
                      <Play className="w-3 h-3 fill-slate-950" />
                      <span>Start Ladder</span>
                    </button>
                  )}
                </div>
              )}

              <div
                className={`text-[10px] mt-2 ${
                  msg.role === 'user' ? 'text-slate-800' : 'text-slate-500'
                }`}
              >
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-slate-900 border border-slate-800 text-slate-400 rounded-2xl rounded-tl-none p-4 text-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Rudiment is crafting your customized drum lesson...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar (when chat has messages) */}
      {messages.length > 0 && (
        <div className="py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
          <span className="text-slate-500 font-medium shrink-0 text-[11px] uppercase tracking-wider">
            Ask:
          </span>
          {quickPrompts.slice(0, 4).map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleChipClick(qp.prompt)}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 rounded-full whitespace-nowrap transition-colors"
            >
              {qp.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="mt-2 relative">
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl focus-within:border-amber-500/60 focus-within:ring-1 focus-within:ring-amber-500/60 transition-all p-1.5 shadow-lg">
          <textarea
            id="chat-input-textarea"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Ask Coach Rudiment about a rudiment, groove, fill, odd meter, or practice routine..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 px-3 py-2 focus:outline-none resize-none max-h-32"
          />
          <button
            id="chat-send-btn"
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="p-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold rounded-lg transition-all shrink-0 flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

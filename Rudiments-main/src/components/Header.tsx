import React, { useState } from 'react';
import {
  MessageSquare,
  Compass,
  Activity,
  Calendar,
  Music,
  User,
  BookOpen,
  Play,
  Menu,
  X,
  RotateCcw,
  Flame,
  ShieldCheck,
} from 'lucide-react';
import { useLearner } from '../context/LearnerContext';

export type AppTab = 'today' | 'path' | 'practice' | 'vocabulary' | 'songs' | 'profile' | 'chat';

interface HeaderProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  practiceStreak?: number;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, practiceStreak = 0 }) => {
  const { resetToDefaults, activeSession, cancelGuidedSession } = useLearner();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleTabChange = (tab: AppTab) => {
    if (activeSession) {
      cancelGuidedSession();
    }
    setActiveTab(tab);
  };

  const handleMobileTabSelect = (tab: AppTab) => {
    handleTabChange(tab);
    setMobileMenuOpen(false);
  };

  const handleReset = () => {
    if (window.confirm('Reset all profile, vocabulary, and skills data to clean seed standards?')) {
      resetToDefaults();
      setMobileMenuOpen(false);
      alert('Learner data reset to clean seed standards.');
    }
  };

  return (
    <>
      <header className="bg-[#f8f8f6] border-b border-stone-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* Top Header Row */}
          <div className="flex items-center justify-between py-2.5 sm:py-3">
            {/* Logo & Identity */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div
                onClick={() => handleTabChange('today')}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#4a523a] flex items-center justify-center text-white font-black text-base sm:text-xl shadow-xs shrink-0 cursor-pointer"
              >
                R
              </div>
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span
                    onClick={() => handleTabChange('today')}
                    className="font-extrabold text-base sm:text-lg text-stone-900 tracking-tight cursor-pointer"
                  >
                    Rudiment
                  </span>
                  <span className="text-[11px] sm:text-xs font-serif italic text-stone-600">
                    Drum Coach AI
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-stone-500 font-medium hidden sm:block">
                  Canonical Curriculum & Adaptive Placement
                </p>
              </div>
            </div>

            {/* Quick Action Top Right */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Streak Badge */}
              <div className="flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-bold font-mono shadow-2xs">
                <Flame className={`w-3.5 h-3.5 ${practiceStreak > 0 ? 'text-amber-500 fill-amber-500' : 'text-stone-300'}`} />
                <span>{practiceStreak} {practiceStreak === 1 ? 'day' : 'days'}</span>
              </div>

              {/* Today CTA button */}
              <button
                onClick={() => handleTabChange('today')}
                className="px-3.5 py-1.5 bg-[#4a523a] hover:bg-[#3d4430] text-white text-xs font-bold rounded-full shadow-2xs transition-all flex items-center gap-1.5 min-h-[36px] min-w-[44px]"
              >
                <Play className="w-3 h-3 fill-current" />
                <span className="text-[11px] sm:text-xs uppercase tracking-wide">TODAY'S PRACTICE</span>
              </button>

              {/* Desktop Reset Button */}
              <button
                onClick={handleReset}
                title="Reset learner data to clean seed defaults"
                className="hidden md:flex p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-full transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Desktop/Tablet Navigation Tabs Bar */}
          <nav className="hidden md:flex items-center gap-1.5 overflow-x-auto py-2 border-t border-stone-200/80 no-scrollbar">
            <button
              id="tab-btn-today"
              onClick={() => handleTabChange('today')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'today'
                  ? 'bg-[#4a523a] text-white shadow-2xs'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Today</span>
            </button>

            <button
              id="tab-btn-path"
              onClick={() => handleTabChange('path')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'path'
                  ? 'bg-[#4a523a] text-white shadow-2xs'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Path</span>
            </button>

            <button
              id="tab-btn-practice"
              onClick={() => handleTabChange('practice')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'practice'
                  ? 'bg-[#4a523a] text-white shadow-2xs'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Practice (Metronome & Pad)</span>
            </button>

            <button
              id="tab-btn-vocabulary"
              onClick={() => handleTabChange('vocabulary')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'vocabulary'
                  ? 'bg-[#4a523a] text-white shadow-2xs'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Vocabulary</span>
            </button>

            <button
              id="tab-btn-songs"
              onClick={() => handleTabChange('songs')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'songs'
                  ? 'bg-[#4a523a] text-white shadow-2xs'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Songs</span>
            </button>

            <button
              id="tab-btn-profile"
              onClick={() => handleTabChange('profile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'bg-[#4a523a] text-white shadow-2xs'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Profile & Progress</span>
            </button>

            <button
              id="tab-btn-chat"
              onClick={() => handleTabChange('chat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ml-auto ${
                activeTab === 'chat'
                  ? 'bg-[#4a523a] text-white shadow-2xs'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Coach Chat</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (md:hidden) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#f8f8f6]/95 backdrop-blur-md border-t border-stone-200 shadow-xl px-1 py-1 flex items-center justify-around"
      >
        {/* 1. Today */}
        <button
          onClick={() => setActiveTab('today')}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-colors min-w-[48px] min-h-[44px] ${
            activeTab === 'today' ? 'text-[#4a523a] font-black' : 'text-stone-500 font-medium'
          }`}
        >
          <Calendar className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-none">Today</span>
        </button>

        {/* 2. Path */}
        <button
          onClick={() => setActiveTab('path')}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-colors min-w-[48px] min-h-[44px] ${
            activeTab === 'path' ? 'text-[#4a523a] font-black' : 'text-stone-500 font-medium'
          }`}
        >
          <Compass className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-none">Path</span>
        </button>

        {/* 3. Practice */}
        <button
          onClick={() => setActiveTab('practice')}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-colors min-w-[48px] min-h-[44px] ${
            activeTab === 'practice' ? 'text-[#4a523a] font-black' : 'text-stone-500 font-medium'
          }`}
        >
          <Activity className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-none">Practice</span>
        </button>

        {/* 4. Vocabulary */}
        <button
          onClick={() => setActiveTab('vocabulary')}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-colors min-w-[48px] min-h-[44px] ${
            activeTab === 'vocabulary' ? 'text-[#4a523a] font-black' : 'text-stone-500 font-medium'
          }`}
        >
          <BookOpen className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-none">Vocab</span>
        </button>

        {/* 5. Songs */}
        <button
          onClick={() => setActiveTab('songs')}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-colors min-w-[48px] min-h-[44px] ${
            activeTab === 'songs' ? 'text-[#4a523a] font-black' : 'text-stone-500 font-medium'
          }`}
        >
          <Music className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-none">Songs</span>
        </button>

        {/* 6. Profile & Coach (More menu) */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-colors min-w-[48px] min-h-[44px] ${
            mobileMenuOpen || ['profile', 'chat'].includes(activeTab)
              ? 'text-[#4a523a] font-black'
              : 'text-stone-500 font-medium'
          }`}
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-none">More</span>
        </button>
      </nav>

      {/* Mobile "More" Drawer Modal */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white border-t border-stone-200 rounded-t-2xl p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <Menu className="w-4 h-4 text-[#4a523a]" />
                More Destinations
              </h3>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs font-bold text-stone-800">
              <button
                onClick={() => handleMobileTabSelect('profile')}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-colors min-h-[44px] ${
                  activeTab === 'profile' ? 'bg-[#4a523a] text-white border-[#4a523a]' : 'bg-stone-50 border-stone-200'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Learner Profile & Strands</span>
              </button>

              <button
                onClick={() => handleMobileTabSelect('chat')}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-colors min-h-[44px] ${
                  activeTab === 'chat' ? 'bg-[#4a523a] text-white border-[#4a523a]' : 'bg-stone-50 border-stone-200'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Coach Rudiment AI Chat</span>
              </button>

              <button
                onClick={handleReset}
                className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-left flex items-center gap-3 transition-colors min-h-[44px] mt-2"
              >
                <RotateCcw className="w-4 h-4 text-rose-600" />
                <span>Reset Learner Data to Seed Standards</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

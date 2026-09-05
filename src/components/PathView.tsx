import React, { useState } from 'react';
import {
  Compass,
  CheckCircle2,
  Lock,
  Play,
  Award,
  ChevronRight,
  ChevronDown,
  Layers,
  Activity,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Target,
  Music,
} from 'lucide-react';
import {
  CurriculumBand,
  StrandId,
  CurriculumUnit,
  CurriculumCompetency,
  DrummerPlacementAssessment,
  PlacementTest,
  PlacementTestResult,
  SelfCheckFeeling,
} from '../types';
import {
  CANONICAL_CURRICULUM_UNITS,
  CANONICAL_CURRICULUM_COMPETENCIES,
  CURRICULUM_COMPETENCIES_BY_ID,
  CURRICULUM_UNITS_BY_ID,
} from '../data/canonicalCurriculum';
import {
  CANONICAL_PLACEMENT_TESTS,
  getOrInitializePlacementAssessment,
  getPlacementTestsForEstimation,
  evaluatePlacementResults,
  savePlacementAssessment,
  STRAND_DEFINITIONS,
} from '../lib/drummerPlacementEngine';
import {
  isCompetencyVerified,
  isUnitComplete,
  isUnitUnlocked,
  deriveCurrentCurriculumPosition,
} from '../lib/canonicalProgressEngine';
import { useLearner } from '../context/LearnerContext';
import { buildPlacementSession } from '../lib/placementEngine';
import { PlacementTestModal } from './PlacementTestModal';
import { AdvancementReadinessCard } from './AdvancementReadinessCard';
import { CompetencyVerificationModal } from './CompetencyVerificationModal';
import {
  deriveCompetencyAdvancementReadiness,
  getSkillStatusAfterCompetencyVerification,
  recordCompetencyVerificationOutcome,
} from '../lib/competencyAdvancementEngine';

interface PathViewProps {
  onStartPracticeCompetency?: (competency: CurriculumCompetency) => void;
}

export const PathView: React.FC<PathViewProps> = ({ onStartPracticeCompetency }) => {
  const { profile, skills, startGuidedSession, updateSkill } = useLearner();
  const [verificationRevision, setVerificationRevision] = useState(0);
  const [showCompetencyVerification, setShowCompetencyVerification] = useState(false);
  const [advancementNotice, setAdvancementNotice] = useState<string | null>(null);

  // Deterministic canonical curriculum position from evidence
  void verificationRevision;
  const canonicalPosition = deriveCurrentCurriculumPosition(skills);

  // Load placement assessment
  const [assessment, setAssessment] = useState<DrummerPlacementAssessment>(() =>
    getOrInitializePlacementAssessment(profile, skills)
  );

  // Selected Band Tab for Browsing
  const [selectedBand, setSelectedBand] = useState<CurriculumBand>(
    canonicalPosition.verifiedBand || 'BEGINNER'
  );

  // Expanded Unit in Accordion
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(
    canonicalPosition.activeUnitId || 'unit-b1-pulse'
  );

  // Placement Test Modal State
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  const availableTests = getPlacementTestsForEstimation(assessment.estimatedBand);

  // Active Unit & Competency details derived from canonical source of truth
  const activeUnit =
    CURRICULUM_UNITS_BY_ID.get(canonicalPosition.activeUnitId) || CANONICAL_CURRICULUM_UNITS[0];
  const activeCompetency =
    CURRICULUM_COMPETENCIES_BY_ID.get(canonicalPosition.activeCompetencyId) ||
    CANONICAL_CURRICULUM_COMPETENCIES[0];
  const activeSkill = skills.find((s) => s.id === activeCompetency.skillId) || ({
    id: activeCompetency.skillId,
    name: activeCompetency.title,
    parentTrack: 'rudiments',
    category: 'Curriculum',
    description: activeCompetency.description,
    status: 'LEARNING',
    confidence: 2,
    practiceCount: 0,
    currentComfortTempo: activeCompetency.tempoStandard.bpm,
  } as any);
  const advancementReadiness = deriveCompetencyAdvancementReadiness(activeCompetency, skills);

  const handleCompetencyVerificationComplete = (result: {
    startedAt: string;
    durationSeconds: number;
    completedRequiredRun: boolean;
    selfAssessment: SelfCheckFeeling;
    frictions: string[];
  }) => {
    const outcome = recordCompetencyVerificationOutcome({
      competency: activeCompetency,
      skill: activeSkill,
      skills,
      ...result,
    });
    if (outcome.passed) {
      updateSkill(activeSkill.id, {
        status: getSkillStatusAfterCompetencyVerification(activeSkill.status, activeCompetency.targetStatus),
        source: 'assessment',
        dateLastPracticed: new Date().toISOString().split('T')[0],
      });
      const nextComp = CURRICULUM_COMPETENCIES_BY_ID.get(outcome.attempt.nextActiveCompetencyId);
      const nextUnit = CURRICULUM_UNITS_BY_ID.get(outcome.attempt.nextActiveUnitId);
      setExpandedUnitId(outcome.attempt.nextActiveUnitId);
      if (nextUnit) setSelectedBand(nextUnit.band);
      setAdvancementNotice(
        outcome.advancementEvent?.unitAdvanced
          ? `Verified ${activeCompetency.title}. The unit is complete and the next unit is now active.`
          : `Verified ${activeCompetency.title}. Next target: ${nextComp?.title || 'next competency'}.`
      );
    } else {
      setAdvancementNotice(`Verification not passed. ${activeCompetency.title} remains active and a repair plan was created.`);
    }
    setShowCompetencyVerification(false);
    setVerificationRevision((value) => value + 1);
  };

  // Deterministic unit status based on real evidence and unlocking
  const getUnitStatus = (unit: CurriculumUnit): 'COMPLETED' | 'IN_PROGRESS' | 'UNLOCKED' | 'LOCKED' => {
    if (isUnitComplete(unit.id, skills)) return 'COMPLETED';
    if (unit.id === canonicalPosition.activeUnitId) return 'IN_PROGRESS';
    if (isUnitUnlocked(unit.id, skills)) return 'UNLOCKED';
    return 'LOCKED';
  };

  // Deterministic competency status based on verification evidence
  const getCompetencyStatus = (comp: CurriculumCompetency): 'VERIFIED' | 'DEVELOPING' | 'PREVIOUSLY REPORTED' | 'READY' | 'LOCKED' => {
    if (isCompetencyVerified(comp.id, skills)) {
      return 'VERIFIED';
    }
    if (comp.id === canonicalPosition.activeCompetencyId) {
      return 'DEVELOPING';
    }
    const skill = skills.find((s) => s.id === comp.skillId);
    if (
      skill &&
      (skill.status === 'CLEAN' || skill.status === 'APPLICABLE' || skill.status === 'MASTERED') &&
      skill.source !== 'practice_log' &&
      skill.source !== 'assessment'
    ) {
      return 'PREVIOUSLY REPORTED';
    }
    const unit = CURRICULUM_UNITS_BY_ID.get(comp.unitId);
    if (unit && !isUnitUnlocked(unit.id, skills)) {
      return 'LOCKED';
    }
    return 'READY';
  };

  // Handle Start Guided Practice on a Competency
  const handlePracticeClick = (comp: CurriculumCompetency) => {
    if (onStartPracticeCompetency) {
      onStartPracticeCompetency(comp);
      return;
    }
    const skill = skills.find((s) => s.id === comp.skillId) || {
      id: comp.skillId,
      name: comp.title,
      parentTrack: 'rudiments',
      currentComfortTempo: comp.tempoStandard.bpm,
    };
    const session = buildPlacementSession(skill as any, profile, '1 beat');
    startGuidedSession(session);
  };

  // Handle Placement Test Completion from Interactive Modal
  const handlePlacementCompleted = (resultsArray: PlacementTestResult[]) => {
    const newAssessment = evaluatePlacementResults(assessment.estimatedBand, resultsArray, skills);
    savePlacementAssessment(newAssessment);
    setAssessment(newAssessment);
    setSelectedBand(newAssessment.verifiedBand);
    setExpandedUnitId(newAssessment.activeUnitId);
  };

  const filteredUnits = CANONICAL_CURRICULUM_UNITS.filter((u) => u.band === selectedBand);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 pb-28 md:pb-12 animate-in fade-in duration-200">
      {/* 1. LEARNER IDENTITY & PLACEMENT STATUS BANNER */}
      <div className="bg-stone-900 text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-stone-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 bg-[#4a523a]/60 text-stone-200 px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-wide border border-[#78855e]/40">
              <Compass className="w-3.5 h-3.5 text-[#a4b584]" />
              <span>DRUMMER CURRICULUM ARCHITECTURE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Your Canonical Learning Path
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 font-medium">
              Deterministic progression: We never learn any skill at full speed first.
            </p>
          </div>

          <button
            onClick={() => setIsTestModalOpen(true)}
            className="self-start sm:self-auto flex items-center gap-2 bg-[#4a523a] hover:bg-[#3d4430] text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <ShieldCheck className="w-4 h-4 text-amber-300" />
            <span>{assessment.placementCompleted ? 'Retake Placement Test' : 'Verify Level with Practical Test'}</span>
          </button>
        </div>

        {/* Level Status Indicator Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-stone-800">
          <div className="bg-stone-800/80 rounded-2xl p-3.5 border border-stone-700/60">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
              Estimated Level
            </span>
            <span className="text-base sm:text-lg font-black text-white mt-0.5 block">
              {assessment.estimatedBand}
            </span>
            <span className="text-[11px] text-stone-400">
              Based on profile questionnaire ({profile.yearsPlaying} yrs)
            </span>
          </div>

          <div className="bg-stone-800/80 rounded-2xl p-3.5 border border-[#4a523a]/60 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#a4b584] uppercase tracking-wider block">
                Verified Level
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  assessment.placementCompleted && assessment.verifiedBand !== 'UNVERIFIED'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {assessment.placementCompleted && assessment.verifiedBand !== 'UNVERIFIED'
                  ? 'VERIFIED'
                  : 'PLACEMENT REQUIRED'}
              </span>
            </div>
            <span className="text-base sm:text-lg font-black text-white mt-0.5 block">
              {assessment.placementCompleted && assessment.verifiedBand !== 'UNVERIFIED'
                ? assessment.verifiedBand
                : 'Unverified'}
            </span>
            <span className="text-[11px] text-stone-400">
              {assessment.placementCompleted && assessment.verifiedBand !== 'UNVERIFIED'
                ? `${assessment.testResults.filter((r) => r.passed).length} of ${assessment.testResults.length} test criteria passed`
                : 'Practical metronome test required'}
            </span>
          </div>

          <div className="bg-stone-800/80 rounded-2xl p-3.5 border border-stone-700/60">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
              Active Unit Focus
            </span>
            <span className="text-sm font-black text-amber-300 mt-0.5 block truncate">
              {activeUnit.title}
            </span>
            <span className="text-[11px] text-stone-400 truncate block">
              Next: {activeCompetency.title}
            </span>
          </div>
        </div>

        {/* Diagnostic Notes */}
        {assessment.diagnosticNotes.length > 0 && (
          <div className="bg-black/30 rounded-xl p-3 text-xs text-stone-300 flex items-start gap-2.5 border border-stone-800">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-stone-200">Coach Diagnosis: </span>
              <span>{assessment.diagnosticNotes.join(' ')}</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. PER-STRAND COMPETENCY MATRIX (Multi-Strand Independence) */}
      <div className="bg-white border border-stone-200 rounded-3xl p-5 sm:p-7 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#4a523a]/10 text-[#4a523a] flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-stone-900">Per-Strand Competency Levels</h2>
              <p className="text-xs text-stone-500 font-medium">
                Drummers develop unevenly. Each strand is certified independently.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(Object.values(assessment.strands) as any[]).map((strand) => (
            <div
              key={strand.strandId}
              className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5 hover:border-stone-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-stone-900">{strand.strandName}</span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                  strand.verifiedBand === 'INTERMEDIATE'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : strand.verifiedBand === 'ADVANCED'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-stone-100 text-stone-700 border-stone-300'
                }`}>
                  {strand.verifiedBand}
                </span>
              </div>

              {/* Progress Bar */}
              {(() => {
                const strandDef = STRAND_DEFINITIONS[strand.strandId as StrandId];
                const strandComps = CANONICAL_CURRICULUM_COMPETENCIES.filter((c) =>
                  strandDef ? strandDef.unitIds.includes(c.unitId) : true
                );
                const liveVerifiedCount = strandComps.filter((c) =>
                  isCompetencyVerified(c.id, skills)
                ).length;
                const liveTotalCount = strandComps.length || 1;

                return (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-stone-600 font-semibold">
                      <span>Verified Competencies</span>
                      <span>{liveVerifiedCount} / {liveTotalCount}</span>
                    </div>
                    <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#4a523a] rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.round((liveVerifiedCount / liveTotalCount) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })()}

              <div className="text-[11px] text-stone-500 truncate pt-1 border-t border-stone-200/80">
                <span className="font-semibold text-stone-700">Next Target: </span>
                {strand.primaryNextCompetencyTitle || 'Foundation Check'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. CURRENT ACTIVE COMPETENCY ACTION CARD */}
      <div className="bg-[#4a523a]/5 border-2 border-[#4a523a]/30 rounded-3xl p-5 sm:p-7 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#4a523a] text-white flex items-center justify-center font-bold">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#4a523a] bg-[#4a523a]/10 px-2 py-0.5 rounded-full border border-[#4a523a]/20 inline-block mb-1">
                Primary Active Competency • {activeUnit.title}
              </span>
              <h2 className="text-lg sm:text-xl font-black text-stone-900">
                {activeCompetency.title}
              </h2>
            </div>
          </div>

          <button
            onClick={() => handlePracticeClick(activeCompetency)}
            className="flex items-center gap-2 bg-[#4a523a] hover:bg-[#3d4430] text-white px-5 py-3 rounded-2xl font-black text-xs transition-transform transform active:scale-95 shadow-md cursor-pointer self-start sm:self-auto"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Practice This Competency</span>
          </button>
        </div>

        <p className="text-xs sm:text-sm text-stone-700 font-medium leading-relaxed">
          {activeCompetency.description}
        </p>

        {/* Technical Requirements Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="bg-white p-3 rounded-xl border border-stone-200 space-y-0.5">
            <span className="text-[10px] font-bold text-stone-500 uppercase">Tempo Standard</span>
            <p className="font-black text-stone-900">{activeCompetency.tempoStandard.standardText}</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-stone-200 space-y-0.5">
            <span className="text-[10px] font-bold text-stone-500 uppercase">Subdivision</span>
            <p className="font-black text-stone-900">{activeCompetency.subdivision}</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-stone-200 space-y-0.5">
            <span className="text-[10px] font-bold text-stone-500 uppercase">Counting Method</span>
            <p className="font-black text-stone-900">{activeCompetency.countingPattern}</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-stone-200 space-y-0.5">
            <span className="text-[10px] font-bold text-stone-500 uppercase">Recommended Song</span>
            <p className="font-black text-stone-900 truncate">
              {activeCompetency.songTags[0] || 'Standard Grooves'}
            </p>
          </div>
        </div>

        {/* Sticking / Exercise Pattern */}
        {activeCompetency.stickingPattern && (
          <div className="bg-white p-3 rounded-xl border border-stone-200 flex items-center justify-between gap-4 text-xs font-mono">
            <span className="text-[11px] font-bold text-stone-500 uppercase font-sans">Sticking Pattern:</span>
            <span className="font-black text-stone-900 bg-stone-100 px-3 py-1 rounded-md">
              {activeCompetency.stickingPattern}
            </span>
          </div>
        )}

        {/* Pass Criteria List */}
        <div className="bg-white/80 p-4 rounded-2xl border border-stone-200 space-y-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-stone-700 block">
            Practical Pass Criteria (Required for Certification):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-start gap-2 text-xs text-stone-600">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#4a523a] shrink-0 mt-0.5" />
              <span>{activeCompetency.durationCriterion}</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-stone-600">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#4a523a] shrink-0 mt-0.5" />
              <span>{activeCompetency.musicalApplicationRequirement}</span>
            </div>
          </div>
        </div>
      </div>

      <AdvancementReadinessCard
        competency={activeCompetency}
        readiness={advancementReadiness}
        onVerify={() => setShowCompetencyVerification(true)}
      />

      {advancementNotice && (
        <div className={`rounded-2xl border p-4 text-xs font-bold ${advancementNotice.startsWith('Verified') ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
          {advancementNotice}
        </div>
      )}

      {/* 4. CURRICULUM BAND TABS & ROADMAP ACCORDION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 pb-2">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-[#4a523a]" />
            <h2 className="text-lg font-black text-stone-900">Curriculum Units Map</h2>
          </div>

          {/* Band Selector Tabs */}
          <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl">
            {(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as CurriculumBand[]).map((band) => (
              <button
                key={band}
                onClick={() => setSelectedBand(band)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                  selectedBand === band
                    ? 'bg-white text-[#4a523a] shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {band}
              </button>
            ))}
          </div>
        </div>

        {/* Units Accordion List */}
        <div className="space-y-3">
          {filteredUnits.map((unit) => {
            const status = getUnitStatus(unit);
            const isExpanded = expandedUnitId === unit.id;
            const unitCompetencies = unit.competencyIds
              .map((id) => CURRICULUM_COMPETENCIES_BY_ID.get(id))
              .filter(Boolean) as CurriculumCompetency[];

            return (
              <div
                key={unit.id}
                className={`rounded-2xl border transition-all ${
                  status === 'IN_PROGRESS'
                    ? 'bg-white border-[#4a523a] shadow-md ring-2 ring-[#4a523a]/10'
                    : status === 'COMPLETED'
                    ? 'bg-white border-emerald-200'
                    : status === 'UNLOCKED'
                    ? 'bg-white border-stone-200'
                    : 'bg-stone-50 border-stone-200/80 opacity-75'
                }`}
              >
                {/* Unit Header Bar */}
                <div
                  onClick={() => setExpandedUnitId(isExpanded ? null : unit.id)}
                  className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : status === 'IN_PROGRESS'
                          ? 'bg-[#4a523a] text-white'
                          : status === 'UNLOCKED'
                          ? 'bg-stone-100 text-stone-700'
                          : 'bg-stone-200 text-stone-400'
                      }`}
                    >
                      {status === 'COMPLETED' ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : status === 'LOCKED' ? (
                        <Lock className="w-4 h-4" />
                      ) : (
                        `U${unit.order}`
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500">
                          Unit {unit.order}
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : status === 'IN_PROGRESS'
                              ? 'bg-[#4a523a]/10 text-[#4a523a] border border-[#4a523a]/20'
                              : status === 'UNLOCKED'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-stone-100 text-stone-500'
                          }`}
                        >
                          {status.replace('_', ' ')}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-black text-stone-900 mt-0.5">
                        {unit.title}
                      </h3>
                      <p className="text-xs text-stone-500 font-medium hidden sm:block">
                        {unit.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-stone-400">
                    <span className="text-xs font-semibold text-stone-500 hidden sm:inline">
                      {unitCompetencies.length} Competencies
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-stone-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-stone-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Competencies Drawer */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 pt-0 border-t border-stone-100 space-y-3">
                    <div className="grid grid-cols-1 gap-2.5 pt-3">
                      {unitCompetencies.map((comp) => {
                        const compStatus = getCompetencyStatus(comp);
                        return (
                          <div
                            key={comp.id}
                            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              compStatus === 'VERIFIED'
                                ? 'bg-emerald-50/40 border-emerald-200'
                                : compStatus === 'DEVELOPING'
                                ? 'bg-[#4a523a]/5 border-[#4a523a]/40 shadow-2xs'
                                : compStatus === 'PREVIOUSLY REPORTED'
                                ? 'bg-amber-50/40 border-amber-200'
                                : 'bg-stone-50 border-stone-200'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                    compStatus === 'VERIFIED'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : compStatus === 'DEVELOPING'
                                      ? 'bg-[#4a523a] text-white'
                                      : compStatus === 'PREVIOUSLY REPORTED'
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                      : 'bg-stone-200 text-stone-600'
                                  }`}
                                >
                                  {compStatus}
                                </span>
                                <h4 className="text-xs sm:text-sm font-black text-stone-900">
                                  {comp.title}
                                </h4>
                              </div>
                              <p className="text-xs text-stone-600 font-medium">
                                {comp.description}
                              </p>
                              <div className="flex items-center gap-3 text-[11px] text-stone-500 pt-0.5">
                                <span>Tempo: <strong className="text-stone-800">{comp.tempoStandard.bpm} BPM</strong></span>
                                <span>•</span>
                                <span>Subdivision: <strong className="text-stone-800">{comp.subdivision}</strong></span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              <button
                                onClick={() => handlePracticeClick(comp)}
                                className="flex items-center gap-1.5 text-xs font-bold bg-[#4a523a] hover:bg-[#3d4430] text-white px-3 py-2 rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer"
                              >
                                <Play className="w-3.5 h-3.5 fill-white" />
                                <span>Practice</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Unit Checkpoint Requirement Box */}
                    <div className="bg-stone-100 p-3 rounded-xl text-xs text-stone-700 flex items-start gap-2 border border-stone-200">
                      <Award className="w-4 h-4 text-[#4a523a] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-stone-900">Unit Checkpoint Criteria: </span>
                        <span>Verify all {unitCompetencies.length} competencies clean under click with relaxed tempo execution.</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. INTERACTIVE PRACTICAL PLACEMENT TEST MODAL (Audio, Metronome, Rubric) */}
      <PlacementTestModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        tests={availableTests}
        estimatedBand={assessment.estimatedBand}
        onComplete={handlePlacementCompleted}
      />

      <CompetencyVerificationModal
        isOpen={showCompetencyVerification}
        competency={activeCompetency}
        skill={activeSkill}
        readiness={advancementReadiness}
        onClose={() => setShowCompetencyVerification(false)}
        onComplete={handleCompetencyVerificationComplete}
      />
    </div>
  );
};

import React from 'react';
import { GranularSkill } from '../types';
import {
  CANONICAL_CURRICULUM_COMPETENCIES,
  CANONICAL_CURRICULUM_UNITS,
  CURRICULUM_COMPETENCIES_BY_ID,
  CURRICULUM_UNITS_BY_ID,
} from '../data/canonicalCurriculum';
import {
  deriveCurrentCurriculumPosition,
  isCompetencyVerified,
  isUnitComplete,
} from '../lib/canonicalProgressEngine';
import {
  deriveCompetencyAdvancementReadiness,
  getCurriculumAdvancementEvents,
} from '../lib/competencyAdvancementEngine';
import { Award, CalendarCheck, ChevronRight, Gauge, ShieldCheck } from 'lucide-react';

export const CurriculumProgressOverview: React.FC<{ skills: GranularSkill[] }> = ({ skills }) => {
  const position = deriveCurrentCurriculumPosition(skills);
  const activeComp = CURRICULUM_COMPETENCIES_BY_ID.get(position.activeCompetencyId) || CANONICAL_CURRICULUM_COMPETENCIES[0];
  const activeUnit = CURRICULUM_UNITS_BY_ID.get(position.activeUnitId) || CANONICAL_CURRICULUM_UNITS[0];
  const readiness = deriveCompetencyAdvancementReadiness(activeComp, skills);
  const verifiedCompetencies = CANONICAL_CURRICULUM_COMPETENCIES.filter((c) => isCompetencyVerified(c.id, skills)).length;
  const completedUnits = CANONICAL_CURRICULUM_UNITS.filter((u) => !u.id.startsWith('style-') && isUnitComplete(u.id, skills)).length;
  const recentEvents = getCurriculumAdvancementEvents(3);

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4a523a]/20 bg-[#4a523a]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#4a523a]"><ShieldCheck className="h-3.5 w-3.5" /> C4 Advancement System</span>
          <h3 className="mt-2 text-lg font-black text-stone-950">Course Progress & Next Verification</h3>
          <p className="mt-1 text-xs text-stone-500">Practice creates readiness. Only a completed practical verification certifies a competency and moves the canonical path.</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-right">
          <span className="block text-[9px] font-black uppercase text-stone-400">Current Unit</span>
          <strong className="text-xs text-stone-900">{activeUnit.title}</strong>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3"><span className="block text-[9px] font-black uppercase text-stone-400">Verified Skills</span><strong className="text-lg text-stone-950">{verifiedCompetencies}</strong></div>
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3"><span className="block text-[9px] font-black uppercase text-stone-400">Completed Units</span><strong className="text-lg text-stone-950">{completedUnits}</strong></div>
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3"><span className="block text-[9px] font-black uppercase text-stone-400">Readiness</span><strong className="text-sm text-stone-950">{readiness.label}</strong></div>
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3"><span className="block text-[9px] font-black uppercase text-stone-400">Formal Test</span><strong className="text-sm text-stone-950">{readiness.targetBpm} BPM / {readiness.targetDurationSeconds}s</strong></div>
      </div>

      <div className="rounded-2xl border border-[#4a523a]/20 bg-[#4a523a]/5 p-4">
        <div className="flex items-start gap-2.5">
          <Gauge className="mt-0.5 h-4 w-4 shrink-0 text-[#4a523a]" />
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#4a523a]">Current competency</span>
            <h4 className="text-sm font-black text-stone-950">{activeComp.title}</h4>
            <p className="mt-1 text-xs text-stone-600">{readiness.summary}</p>
          </div>
        </div>
      </div>

      {recentEvents.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-black text-stone-800"><CalendarCheck className="h-4 w-4 text-emerald-600" /> Recent curriculum advances</div>
          {recentEvents.map((event) => (
            <div key={event.id} className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3 text-[11px]">
              <div><strong className="block text-stone-900">{event.competencyTitle}</strong><span className="text-stone-500">Verified {new Date(event.verifiedAt).toLocaleDateString()}</span></div>
              <ChevronRight className="h-4 w-4 shrink-0 text-stone-400" />
            </div>
          ))}
        </div>
      )}

      {recentEvents.length === 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-dashed border-stone-300 p-3 text-xs text-stone-500"><Award className="mt-0.5 h-4 w-4 shrink-0" /> Your first formal competency pass will appear here. Existing musical-application evidence remains preserved separately.</div>
      )}
    </div>
  );
};

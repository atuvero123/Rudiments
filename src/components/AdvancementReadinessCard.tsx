import React from 'react';
import { CurriculumCompetency } from '../types';
import { CompetencyAdvancementReadiness } from '../lib/competencyAdvancementEngine';
import { Check, Circle, ShieldCheck, Wrench, LockKeyhole, Gauge, ArrowRight } from 'lucide-react';

interface AdvancementReadinessCardProps {
  competency: CurriculumCompetency;
  readiness: CompetencyAdvancementReadiness;
  onVerify?: () => void;
  compact?: boolean;
}

const stateClasses: Record<CompetencyAdvancementReadiness['state'], string> = {
  VERIFIED: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  BLOCKED: 'border-stone-300 bg-stone-100 text-stone-700',
  DEVELOPING: 'border-sky-200 bg-sky-50 text-sky-900',
  NEARLY_READY: 'border-amber-200 bg-amber-50 text-amber-900',
  READY_TO_VERIFY: 'border-emerald-300 bg-emerald-50 text-emerald-950',
  REPAIR_REQUIRED: 'border-rose-200 bg-rose-50 text-rose-900',
};

export const AdvancementReadinessCard: React.FC<AdvancementReadinessCardProps> = ({
  competency,
  readiness,
  onVerify,
  compact = false,
}) => {
  const Icon = readiness.state === 'VERIFIED'
    ? ShieldCheck
    : readiness.state === 'BLOCKED'
    ? LockKeyhole
    : readiness.state === 'REPAIR_REQUIRED'
    ? Wrench
    : Gauge;

  return (
    <div className={`rounded-2xl border p-4 ${stateClasses[readiness.state]} ${compact ? 'space-y-3' : 'space-y-4'}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2.5">
          <Icon className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest">C4 Advancement Readiness</span>
              <span className="rounded-full border border-current/20 bg-white/50 px-2 py-0.5 text-[10px] font-black uppercase">{readiness.label}</span>
            </div>
            <h3 className="mt-1 text-sm font-black">{competency.title}</h3>
            <p className="mt-1 text-xs leading-relaxed opacity-80">{readiness.summary}</p>
          </div>
        </div>
        {readiness.state === 'READY_TO_VERIFY' && onVerify && (
          <button onClick={onVerify} className="flex min-h-[42px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#4a523a] px-4 text-xs font-black text-white shadow-sm active:scale-[0.98]">
            <ShieldCheck className="h-4 w-4" /> Run Verification
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
        <div className="rounded-xl border border-current/10 bg-white/60 p-2.5"><span className="block text-[9px] font-black uppercase opacity-60">Formal Standard</span><strong>{readiness.targetBpm} BPM</strong></div>
        <div className="rounded-xl border border-current/10 bg-white/60 p-2.5"><span className="block text-[9px] font-black uppercase opacity-60">Test Duration</span><strong>{readiness.targetDurationSeconds}s</strong></div>
        <div className="rounded-xl border border-current/10 bg-white/60 p-2.5"><span className="block text-[9px] font-black uppercase opacity-60">Independent Clean</span><strong>{readiness.cleanIndependentAttempts}</strong></div>
        <div className="rounded-xl border border-current/10 bg-white/60 p-2.5"><span className="block text-[9px] font-black uppercase opacity-60">Readiness</span><strong>{readiness.metRequirements}/{readiness.totalRequirements || '—'}</strong></div>
      </div>

      {!compact && readiness.requirements.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {readiness.requirements.map((req) => (
            <div key={req.id} className="flex items-start gap-2 rounded-xl border border-current/10 bg-white/55 p-2.5 text-[11px]">
              {req.met ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-40" />}
              <div><strong className="block">{req.label}</strong><span className="opacity-70">{req.detail}</span></div>
            </div>
          ))}
        </div>
      )}

      {readiness.state === 'NEARLY_READY' && (
        <div className="flex items-center gap-2 text-[11px] font-bold"><ArrowRight className="h-3.5 w-3.5" /> Keep today's practice focused on the unmet readiness requirements; the formal test unlocks automatically when they are satisfied.</div>
      )}
    </div>
  );
};

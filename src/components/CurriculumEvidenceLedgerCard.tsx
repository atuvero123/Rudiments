import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, ShieldCheck, Activity, Music, Layers } from 'lucide-react';
import { CurriculumCompetency } from '../types';
import { getCurriculumEvidenceLedger } from '../lib/curriculumPracticeIntelligence';

export const CurriculumEvidenceLedgerCard: React.FC<{ competency: CurriculumCompetency }> = ({ competency }) => {
  const [revision, setRevision] = useState(0);
  const ledger = getCurriculumEvidenceLedger(competency.id);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (!detail?.competencyId || detail.competencyId === competency.id) {
        setRevision((value) => value + 1);
      }
    };
    window.addEventListener('rudiment:c6-evidence-updated', handler as EventListener);
    return () => window.removeEventListener('rudiment:c6-evidence-updated', handler as EventListener);
  }, [competency.id]);

  void revision;

  return (
    <div className="rounded-3xl border-2 border-sky-200 bg-sky-50/60 p-5 sm:p-6 space-y-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sky-800">
            <Activity className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-wider">C6 Curriculum Evidence Ledger</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-stone-900 mt-1">{competency.title}</h3>
          <p className="text-xs text-stone-600 mt-1">Practice builds readiness. Formal competency verification still remains a separate C4 test.</p>
        </div>
        <div className="bg-white border border-sky-200 rounded-2xl px-4 py-2 text-center min-w-[92px]">
          <span className="text-[9px] uppercase font-black text-sky-700 block">Readiness</span>
          <span className="text-xl font-black text-stone-900">{ledger.readiness}/6</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Metric icon={<Layers className="w-3.5 h-3.5" />} label="Attempts" value={ledger.totalAttempts} />
        <Metric icon={<ShieldCheck className="w-3.5 h-3.5" />} label="Independent Clean" value={ledger.independentCleanRuns} />
        <Metric icon={<Music className="w-3.5 h-3.5" />} label="Musical Uses" value={ledger.musicalApplications} />
        <Metric icon={<Activity className="w-3.5 h-3.5" />} label="Clean Tempo" value={ledger.highestCleanTempo ? `${ledger.highestCleanTempo} BPM` : '—'} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ledger.readinessCriteria.map((criterion) => (
          <div key={criterion.label} className={`rounded-xl border p-3 flex items-start gap-2 ${criterion.met ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-stone-200'}`}>
            {criterion.met ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> : <Circle className="w-4 h-4 text-stone-300 mt-0.5 shrink-0" />}
            <div>
              <div className="text-xs font-black text-stone-900">{criterion.label}</div>
              <div className="text-[11px] text-stone-500 mt-0.5">{criterion.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Metric: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
  <div className="bg-white rounded-xl border border-sky-100 p-3">
    <div className="flex items-center gap-1.5 text-sky-700 text-[9px] font-black uppercase tracking-wider">{icon}{label}</div>
    <div className="text-sm font-black text-stone-900 mt-1">{value}</div>
  </div>
);

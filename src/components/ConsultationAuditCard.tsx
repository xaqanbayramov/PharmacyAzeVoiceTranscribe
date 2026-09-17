import React from 'react';
import { ShieldCheck, UserCheck, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface ConsultationAuditCardProps {
  score?: {
    greetingPoliteness: 'excellent' | 'good' | 'neutral' | 'poor';
    dosageExplanationProvided: boolean;
    prescriptionChecked: boolean;
    notes: string;
  };
}

export const ConsultationAuditCard: React.FC<ConsultationAuditCardProps> = ({ score }) => {
  if (!score) return null;

  return (
    <div id="consultation-audit-card" className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="p-2 rounded-lg bg-teal-100 text-teal-800">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-stone-900">
            Əczaçı Xidmət və Resept Nəzarət Standartı (Audit)
          </h3>
          <p className="text-xs text-stone-500">
            Müştəriyə tibbi məsləhət, salamlaşma etiketi və resept yoxlaması
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {/* Metric 1: Politeness */}
        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/70">
          <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
            Etiket & Salamlaşma
          </div>
          <div className="text-sm font-bold text-stone-800 mt-1 flex items-center gap-1.5 capitalize">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>
              {score.greetingPoliteness === 'excellent'
                ? 'Əla / Yüksək'
                : score.greetingPoliteness === 'good'
                ? 'Yaxşı'
                : score.greetingPoliteness === 'neutral'
                ? 'Neytral'
                : 'Qeyri-kafi'}
            </span>
          </div>
        </div>

        {/* Metric 2: Dosage Explanation */}
        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/70">
          <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
            Doza İzah Edildi?
          </div>
          <div className="text-sm font-bold text-stone-800 mt-1 flex items-center gap-1.5">
            {score.dosageExplanationProvided ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-800">Bəli, izah edildi</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span className="text-stone-600">İzah edilmədi</span>
              </>
            )}
          </div>
        </div>

        {/* Metric 3: Prescription Checked */}
        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/70">
          <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
            Resept Nəzarəti
          </div>
          <div className="text-sm font-bold text-stone-800 mt-1 flex items-center gap-1.5">
            {score.prescriptionChecked ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-800">Yoxlanıldı (və ya tələb olunmadı)</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <span className="text-rose-700">Diqqət tələb edir</span>
              </>
            )}
          </div>
        </div>
      </div>

      {score.notes && (
        <div className="p-3 bg-teal-50/60 border border-teal-200/80 rounded-xl text-xs text-teal-950 flex items-start gap-2">
          <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-teal-900">Klinik & Kommersiya Qeydi: </span>
            {score.notes}
          </div>
        </div>
      )}
    </div>
  );
};

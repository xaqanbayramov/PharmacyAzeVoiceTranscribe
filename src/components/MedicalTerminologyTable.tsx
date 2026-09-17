import React from 'react';
import { MedicalEntity } from '../types';
import { 
  Pill, 
  ShieldAlert, 
  FileCheck2, 
  CheckCircle, 
  XCircle, 
  HelpCircle,
  AlertCircle,
  Sparkles
} from 'lucide-react';

interface MedicalTerminologyTableProps {
  entities: MedicalEntity[];
}

export const MedicalTerminologyTable: React.FC<MedicalTerminologyTableProps> = ({ entities }) => {
  if (!entities || entities.length === 0) {
    return null;
  }

  const getStatusBadge = (status: MedicalEntity['statusInDialog']) => {
    switch (status) {
      case 'purchased':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5" />
            Alındı (Satıldı)
          </span>
        );
      case 'refused':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            İmtina Edildi
          </span>
        );
      case 'out_of_stock':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5" />
            Qalıqda Yoxdur (Defisit)
          </span>
        );
      case 'alternative_suggested':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
            <Sparkles className="w-3.5 h-3.5" />
            Analoq Təklif Olundu
          </span>
        );
      case 'inquired_not_purchased':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
            <HelpCircle className="w-3.5 h-3.5" />
            Soruşuldu (Alınmadı)
          </span>
        );
    }
  };

  return (
    <div id="medical-entities-section" className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-stone-900">
              Tanınmış Tibbi və Əczaçılıq Terminologiyası
            </h3>
            <p className="text-xs text-stone-500">
              Səs yazısında aşkar edilmiş dərman preparatları, INN tərkibləri və resept təsnifatı
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          {entities.length} preparat aşkarlandı
        </span>
      </div>

      {/* Responsive Grid of Medical Cards */}
      <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {entities.map((item, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-stone-200/90 bg-gradient-to-b from-white to-stone-50/40 p-4 shadow-2xs hover:border-emerald-300 transition-colors flex flex-col justify-between"
          >
            <div>
              {/* Card top row */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h4 className="text-base font-bold text-stone-900 flex items-center gap-1.5">
                    <span>{item.term}</span>
                    {item.dosageOrForm && (
                      <span className="text-xs font-normal text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                        {item.dosageOrForm}
                      </span>
                    )}
                  </h4>
                  <div className="text-xs text-emerald-700 font-medium mt-0.5">
                    INN (Təsiredici maddə): <span className="font-semibold text-stone-800">{item.innOrGeneric}</span>
                  </div>
                </div>
                <div>{getStatusBadge(item.statusInDialog)}</div>
              </div>

              {/* Categorization and prescription status */}
              <div className="flex flex-wrap gap-1.5 my-3">
                <span className="text-[11px] font-medium bg-stone-100 text-stone-700 px-2.5 py-1 rounded-md border border-stone-200">
                  {item.category}
                </span>
                <span
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border flex items-center gap-1 ${
                    item.prescriptionStatus.includes('Prescription') || item.prescriptionStatus.includes('Resept')
                      ? 'bg-amber-50 text-amber-900 border-amber-200'
                      : 'bg-teal-50 text-teal-800 border-teal-200'
                  }`}
                >
                  {item.prescriptionStatus.includes('Prescription') || item.prescriptionStatus.includes('Resept') ? (
                    <>
                      <ShieldAlert className="w-3 h-3 text-amber-600" />
                      Reseptli (Rx)
                    </>
                  ) : (
                    <>
                      <FileCheck2 className="w-3 h-3 text-teal-600" />
                      Reseptsiz (OTC)
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Notes if present */}
            {item.notes && (
              <div className="mt-2 pt-2.5 border-t border-stone-100 text-xs text-stone-600 italic bg-stone-50/70 -mx-4 -mb-4 px-4 py-2.5 rounded-b-xl">
                <span className="font-medium text-stone-700 not-italic">Məsləhət / Qeyd: </span>
                {item.notes}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

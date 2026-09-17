import React from 'react';
import { PharmacyAnalysisResult } from '../types';
import { History, CheckCircle2, XCircle, Clock, Trash2, ChevronRight, X } from 'lucide-react';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: PharmacyAnalysisResult[];
  onSelectResult: (result: PharmacyAnalysisResult) => void;
  onClearHistory: () => void;
  currentId?: string;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onSelectResult,
  onClearHistory,
  currentId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-stone-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-emerald-700" />
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Səs Yazıları Tarixçəsi
              </h3>
              <p className="text-xs text-stone-500">
                {history.length} analiz edilmiş aptek danışığı
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-16 text-stone-400 text-xs">
              Hələ heç bir səs yazısı qeydə alınmayıb.
            </div>
          ) : (
            history.map((item) => {
              const isSale = item.saleAnalysis.saleOccurred;
              const isSelected = item.id === currentId;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectResult(item);
                    onClose();
                  }}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-2xs'
                      : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {isSale ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span
                        className={`text-xs font-bold ${
                          isSale ? 'text-emerald-800' : 'text-rose-800'
                        }`}
                      >
                        {isSale ? 'Satış Baş Tutdu' : 'Satış Olmadı'}
                      </span>
                    </div>
                    <span className="text-[11px] text-stone-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-stone-800 mt-1 line-clamp-1">
                    {item.fileName || 'Aptek Səs Yazısı'}
                  </h4>

                  <p className="text-[11px] text-stone-500 mt-1 line-clamp-2">
                    {item.saleAnalysis.verdictExplanation}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
                    <span>{item.medicalEntities.length} preparat</span>
                    {item.saleAnalysis.transactionDetails?.totalAmount && (
                      <span className="font-semibold text-stone-700">
                        {item.saleAnalysis.transactionDetails.totalAmount.toFixed(2)} AZN
                      </span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-stone-300" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="p-4 border-t border-stone-200 bg-stone-50/80 flex items-center justify-between">
            <button
              onClick={onClearHistory}
              className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1.5 font-medium cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Tarixçəni Təmizlə</span>
            </button>
            <span className="text-[11px] text-stone-400">
              Lokal yaddaşda saxlanılır
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { SaleAnalysis } from '../types';
import { 
  CheckCircle2, 
  XCircle, 
  CreditCard, 
  Banknote, 
  AlertTriangle, 
  ShieldCheck, 
  HelpCircle,
  TrendingUp,
  FileText,
  FileAudio
} from 'lucide-react';
import { AudioDownloadButtons } from './AudioDownloadButtons';

interface SaleVerdictCardProps {
  saleAnalysis: SaleAnalysis;
  audioDurationSeconds?: number;
  audioSource?: Blob | string | null;
  fileName?: string;
}

export const SaleVerdictCard: React.FC<SaleVerdictCardProps> = ({
  saleAnalysis,
  audioDurationSeconds,
  audioSource,
  fileName,
}) => {
  const isSale = saleAnalysis.saleOccurred;
  const normalizedConfidence = Math.round(
    saleAnalysis.confidenceScore <= 1
      ? saleAnalysis.confidenceScore * 100
      : saleAnalysis.confidenceScore
  );

  return (
    <div
      id="sale-verdict-container"
      className={`rounded-2xl border p-6 shadow-sm transition-all ${
        isSale
          ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white'
          : 'border-rose-200 bg-gradient-to-br from-rose-50/90 via-amber-50/30 to-white'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-stone-200/70">
        <div className="flex items-start gap-3.5">
          <div
            className={`p-3 rounded-xl flex items-center justify-center shrink-0 ${
              isSale
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                : 'bg-rose-600 text-white shadow-sm shadow-rose-200'
            }`}
          >
            {isSale ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  isSale
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {isSale ? 'SATIŞ NƏTİCƏSİ: UĞURLU' : 'SATIŞ NƏTİCƏSİ: BAŞ TUTMADI'}
              </span>
              <span className="text-xs text-stone-500 font-medium">
                Dəqiqlik: {normalizedConfidence}%
              </span>
              {audioDurationSeconds ? (
                <span className="text-xs text-stone-400">
                  • Səs müddəti: {Math.round(audioDurationSeconds)} san
                </span>
              ) : null}
            </div>
            <h2 className="text-2xl font-bold text-stone-900 mt-1">
              {saleAnalysis.verdictTitle || (isSale ? 'Satış Baş Tutdu' : 'Satış Baş Tutmadı')}
            </h2>
          </div>
        </div>

        {/* Transaction Summary Badge */}
        {saleAnalysis.transactionDetails && (
          <div className="bg-white/90 border border-stone-200 rounded-xl px-4 py-3 shadow-xs flex items-center gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-stone-400">
                {isSale ? 'Ödəniş Məbləği' : 'Təxmini Dəyər'}
              </div>
              <div className="text-xl font-bold text-stone-900">
                {saleAnalysis.transactionDetails.totalAmount !== undefined &&
                saleAnalysis.transactionDetails.totalAmount !== null
                  ? `${saleAnalysis.transactionDetails.totalAmount.toFixed(2)} ${saleAnalysis.transactionDetails.currency || 'AZN'}`
                  : 'Məbləğ qeyd olunmadı'}
              </div>
            </div>
            {saleAnalysis.transactionDetails.paymentMethod && (
              <div className="border-l border-stone-200 pl-3 flex items-center gap-1.5 text-stone-600 text-sm font-medium">
                {saleAnalysis.transactionDetails.paymentMethod === 'card' ? (
                  <>
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>Kartla (POS)</span>
                  </>
                ) : saleAnalysis.transactionDetails.paymentMethod === 'cash' ? (
                  <>
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>Nağd</span>
                  </>
                ) : (
                  <span className="text-stone-400 text-xs">Metod: Naməlum</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Explanation paragraph */}
      <div className="mt-4 text-stone-700 text-[15px] leading-relaxed">
        <p className="font-medium text-stone-800">
          {saleAnalysis.verdictExplanation}
        </p>
      </div>

      {/* Non-sale reason banner if sale did not happen */}
      {!isSale && saleAnalysis.nonSaleReason && (
        <div className="mt-4 p-3.5 bg-rose-100/70 border border-rose-200/80 rounded-xl flex items-start gap-2.5 text-sm text-rose-900">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">İmtina / Uğursuzluq səbəbi: </span>
            {saleAnalysis.nonSaleReasonDescription || (
              saleAnalysis.nonSaleReason === 'out_of_stock'
                ? 'Dərman aptek anbarında qurtarıb (Defisit)'
                : saleAnalysis.nonSaleReason === 'prescription_missing'
                ? 'Resept tələb olunur, lakin müştəridə resept yoxdur'
                : saleAnalysis.nonSaleReason === 'price_objection'
                ? 'Müştəri qiyməti baha hesab etdi və imtina etdi'
                : saleAnalysis.nonSaleReason === 'inquiry_only'
                ? 'Müştəri sadəcə məlumat almaq üçün soruşurdu'
                : 'Müştəri təklif olunan analoqu qəbul etmədi'
            )}
          </div>
        </div>
      )}

      {/* Decisive Spoken Evidence Quotes */}
      {saleAnalysis.decisiveEvidence && saleAnalysis.decisiveEvidence.length > 0 && (
        <div className="mt-5 pt-4 border-t border-stone-200/60">
          <div className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-stone-400" />
            <span>Səs Yazısından Əsas Sübut və Dəlillər (Decisive Spoken Quotes):</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {saleAnalysis.decisiveEvidence.map((quote, idx) => (
              <div
                key={idx}
                className="bg-white/80 border border-stone-200/90 text-stone-800 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-stone-400 shrink-0" />
                <span className="italic font-medium">"{quote}"</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Voice Recording Download Bar in MP3 and WAV */}
      {audioSource && (
        <div className="mt-5 pt-4 border-t border-stone-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/75 border border-stone-200/80 p-3.5 rounded-xl shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-800 shrink-0">
              <FileAudio className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-stone-800">
                Səs Yazısını Formatda Yüklə
              </div>
              <div className="text-[11px] text-stone-500">
                Orijinal aptek danışığını MP3 və ya sıxılmamış WAV formatında saxlayın
              </div>
            </div>
          </div>
          <AudioDownloadButtons
            audioSource={audioSource}
            fileName={fileName || 'Aptek_Ses_Yazisi'}
            showTitle={false}
          />
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  History, 
  Download, 
  RefreshCw, 
  Sparkles, 
  AlertCircle, 
  Activity,
  Share2,
  CheckCircle2,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { PharmacyAnalysisResult, SampleRecordingPreset } from './types';
import { AudioRecorder } from './components/AudioRecorder';
import { SaleVerdictCard } from './components/SaleVerdictCard';
import { TranscriptViewer } from './components/TranscriptViewer';
import { MedicalTerminologyTable } from './components/MedicalTerminologyTable';
import { ConsultationAuditCard } from './components/ConsultationAuditCard';
import { HistoryDrawer } from './components/HistoryDrawer';
import { AudioDownloadButtons } from './components/AudioDownloadButtons';
import { generateSpokenAudioFromScript } from './utils/audio';

const LOCAL_STORAGE_KEY = 'pharmascribe_history_v1';

export default function App() {
  const [currentResult, setCurrentResult] = useState<PharmacyAnalysisResult | null>(null);
  const [currentAudio, setCurrentAudio] = useState<{ source: Blob | string; fileName: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [history, setHistory] = useState<PharmacyAnalysisResult[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {
      // LocalStorage fallback
    }
  }, []);

  const saveToHistory = (result: PharmacyAnalysisResult) => {
    try {
      const updated = [result, ...history.filter((h) => h.id !== result.id)].slice(0, 30);
      setHistory(updated);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  // Analyze audio via server endpoint
  const handleAnalyzeAudio = async (audioBase64: string, mimeType: string, fileName?: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await fetch('/api/transcribe-and-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          mimeType,
          fileName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      const result: PharmacyAnalysisResult = await response.json();
      setCurrentResult(result);
      setCurrentAudio({ source: audioBase64, fileName: fileName || 'Aptek_Ses_Yazisi' });
      saveToHistory(result);
      setTimeout(() => {
        document.getElementById('sale-verdict-container')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      console.error('Audio analysis error:', err);
      setAnalysisError(
        err.message || 'Səs yazısının transkripsiyası və təhlilində xəta baş verdi. Zəhmət olmasa təkrar cəhd edin.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Analyze preset script text
  const handleAnalyzePresetText = async (preset: SampleRecordingPreset) => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const fullDialogue = preset.dialogueScript
        .map((s) => `${s.speaker === 'pharmacist' ? 'Əczaçı' : 'Müştəri'}: ${s.text}`)
        .join('\n');

      const response = await fetch('/api/analyze-dialogue-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dialogueText: fullDialogue,
          title: preset.title,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      const result: PharmacyAnalysisResult = await response.json();
      setCurrentResult(result);
      saveToHistory(result);

      // Generate audio in background for this preset dialogue so user can download it too
      generateSpokenAudioFromScript(preset.dialogueScript).then((gen) => {
        if (gen) {
          setCurrentAudio({ source: gen.audioBlob, fileName: preset.title });
        }
      }).catch(() => {});

      setTimeout(() => {
        document.getElementById('sale-verdict-container')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      console.error('Preset analysis error:', err);
      setAnalysisError(
        err.message || 'Nümunə ssenarinin təhlilində xəta baş verdi.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Export full report as text file
  const handleExportReport = () => {
    if (!currentResult) return;

    const lines = [
      '====================================================',
      'APTEK SƏS YAZISI TRANSKRİPSİYASI VƏ SATIŞ HESABATI',
      '====================================================',
      `Fayl / Sənəd: ${currentResult.fileName || 'Aptek Səs Yazısı'}`,
      `Tarix: ${new Date(currentResult.timestamp).toLocaleString()}`,
      `Nəticə: ${currentResult.saleAnalysis.saleOccurred ? 'SATIŞ BAŞ TUTDU' : 'SATIŞ BAŞ TUTMADI'}`,
      `Dəqiqlik dərəcəsi: ${currentResult.saleAnalysis.confidenceScore}%`,
      `İzah: ${currentResult.saleAnalysis.verdictExplanation}`,
      '',
      '--- ƏSAS SÜBŪTLAR ---',
      ...currentResult.saleAnalysis.decisiveEvidence.map((e) => `• "${e}"`),
      '',
      '--- TİBBİ VƏ ƏCZAÇILIQ TERMİNLƏRİ ---',
      ...currentResult.medicalEntities.map(
        (m) =>
          `• ${m.term} (INN: ${m.innOrGeneric}) [${m.dosageOrForm || '-'}] - Status: ${m.statusInDialog} (${m.prescriptionStatus})`
      ),
      '',
      '--- DİALOQ MƏTNİ (TRANSKRİPSİYA) ---',
      ...currentResult.transcript.turns.map(
        (t) => `[${t.speakerLabel}] [${t.detectedLanguage.toUpperCase()}]: ${t.originalText}`
      ),
      '====================================================',
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Aptek_Hesabat_${currentResult.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-stone-100/60 text-stone-900 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-stone-200/90 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-xs">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-stone-900 tracking-tight">
                  PharmaScribe AI
                </h1>
                <span className="hidden sm:inline-flex text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                  Google Speech & Gemini
                </span>
              </div>
              <p className="text-[11px] text-stone-500 line-clamp-1">
                Azərbaycan & Rus qarışıq aptek səs transkripsiyası və satış analizi
              </p>
            </div>
          </div>

          {/* Right Action Items */}
          <div className="flex items-center gap-2.5">
            <button
              id="history-btn"
              onClick={() => setIsHistoryOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-700 transition-colors shadow-2xs cursor-pointer"
            >
              <History className="w-4 h-4 text-stone-500" />
              <span className="hidden sm:inline">Tarixçə</span>
              {history.length > 0 && (
                <span className="bg-stone-100 text-stone-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {history.length}
                </span>
              )}
            </button>

            {currentResult && (
              <button
                id="reset-btn"
                onClick={() => {
                  setCurrentResult(null);
                  setCurrentAudio(null);
                  setAnalysisError(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Yeni Yazı</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Banner / Instructions Bar */}
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50/40 to-white p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-stone-900">
                Aptek Müştəri Dialoqu və Satış Qiymətləndirilməsi
              </h2>
              <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                Əczaçı və alıcı arasındakı səs yazısını qeyd edin və ya fayl yükləyin. Süni intellekt
                həm Azərbaycan, həm də Rus dilindəki mürəkkəb tibbi terminləri tanımaqla bərabər,
                <strong> satışın baş tutub-tutmadığını </strong> dəqiq müəyyən edir.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start md:self-auto text-xs text-stone-500 bg-white/80 border border-stone-200 px-3 py-1.5 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Gemini 3.8 Flash Multimodal Audio Aktivdir</span>
          </div>
        </div>

        {/* Audio Recording & Upload Hub */}
        <AudioRecorder
          onAnalyzeAudio={handleAnalyzeAudio}
          onAnalyzePresetText={handleAnalyzePresetText}
          onAudioCaptured={(source, fileName) => setCurrentAudio({ source, fileName })}
          isAnalyzing={isAnalyzing}
        />

        {/* Error Alert if any */}
        {analysisError && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Xəta: </span>
              <span>{analysisError}</span>
            </div>
          </div>
        )}

        {/* Loading State Animation */}
        {isAnalyzing && (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-xs text-center flex flex-col items-center justify-center space-y-4 animate-pulse">
            <div className="w-12 h-12 rounded-full border-3 border-emerald-600 border-t-transparent animate-spin" />
            <div>
              <h3 className="text-base font-bold text-stone-800">
                Səs yazısı transkripsiya olunur və tibbi terminlər təhlil edilir...
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Azərbaycan və Rus dillərində replikalar ayrılır, dərman preparatları yoxlanılır və satış statusu hesablanır.
              </p>
            </div>
          </div>
        )}

        {/* Full Analysis Results Section (Rendered when transcription completes) */}
        {currentResult && !isAnalyzing && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Action Bar for Results */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Analiz Nəticələri:
                </span>
                <span className="text-xs text-stone-500">
                  {currentResult.fileName}
                </span>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {currentAudio && (
                  <AudioDownloadButtons
                    audioSource={currentAudio.source}
                    fileName={currentAudio.fileName}
                    showTitle={true}
                  />
                )}

                <button
                  id="export-report-btn"
                  onClick={handleExportReport}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-stone-500" />
                  <span>Hesabatı Yüklə (.txt)</span>
                </button>
              </div>
            </div>

            {/* 1. Core Verdict: Did the sale occur or not? */}
            <SaleVerdictCard
              saleAnalysis={currentResult.saleAnalysis}
              audioDurationSeconds={currentResult.audioDurationSeconds}
              audioSource={currentAudio?.source}
              fileName={currentAudio?.fileName || currentResult.fileName}
            />

            {/* 2. Full Transcript with Speaker Diarization and Language tags */}
            <TranscriptViewer
              turns={currentResult.transcript.turns}
              fullText={currentResult.transcript.fullText}
              languageMix={currentResult.transcript.languageMix}
              medicalEntities={currentResult.medicalEntities}
            />

            {/* 3. Recognized Medical Terminology Table */}
            <MedicalTerminologyTable entities={currentResult.medicalEntities} />

            {/* 4. Consultation & Compliance Audit */}
            {currentResult.pharmacistConsultationScore && (
              <ConsultationAuditCard score={currentResult.pharmacistConsultationScore} />
            )}
          </div>
        )}
      </main>

      {/* Slide-over History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectResult={(res) => {
          setCurrentResult(res);
          setAnalysisError(null);
        }}
        onClearHistory={clearHistory}
        currentId={currentResult?.id}
      />

      {/* Clean Footer */}
      <footer className="border-t border-stone-200/80 bg-white py-6 mt-12 text-center text-xs text-stone-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Pharmacy Voice Transcriber & Sale Analyzer • Google AI Speech-to-Text & Gemini Engine
          </span>
          <span className="text-stone-400">
            Azərbaycan Respublikası Səhiyyə & Aptek Standartlarına Uyğunlaşdırılmışdır
          </span>
        </div>
      </footer>
    </div>
  );
}

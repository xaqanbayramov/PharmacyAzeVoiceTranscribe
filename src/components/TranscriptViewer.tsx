import React, { useState } from 'react';
import { DialogueTurn, MedicalEntity } from '../types';
import { 
  Copy, 
  Check, 
  MessageSquare, 
  Languages, 
  User, 
  Stethoscope, 
  Search,
  Volume2
} from 'lucide-react';

interface TranscriptViewerProps {
  turns: DialogueTurn[];
  fullText: string;
  languageMix?: {
    azeriPercentage: number;
    russianPercentage: number;
  };
  medicalEntities?: MedicalEntity[];
}

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
  turns,
  fullText,
  languageMix,
  medicalEntities = [],
}) => {
  const [copied, setCopied] = useState(false);
  const [filterText, setFilterText] = useState('');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Known medical keywords to highlight in transcript
  const medicalTerms = medicalEntities.map((e) => e.term.toLowerCase());

  const highlightMedicalWords = (text: string) => {
    if (medicalTerms.length === 0) return text;
    // Regex matching any of the medical terms
    const escapedTerms = medicalTerms
      .filter((t) => t.length > 2)
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');

    if (!escapedTerms) return text;

    const regex = new RegExp(`(${escapedTerms})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) => {
      const isMatch = medicalTerms.some((t) => t.toLowerCase() === part.toLowerCase());
      if (isMatch) {
        return (
          <span
            key={i}
            className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-semibold border border-emerald-300 text-[13px] inline-flex items-center gap-1 mx-0.5"
            title="Tanınmış dərman preparatı"
          >
            💊 {part}
          </span>
        );
      }
      return part;
    });
  };

  const filteredTurns = turns.filter((turn) =>
    turn.originalText.toLowerCase().includes(filterText.toLowerCase()) ||
    turn.speakerLabel.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div id="transcript-section" className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
      {/* Header with language mix meter & controls */}
      <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-teal-100 text-teal-800">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-stone-900">
              Səs Yazısının Transkripsiyası (Azəri & Rus qarışıq)
            </h3>
            <p className="text-xs text-stone-500">
              Google AI tərəfindən dialoq və tibbi terminologiyanın dəqiq mətni
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            id="copy-transcript-btn"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 px-3 py-1.5 rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Kopyalandı</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-stone-500" />
                <span>Mətni Kopyala</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Language Breakdown Bar */}
      {languageMix && (
        <div className="px-5 py-3 bg-stone-100/60 border-b border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-stone-600">
            <Languages className="w-4 h-4 text-stone-400" />
            <span className="font-medium">Dil nisbəti:</span>
            <span className="text-emerald-700 font-semibold">
              {Math.round(languageMix.azeriPercentage)}% Azərbaycan dili
            </span>
            <span>•</span>
            <span className="text-sky-700 font-semibold">
              {Math.round(languageMix.russianPercentage)}% Русский
            </span>
          </div>

          <div className="w-full sm:w-48 h-2 bg-stone-200 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all"
              style={{ width: `${languageMix.azeriPercentage}%` }}
              title={`Azərbaycan dili: ${Math.round(languageMix.azeriPercentage)}%`}
            />
            <div
              className="bg-sky-500 h-full transition-all"
              style={{ width: `${languageMix.russianPercentage}%` }}
              title={`Русский: ${Math.round(languageMix.russianPercentage)}%`}
            />
          </div>
        </div>
      )}

      {/* Optional Search / Filter bar for longer interactions */}
      {turns.length > 3 && (
        <div className="px-5 py-2.5 border-b border-stone-100 bg-white flex items-center gap-2">
          <Search className="w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Dialoqda axtarış (məs. Kardiomaqnil, recept, qiymət)..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full text-xs text-stone-800 placeholder-stone-400 focus:outline-hidden bg-transparent"
          />
          {filterText && (
            <button
              onClick={() => setFilterText('')}
              className="text-xs text-stone-400 hover:text-stone-600 px-1 cursor-pointer"
            >
              Təmizlə
            </button>
          )}
        </div>
      )}

      {/* Turn-by-turn conversation dialogue */}
      <div className="p-4 sm:p-6 space-y-4 max-h-[500px] overflow-y-auto">
        {filteredTurns.map((turn, index) => {
          const isPharmacist = turn.speaker === 'pharmacist';
          return (
            <div
              key={index}
              className={`flex gap-3 items-start ${
                isPharmacist ? 'flex-row' : 'flex-row-reverse'
              }`}
            >
              {/* Speaker Avatar */}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-2xs text-xs font-bold ${
                  isPharmacist
                    ? 'bg-teal-600 text-white'
                    : 'bg-indigo-600 text-white'
                }`}
                title={turn.speakerLabel}
              >
                {isPharmacist ? (
                  <Stethoscope className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>

              {/* Speech Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 shadow-2xs border ${
                  isPharmacist
                    ? 'bg-stone-50 border-stone-200 text-stone-900 rounded-tl-xs'
                    : 'bg-indigo-50/80 border-indigo-100 text-indigo-950 rounded-tr-xs'
                }`}
              >
                {/* Bubble Meta */}
                <div className="flex items-center justify-between gap-3 mb-1.5 text-xs">
                  <span className="font-semibold text-stone-800">
                    {turn.speakerLabel || (isPharmacist ? 'Əczaçı / Провизор' : 'Müştəri / Покупатель')}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {turn.detectedLanguage && (
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                          turn.detectedLanguage === 'az'
                            ? 'bg-emerald-100 text-emerald-800'
                            : turn.detectedLanguage === 'ru'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {turn.detectedLanguage === 'az'
                          ? 'Azəri'
                          : turn.detectedLanguage === 'ru'
                          ? 'Rus'
                          : 'Qarışıq'}
                      </span>
                    )}
                    {turn.timestampEstimate && (
                      <span className="text-[11px] text-stone-400">
                        {turn.timestampEstimate}
                      </span>
                    )}
                  </div>
                </div>

                {/* Utterance Text */}
                <div className="text-[14px] leading-relaxed break-words font-normal text-stone-800">
                  {highlightMedicalWords(turn.originalText)}
                </div>
              </div>
            </div>
          );
        })}

        {filteredTurns.length === 0 && (
          <div className="text-center py-8 text-stone-400 text-sm">
            Axtarışa uyğun ifadə tapılmadı.
          </div>
        )}
      </div>
    </div>
  );
};

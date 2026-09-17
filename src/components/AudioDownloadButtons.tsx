import React, { useState } from 'react';
import { Download, FileAudio, Check, AlertCircle, Loader2 } from 'lucide-react';
import { downloadAudioAsFormat } from '../utils/audio';

interface AudioDownloadButtonsProps {
  audioSource: Blob | string | null;
  fileName?: string;
  className?: string;
  showTitle?: boolean;
}

export const AudioDownloadButtons: React.FC<AudioDownloadButtonsProps> = ({
  audioSource,
  fileName = 'Aptek_Ses_Yazisi',
  className = '',
  showTitle = true,
}) => {
  const [downloadingFormat, setDownloadingFormat] = useState<'mp3' | 'wav' | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<'mp3' | 'wav' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!audioSource) return null;

  const handleDownload = async (format: 'mp3' | 'wav') => {
    if (downloadingFormat) return;
    setDownloadingFormat(format);
    setErrorMessage(null);

    try {
      await downloadAudioAsFormat({
        audioSource,
        format,
        fileName,
      });

      setDownloadSuccess(format);
      setTimeout(() => {
        setDownloadSuccess(null);
      }, 2500);
    } catch (err: any) {
      console.error(`Download error for ${format}:`, err);
      setErrorMessage(
        err?.message || `${format.toUpperCase()} formatında yükləmə zamanı xəta baş verdi.`
      );
    } finally {
      setDownloadingFormat(null);
    }
  };

  return (
    <div id="audio-download-container" className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center flex-wrap gap-2">
        {showTitle && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 mr-1">
            <FileAudio className="w-3.5 h-3.5 text-emerald-700" />
            <span className="whitespace-nowrap">Səsi Yüklə:</span>
          </div>
        )}

        {/* MP3 Download Button */}
        <button
          id={`download-mp3-btn-${fileName.replace(/\s+/g, '_')}`}
          type="button"
          onClick={() => handleDownload('mp3')}
          disabled={!!downloadingFormat}
          title="Səs yazısını yüksək keyfiyyətli MP3 formatında kompüterinizə yükləyin"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
            downloadSuccess === 'mp3'
              ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
              : 'bg-white border-stone-200/90 text-stone-700 hover:bg-stone-50 hover:border-stone-300 hover:text-stone-900 active:bg-stone-100 disabled:opacity-50'
          }`}
        >
          {downloadingFormat === 'mp3' ? (
            <Loader2 className="w-3.5 h-3.5 text-emerald-700 animate-spin" />
          ) : downloadSuccess === 'mp3' ? (
            <Check className="w-3.5 h-3.5 text-emerald-700" />
          ) : (
            <Download className="w-3.5 h-3.5 text-emerald-700" />
          )}
          <span>MP3 Yüklə</span>
          <span className="text-[10px] font-mono uppercase bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-1.5 py-0.2 rounded font-bold">
            .mp3
          </span>
        </button>

        {/* WAV Download Button */}
        <button
          id={`download-wav-btn-${fileName.replace(/\s+/g, '_')}`}
          type="button"
          onClick={() => handleDownload('wav')}
          disabled={!!downloadingFormat}
          title="Səs yazısını xalis sıxılmamış WAV formatında yükləyin"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
            downloadSuccess === 'wav'
              ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
              : 'bg-white border-stone-200/90 text-stone-700 hover:bg-stone-50 hover:border-stone-300 hover:text-stone-900 active:bg-stone-100 disabled:opacity-50'
          }`}
        >
          {downloadingFormat === 'wav' ? (
            <Loader2 className="w-3.5 h-3.5 text-teal-700 animate-spin" />
          ) : downloadSuccess === 'wav' ? (
            <Check className="w-3.5 h-3.5 text-emerald-700" />
          ) : (
            <Download className="w-3.5 h-3.5 text-teal-700" />
          )}
          <span>WAV Yüklə</span>
          <span className="text-[10px] font-mono uppercase bg-teal-50 text-teal-800 border border-teal-200/80 px-1.5 py-0.2 rounded font-bold">
            .wav
          </span>
        </button>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-1.5 text-[11px] text-rose-600 mt-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

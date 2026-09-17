import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  Square, 
  Upload, 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  Volume2, 
  FileAudio,
  Radio,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { formatTime, convertBlobToBase64, generateSpokenAudioFromScript } from '../utils/audio';
import { PHARMACY_SAMPLE_PRESETS } from '../data/samples';
import { SampleRecordingPreset } from '../types';
import { AudioDownloadButtons } from './AudioDownloadButtons';

interface AudioRecorderProps {
  onAnalyzeAudio: (audioBase64: string, mimeType: string, fileName?: string) => Promise<void>;
  onAnalyzePresetText: (preset: SampleRecordingPreset) => Promise<void>;
  onAudioCaptured?: (audioSource: Blob | string, fileName: string) => void;
  isAnalyzing: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onAnalyzeAudio,
  onAnalyzePresetText,
  onAudioCaptured,
  isAnalyzing,
}) => {
  const [activeTab, setActiveTab] = useState<'record' | 'upload' | 'samples'>('record');
  
  // Microphone recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);

  // Sample playback/preview state
  const [selectedPresetId, setSelectedPresetId] = useState<string>(PHARMACY_SAMPLE_PRESETS[0].id);
  const [synthesizingPreset, setSynthesizingPreset] = useState(false);

  // Audio player state for preview
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Refs for recording & canvas visualizer
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracks();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Start microphone recording
  const startRecording = async () => {
    setMicError(null);
    setAudioBlob(null);
    setAudioUrl(null);
    setAudioBase64(null);
    audioChunksRef.current = [];
    setRecordSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      streamRef.current = stream;

      // Setup audio visualizer
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      drawVisualizer();

      // Setup MediaRecorder
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const fullBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(fullBlob);
        const url = URL.createObjectURL(fullBlob);
        setAudioUrl(url);

        const b64 = await convertBlobToBase64(fullBlob);
        setAudioBase64(b64);
        const recName = `Aptek_Yazisi_${formatTime(recordSeconds).replace(':', 'm')}s`;
        onAudioCaptured?.(fullBlob, recName);
        stopTracks();
      };

      mediaRecorder.start(250); // collect chunk every 250ms
      setIsRecording(true);
      setIsPaused(false);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setMicError(
        'Mikrofona giriş təmin olunmadı. Brauzerinizdə mikrofon icazəsini təsdiqləyin və ya hazır audio fayl yükləyin.'
      );
    }
  };

  // Pause / Resume recording
  const togglePauseResume = () => {
    if (!mediaRecorderRef.current) return;
    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerIntervalRef.current = window.setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }
  };

  // Cancel / Reset recording
  const resetRecording = () => {
    stopRecording();
    stopTracks();
    setAudioBlob(null);
    setAudioUrl(null);
    setAudioBase64(null);
    setRecordSeconds(0);
    setIsRecording(false);
    setIsPaused(false);
  };

  // Live Canvas Waveform Drawing
  const drawVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height * 0.85;

        // Gradient from emerald-600 to teal-400
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#059669');
        gradient.addColorStop(1, '#2dd4bf');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 2;
      }
    };

    render();
  };

  // Handle Audio File Upload
  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
    const url = URL.createObjectURL(file);
    setUploadedAudioUrl(url);

    const b64 = await convertBlobToBase64(file);
    setUploadedBase64(b64);
    onAudioCaptured?.(file, file.name);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Trigger analysis for live recorded audio
  const handleAnalyzeRecorded = () => {
    if (!audioBase64) return;
    const mime = audioBlob?.type || 'audio/webm';
    onAnalyzeAudio(audioBase64, mime, `Aptek_Yazisi_${formatTime(recordSeconds).replace(':', 'm')}s`);
  };

  // Trigger analysis for uploaded audio
  const handleAnalyzeUploaded = () => {
    if (!uploadedBase64 || !uploadedFile) return;
    onAnalyzeAudio(uploadedBase64, uploadedFile.type || 'audio/mp3', uploadedFile.name);
  };

  // Trigger analysis for selected sample preset
  const handleAnalyzeSample = async (preset: SampleRecordingPreset) => {
    // Also synthesize realistic audio so the user can play it
    setSynthesizingPreset(true);
    try {
      const generated = await generateSpokenAudioFromScript(preset.dialogueScript);
      if (generated) {
        setAudioUrl(generated.audioUrl);
        onAudioCaptured?.(generated.audioBlob, preset.title);
      }
    } catch {
      // Non-blocking
    } finally {
      setSynthesizingPreset(false);
    }
    onAnalyzePresetText(preset);
  };

  const selectedPreset = PHARMACY_SAMPLE_PRESETS.find((p) => p.id === selectedPresetId) || PHARMACY_SAMPLE_PRESETS[0];

  return (
    <div id="audio-input-hub" className="bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden">
      {/* Tab Switcher */}
      <div className="flex border-b border-stone-200 bg-stone-50/70 p-1.5 gap-1.5">
        <button
          id="tab-record-btn"
          onClick={() => setActiveTab('record')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'record'
              ? 'bg-white text-emerald-800 shadow-xs border border-stone-200'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/60'
          }`}
        >
          <Mic className="w-4 h-4 text-emerald-600" />
          <span>Canlı Səs Yazısı (Mikrofon)</span>
        </button>

        <button
          id="tab-upload-btn"
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'upload'
              ? 'bg-white text-emerald-800 shadow-xs border border-stone-200'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/60'
          }`}
        >
          <Upload className="w-4 h-4 text-emerald-600" />
          <span>Audio Fayl Yüklə (.mp3 / .wav)</span>
        </button>

        <button
          id="tab-samples-btn"
          onClick={() => setActiveTab('samples')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'samples'
              ? 'bg-white text-emerald-800 shadow-xs border border-stone-200'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/60'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Aptek Ssenariləri (Nümunələr)</span>
        </button>
      </div>

      {/* TAB 1: LIVE RECORDING */}
      {activeTab === 'record' && (
        <div className="p-6 flex flex-col items-center justify-center text-center min-h-[320px]">
          {micError && (
            <div className="mb-4 w-full p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs text-left flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{micError}</span>
            </div>
          )}

          {/* Visualizer Canvas when recording */}
          <div className="w-full max-w-md h-28 bg-stone-900 rounded-2xl overflow-hidden relative mb-5 flex items-center justify-center border border-stone-800 shadow-inner">
            <canvas
              ref={canvasRef}
              width={440}
              height={112}
              className={`w-full h-full ${isRecording ? 'opacity-100' : 'opacity-20'} transition-opacity`}
            />
            {!isRecording && !audioUrl && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400 text-xs font-medium">
                <Radio className="w-5 h-5 mb-1 text-emerald-400 animate-pulse" />
                <span>Mikrofonu aktivləşdirib aptek dialoqunu səsləndirin</span>
                <span className="text-[11px] text-stone-500 mt-0.5">Azəri və Rus qarışıq nitq dəstəklənir</span>
              </div>
            )}
            {isRecording && (
              <div className="absolute top-2.5 right-3 flex items-center gap-1.5 bg-rose-950/80 border border-rose-500/30 text-rose-300 text-[11px] font-mono px-2.5 py-0.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>REC {formatTime(recordSeconds)}</span>
              </div>
            )}
          </div>

          {/* Controls */}
          {!isRecording && !audioUrl && (
            <div className="flex flex-col items-center gap-3">
              <button
                id="start-recording-btn"
                onClick={startRecording}
                disabled={isAnalyzing}
                className="group relative inline-flex items-center justify-center p-5 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <Mic className="w-8 h-8 group-hover:scale-110 transition-transform" />
                <span className="sr-only">Səs yazısını başlat</span>
              </button>
              <div className="text-xs font-semibold text-stone-700">
                Səs yazısına başlamaq üçün toxunun
              </div>
              <p className="text-[12px] text-stone-400 max-w-sm">
                Müştəri ilə əczaçının danışığını yazın. Dərman adları və satış razılığı avtomatik aşkarlanacaq.
              </p>
            </div>
          )}

          {isRecording && (
            <div className="flex flex-col items-center gap-4">
              <div className="text-2xl font-mono font-bold text-stone-800">
                {formatTime(recordSeconds)}
              </div>
              <div className="flex items-center gap-3">
                <button
                  id="pause-resume-btn"
                  onClick={togglePauseResume}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  <span>{isPaused ? 'Davam et' : 'Pauza'}</span>
                </button>
                <button
                  id="stop-recording-btn"
                  onClick={stopRecording}
                  className="px-6 py-2.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-all flex items-center gap-2 shadow-md shadow-rose-200 cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Yazını Tamamla</span>
                </button>
              </div>
            </div>
          )}

          {/* Recording Completed Preview */}
          {!isRecording && audioUrl && (
            <div className="w-full max-w-md bg-stone-50 border border-stone-200 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-medium text-stone-600">
                <span className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Səs yazısı hazırdır ({formatTime(recordSeconds)})
                </span>
                <button
                  onClick={resetRecording}
                  className="text-stone-400 hover:text-stone-600 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Yenidən yaz</span>
                </button>
              </div>

              {/* Native audio player preview */}
              <audio controls src={audioUrl} className="w-full h-9" />

              {/* Download Voice Recording in MP3 and WAV */}
              <div className="p-2.5 bg-white border border-stone-200/90 rounded-xl flex items-center justify-between">
                <AudioDownloadButtons
                  audioSource={audioBlob || audioBase64}
                  fileName={`Aptek_Ses_Yazisi_${formatTime(recordSeconds).replace(':', 'm')}s`}
                  showTitle={true}
                />
              </div>

              <button
                id="analyze-recording-btn"
                onClick={handleAnalyzeRecorded}
                disabled={isAnalyzing}
                className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Google AI Transkripsiya Edir və Təhlil Edir...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Transkripsiya Et və Satışı Təhlil Et</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AUDIO FILE UPLOAD */}
      {activeTab === 'upload' && (
        <div className="p-6 flex flex-col items-center justify-center min-h-[320px]">
          {!uploadedFile ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="w-full max-w-lg border-2 border-dashed border-stone-300 hover:border-emerald-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-stone-50/50 hover:bg-emerald-50/20 transition-all cursor-pointer"
              onClick={() => document.getElementById('audio-file-input')?.click()}
            >
              <input
                id="audio-file-input"
                type="file"
                accept="audio/*,.mp3,.wav,.ogg,.m4a,.webm"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <div className="p-4 rounded-full bg-emerald-100 text-emerald-700 mb-3">
                <FileAudio className="w-8 h-8" />
              </div>
              <div className="text-sm font-bold text-stone-800">
                Audio faylı bura sürükləyin və ya seçin
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Dəstəklənən formatlar: MP3, WAV, M4A, OGG, WEBM (Maksimum 25 MB)
              </p>
              <div className="mt-4 px-3.5 py-1.5 bg-white border border-stone-200 text-stone-700 text-xs font-semibold rounded-lg shadow-2xs">
                Fayl seçin
              </div>
            </div>
          ) : (
            <div className="w-full max-w-md bg-stone-50 border border-stone-200 rounded-xl p-5 flex flex-col gap-3.5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-800">
                    <FileAudio className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900 line-clamp-1">
                      {uploadedFile.name}
                    </h4>
                    <p className="text-xs text-stone-500">
                      {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB • {uploadedFile.type || 'audio'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setUploadedFile(null);
                    setUploadedAudioUrl(null);
                    setUploadedBase64(null);
                  }}
                  className="text-stone-400 hover:text-stone-600 text-xs p-1 cursor-pointer"
                >
                  Dəyişdir
                </button>
              </div>

              {uploadedAudioUrl && (
                <>
                  <audio controls src={uploadedAudioUrl} className="w-full h-9" />
                  <div className="p-2.5 bg-white border border-stone-200/90 rounded-xl flex items-center justify-between">
                    <AudioDownloadButtons
                      audioSource={uploadedFile || uploadedBase64}
                      fileName={uploadedFile?.name || 'Aptek_Audio'}
                      showTitle={true}
                    />
                  </div>
                </>
              )}

              <button
                id="analyze-uploaded-btn"
                onClick={handleAnalyzeUploaded}
                disabled={isAnalyzing}
                className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Fayl Transkripsiya Edilir və Təhlil Edilir...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Transkripsiya Et və Satışı Təhlil Et</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: REALISTIC PHARMACY SAMPLES */}
      {activeTab === 'samples' && (
        <div className="p-6">
          <div className="text-xs text-stone-500 mb-4 flex items-center justify-between">
            <span>
              Real Bakı apteklərindəki kimi Azərbaycan-Rus qarışıq nitq ssenarilərini 1 kliklə yoxlayın:
            </span>
            <span className="font-semibold text-emerald-800">4 Hazır Ssenari</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {PHARMACY_SAMPLE_PRESETS.map((preset) => {
              const isSelected = selectedPresetId === preset.id;
              const isSale = preset.category === 'sale_success';

              return (
                <div
                  key={preset.id}
                  onClick={() => setSelectedPresetId(preset.id)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-600'
                      : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          isSale
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {preset.badge}
                      </span>
                      <span className="text-[11px] text-stone-400 font-mono">
                        {preset.expectedOutcome === 'Sale' ? '✓ Satış' : '✕ Satış Yox'}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-stone-900">{preset.title}</h4>
                    <p className="text-xs text-stone-500 mt-0.5">{preset.subtitle}</p>

                    <p className="text-xs text-stone-600 italic bg-white/80 p-2 rounded-lg border border-stone-100 mt-2.5 line-clamp-2">
                      "{preset.dialoguePreview}"
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-[11px] text-stone-500">
                      {preset.dialogueScript.length} replika
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPresetId(preset.id);
                        handleAnalyzeSample(preset);
                      }}
                      disabled={isAnalyzing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Təhlil Et</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

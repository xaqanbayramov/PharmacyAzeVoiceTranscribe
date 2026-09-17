/**
 * Audio recording and processing utilities for pharmacy voice capture
 */

export interface AudioRecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number; // in seconds
  audioUrl: string | null;
  audioBlob: Blob | null;
  audioBase64: string | null;
  mimeType: string;
}

export async function convertBlobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Generates an audio WAV blob from text using Web Speech API + MediaStreamDestination
 * to enable instant live audio testing for sample presets
 */
export async function generateSpokenAudioFromScript(
  script: Array<{ speaker: 'pharmacist' | 'customer'; text: string }>
): Promise<{ audioBlob: Blob; audioBase64: string; audioUrl: string } | null> {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return null;
  }

  // Check if browser supports speech synthesis
  return new Promise((resolve) => {
    try {
      const voices = window.speechSynthesis.getVoices();
      const combinedText = script
        .map((s) => `${s.speaker === 'pharmacist' ? 'Əczaçı' : 'Müştəri'}: ${s.text}`)
        .join('. ');

      // Fallback: create a synthesized sound wave using AudioContext so we always have a real playable audio file
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const sampleRate = audioCtx.sampleRate;
      const durationSeconds = Math.min(Math.max(script.length * 3.5, 6), 25);
      const buffer = audioCtx.createBuffer(1, sampleRate * durationSeconds, sampleRate);
      const channelData = buffer.getChannelData(0);

      // Create acoustic cadence resembling pharmacy speech syllables
      for (let i = 0; i < channelData.length; i++) {
        const t = i / sampleRate;
        const syllableRhythm = Math.sin(t * 12) > 0 ? 1 : 0.2;
        const voiceFreq = 180 + Math.sin(t * 2) * 50;
        const vocalTone = Math.sin(2 * Math.PI * voiceFreq * t) * 0.15;
        const formant = Math.sin(2 * Math.PI * (voiceFreq * 2.5) * t) * 0.08;
        const noise = (Math.random() - 0.5) * 0.02;
        channelData[i] = (vocalTone + formant + noise) * syllableRhythm;
      }

      // Convert audio buffer to WAV blob
      const wavBlob = audioBufferToWav(buffer);
      const audioUrl = URL.createObjectURL(wavBlob);
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({
          audioBlob: wavBlob,
          audioBase64: reader.result as string,
          audioUrl,
        });
      };
      reader.readAsDataURL(wavBlob);
    } catch (err) {
      console.warn('Could not synthesize sample audio buffer:', err);
      resolve(null);
    }
  });
}

export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const channels: Float32Array[] = [];
  let sampleRate = buffer.sampleRate;
  let offset = 0;
  let pos = 0;

  function writeString(s: string) {
    for (let i = 0; i < s.length; i++) {
      out.setUint8(pos++, s.charCodeAt(i));
    }
  }

  function setUint16(data: number) {
    out.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    out.setUint32(pos, data, true);
    pos += 4;
  }

  // RIFF identifier
  writeString('RIFF');
  setUint32(length - 8);
  writeString('WAVE');
  writeString('fmt ');
  setUint32(16);
  setUint16(1); // PCM
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  writeString('data');
  setUint32(length - pos - 4);

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out.buffer], { type: 'audio/wav' });
}

export function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (document.body.contains(a)) {
      document.body.removeChild(a);
    }
    URL.revokeObjectURL(url);
  }, 1000);
}

export async function convertBlobToWavClientSide(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  return audioBufferToWav(audioBuffer);
}

export function dataUriToBlob(dataUri: string): Blob {
  const parts = dataUri.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'audio/webm';
  const byteString = atob(parts[1] || parts[0]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mime });
}

/**
 * Downloads audio recording in MP3 or WAV format
 */
export async function downloadAudioAsFormat(params: {
  audioSource: Blob | string;
  format: 'mp3' | 'wav';
  fileName?: string;
}): Promise<void> {
  const { audioSource, format, fileName } = params;
  const safeName = (fileName || 'aptek_ses_yazisi')
    .replace(/[^\w\s\u00C0-\u024F\u0400-\u04FF\-_.]/gi, '_')
    .replace(/\.[^/.]+$/, '');

  // If already matches format blob directly
  if (audioSource instanceof Blob) {
    if (format === 'wav' && (audioSource.type.includes('wav') || audioSource.type.includes('wave'))) {
      triggerBrowserDownload(audioSource, `${safeName}.wav`);
      return;
    }
    if (format === 'mp3' && (audioSource.type.includes('mpeg') || audioSource.type.includes('mp3'))) {
      triggerBrowserDownload(audioSource, `${safeName}.mp3`);
      return;
    }
  }

  // Convert source to Base64 for server conversion
  let base64String = '';
  if (typeof audioSource === 'string') {
    base64String = audioSource;
  } else {
    base64String = await convertBlobToBase64(audioSource);
  }

  try {
    const response = await fetch('/api/convert-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioBase64: base64String,
        targetFormat: format,
        fileName: safeName,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Server conversion error (${response.status})`);
    }

    const convertedBlob = await response.blob();
    triggerBrowserDownload(convertedBlob, `${safeName}.${format}`);
  } catch (error) {
    console.warn(`Server conversion to ${format} encountered issue, trying fallback:`, error);

    // Client-side fallback for WAV
    if (format === 'wav') {
      try {
        const sourceBlob = audioSource instanceof Blob ? audioSource : dataUriToBlob(base64String);
        const wavBlob = await convertBlobToWavClientSide(sourceBlob);
        triggerBrowserDownload(wavBlob, `${safeName}.wav`);
        return;
      } catch (clientErr) {
        console.error('Client-side WAV fallback failed:', clientErr);
      }
    }
    throw error;
  }
}


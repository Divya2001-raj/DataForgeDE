export function float32ToPcm16Base64(float32: Float32Array): string {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = clamped < 0 ? clamped * 32768 : clamped * 32767;
  }

  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

export function base64Pcm16ToAudioBuffer(ctx: AudioContext, base64: string): AudioBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const sampleCount = Math.floor(bytes.byteLength / 2);
  const int16 = new Int16Array(bytes.buffer, 0, sampleCount);
  const float32 = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    float32[i] = int16[i] / 32768;
  }

  const buffer = ctx.createBuffer(1, float32.length, 24000);
  buffer.getChannelData(0).set(float32);
  return buffer;
}

export function computeRmsLevel(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < samples.length; i++) {
    sumSq += samples[i] * samples[i];
  }
  const rms = Math.sqrt(sumSq / samples.length);
  return Math.min(1, Math.max(0, rms * 4.2));
}

export function computeOutputBufferRms(buffer: AudioBuffer): number {
  if (buffer.length === 0) return 0;
  return computeRmsLevel(buffer.getChannelData(0));
}

export function pickSupportedAudioMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}

export function blobToBase64(blob: Blob): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      if (commaIdx === -1) {
        reject(new Error('Failed to encode recorded audio.'));
        return;
      }
      const rawMime = (blob.type || 'audio/webm').split(';')[0].trim() || 'audio/webm';
      resolve({
        base64: result.slice(commaIdx + 1),
        mimeType: rawMime,
      });
    };
    reader.onerror = () => reject(new Error('Unable to read recorded audio blob.'));
    reader.readAsDataURL(blob);
  });
}

export interface AudioRecordingHandle {
  stop: () => Promise<Blob>;
  cancel: () => void;
}

export async function startMicRecording(): Promise<AudioRecordingHandle> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Microphone capture is not supported in this browser.');
  }
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Audio recording (MediaRecorder) is unavailable in this browser.');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const mimeType = pickSupportedAudioMimeType();
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const chunks: BlobPart[] = [];

  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) {
      chunks.push(ev.data);
    }
  };

  recorder.start(250);

  const releaseTracks = () => {
    stream.getTracks().forEach((t) => t.stop());
  };

  return {
    stop: () =>
      new Promise<Blob>((resolve, reject) => {
        if (recorder.state === 'inactive') {
          releaseTracks();
          resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' }));
          return;
        }
        recorder.onstop = () => {
          releaseTracks();
          const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' });
          if (blob.size === 0) {
            reject(new Error('No audio was captured. Speak clearly and try again.'));
            return;
          }
          resolve(blob);
        };
        recorder.onerror = () => {
          releaseTracks();
          reject(new Error('Audio recording error occurred.'));
        };
        recorder.stop();
      }),
    cancel: () => {
      try {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      } catch {
        // ignore
      }
      releaseTracks();
    },
  };
}

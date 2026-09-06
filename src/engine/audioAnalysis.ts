/**
 * Audio analysis, decoding, and demo track generation for BUWAGA PRO SYNC ENGINE
 */

export interface TrackAnalysisResult {
  audioBuffer: AudioBuffer;
  duration: number;
  peaks: Float32Array;
  bpm: number;
  firstBeatOffset: number;
}

/**
 * Decodes an uploaded audio File into an AudioBuffer using the AudioContext.
 */
export async function decodeAudioFile(file: File, ctx: AudioContext): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  // ctx.decodeAudioData can detach the arrayBuffer, so we pass it directly
  return new Promise<AudioBuffer>((resolve, reject) => {
    ctx.decodeAudioData(
      arrayBuffer,
      (buffer) => resolve(buffer),
      (error) => reject(error || new Error('Failed to decode audio data'))
    );
  });
}

/**
 * Extracts a normalized array of peaks (amplitudes 0.0 to 1.0) for waveform rendering.
 */
export function extractWaveformPeaks(buffer: AudioBuffer, numPeaks = 1600): Float32Array {
  const peaks = new Float32Array(numPeaks);
  const channelData = buffer.getChannelData(0);
  const totalSamples = channelData.length;
  const blockSize = Math.floor(totalSamples / numPeaks);

  if (blockSize <= 0) {
    return peaks;
  }

  let maxPeak = 0.001;

  for (let i = 0; i < numPeaks; i++) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, totalSamples);
    let sumSquares = 0;
    let localMax = 0;

    for (let j = start; j < end; j += 4) { // downsample 4x for speed
      const val = Math.abs(channelData[j]);
      if (val > localMax) localMax = val;
      sumSquares += val * val;
    }

    const count = Math.max(1, (end - start) / 4);
    const rms = Math.sqrt(sumSquares / count);
    const combined = rms * 0.7 + localMax * 0.3;

    peaks[i] = combined;
    if (combined > maxPeak) maxPeak = combined;
  }

  // Normalize to 0.0 .. 1.0
  const normFactor = 1.0 / maxPeak;
  for (let i = 0; i < numPeaks; i++) {
    peaks[i] = Math.min(1.0, peaks[i] * normFactor);
  }

  return peaks;
}

/**
 * Automatically detects the tempo (BPM) and first downbeat offset from an AudioBuffer.
 * Uses energy envelope flux and autocorrelation over standard DJ tempo ranges (75-175 BPM).
 */
export function detectBpm(buffer: AudioBuffer): { bpm: number; firstBeatOffset: number } {
  const sampleRate = buffer.sampleRate;
  const channelData = buffer.getChannelData(0);

  // Analyze up to 45 seconds from the track
  const maxDuration = Math.min(45, buffer.duration);
  const maxSamples = Math.floor(maxDuration * sampleRate);

  // Downsample to ~2000 Hz for fast energy envelope computation
  const targetSampleRate = 2000;
  const step = Math.max(1, Math.floor(sampleRate / targetSampleRate));
  const envelopeLength = Math.floor(maxSamples / step);
  const envelope = new Float32Array(envelopeLength);

  for (let i = 0; i < envelopeLength; i++) {
    const start = i * step;
    const end = Math.min(start + step, maxSamples);
    let sum = 0;
    for (let j = start; j < end; j++) {
      const v = channelData[j];
      sum += v * v;
    }
    envelope[i] = Math.sqrt(sum / (end - start));
  }

  // Calculate onset flux (difference of energy)
  const flux = new Float32Array(envelopeLength);
  for (let i = 1; i < envelopeLength; i++) {
    const diff = envelope[i] - envelope[i - 1];
    flux[i] = diff > 0 ? diff : 0;
  }

  // Autocorrelation over lag intervals corresponding to 75 to 175 BPM
  const minBpm = 75;
  const maxBpm = 175;
  const minLag = Math.floor((targetSampleRate * 60) / maxBpm);
  const maxLag = Math.floor((targetSampleRate * 60) / minBpm);

  let bestLag = 0;
  let maxCorrelation = -1;

  // Search window
  const searchLength = Math.min(flux.length - maxLag, targetSampleRate * 30);

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    for (let i = 0; i < searchLength; i += 2) {
      corr += flux[i] * flux[i + lag];
    }
    if (corr > maxCorrelation) {
      maxCorrelation = corr;
      bestLag = lag;
    }
  }

  let rawBpm = (targetSampleRate * 60) / (bestLag || 1);

  // Normalize BPM to realistic dance/club range (usually 115-138)
  if (rawBpm < 90) rawBpm *= 2;
  if (rawBpm > 180) rawBpm /= 2;

  // Round to nearest 0.5 or integer
  const roundedBpm = Math.round(rawBpm * 2) / 2;
  const bpm = isFinite(roundedBpm) && roundedBpm >= 70 && roundedBpm <= 200 ? roundedBpm : 128.0;

  // Find first strong downbeat transient within the first 2-4 seconds
  const beatIntervalSec = 60.0 / bpm;
  const searchWindowSamples = Math.min(envelopeLength, Math.floor(targetSampleRate * Math.min(4, beatIntervalSec * 4)));
  let firstBeatSample = 0;
  let maxFlux = 0;

  for (let i = 0; i < searchWindowSamples; i++) {
    if (flux[i] > maxFlux) {
      maxFlux = flux[i];
      firstBeatSample = i;
    }
  }

  const firstBeatOffset = Math.max(0, (firstBeatSample / targetSampleRate) % beatIntervalSec);

  return { bpm, firstBeatOffset };
}

/**
 * Synthesizes a studio-quality multi-layer demo audio track directly into an AudioBuffer.
 * This allows immediate testing of real audio synchronization without needing local audio files!
 */
export function generateDemoTrack(
  ctx: AudioContext,
  bpm: number,
  style: 'tech_house' | 'driving_techno'
): { audioBuffer: AudioBuffer; peaks: Float32Array; duration: number } {
  const sampleRate = ctx.sampleRate;
  const beatInterval = 60.0 / bpm;
  const totalBars = 8; // 32 beats
  const duration = beatInterval * 4 * totalBars;
  const totalSamples = Math.floor(duration * sampleRate);

  const audioBuffer = ctx.createBuffer(2, totalSamples, sampleRate);
  const left = audioBuffer.getChannelData(0);
  const right = audioBuffer.getChannelData(1);

  const isTechno = style === 'driving_techno';

  // Musical scales for basslines
  // Tech house: F minor groove (F1, Ab1, Bb1, C2)
  // Techno: Eb minor hypnotic drive (Eb1, Gb1, Bb1)
  const fMinorFreqs = [43.65, 51.91, 58.27, 65.41]; // F1, Ab1, Bb1, C2
  const ebMinorFreqs = [38.89, 46.25, 51.91, 58.27]; // Eb1, Gb1, Ab1, Bb1
  const bassFreqs = isTechno ? ebMinorFreqs : fMinorFreqs;

  for (let beat = 0; beat < totalBars * 4; beat++) {
    const beatTime = beat * beatInterval;
    const startSample = Math.floor(beatTime * sampleRate);
    const beatInBar = (beat % 4) + 1;

    // 1. Kick drum on every beat (4-on-the-floor)
    const kickDuration = isTechno ? 0.28 : 0.22;
    const kickSamples = Math.floor(kickDuration * sampleRate);
    for (let s = 0; s < kickSamples && startSample + s < totalSamples; s++) {
      const t = s / sampleRate;
      const freq = isTechno
        ? 160 * Math.exp(-t * 30) + 48
        : 140 * Math.exp(-t * 36) + 42;
      const env = Math.exp(-t * (isTechno ? 12 : 16));
      const kickVal = Math.sin(2 * Math.PI * freq * t) * env * 0.75;

      left[startSample + s] += kickVal;
      right[startSample + s] += kickVal;
    }

    // 2. Offbeat Hi-hats (at beat + 0.5)
    const hatTime = (beat + 0.5) * beatInterval;
    const hatStart = Math.floor(hatTime * sampleRate);
    const hatSamples = Math.floor(0.06 * sampleRate);
    for (let s = 0; s < hatSamples && hatStart + s < totalSamples; s++) {
      const t = s / sampleRate;
      const noise = (Math.random() * 2 - 1) * Math.exp(-t * 60) * 0.28;
      left[hatStart + s] += noise * 0.9;
      right[hatStart + s] += noise * 1.1; // slight stereo width
    }

    // 3. Clap/Snare on beats 2 and 4
    if (beatInBar === 2 || beatInBar === 4) {
      const clapSamples = Math.floor(0.14 * sampleRate);
      for (let s = 0; s < clapSamples && startSample + s < totalSamples; s++) {
        const t = s / sampleRate;
        const noise = (Math.random() * 2 - 1) * Math.exp(-t * 22) * 0.35;
        left[startSample + s] += noise;
        right[startSample + s] += noise;
      }
    }

    // 4. Bassline: 16th-note sub bass groove
    const bassNote = bassFreqs[Math.floor(beat / 2) % bassFreqs.length];
    for (let sub = 1; sub < 4; sub++) {
      const subTime = (beat + sub * 0.25) * beatInterval;
      const subStart = Math.floor(subTime * sampleRate);
      const subSamples = Math.floor(0.18 * sampleRate);
      for (let s = 0; s < subSamples && subStart + s < totalSamples; s++) {
        const t = s / sampleRate;
        const env = Math.sin((s / subSamples) * Math.PI) * 0.4;
        const subVal = (Math.sin(2 * Math.PI * bassNote * t) + 0.25 * Math.sin(4 * Math.PI * bassNote * t)) * env;
        left[subStart + s] += subVal;
        right[subStart + s] += subVal;
      }
    }

    // 5. Synth Stabs / Chords on bars 1, 3, 5, 7
    if (beat % 2 === 0) {
      const stabFreq = isTechno ? 261.63 : 349.23; // C4 or F4
      const stabSamples = Math.floor(0.15 * sampleRate);
      for (let s = 0; s < stabSamples && startSample + s < totalSamples; s++) {
        const t = s / sampleRate;
        const env = Math.exp(-t * 18) * 0.22;
        const synthL = Math.sin(2 * Math.PI * stabFreq * t) * env;
        const synthR = Math.sin(2 * Math.PI * (stabFreq * 1.5) * t) * env;
        left[startSample + s] += synthL;
        right[startSample + s] += synthR;
      }
    }
  }

  // Soft master clip / limit to avoid digital clipping
  for (let i = 0; i < totalSamples; i++) {
    left[i] = Math.tanh(left[i] * 1.1);
    right[i] = Math.tanh(right[i] * 1.1);
  }

  const peaks = extractWaveformPeaks(audioBuffer, 1600);

  return { audioBuffer, peaks, duration };
}

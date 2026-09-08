import fs from 'fs';
import path from 'path';

// 4-Bar 128.0 BPM Universal Superb Beat WAV Generator
const sampleRate = 44100;
const bpm = 128.0;
const bars = 4;
const beatsPerBar = 4;
const totalBeats = bars * beatsPerBar; // 16 beats
const beatDuration = 60.0 / bpm; // 0.46875 sec per beat
const totalDuration = totalBeats * beatDuration; // 7.500 sec
const totalSamples = Math.floor(totalDuration * sampleRate);

const left = new Float32Array(totalSamples);
const right = new Float32Array(totalSamples);

// Pseudo-random helper for noise
let seed = 42;
function random() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}

// 1. KICK & 808 SUB-BASS (Solid 4-on-the-floor punches + syncopated sub accents)
for (let bar = 0; bar < bars; bar++) {
  // Solid kicks on every quarter beat (0, 1, 2, 3) to lock with any song tempo
  const mainKicks = [0, 1.0, 2.0, 3.0];
  for (const kb of mainKicks) {
    const startSec = (bar * beatsPerBar + kb) * beatDuration;
    const startSample = Math.floor(startSec * sampleRate);
    const kickSamples = Math.floor(0.24 * sampleRate);

    for (let i = 0; i < kickSamples && startSample + i < totalSamples; i++) {
      const t = i / sampleRate;
      // High-impact punch: 165 Hz diving rapidly to 48 Hz
      const freq = 165 * Math.exp(-t * 42) + 48;
      const phase = 2 * Math.PI * freq * t;
      const env = Math.exp(-t * 14);
      const raw = Math.sin(phase) * env * 0.85;
      const val = Math.tanh(raw * 1.3) * 0.8;

      left[startSample + i] += val;
      right[startSample + i] += val;
    }
  }

  // Syncopated 808 sub slides on 1.75 and 2.5
  const subHits = [1.75, 2.5];
  for (const sb of subHits) {
    const startSec = (bar * beatsPerBar + sb) * beatDuration;
    const startSample = Math.floor(startSec * sampleRate);
    const subSamples = Math.floor(0.20 * sampleRate);

    for (let i = 0; i < subSamples && startSample + i < totalSamples; i++) {
      const t = i / sampleRate;
      const freq = 120 * Math.exp(-t * 25) + 42;
      const env = Math.exp(-t * 10);
      const val = Math.tanh(Math.sin(2 * Math.PI * freq * t) * env * 0.7) * 0.65;

      left[startSample + i] += val;
      right[startSample + i] += val;
    }
  }
}

// 2. SYNCOPATED RIMSHOT & CLAP (Crisp backbeat on 1 & 3 + syncopated accents on 0.75, 1.75, 2.75)
for (let bar = 0; bar < bars; bar++) {
  // Backbeat claps on beats 2 & 4 (indexed as 1.0 and 3.0)
  const backbeats = [1.0, 3.0];
  for (const bb of backbeats) {
    const startSec = (bar * beatsPerBar + bb) * beatDuration;
    const startSample = Math.floor(startSec * sampleRate);
    const clapSamples = Math.floor(0.12 * sampleRate);

    for (let i = 0; i < clapSamples && startSample + i < totalSamples; i++) {
      const t = i / sampleRate;
      const noise = (random() * 2 - 1) * Math.exp(-t * 32);
      const tone = Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t * 50) * 0.4;
      const val = (noise * 0.7 + tone) * 0.7;

      left[startSample + i] += val;
      right[startSample + i] += val;
    }
  }

  // Wooden syncopated rimshots
  const rimHits = [0.75, 1.75, 2.5, 3.5];
  for (const rb of rimHits) {
    const startSec = (bar * beatsPerBar + rb) * beatDuration;
    const startSample = Math.floor(startSec * sampleRate);
    const rimSamples = Math.floor(0.08 * sampleRate);

    for (let i = 0; i < rimSamples && startSample + i < totalSamples; i++) {
      const t = i / sampleRate;
      const tonal = (Math.sin(2 * Math.PI * 960 * t) * 0.6 + Math.sin(2 * Math.PI * 1920 * t) * 0.4) * Math.exp(-t * 80);
      const noise = (random() * 2 - 1) * Math.exp(-t * 60);
      const val = (tonal * 0.75 + noise * 0.45) * 0.65;

      left[startSample + i] += val * 0.9;
      right[startSample + i] += val * 1.1; // stereo spice
    }
  }
}

// 3. 16TH ORGANIC SHAKER (Stereo swung continuous groove)
const sixteenths = totalBeats * 4; // 64 16th notes
for (let s = 0; s < sixteenths; s++) {
  const isDownbeat = s % 4 === 0;
  const isOffbeat = s % 4 === 2;
  const startSec = s * (beatDuration / 4);
  const startSample = Math.floor(startSec * sampleRate);
  const shakerLen = Math.floor(0.05 * sampleRate);

  const amp = isDownbeat ? 0.35 : isOffbeat ? 0.28 : 0.18;

  for (let i = 0; i < shakerLen && startSample + i < totalSamples; i++) {
    const t = i / sampleRate;
    const noise = (random() * 2 - 1);
    const env = Math.exp(-t * 90);
    const tone = Math.sin(2 * Math.PI * 5800 * t) * 0.25;
    const val = (noise * 0.75 + tone) * env * amp;

    const pan = 0.4 + 0.2 * Math.sin(s * 0.6);
    left[startSample + i] += val * (1 - pan);
    right[startSample + i] += val * pan;
  }
}

// 4. MASTERING: Soft clipping & Peak Limiter (-0.5 dB ceiling)
let maxPeak = 0;
for (let i = 0; i < totalSamples; i++) {
  maxPeak = Math.max(maxPeak, Math.abs(left[i]), Math.abs(right[i]));
}

const targetPeak = 0.94; // -0.5 dB
const normFactor = maxPeak > 0 ? targetPeak / maxPeak : 1;

for (let i = 0; i < totalSamples; i++) {
  left[i] = Math.tanh(left[i] * normFactor);
  right[i] = Math.tanh(right[i] * normFactor);
}

// Encode to 16-bit PCM WAV
const numChannels = 2;
const bitsPerSample = 16;
const bytesPerSample = bitsPerSample / 8;
const blockAlign = numChannels * bytesPerSample;
const byteRate = sampleRate * blockAlign;
const dataSize = totalSamples * blockAlign;
const buffer = Buffer.alloc(44 + dataSize);

// RIFF chunk
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write('WAVE', 8);

// fmt chunk
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(numChannels, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(byteRate, 28);
buffer.writeUInt16LE(blockAlign, 32);
buffer.writeUInt16LE(bitsPerSample, 34);

// data chunk
buffer.write('data', 36);
buffer.writeUInt32LE(dataSize, 40);

let offset = 44;
for (let i = 0; i < totalSamples; i++) {
  const sL = Math.max(-1, Math.min(1, left[i]));
  const sR = Math.max(-1, Math.min(1, right[i]));
  const intL = sL < 0 ? sL * 0x8000 : sL * 0x7fff;
  const intR = sR < 0 ? sR * 0x8000 : sR * 0x7fff;
  buffer.writeInt16LE(Math.floor(intL), offset);
  buffer.writeInt16LE(Math.floor(intR), offset + 2);
  offset += 4;
}

const outPath = path.resolve(process.cwd(), 'public/superb_beat.wav');
fs.writeFileSync(outPath, buffer);
console.log(`Generated Superb Beat WAV: ${outPath} (${(totalDuration).toFixed(2)}s, ${totalSamples} samples)`);

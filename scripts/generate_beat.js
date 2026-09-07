import fs from 'fs';
import path from 'path';

// 4-Bar 100 BPM Superb Beat WAV Generator
const sampleRate = 44100;
const bpm = 100.0;
const bars = 4;
const beatsPerBar = 4;
const totalBeats = bars * beatsPerBar; // 16 beats
const beatDuration = 60.0 / bpm; // 0.600 sec per beat
const totalDuration = totalBeats * beatDuration; // 9.600 sec
const totalSamples = Math.floor(totalDuration * sampleRate);

const left = new Float32Array(totalSamples);
const right = new Float32Array(totalSamples);

// Pseudo-random helper for white noise
let seed = 42;
function random() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}

// 1. KICK & 808 SUB-BASS (Syncopated Afro-Dembow pattern: 0, 1.75, 2.5, 3.25 per bar)
for (let bar = 0; bar < bars; bar++) {
  const kickBeats = [0, 1.75, 2.5, 3.25];
  for (const kb of kickBeats) {
    const startSec = (bar * beatsPerBar + kb) * beatDuration;
    const startSample = Math.floor(startSec * sampleRate);
    const kickSamples = Math.floor(0.35 * sampleRate);

    for (let i = 0; i < kickSamples && startSample + i < totalSamples; i++) {
      const t = i / sampleRate;
      // Pitch drop: starts high (160 Hz) and dives to 46 Hz (F# sub)
      const freq = 160 * Math.exp(-t * 30) + 46;
      const phase = 2 * Math.PI * freq * t;
      // Amplitude envelope: punchy initial hit + smooth sub tail
      const env = Math.exp(-t * 9);
      // Soft saturation
      const raw = Math.sin(phase) * env * 0.9;
      const val = Math.tanh(raw * 1.2) * 0.85;

      left[startSample + i] += val;
      right[startSample + i] += val;
    }
  }
}

// 2. SYNCOPATED RIMSHOT & CLAP (Crisp, snappy Afro-Dembow accents at 0.75, 1.75, 2.75, 3.5)
for (let bar = 0; bar < bars; bar++) {
  const rimBeats = [0.75, 1.75, 2.5, 3.5];
  for (let rIdx = 0; rIdx < rimBeats.length; rIdx++) {
    const rb = rimBeats[rIdx];
    const startSec = (bar * beatsPerBar + rb) * beatDuration;
    const startSample = Math.floor(startSec * sampleRate);
    const rimSamples = Math.floor(0.12 * sampleRate);

    for (let i = 0; i < rimSamples && startSample + i < totalSamples; i++) {
      const t = i / sampleRate;
      // Wooden rim tonal body (880 Hz + 1760 Hz harmonic)
      const tonal = (Math.sin(2 * Math.PI * 880 * t) * 0.6 + Math.sin(2 * Math.PI * 1760 * t) * 0.4) * Math.exp(-t * 70);
      // Crisp noise burst
      const noise = (random() * 2 - 1) * Math.exp(-t * 45);
      const val = (tonal * 0.7 + noise * 0.5) * 0.75;

      left[startSample + i] += val * 0.95;
      right[startSample + i] += val * 1.05; // Subtle stereo spread
    }
  }
}

// 3. 16TH ORGANIC SHAKER (Stereo swung continuous groove)
const sixteenths = totalBeats * 4; // 64 16th notes
for (let s = 0; s < sixteenths; s++) {
  const isDownbeat = s % 4 === 0;
  const isOffbeat = s % 4 === 2;
  const swingOffset = (s % 2 === 1) ? 0.015 : 0; // Swing feel
  const startSec = (s * (beatDuration / 4)) + swingOffset;
  const startSample = Math.floor(startSec * sampleRate);
  const shakerLen = Math.floor(0.06 * sampleRate);

  const amp = isDownbeat ? 0.4 : isOffbeat ? 0.32 : 0.22;

  for (let i = 0; i < shakerLen && startSample + i < totalSamples; i++) {
    const t = i / sampleRate;
    // High-pass filtered noise
    const noise = (random() * 2 - 1);
    const env = Math.exp(-t * 80);
    const tone = Math.sin(2 * Math.PI * 5200 * t) * 0.3;
    const val = (noise * 0.7 + tone) * env * amp;

    // Stereo panning movement
    const pan = 0.4 + 0.2 * Math.sin(s * 0.5);
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
buffer.writeUInt32LE(16, 16); // subchunk1size (16 for PCM)
buffer.writeUInt16LE(1, 20); // audio format (1 = PCM)
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

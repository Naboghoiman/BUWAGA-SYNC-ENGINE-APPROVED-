export interface TrackInfo {
  name: string;
  artist?: string;
  duration: number; // in seconds
  audioBuffer: AudioBuffer | null;
  peaks: Float32Array; // normalized waveform peaks
  detectedBpm: number;
  gridOffset: number; // offset of first downbeat in seconds
  fileType?: string;
  isDemo?: boolean;
}

export interface BeatGridState {
  bpm: number;
  interval: number; // 60.0 / bpm
  duration: number;
}

export interface DeckState {
  id: 'master' | 'slave';
  name: string;
  bpm: number; // Base track BPM
  currentBpm: number; // Calculated effective BPM = bpm * playbackRate
  position: number; // in seconds
  playbackRate: number; // 1.0 = 100%
  playing: boolean;
  cuePosition: number;
  nearestBeat: number;
  phaseInBeat: number; // 0.0 to 1.0 (phase percentage within current beat)
  beatNumber: number; // 1, 2, 3, 4
  barNumber: number;
  volume: number; // 0.0 to 1.0
  muted: boolean;
  gain: number; // dB, default 0
  high: number; // dB, default 0
  mid: number; // dB, default 0
  low: number; // dB, default 0
  filter: number; // -1 (LPF) to 0 (OPEN) to +1 (HPF)
  cue: boolean; // PFL headphone cue
  loopActive: boolean;
  loopSize: number; // in beats: 0.125, 0.25, 0.5, 1, 2, 4, 8
  loopStart: number;
  loopEnd: number;
  pitchRange: 0.08 | 0.10 | 0.50; // ±8%, ±10%, ±50%
  keyLock: boolean;
  keyTranspose: number; // semitones (-12 to +12)
}

export interface PidTelemetry {
  timestamp: number;
  error: number; // masterBeat - slaveBeat in seconds
  integral: number;
  derivative: number;
  proportionalTerm: number;
  integralTerm: number;
  derivativeTerm: number;
  totalCorrection: number;
  playbackRate: number;
  phaseErrorMs: number;
}

export interface PidCoefficients {
  kp: number;
  ki: number;
  kd: number;
}

export interface SyncEngineStatus {
  syncActive: boolean; // Continuous PID sync engaged
  masterId: 'master' | 'slave';
  phaseErrorSec: number;
  phaseErrorMs: number;
  isPhaseLocked: boolean; // within tolerance (e.g. < 5ms)
  driftRatePerSec: number; // simulated clock drift in %
  correctionCount: number;
  lastSyncTimestamp: number | null;
}

export interface LogEntry {
  id: string;
  time: string;
  type: 'info' | 'sync' | 'correction' | 'drift';
  message: string;
}

export type MainNavTab = 'decks' | 'fullMixer' | 'masterOutput' | 'samples' | 'settings';
export type DjViewTab = 'decks' | 'mixer' | 'master' | 'sampler' | 'settings';
export type MasterOutputSubTab = 'output' | 'effects' | 'dynamics' | '31bandEq';

export interface SamplerPad {
  id: number;
  name: string;
  category: 'drum' | 'fx' | 'custom';
  audioBuffer?: AudioBuffer | null;
  isCustom?: boolean;
}

export interface LooperTrack {
  id: number;
  name: string;
  originalBpm: number;
  bars: number;
  audioBuffer?: AudioBuffer | null;
  peaks?: Float32Array;
  isPlaying: boolean;
  isMuted: boolean;
  isSolo: boolean;
  volume: number;
  isCustom?: boolean;
}

export interface LooperGlobalParams {
  volume: number; // 0 to 1
  bass: number; // -12dB to +12dB
  key: number; // semitones -12 to +12
  keyLock: boolean;
  syncToMaster: boolean;
  tempoMultiplier?: number; // 0.5 (half-time), 1.0 (normal), 2.0 (double-time)
  bassCut?: boolean;
}

export interface ReverbParams {
  enabled: boolean;
  preset: string;
  type: 'HALL' | 'ROOM' | 'PLATE' | 'AMBIENCE';
  predelay: number; // ms
  early: number; // %
  decay: number; // sec
  space: number; // %
  damping: number; // %
  chSend: number; // %
}

export interface DelayParams {
  enabled: boolean;
  mode: 'STEREO' | 'PING-PONG' | 'MONO' | 'DUAL' | 'TAPE';
  timeDivision: string; // "1/2", "3/4", "1/4", "1/8"
  feedback: number; // %
  loCut: number; // Hz
  hiCut: number; // kHz
  width: number; // %
  chSend: number; // %
}

export interface CompressorParams {
  enabled: boolean;
  preset: string;
  threshold: number; // dB
  ratio: number; // e.g. 2.0
  attack: number; // ms
  release: number; // ms
  makeup: number; // dB
}

export interface LimiterParams {
  enabled: boolean;
  ceiling: number; // dBFS, e.g. -1.0
  release: number; // ms, e.g. 160
}

export interface MasterOutputParams {
  inputTrim: number; // dB
  masterFilter: number; // -1 to +1 (0 = OPEN)
  masterLevel: number; // 0 to 100%
  balance: number; // -1 (L) to +1 (R), 0 = CENTER
  denoiseBypass: boolean;
  denoiseThreshold: number;
}

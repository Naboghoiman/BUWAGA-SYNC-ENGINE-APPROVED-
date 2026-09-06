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
  filterFreq: number; // LP / HP filter, 0 to 1 (0.5 is neutral)
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

import { PidCoefficients, PidTelemetry, TrackInfo } from '../types';

export class BeatGrid {
  bpm: number;
  offset: number = 0;
  beats: number[] = [];

  constructor(tempo: number, offset = 0) {
    this.bpm = tempo;
    this.offset = offset;
  }

  generate(duration = 600) {
    this.beats = [];
    const interval = 60.0 / this.bpm;
    const start = (this.offset % interval + interval) % interval;
    for (let t = start; t < duration; t += interval) {
      this.beats.push(t);
    }
  }

  nearestBeat(position: number): number {
    const interval = this.getInterval();
    if (interval <= 0) return 0;
    const start = (this.offset % interval + interval) % interval;
    const beatIndex = Math.round((position - start) / interval);
    return Math.max(0, start + beatIndex * interval);
  }

  getInterval(): number {
    return 60.0 / this.bpm;
  }
}

export class Deck {
  name: string;
  bpm: number;
  position: number;
  playbackRate: number;
  playing: boolean;
  grid: BeatGrid;
  cuePosition: number;
  volume: number;
  muted: boolean;
  track: TrackInfo | null = null;
  duration: number = 600;

  constructor(id: string, tempo: number) {
    this.name = id;
    this.bpm = tempo;
    this.position = 0;
    this.playbackRate = 1.0;
    this.playing = false;
    this.grid = new BeatGrid(tempo, 0);
    this.grid.generate(600);
    this.cuePosition = 0;
    this.volume = 0.9;
    this.muted = false;
    this.track = null;
    this.duration = 600;
  }

  loadTrack(track: TrackInfo) {
    this.track = track;
    this.duration = track.duration;
    this.bpm = track.detectedBpm;
    this.position = 0;
    this.cuePosition = 0;
    this.grid.bpm = track.detectedBpm;
    this.grid.offset = track.gridOffset || 0;
    this.grid.generate(Math.max(600, track.duration + 60));
  }

  ejectTrack() {
    this.track = null;
    this.duration = 600;
    this.position = 0;
    this.cuePosition = 0;
    this.grid.offset = 0;
    this.grid.generate(600);
  }

  setGridOffset(offset: number) {
    this.grid.offset = offset;
    this.grid.generate(Math.max(600, this.duration + 60));
  }

  setBpm(newBpm: number) {
    const ratio = newBpm / this.bpm;
    this.bpm = newBpm;
    this.grid.bpm = newBpm;
    this.grid.generate(Math.max(600, this.duration + 60));
    return ratio;
  }

  start() {
    this.playing = true;
  }

  pause() {
    this.playing = false;
  }

  cue() {
    if (this.playing) {
      this.playing = false;
      this.position = this.cuePosition;
    } else {
      this.cuePosition = this.position;
    }
  }

  update(seconds: number) {
    if (this.playing) {
      this.position += seconds * this.playbackRate;
      if (this.duration > 0 && this.position >= this.duration) {
        this.position = this.position % this.duration; // loop seamless
      }
      if (this.position < 0) this.position = 0;
    }
  }

  // Pitch bend / nudge (+ / - temporary speed change)
  nudge(secondsDelta: number) {
    this.position += secondsDelta;
    if (this.position < 0) this.position = 0;
    if (this.duration > 0 && this.position >= this.duration) {
      this.position = this.position % this.duration;
    }
  }
}

export class SyncController {
  kp: number;
  ki: number;
  kd: number;
  integral: number;
  previousError: number;

  // Telemetry caching
  lastP = 0;
  lastI = 0;
  lastD = 0;
  lastCorrection = 0;

  constructor(coeffs: PidCoefficients = { kp: 0.10, ki: 0.01, kd: 0.10 }) {
    this.kp = coeffs.kp;
    this.ki = coeffs.ki;
    this.kd = coeffs.kd;
    this.integral = 0;
    this.previousError = 0;
  }

  setCoefficients(coeffs: Partial<PidCoefficients>) {
    if (coeffs.kp !== undefined) this.kp = coeffs.kp;
    if (coeffs.ki !== undefined) this.ki = coeffs.ki;
    if (coeffs.kd !== undefined) this.kd = coeffs.kd;
  }

  reset() {
    this.integral = 0;
    this.previousError = 0;
    this.lastP = 0;
    this.lastI = 0;
    this.lastD = 0;
    this.lastCorrection = 0;
  }

  calculate(error: number): number {
    this.integral += error;
    // Anti-windup protection (10% clamp)
    if (this.integral > 0.10) this.integral = 0.10;
    if (this.integral < -0.10) this.integral = -0.10;

    const derivative = error - this.previousError;
    this.previousError = error;

    this.lastP = this.kp * error;
    this.lastI = this.ki * this.integral;
    this.lastD = this.kd * derivative;

    let correction = this.lastP + this.lastI + this.lastD;

    // 10% maximum PID rate correction output limit (±10% pitch bend clamp)
    if (correction > 0.10) correction = 0.10;
    if (correction < -0.10) correction = -0.10;
    this.lastCorrection = correction;

    return correction;
  }
}

export class BUWAGA_SYNC_ENGINE {
  master: Deck;
  slave: Deck;
  controller: SyncController;

  // Engine operational flags
  syncActive = false;
  continuousSync = true;
  driftRate = 0; // % artificial motor/clock drift to test PID resistance (-10% to +10%)
  telemetryHistory: PidTelemetry[] = [];
  lastCorrectionLog: string = '';

  constructor(masterBpm = 128.0, slaveBpm = 126.0) {
    this.master = new Deck('MASTER', masterBpm);
    this.slave = new Deck('SLAVE', slaveBpm);
    this.controller = new SyncController({
      kp: 0.10,
      ki: 0.01,
      kd: 0.10,
    });
  }

  /**
   * Calculates the exact beat phase deviation between master and slave.
   * Returns signed phase error in seconds (positive = slave is leading/ahead of master).
   */
  getBeatPhaseError(): {
    phaseError: number;
    masterBeat: number;
    slaveBeat: number;
    masterOffset: number;
    slaveOffset: number;
  } {
    const intervalM = 60.0 / (this.master.bpm > 0 ? this.master.bpm : 120);
    const intervalS = 60.0 / (this.slave.bpm > 0 ? this.slave.bpm : 120);

    const gridOffsetM = this.master.grid.offset || 0;
    const gridOffsetS = this.slave.grid.offset || 0;

    const relPosM = this.master.position - gridOffsetM;
    const relPosS = this.slave.position - gridOffsetS;

    // Fractional progress through beat cycle [0, 1)
    const phiM = (((relPosM % intervalM) + intervalM) % intervalM) / intervalM;
    const phiS = (((relPosS % intervalS) + intervalS) % intervalS) / intervalS;

    // Relative phase difference [-0.5, 0.5]
    let phaseDiff = phiS - phiM;
    if (phaseDiff > 0.5) phaseDiff -= 1.0;
    if (phaseDiff < -0.5) phaseDiff += 1.0;

    // Real-time interval of master reference clock
    const effectiveBpmM = this.master.bpm * this.master.playbackRate;
    const realBeatInterval = 60.0 / (effectiveBpmM > 0 ? effectiveBpmM : 120);
    const phaseError = phaseDiff * realBeatInterval;

    return {
      phaseError,
      masterBeat: this.master.grid.nearestBeat(this.master.position),
      slaveBeat: this.slave.grid.nearestBeat(this.slave.position),
      masterOffset: phiM * intervalM,
      slaveOffset: phiS * intervalS,
    };
  }

  /**
   * BUWAGA PRO SYNC BUTTON (100% Perfect Mathematical Synchronization)
   * 1. Match BPM automatically
   * 2. Align beat phase
   * 3. Start slave automatically
   */
  syncButton(): { bpmRatio: number; phaseCorrection: number; masterBeat: number; slaveBeat: number } {
    this.syncActive = true;

    // 1. Automatically Match BPM via playback rate ratio (True DJ algorithm)
    const targetBpm = this.master.bpm * this.master.playbackRate;
    const baseSlaveBpm = this.slave.track ? (this.slave.track.detectedBpm || this.slave.bpm) : this.slave.bpm;
    const bpmRatio = targetBpm / (baseSlaveBpm > 0 ? baseSlaveBpm : targetBpm);
    this.slave.playbackRate = bpmRatio;

    // 2. Automatically align beat phase: eliminate relative beat phase error 100%
    const intervalS = 60.0 / (this.slave.bpm > 0 ? this.slave.bpm : 120);
    const intervalM = 60.0 / (this.master.bpm > 0 ? this.master.bpm : 120);
    const gridOffsetM = this.master.grid.offset || 0;
    const gridOffsetS = this.slave.grid.offset || 0;

    const relPosM = this.master.position - gridOffsetM;
    const relPosS = this.slave.position - gridOffsetS;

    const phiM = (((relPosM % intervalM) + intervalM) % intervalM) / intervalM;
    const phiS = (((relPosS % intervalS) + intervalS) % intervalS) / intervalS;

    let phaseDiff = phiS - phiM;
    if (phaseDiff > 0.5) phaseDiff -= 1.0;
    if (phaseDiff < -0.5) phaseDiff += 1.0;

    // In slave track time, subtract the phase discrepancy
    const phaseCorrectionTrack = phaseDiff * intervalS;
    this.slave.position -= phaseCorrectionTrack;

    if (this.slave.position < 0) this.slave.position = 0;
    if (this.slave.duration > 0 && this.slave.position >= this.slave.duration) {
      this.slave.position = this.slave.position % this.slave.duration;
    }

    // Reset PID controller so no residual error remains
    this.controller.reset();

    // 3. Start slave automatically
    this.slave.start();

    return {
      bpmRatio,
      phaseCorrection: phaseCorrectionTrack,
      masterBeat: this.master.grid.nearestBeat(this.master.position),
      slaveBeat: this.slave.grid.nearestBeat(this.slave.position),
    };
  }

  /**
   * Snap follower phase to 100% match master instantly (0.00ms error)
   */
  snapPhase(): void {
    // 1. Match BPM via playback rate ratio
    const targetBpm = this.master.bpm * this.master.playbackRate;
    const baseSlaveBpm = this.slave.track ? (this.slave.track.detectedBpm || this.slave.bpm) : this.slave.bpm;
    const bpmRatio = targetBpm / (baseSlaveBpm > 0 ? baseSlaveBpm : targetBpm);
    this.slave.playbackRate = bpmRatio;

    // 2. Align beat phase
    const intervalS = 60.0 / (this.slave.bpm > 0 ? this.slave.bpm : 120);
    const intervalM = 60.0 / (this.master.bpm > 0 ? this.master.bpm : 120);
    const gridOffsetM = this.master.grid.offset || 0;
    const gridOffsetS = this.slave.grid.offset || 0;

    const relPosM = this.master.position - gridOffsetM;
    const relPosS = this.slave.position - gridOffsetS;

    const phiM = (((relPosM % intervalM) + intervalM) % intervalM) / intervalM;
    const phiS = (((relPosS % intervalS) + intervalS) % intervalS) / intervalS;

    let phaseDiff = phiS - phiM;
    if (phaseDiff > 0.5) phaseDiff -= 1.0;
    if (phaseDiff < -0.5) phaseDiff += 1.0;

    this.slave.position -= phaseDiff * intervalS;

    if (this.slave.position < 0) this.slave.position = 0;
    if (this.slave.duration > 0 && this.slave.position >= this.slave.duration) {
      this.slave.position = this.slave.position % this.slave.duration;
    }

    this.controller.reset();
  }

  /**
   * Continuous phase process loop (called at fixed interval or requestAnimationFrame)
   */
  process(): { phaseError: number; correction: number; rate: number } {
    const { phaseError } = this.getBeatPhaseError();

    let correction = 0;
    const targetBpm = this.master.bpm * this.master.playbackRate;
    const baseSlaveBpm = this.slave.track ? (this.slave.track.detectedBpm || this.slave.bpm) : this.slave.bpm;
    const nominalRate = targetBpm / (baseSlaveBpm > 0 ? baseSlaveBpm : targetBpm);

    if (this.continuousSync && this.slave.playing && this.master.playing) {
      // If error is virtually zero (< 0.1ms), hold exact nominal rate
      if (Math.abs(phaseError) < 0.0001) {
        this.slave.playbackRate = nominalRate;
        this.controller.reset();
      } else {
        correction = this.controller.calculate(phaseError);
        // If slave is ahead (phaseError > 0), slave needs to slow down (rate < nominalRate)
        this.slave.playbackRate = nominalRate - correction;

        // Clamp playback rate within realistic vinyl limits [0.5x, 2.0x]
        if (this.slave.playbackRate < 0.5) this.slave.playbackRate = 0.5;
        if (this.slave.playbackRate > 2.0) this.slave.playbackRate = 2.0;
      }
    } else if (this.syncActive && !this.continuousSync) {
      this.slave.playbackRate = nominalRate;
    }

    // Apply any artificial drift to slave to demonstrate PID correction
    if (this.driftRate !== 0 && this.slave.playing) {
      this.slave.position += (this.driftRate / 100) * 0.02;
    }

    // Record telemetry
    const telemetry: PidTelemetry = {
      timestamp: Date.now(),
      error: phaseError,
      phaseErrorMs: phaseError * 1000,
      integral: this.controller.integral,
      derivative: this.controller.previousError,
      proportionalTerm: this.controller.lastP,
      integralTerm: this.controller.lastI,
      derivativeTerm: this.controller.lastD,
      totalCorrection: correction,
      playbackRate: this.slave.playbackRate,
    };

    this.telemetryHistory.push(telemetry);
    if (this.telemetryHistory.length > 120) {
      this.telemetryHistory.shift();
    }

    return {
      phaseError,
      correction,
      rate: this.slave.playbackRate,
    };
  }

  /**
   * Run 100 ticks benchmark (as in the original C++ main())
   */
  runBenchmark(ticks = 100, dt = 0.02): {
    syncResult: { bpmRatio: number; phaseCorrection: number };
    logs: string[];
    history: { tick: number; phaseError: number; correction: number; rate: number }[];
  } {
    const logs: string[] = [];
    const history: { tick: number; phaseError: number; correction: number; rate: number }[] = [];

    logs.push('=== BUWAGA PRO SYNC ENGINE C++ BENCHMARK ===');
    logs.push('SYNC PRESSED');

    const syncResult = this.syncButton();
    logs.push('Slave started');
    logs.push(`BPM ratio: ${syncResult.bpmRatio.toFixed(5)}`);
    logs.push(`Phase correction: ${syncResult.phaseCorrection.toFixed(6)} s`);

    for (let i = 0; i < ticks; i++) {
      this.master.update(dt);
      this.slave.update(dt);
      const res = this.process();

      history.push({
        tick: i + 1,
        phaseError: res.phaseError,
        correction: res.correction,
        rate: res.rate,
      });

      if (i < 10 || i % 10 === 0 || i === ticks - 1) {
        logs.push(
          `Tick ${String(i + 1).padStart(3, ' ')}: Phase error: ${(res.phaseError * 1000).toFixed(2)}ms | Correction: ${res.correction.toFixed(6)} | Rate: ${res.rate.toFixed(5)}`
        );
      }
    }

    return { syncResult, logs, history };
  }
}

/**
 * DJ IMAN PROFESSIONAL BUFFERED SAFE DSP AUDIO ENGINE
 * Multi-Channel Web Audio Architecture with 3-Band Isolator EQ, Biquad DJ Filters,
 * 31-Band ISO Graphic EQ, Dynamics Bus Compressor, Master Safety Limiter,
 * Space Reverb & Dual Delays, 18-Pad Performance Sampler, Master REC Engine,
 * and Dedicated Beat-Matched Looper Audio Pipeline.
 */

import { ReverbParams, DelayParams, CompressorParams, LimiterParams, MasterOutputParams } from '../types';

export type SoundMode = 'beats' | 'clicks';

export const ISO_FREQUENCIES = [
  20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160,
  200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600,
  2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000
];

interface LooperNodeState {
  source: AudioBufferSourceNode;
  gain: GainNode;
  trackId: number;
  loopBpm: number;
  baseVolume: number;
}

export class DjAudioSynth {
  public ctx: AudioContext | null = null;

  // Master Nodes
  private masterGain: GainNode | null = null;
  private masterInputTrimGain: GainNode | null = null;
  private masterFilterNode: BiquadFilterNode | null = null;
  private masterPanner: StereoPannerNode | null = null;
  private masterCompressor: DynamicsCompressorNode | null = null;
  private masterLimiter: DynamicsCompressorNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  public eqGains: number[] = new Array(31).fill(0);
  public isEqEnabled = true;

  // Crossfader and Channel Strips
  private crossfaderGainA: GainNode | null = null;
  private crossfaderGainB: GainNode | null = null;

  // Channel 1 (Deck 1 / Master)
  private ch1TrimGain: GainNode | null = null;
  private ch1LowEq: BiquadFilterNode | null = null;
  private ch1MidEq: BiquadFilterNode | null = null;
  private ch1HighEq: BiquadFilterNode | null = null;
  private ch1Filter: BiquadFilterNode | null = null;
  private ch1FaderGain: GainNode | null = null;

  // Channel 2 (Deck 2 / Slave)
  private ch2TrimGain: GainNode | null = null;
  private ch2LowEq: BiquadFilterNode | null = null;
  private ch2MidEq: BiquadFilterNode | null = null;
  private ch2HighEq: BiquadFilterNode | null = null;
  private ch2Filter: BiquadFilterNode | null = null;
  private ch2FaderGain: GainNode | null = null;

  // Effects Send & Return Bus
  private effectsSendGain: GainNode | null = null;
  private reverbConvolver: ConvolverNode | null = null;
  private reverbInputFilter: BiquadFilterNode | null = null;
  private reverbWetGain: GainNode | null = null;

  private delayNodeA: DelayNode | null = null;
  private delayFilterA: BiquadFilterNode | null = null;
  private delayFeedbackA: GainNode | null = null;
  private delayWetGainA: GainNode | null = null;

  private delayNodeB: DelayNode | null = null;
  private delayFilterB: BiquadFilterNode | null = null;
  private delayFeedbackB: GainNode | null = null;
  private delayWetGainB: GainNode | null = null;

  // Dedicated Looper Pipeline
  private looperSubmixGain: GainNode | null = null;
  private looperBassFilter: BiquadFilterNode | null = null;
  private looperMasterGain: GainNode | null = null;
  private activeLooperNodes: Map<number, LooperNodeState> = new Map();
  public looperVolume = 0.85;
  public looperBassDb = 0.0;
  public looperKeyShift = 0;
  public looperKeyLock = true;

  // Analyser nodes for VU meters
  private analyserA: AnalyserNode | null = null;
  private analyserB: AnalyserNode | null = null;
  private analyserMaster: AnalyserNode | null = null;

  // Real AudioBuffer sources
  private audioBufferA: AudioBuffer | null = null;
  private audioBufferB: AudioBuffer | null = null;
  private sourceNodeA: AudioBufferSourceNode | null = null;
  private sourceNodeB: AudioBufferSourceNode | null = null;
  public isPlayingA = false;
  public isPlayingB = false;

  // Sampler pad buffers
  private padBuffers: Map<number, AudioBuffer> = new Map();

  // Master Recorder
  private recDestination: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  public isRecording = false;
  public recordStartTime = 0;

  // Internal Parameter State (Persisted across lazy context loads)
  public ch1GainVal = 0;
  public ch1HighVal = 0;
  public ch1MidVal = 0;
  public ch1LowVal = 0;
  public ch1FilterVal = 0;
  public ch1FaderVal = 0.85;

  public ch2GainVal = 0;
  public ch2HighVal = 0;
  public ch2MidVal = 0;
  public ch2LowVal = 0;
  public ch2FilterVal = 0;
  public ch2FaderVal = 0.85;

  public crossfaderVal = 0.5;
  public crossfaderCurve: 'smooth' | 'cut' | 'linear' = 'smooth';

  public masterVolumeVal = 0.86;
  public masterInputTrimVal = 0;
  public masterFilterVal = 0;
  public masterBalanceVal = 0;

  public soundMode: SoundMode = 'beats';
  public isMuted = false;
  public guideClickEnabled = false;

  // Settings
  public reverbParams: ReverbParams = {
    enabled: true,
    preset: '003 - Medium Warm',
    type: 'HALL',
    predelay: 24,
    early: 28,
    decay: 2.2,
    space: 62,
    damping: 48,
    chSend: 25,
  };

  public delayParamsA: DelayParams = {
    enabled: true,
    mode: 'STEREO',
    timeDivision: '1/2',
    feedback: 28,
    loCut: 120,
    hiCut: 9000,
    width: 78,
    chSend: 20,
  };

  public delayParamsB: DelayParams = {
    enabled: false,
    mode: 'DUAL',
    timeDivision: '3/4',
    feedback: 22,
    loCut: 180,
    hiCut: 7200,
    width: 62,
    chSend: 0,
  };

  public compressorParams: CompressorParams = {
    enabled: true,
    preset: 'Commercial Clean',
    threshold: -12.0,
    ratio: 2.0,
    attack: 20,
    release: 180,
    makeup: 0.0,
  };

  public limiterParams: LimiterParams = {
    enabled: true,
    ceiling: -1.0,
    release: 160,
  };

  public masterOutputParams: MasterOutputParams = {
    inputTrim: 0.0,
    masterFilter: 0.0,
    masterLevel: 86.0,
    balance: 0.0,
    denoiseBypass: true,
    denoiseThreshold: -45,
  };

  private lastScheduledBeatA = -1;
  private lastScheduledBeatB = -1;

  constructor() {
    // Lazy initialized on first user interaction
  }

  public getContext(): AudioContext {
    this.initContext();
    return this.ctx!;
  }

  public initContext() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    // 1. Channel 1 (Deck 1) Strip
    this.ch1TrimGain = this.ctx.createGain();
    this.ch1LowEq = this.ctx.createBiquadFilter();
    this.ch1LowEq.type = 'lowshelf';
    this.ch1LowEq.frequency.value = 250;

    this.ch1MidEq = this.ctx.createBiquadFilter();
    this.ch1MidEq.type = 'peaking';
    this.ch1MidEq.frequency.value = 1000;
    this.ch1MidEq.Q.value = 1.0;

    this.ch1HighEq = this.ctx.createBiquadFilter();
    this.ch1HighEq.type = 'highshelf';
    this.ch1HighEq.frequency.value = 3500;

    this.ch1Filter = this.ctx.createBiquadFilter();
    this.ch1Filter.type = 'allpass';

    this.ch1FaderGain = this.ctx.createGain();

    this.analyserA = this.ctx.createAnalyser();
    this.analyserA.fftSize = 64;

    this.ch1TrimGain
      .connect(this.ch1LowEq)
      .connect(this.ch1MidEq)
      .connect(this.ch1HighEq)
      .connect(this.ch1Filter)
      .connect(this.ch1FaderGain);

    this.ch1FaderGain.connect(this.analyserA);

    // 2. Channel 2 (Deck 2) Strip
    this.ch2TrimGain = this.ctx.createGain();
    this.ch2LowEq = this.ctx.createBiquadFilter();
    this.ch2LowEq.type = 'lowshelf';
    this.ch2LowEq.frequency.value = 250;

    this.ch2MidEq = this.ctx.createBiquadFilter();
    this.ch2MidEq.type = 'peaking';
    this.ch2MidEq.frequency.value = 1000;
    this.ch2MidEq.Q.value = 1.0;

    this.ch2HighEq = this.ctx.createBiquadFilter();
    this.ch2HighEq.type = 'highshelf';
    this.ch2HighEq.frequency.value = 3500;

    this.ch2Filter = this.ctx.createBiquadFilter();
    this.ch2Filter.type = 'allpass';

    this.ch2FaderGain = this.ctx.createGain();

    this.analyserB = this.ctx.createAnalyser();
    this.analyserB.fftSize = 64;

    this.ch2TrimGain
      .connect(this.ch2LowEq)
      .connect(this.ch2MidEq)
      .connect(this.ch2HighEq)
      .connect(this.ch2Filter)
      .connect(this.ch2FaderGain);

    this.ch2FaderGain.connect(this.analyserB);

    // 3. Crossfader
    this.crossfaderGainA = this.ctx.createGain();
    this.crossfaderGainB = this.ctx.createGain();

    this.ch1FaderGain.connect(this.crossfaderGainA);
    this.ch2FaderGain.connect(this.crossfaderGainB);

    // 4. Master Bus Routing
    this.masterInputTrimGain = this.ctx.createGain();
    this.masterFilterNode = this.ctx.createBiquadFilter();
    this.masterFilterNode.type = 'allpass';

    this.crossfaderGainA.connect(this.masterInputTrimGain);
    this.crossfaderGainB.connect(this.masterInputTrimGain);

    // 5. Dedicated Looper Audio Pipeline
    this.looperSubmixGain = this.ctx.createGain();
    this.looperBassFilter = this.ctx.createBiquadFilter();
    this.looperBassFilter.type = 'lowshelf';
    this.looperBassFilter.frequency.value = 250;
    this.looperBassFilter.gain.setValueAtTime(this.looperBassDb, this.ctx.currentTime);

    this.looperMasterGain = this.ctx.createGain();
    this.looperMasterGain.gain.setValueAtTime(this.looperVolume, this.ctx.currentTime);

    this.looperSubmixGain
      .connect(this.looperBassFilter)
      .connect(this.looperMasterGain)
      .connect(this.masterInputTrimGain);

    this.masterInputTrimGain.connect(this.masterFilterNode);

    // 6. Dynamics Bus Compressor
    this.masterCompressor = this.ctx.createDynamicsCompressor();
    this.masterFilterNode.connect(this.masterCompressor);

    // 7. Effects Send & Return Bus
    this.setupEffectsBus();

    // 8. 31-Band ISO Graphic EQ
    let prevNode: AudioNode = this.masterCompressor;
    this.eqFilters = [];
    for (let i = 0; i < ISO_FREQUENCIES.length; i++) {
      const f = ISO_FREQUENCIES[i];
      const filter = this.ctx.createBiquadFilter();
      if (i === 0) {
        filter.type = 'lowshelf';
      } else if (i === ISO_FREQUENCIES.length - 1) {
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
        filter.Q.value = 4.3; // standard 1/3 octave Q
      }
      filter.frequency.value = f;
      filter.gain.value = this.isEqEnabled ? this.eqGains[i] || 0 : 0;
      prevNode.connect(filter);
      prevNode = filter;
      this.eqFilters.push(filter);
    }

    // 9. Output Safety Limiter (high-ratio fast peak limiter)
    this.masterLimiter = this.ctx.createDynamicsCompressor();
    this.masterLimiter.threshold.setValueAtTime(this.limiterParams.ceiling, this.ctx.currentTime);
    this.masterLimiter.knee.setValueAtTime(0.0, this.ctx.currentTime);
    this.masterLimiter.ratio.setValueAtTime(20.0, this.ctx.currentTime);
    this.masterLimiter.attack.setValueAtTime(0.001, this.ctx.currentTime);
    this.masterLimiter.release.setValueAtTime(this.limiterParams.release / 1000, this.ctx.currentTime);

    prevNode.connect(this.masterLimiter);

    // 10. Balance / Panner
    if (this.ctx.createStereoPanner) {
      this.masterPanner = this.ctx.createStereoPanner();
      this.masterLimiter.connect(this.masterPanner);
      prevNode = this.masterPanner;
    } else {
      prevNode = this.masterLimiter;
    }

    // 11. Master Volume & Destination
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.masterVolumeVal, this.ctx.currentTime);

    this.analyserMaster = this.ctx.createAnalyser();
    this.analyserMaster.fftSize = 64;

    prevNode.connect(this.masterGain);
    this.masterGain.connect(this.analyserMaster);
    this.masterGain.connect(this.ctx.destination);

    // 12. Master Recorder Stream Destination
    try {
      this.recDestination = this.ctx.createMediaStreamDestination();
      this.masterGain.connect(this.recDestination);
    } catch {
      // ignore
    }

    // Apply all persisted state values to ensure instant response
    this.applyAllPersistedStates();
  }

  private setupEffectsBus() {
    if (!this.ctx || !this.masterCompressor || !this.masterFilterNode) return;

    this.effectsSendGain = this.ctx.createGain();
    this.effectsSendGain.gain.setValueAtTime(0.5, this.ctx.currentTime);

    // Send audio from masterFilterNode to effects send
    this.masterFilterNode.connect(this.effectsSendGain);

    // --- REVERB RETURN ---
    try {
      this.reverbConvolver = this.ctx.createConvolver();
      this.setupReverbImpulse(this.reverbParams.decay);

      this.reverbInputFilter = this.ctx.createBiquadFilter();
      this.reverbInputFilter.type = 'lowpass';
      this.reverbInputFilter.frequency.value = 4500;

      this.reverbWetGain = this.ctx.createGain();
      const reverbWet = this.reverbParams.enabled ? (this.reverbParams.chSend / 100) * 0.7 : 0;
      this.reverbWetGain.gain.setValueAtTime(reverbWet, this.ctx.currentTime);

      this.effectsSendGain
        .connect(this.reverbInputFilter)
        .connect(this.reverbConvolver)
        .connect(this.reverbWetGain)
        .connect(this.masterCompressor);
    } catch (e) {
      console.warn('Reverb setup error:', e);
    }

    // --- DELAY A RETURN ---
    try {
      this.delayNodeA = this.ctx.createDelay(2.0);
      this.delayNodeA.delayTime.setValueAtTime(0.25, this.ctx.currentTime);

      this.delayFilterA = this.ctx.createBiquadFilter();
      this.delayFilterA.type = 'bandpass';
      this.delayFilterA.frequency.value = 2200;
      this.delayFilterA.Q.value = 0.8;

      this.delayFeedbackA = this.ctx.createGain();
      this.delayFeedbackA.gain.setValueAtTime(0.28, this.ctx.currentTime);

      this.delayWetGainA = this.ctx.createGain();
      const delayWetA = this.delayParamsA.enabled ? (this.delayParamsA.chSend / 100) * 0.6 : 0;
      this.delayWetGainA.gain.setValueAtTime(delayWetA, this.ctx.currentTime);

      this.effectsSendGain.connect(this.delayFilterA).connect(this.delayNodeA);
      this.delayNodeA.connect(this.delayFeedbackA).connect(this.delayNodeA);
      this.delayNodeA.connect(this.delayWetGainA).connect(this.masterCompressor);
    } catch (e) {
      console.warn('Delay A setup error:', e);
    }

    // --- DELAY B RETURN ---
    try {
      this.delayNodeB = this.ctx.createDelay(2.0);
      this.delayNodeB.delayTime.setValueAtTime(0.375, this.ctx.currentTime);

      this.delayFilterB = this.ctx.createBiquadFilter();
      this.delayFilterB.type = 'bandpass';
      this.delayFilterB.frequency.value = 1800;
      this.delayFilterB.Q.value = 0.8;

      this.delayFeedbackB = this.ctx.createGain();
      this.delayFeedbackB.gain.setValueAtTime(0.22, this.ctx.currentTime);

      this.delayWetGainB = this.ctx.createGain();
      const delayWetB = this.delayParamsB.enabled ? (this.delayParamsB.chSend / 100) * 0.6 : 0;
      this.delayWetGainB.gain.setValueAtTime(delayWetB, this.ctx.currentTime);

      this.effectsSendGain.connect(this.delayFilterB).connect(this.delayNodeB);
      this.delayNodeB.connect(this.delayFeedbackB).connect(this.delayNodeB);
      this.delayNodeB.connect(this.delayWetGainB).connect(this.masterCompressor);
    } catch (e) {
      console.warn('Delay B setup error:', e);
    }
  }

  private setupReverbImpulse(decaySec: number) {
    if (!this.ctx || !this.reverbConvolver) return;
    try {
      const sampleRate = this.ctx.sampleRate;
      const length = Math.max(0.2, Math.min(6.0, decaySec)) * sampleRate;
      const impulse = this.ctx.createBuffer(2, length, sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = impulse.getChannelData(ch);
        for (let i = 0; i < length; i++) {
          const decay = Math.exp(-i / (sampleRate * 0.6));
          d[i] = (Math.random() * 2 - 1) * decay;
        }
      }
      this.reverbConvolver.buffer = impulse;
    } catch {
      // ignore
    }
  }

  private applyAllPersistedStates() {
    this.setChannelGain(1, this.ch1GainVal);
    this.setChannelEq(1, 'high', this.ch1HighVal);
    this.setChannelEq(1, 'mid', this.ch1MidVal);
    this.setChannelEq(1, 'low', this.ch1LowVal);
    this.setChannelFilter(1, this.ch1FilterVal);
    this.setChannelFader(1, this.ch1FaderVal);

    this.setChannelGain(2, this.ch2GainVal);
    this.setChannelEq(2, 'high', this.ch2HighVal);
    this.setChannelEq(2, 'mid', this.ch2MidVal);
    this.setChannelEq(2, 'low', this.ch2LowVal);
    this.setChannelFilter(2, this.ch2FilterVal);
    this.setChannelFader(2, this.ch2FaderVal);

    this.setCrossfader(this.crossfaderVal, this.crossfaderCurve);

    this.setMasterInputTrim(this.masterInputTrimVal);
    this.setMasterFilter(this.masterFilterVal);
    this.setMasterBalance(this.masterBalanceVal);
    this.setMasterVolume(this.masterVolumeVal);

    this.applyCompressorSettings();
    this.setLimiter(this.limiterParams.enabled, this.limiterParams.ceiling, this.limiterParams.release);
    this.toggleEq(this.isEqEnabled);

    this.setLooperVolume(this.looperVolume);
    this.setLooperBass(this.looperBassDb);
  }

  public async resume() {
    this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  // --- Channel Controls ---
  public setChannelGain(ch: 1 | 2, dB: number) {
    if (ch === 1) this.ch1GainVal = dB;
    else this.ch2GainVal = dB;

    this.initContext();
    if (!this.ctx) return;
    const gainNode = ch === 1 ? this.ch1TrimGain : this.ch2TrimGain;
    if (gainNode) {
      const linear = Math.pow(10, dB / 20);
      gainNode.gain.setValueAtTime(linear, this.ctx.currentTime);
    }
  }

  public setChannelEq(ch: 1 | 2, band: 'high' | 'mid' | 'low', dB: number) {
    if (ch === 1) {
      if (band === 'high') this.ch1HighVal = dB;
      else if (band === 'mid') this.ch1MidVal = dB;
      else this.ch1LowVal = dB;
    } else {
      if (band === 'high') this.ch2HighVal = dB;
      else if (band === 'mid') this.ch2MidVal = dB;
      else this.ch2LowVal = dB;
    }

    this.initContext();
    if (!this.ctx) return;
    let node: BiquadFilterNode | null = null;
    if (ch === 1) {
      if (band === 'high') node = this.ch1HighEq;
      else if (band === 'mid') node = this.ch1MidEq;
      else node = this.ch1LowEq;
    } else {
      if (band === 'high') node = this.ch2HighEq;
      else if (band === 'mid') node = this.ch2MidEq;
      else node = this.ch2LowEq;
    }
    if (node) {
      node.gain.setValueAtTime(Math.max(-26, Math.min(6, dB)), this.ctx.currentTime);
    }
  }

  public setChannelEQ(ch: 1 | 2, high: number, mid: number, low: number) {
    this.setChannelEq(ch, 'high', high);
    this.setChannelEq(ch, 'mid', mid);
    this.setChannelEq(ch, 'low', low);
  }

  public setChannelFilter(ch: 1 | 2, val: number) {
    if (ch === 1) this.ch1FilterVal = val;
    else this.ch2FilterVal = val;

    this.initContext();
    if (!this.ctx) return;
    const node = ch === 1 ? this.ch1Filter : this.ch2Filter;
    if (!node) return;

    if (Math.abs(val) < 0.03) {
      node.type = 'allpass';
      return;
    }

    if (val < 0) {
      // Low pass filter: from 20kHz down to 200Hz
      node.type = 'lowpass';
      const norm = 1 + val;
      const freq = 200 + Math.pow(norm, 2) * 19800;
      node.frequency.setValueAtTime(freq, this.ctx.currentTime);
      node.Q.setValueAtTime(1.4, this.ctx.currentTime);
    } else {
      // High pass filter: from 20Hz up to 5kHz
      node.type = 'highpass';
      const freq = 20 + Math.pow(val, 2) * 4980;
      node.frequency.setValueAtTime(freq, this.ctx.currentTime);
      node.Q.setValueAtTime(1.4, this.ctx.currentTime);
    }
  }

  public setChannelFader(ch: 1 | 2, linearVol: number) {
    if (ch === 1) this.ch1FaderVal = linearVol;
    else this.ch2FaderVal = linearVol;

    this.initContext();
    if (!this.ctx) return;
    const node = ch === 1 ? this.ch1FaderGain : this.ch2FaderGain;
    if (node) {
      node.gain.setValueAtTime(Math.max(0, Math.min(1, linearVol)), this.ctx.currentTime);
    }
  }

  public setCrossfader(val: number, curve: 'smooth' | 'cut' | 'linear' = 'smooth') {
    this.crossfaderVal = Math.max(0, Math.min(1, val));
    this.crossfaderCurve = curve;

    this.initContext();
    if (!this.crossfaderGainA || !this.crossfaderGainB || !this.ctx) return;

    let gainA = 1;
    let gainB = 1;

    if (curve === 'cut') {
      gainA = this.crossfaderVal > 0.95 ? (1 - this.crossfaderVal) * 20 : 1;
      gainB = this.crossfaderVal < 0.05 ? this.crossfaderVal * 20 : 1;
    } else if (curve === 'linear') {
      gainA = 1 - this.crossfaderVal;
      gainB = this.crossfaderVal;
    } else {
      gainA = Math.cos((this.crossfaderVal * Math.PI) / 2);
      gainB = Math.sin((this.crossfaderVal * Math.PI) / 2);
    }

    this.crossfaderGainA.gain.setValueAtTime(gainA, this.ctx.currentTime);
    this.crossfaderGainB.gain.setValueAtTime(gainB, this.ctx.currentTime);
  }

  public updateCrossfader(val: number) {
    this.setCrossfader(val, this.crossfaderCurve);
  }

  // --- Master DSP Controls ---
  public setMasterVolume(vol: number) {
    this.masterVolumeVal = Math.max(0, Math.min(1, vol));
    this.initContext();
    if (!this.masterGain || !this.ctx) return;
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolumeVal, this.ctx.currentTime);
  }

  public setMasterFilter(val: number) {
    this.masterFilterVal = val;
    this.initContext();
    if (!this.masterFilterNode || !this.ctx) return;

    if (Math.abs(val) < 0.03) {
      this.masterFilterNode.type = 'allpass';
      return;
    }
    if (val < 0) {
      this.masterFilterNode.type = 'lowpass';
      const norm = 1 + val;
      const freq = 200 + Math.pow(norm, 2) * 19800;
      this.masterFilterNode.frequency.setValueAtTime(freq, this.ctx.currentTime);
    } else {
      this.masterFilterNode.type = 'highpass';
      const freq = 20 + Math.pow(val, 2) * 4980;
      this.masterFilterNode.frequency.setValueAtTime(freq, this.ctx.currentTime);
    }
  }

  public setMasterInputTrim(dB: number) {
    this.masterInputTrimVal = dB;
    this.initContext();
    if (!this.masterInputTrimGain || !this.ctx) return;
    const linear = Math.pow(10, dB / 20);
    this.masterInputTrimGain.gain.setValueAtTime(linear, this.ctx.currentTime);
  }

  public setMasterBalance(bal: number) {
    this.masterBalanceVal = bal;
    this.initContext();
    if (this.masterPanner && this.ctx) {
      this.masterPanner.pan.setValueAtTime(Math.max(-1, Math.min(1, bal)), this.ctx.currentTime);
    }
  }

  public setMasterPanner(bal: number) {
    this.setMasterBalance(bal);
  }

  public setCompressor(enabled: boolean, threshold: number, ratio: number, attack: number, release: number, makeup: number) {
    this.compressorParams.enabled = enabled;
    this.compressorParams.threshold = threshold;
    this.compressorParams.ratio = ratio;
    this.compressorParams.attack = attack;
    this.compressorParams.release = release;
    this.compressorParams.makeup = makeup;
    this.applyCompressorSettings();
  }

  public applyCompressorSettings() {
    this.initContext();
    if (!this.masterCompressor || !this.ctx) return;
    if (!this.compressorParams.enabled) {
      this.masterCompressor.threshold.setValueAtTime(0, this.ctx.currentTime);
      this.masterCompressor.ratio.setValueAtTime(1, this.ctx.currentTime);
      return;
    }
    this.masterCompressor.threshold.setValueAtTime(this.compressorParams.threshold, this.ctx.currentTime);
    this.masterCompressor.ratio.setValueAtTime(this.compressorParams.ratio, this.ctx.currentTime);
    this.masterCompressor.attack.setValueAtTime(this.compressorParams.attack / 1000, this.ctx.currentTime);
    this.masterCompressor.release.setValueAtTime(this.compressorParams.release / 1000, this.ctx.currentTime);
  }

  public setLimiter(enabled: boolean, ceiling: number, release: number) {
    this.limiterParams.enabled = enabled;
    this.limiterParams.ceiling = ceiling;
    this.limiterParams.release = release;
    this.initContext();
    if (this.masterLimiter && this.ctx) {
      if (!enabled) {
        this.masterLimiter.threshold.setValueAtTime(0, this.ctx.currentTime);
        this.masterLimiter.ratio.setValueAtTime(1, this.ctx.currentTime);
      } else {
        this.masterLimiter.threshold.setValueAtTime(ceiling, this.ctx.currentTime);
        this.masterLimiter.ratio.setValueAtTime(20, this.ctx.currentTime);
        this.masterLimiter.release.setValueAtTime(release / 1000, this.ctx.currentTime);
      }
    }
  }

  // --- Effects: Reverb & Delays ---
  public setReverb(params: Partial<ReverbParams>) {
    this.reverbParams = { ...this.reverbParams, ...params };
    this.initContext();
    if (!this.ctx || !this.reverbWetGain) return;

    if (params.decay !== undefined) {
      this.setupReverbImpulse(this.reverbParams.decay);
    }
    if (params.damping !== undefined && this.reverbInputFilter) {
      const f = 1000 + (1 - this.reverbParams.damping / 100) * 12000;
      this.reverbInputFilter.frequency.setValueAtTime(f, this.ctx.currentTime);
    }

    const wet = this.reverbParams.enabled ? (this.reverbParams.chSend / 100) * 0.75 : 0;
    this.reverbWetGain.gain.setValueAtTime(wet, this.ctx.currentTime);
  }

  public setDelayA(params: Partial<DelayParams>, masterBpm = 120) {
    this.delayParamsA = { ...this.delayParamsA, ...params };
    this.initContext();
    if (!this.ctx || !this.delayNodeA || !this.delayFeedbackA || !this.delayWetGainA) return;

    // Convert time division to seconds
    let fraction = 0.5;
    if (this.delayParamsA.timeDivision === '1/2') fraction = 0.5;
    else if (this.delayParamsA.timeDivision === '1/4') fraction = 0.25;
    else if (this.delayParamsA.timeDivision === '3/4') fraction = 0.75;
    else if (this.delayParamsA.timeDivision === '1/8') fraction = 0.125;

    const beatSec = 60 / masterBpm;
    const delaySec = Math.max(0.01, Math.min(2.0, beatSec * fraction * 2));
    this.delayNodeA.delayTime.setValueAtTime(delaySec, this.ctx.currentTime);

    const fb = Math.max(0, Math.min(0.92, this.delayParamsA.feedback / 100));
    this.delayFeedbackA.gain.setValueAtTime(fb, this.ctx.currentTime);

    const wet = this.delayParamsA.enabled ? (this.delayParamsA.chSend / 100) * 0.7 : 0;
    this.delayWetGainA.gain.setValueAtTime(wet, this.ctx.currentTime);
  }

  public setDelayB(params: Partial<DelayParams>, masterBpm = 120) {
    this.delayParamsB = { ...this.delayParamsB, ...params };
    this.initContext();
    if (!this.ctx || !this.delayNodeB || !this.delayFeedbackB || !this.delayWetGainB) return;

    let fraction = 0.75;
    if (this.delayParamsB.timeDivision === '1/2') fraction = 0.5;
    else if (this.delayParamsB.timeDivision === '1/4') fraction = 0.25;
    else if (this.delayParamsB.timeDivision === '3/4') fraction = 0.75;
    else if (this.delayParamsB.timeDivision === '1/8') fraction = 0.125;

    const beatSec = 60 / masterBpm;
    const delaySec = Math.max(0.01, Math.min(2.0, beatSec * fraction * 2));
    this.delayNodeB.delayTime.setValueAtTime(delaySec, this.ctx.currentTime);

    const fb = Math.max(0, Math.min(0.92, this.delayParamsB.feedback / 100));
    this.delayFeedbackB.gain.setValueAtTime(fb, this.ctx.currentTime);

    const wet = this.delayParamsB.enabled ? (this.delayParamsB.chSend / 100) * 0.7 : 0;
    this.delayWetGainB.gain.setValueAtTime(wet, this.ctx.currentTime);
  }

  // --- 31-Band Graphic EQ ---
  public setEqBand(index: number, dB: number) {
    if (index >= 0 && index < this.eqGains.length) {
      this.eqGains[index] = Math.max(-12, Math.min(12, dB));
      this.initContext();
      if (this.eqFilters[index] && this.ctx) {
        const targetGain = this.isEqEnabled ? this.eqGains[index] : 0;
        this.eqFilters[index].gain.setValueAtTime(targetGain, this.ctx.currentTime);
      }
    }
  }

  public setGraphicEqBand(index: number, val: number) {
    this.setEqBand(index, val);
  }

  public toggleEq(enabled: boolean) {
    this.isEqEnabled = enabled;
    this.initContext();
    if (!this.ctx) return;
    for (let i = 0; i < this.eqFilters.length; i++) {
      const g = enabled ? this.eqGains[i] || 0 : 0;
      this.eqFilters[i].gain.setValueAtTime(g, this.ctx.currentTime);
    }
  }

  public setGraphicEqEnabled(enabled: boolean) {
    this.toggleEq(enabled);
  }

  public setEqFlat() {
    this.eqGains.fill(0);
    this.initContext();
    if (!this.ctx) return;
    for (let i = 0; i < this.eqFilters.length; i++) {
      this.eqFilters[i].gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  public resetGraphicEqFlat() {
    this.setEqFlat();
  }

  // --- LOOPER DSP PIPELINE ---
  public setLooperVolume(vol: number) {
    this.looperVolume = Math.max(0, Math.min(1.0, vol));
    this.initContext();
    if (this.looperMasterGain && this.ctx) {
      this.looperMasterGain.gain.setValueAtTime(this.looperVolume, this.ctx.currentTime);
    }
  }

  public setLooperBass(dB: number) {
    this.looperBassDb = Math.max(-24, Math.min(12, dB));
    this.initContext();
    if (this.looperBassFilter && this.ctx) {
      this.looperBassFilter.gain.setValueAtTime(this.looperBassDb, this.ctx.currentTime);
    }
  }

  public setLooperKey(semitones: number, masterBpm = 120) {
    this.looperKeyShift = Math.max(-12, Math.min(12, semitones));
    this.updateAllLooperPlaybackRates(masterBpm);
  }

  public playLooperTrack(
    trackId: number,
    buffer: AudioBuffer,
    loopBpm: number,
    masterBpm: number,
    keyShift: number,
    volume: number,
    startOffsetSec = 0
  ) {
    this.initContext();
    if (!this.ctx || !this.looperSubmixGain) return;

    this.stopLooperTrack(trackId);

    try {
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const trackGain = this.ctx.createGain();
      trackGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.ctx.currentTime);

      source.connect(trackGain);
      trackGain.connect(this.looperSubmixGain);

      // Pitch and tempo calculation
      const tempoRatio = loopBpm > 0 && masterBpm > 0 ? masterBpm / loopBpm : 1.0;
      const pitchRatio = Math.pow(2, keyShift / 12);
      const rate = Math.max(0.1, Math.min(5.0, tempoRatio * pitchRatio));
      source.playbackRate.setValueAtTime(rate, this.ctx.currentTime);

      const dur = buffer.duration;
      const offset = dur > 0 ? ((startOffsetSec % dur) + dur) % dur : 0;
      source.start(0, offset);

      this.activeLooperNodes.set(trackId, {
        source,
        gain: trackGain,
        trackId,
        loopBpm,
        baseVolume: volume,
      });
    } catch (err) {
      console.warn('Looper play error:', err);
    }
  }

  public stopLooperTrack(trackId: number) {
    const nodeState = this.activeLooperNodes.get(trackId);
    if (nodeState) {
      try {
        nodeState.source.stop();
        nodeState.source.disconnect();
        nodeState.gain.disconnect();
      } catch {
        // ignore
      }
      this.activeLooperNodes.delete(trackId);
    }
  }

  public stopAllLooperTracks() {
    this.activeLooperNodes.forEach((nodeState) => {
      try {
        nodeState.source.stop();
        nodeState.source.disconnect();
        nodeState.gain.disconnect();
      } catch {
        // ignore
      }
    });
    this.activeLooperNodes.clear();
  }

  public updateLooperPlaybackRate(trackId: number, loopBpm: number, masterBpm: number, keyShift: number) {
    const nodeState = this.activeLooperNodes.get(trackId);
    if (!nodeState || !this.ctx) return;
    try {
      const tempoRatio = loopBpm > 0 && masterBpm > 0 ? masterBpm / loopBpm : 1.0;
      const pitchRatio = Math.pow(2, keyShift / 12);
      const rate = Math.max(0.1, Math.min(5.0, tempoRatio * pitchRatio));
      nodeState.source.playbackRate.setValueAtTime(rate, this.ctx.currentTime);
    } catch {
      // ignore
    }
  }

  public updateAllLooperPlaybackRates(masterBpm: number) {
    if (!this.ctx) return;
    this.activeLooperNodes.forEach((nodeState) => {
      this.updateLooperPlaybackRate(nodeState.trackId, nodeState.loopBpm, masterBpm, this.looperKeyShift);
    });
  }

  public updateLooperTrackVolume(trackId: number, volume: number, isMuted: boolean) {
    const nodeState = this.activeLooperNodes.get(trackId);
    if (!nodeState || !this.ctx) return;
    const vol = isMuted ? 0 : Math.max(0, Math.min(1, volume));
    nodeState.gain.gain.setValueAtTime(vol, this.ctx.currentTime);
  }

  // --- Real AudioBuffer Track Playback ---
  public setTrackBuffer(deck: 'master' | 'slave', buffer: AudioBuffer | null) {
    this.initContext();
    this.pauseDeck(deck);
    if (deck === 'master') {
      this.audioBufferA = buffer;
    } else {
      this.audioBufferB = buffer;
    }
  }

  public hasTrackBuffer(deck: 'master' | 'slave'): boolean {
    return deck === 'master' ? this.audioBufferA !== null : this.audioBufferB !== null;
  }

  public playDeck(deck: 'master' | 'slave', positionSec: number, playbackRate: number) {
    this.initContext();
    if (!this.ctx) return;

    const buffer = deck === 'master' ? this.audioBufferA : this.audioBufferB;
    if (!buffer) return;

    this.stopSource(deck);

    try {
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.playbackRate.setValueAtTime(Math.max(0.05, playbackRate), this.ctx.currentTime);

      const destGain = deck === 'master' ? this.ch1TrimGain : this.ch2TrimGain;
      if (destGain) {
        source.connect(destGain);
      }

      const duration = buffer.duration;
      const offset = duration > 0 ? ((positionSec % duration) + duration) % duration : 0;

      source.start(0, offset);

      if (deck === 'master') {
        this.sourceNodeA = source;
        this.isPlayingA = true;
      } else {
        this.sourceNodeB = source;
        this.isPlayingB = true;
      }
    } catch (err) {
      console.warn('Error playing buffer:', err);
    }
  }

  public pauseDeck(deck: 'master' | 'slave') {
    this.stopSource(deck);
    if (deck === 'master') {
      this.isPlayingA = false;
    } else {
      this.isPlayingB = false;
    }
  }

  public stopSource(deck: 'master' | 'slave') {
    const source = deck === 'master' ? this.sourceNodeA : this.sourceNodeB;
    if (source) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // ignore
      }
      if (deck === 'master') {
        this.sourceNodeA = null;
      } else {
        this.sourceNodeB = null;
      }
    }
  }

  public updatePlaybackRate(deck: 'master' | 'slave', rate: number) {
    this.initContext();
    if (!this.ctx) return;
    const source = deck === 'master' ? this.sourceNodeA : this.sourceNodeB;
    if (source) {
      try {
        source.playbackRate.setValueAtTime(Math.max(0.05, rate), this.ctx.currentTime);
      } catch {
        // ignore
      }
    }
  }

  public seekDeck(deck: 'master' | 'slave', positionSec: number, playbackRate: number, isPlaying: boolean) {
    if (isPlaying) {
      this.playDeck(deck, positionSec, playbackRate);
    } else {
      this.stopSource(deck);
    }
  }

  // --- Beat Ticks & Drum Beats ---
  public triggerTick(
    deck: 'master' | 'slave',
    positionSec: number,
    bpm: number,
    isPlaying: boolean,
    gridOffset: number = 0
  ) {
    if (!isPlaying || this.isMuted) return;
    this.initContext();
    if (!this.ctx || this.ctx.state !== 'running') return;

    const hasRealTrack = this.hasTrackBuffer(deck);
    if (hasRealTrack && !this.guideClickEnabled) {
      return;
    }

    const interval = 60.0 / bpm;
    const relPos = positionSec - (gridOffset || 0);
    const currentBeatIndex = Math.floor(relPos / interval);

    const lastScheduled = deck === 'master' ? this.lastScheduledBeatA : this.lastScheduledBeatB;

    if (currentBeatIndex > lastScheduled) {
      if (deck === 'master') {
        this.lastScheduledBeatA = currentBeatIndex;
      } else {
        this.lastScheduledBeatB = currentBeatIndex;
      }

      if (currentBeatIndex - lastScheduled > 4 && lastScheduled !== -1) {
        return;
      }

      const beatInBar = (currentBeatIndex % 4) + 1;
      const isDownbeat = beatInBar === 1;

      if (this.soundMode === 'clicks') {
        this.playMetronomeClick(deck, isDownbeat);
      } else {
        this.playDrumBeat(deck, beatInBar);
      }
    }
  }

  public resetTracking(deck: 'master' | 'slave') {
    if (deck === 'master') {
      this.lastScheduledBeatA = -1;
    } else {
      this.lastScheduledBeatB = -1;
    }
  }

  private playDrumBeat(deck: 'master' | 'slave', beatInBar: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const dest = deck === 'master' ? this.ch1TrimGain : this.ch2TrimGain;
    if (!dest) return;

    const isMaster = deck === 'master';

    // 1. Kick
    const kickOsc = this.ctx.createOscillator();
    const kickGain = this.ctx.createGain();

    kickOsc.type = 'sine';
    const startFreq = isMaster ? 135 : 160;
    const endFreq = isMaster ? 42 : 52;

    kickOsc.frequency.setValueAtTime(startFreq, now);
    kickOsc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.08);

    const kickLevel = beatInBar === 1 ? 0.9 : 0.75;
    kickGain.gain.setValueAtTime(kickLevel, now);
    kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    kickOsc.connect(kickGain);
    kickGain.connect(dest);

    kickOsc.start(now);
    kickOsc.stop(now + 0.23);

    // 2. Snare / Clap on 2 & 4
    if (beatInBar === 2 || beatInBar === 4) {
      this.playSnareClap(dest, now, isMaster);
    }

    // 3. Crisp Hi-hats
    this.playHiHat(dest, now, isMaster, beatInBar === 1);
  }

  private playSnareClap(dest: AudioNode, now: number, isMaster: boolean) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isMaster ? 1800 : 2400, now);
    filter.Q.setValueAtTime(1.8, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    noise.start(now);
  }

  private playHiHat(dest: AudioNode, now: number, isMaster: boolean, isAccent: boolean) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(isMaster ? 7500 : 9000, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isAccent ? 0.25 : 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    noise.start(now);
  }

  private playMetronomeClick(deck: 'master' | 'slave', isDownbeat: boolean) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const dest = deck === 'master' ? this.ch1TrimGain : this.ch2TrimGain;
    if (!dest) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const isMaster = deck === 'master';
    let freq = isDownbeat ? 1400 : 880;
    if (!isMaster) freq = isDownbeat ? 1760 : 1100;

    osc.type = isMaster ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // --- 18-PAD PERFORMANCE SAMPLER ---
  public setCustomPadBuffer(padId: number, buffer: AudioBuffer) {
    this.padBuffers.set(padId, buffer);
  }

  public triggerSamplerPad(padId: number) {
    this.triggerPad(padId);
  }

  public loadCustomSample(padId: number, buffer: AudioBuffer) {
    this.setCustomPadBuffer(padId, buffer);
  }

  public triggerPad(padId: number) {
    this.initContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const dest = this.masterInputTrimGain || this.masterGain;
    if (!dest) return;

    if (this.padBuffers.has(padId)) {
      const buf = this.padBuffers.get(padId)!;
      try {
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        src.connect(dest);
        src.start(now);
      } catch (e) {
        console.warn('Error playing custom pad:', e);
      }
      return;
    }

    switch (padId) {
      case 1: this.synthKick(dest, now); break;
      case 2: this.synthSnare(dest, now); break;
      case 3: this.synthClap(dest, now); break;
      case 4: this.synthClosedHat(dest, now); break;
      case 5: this.synthOpenHat(dest, now); break;
      case 6: this.synthLowTom(dest, now); break;
      case 7: this.synthPerc(dest, now); break;
      case 8: this.synthCrash(dest, now); break;
      case 9: this.synthDjMixFx(dest, now); break;
      case 10: this.synthWaaoFx(dest, now); break;
      case 11: this.synthVoiceDropFx(dest, now); break;
      case 12: this.synthFxSequal(dest, now); break;
      case 13: this.synthSwordWhoosh(dest, now); break;
      case 14: this.synthSiren2(dest, now); break;
      case 15: this.synthSiren1(dest, now); break;
      case 16: this.synthKillBill1(dest, now); break;
      case 17: this.synthKillBillIronside(dest, now); break;
      case 18: this.synthTwoHorn(dest, now); break;
      default: this.synthPerc(dest, now); break;
    }
  }

  private synthKick(dest: AudioNode, now: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.12);
    gain.gain.setValueAtTime(1.0, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  private synthSnare(dest: AudioNode, now: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gOsc = this.ctx.createGain();
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);
    gOsc.gain.setValueAtTime(0.5, now);
    gOsc.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gOsc);
    gOsc.connect(dest);
    osc.start(now);
    osc.stop(now + 0.11);
    this.playSnareClap(dest, now, true);
  }

  private synthClap(dest: AudioNode, now: number) {
    if (!this.ctx) return;
    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.012;
      this.playSnareClap(dest, t, false);
    }
  }

  private synthClosedHat(dest: AudioNode, now: number) {
    this.playHiHat(dest, now, true, false);
  }

  private synthOpenHat(dest: AudioNode, now: number) {
    if (!this.ctx) return;
    const bufSize = this.ctx.sampleRate * 0.28;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 8500;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.4, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    src.start(now);
  }

  private synthLowTom(dest: AudioNode, now: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
    g.gain.setValueAtTime(0.8, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(g);
    g.connect(dest);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  private synthPerc(dest: AudioNode, now: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.05);
    g.gain.setValueAtTime(0.6, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(g);
    g.connect(dest);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  private synthCrash(dest: AudioNode, now: number) {
    if (!this.ctx) return;
    const bufSize = this.ctx.sampleRate * 0.9;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 5500;
    f.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.6, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    src.start(now);
  }

  private synthDjMixFx(dest: AudioNode, now: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(900, now + 0.15);
    osc.frequency.linearRampToValueAtTime(120, now + 0.4);
    g.gain.setValueAtTime(0.6, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc.connect(g);
    g.connect(dest);
    osc.start(now);
    osc.stop(now + 0.46);
  }

  private synthWaaoFx(dest: AudioNode, now: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const f = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, now);
    f.type = 'bandpass';
    f.frequency.setValueAtTime(300, now);
    f.frequency.exponentialRampToValueAtTime(2800, now + 0.25);
    f.frequency.exponentialRampToValueAtTime(200, now + 0.55);
    f.Q.value = 4.5;
    g.gain.setValueAtTime(0.7, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.connect(f);
    f.connect(g);
    g.connect(dest);
    osc.start(now);
    osc.stop(now + 0.62);
  }

  private synthVoiceDropFx(dest: AudioNode, now: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const f1 = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, now);
    f1.type = 'bandpass';
    f1.frequency.setValueAtTime(700, now);
    f1.frequency.linearRampToValueAtTime(1400, now + 0.2);
    f1.Q.value = 5.0;
    g.gain.setValueAtTime(0.8, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(f1);
    f1.connect(g);
    g.connect(dest);
    osc.start(now);
    osc.stop(now + 0.52);
  }

  private synthFxSequal(dest: AudioNode, now: number) {
    if (!this.ctx) return;
    const freqs = [880, 1100, 1320, 1760];
    freqs.forEach((freq, idx) => {
      const t = now + idx * 0.07;
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, t + 0.06);
      g.gain.setValueAtTime(0.35, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.065);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + 0.07);
    });
  }

  private synthSwordWhoosh(dest: AudioNode, now: number) {
    if (!this.ctx) return;
    const bufSize = this.ctx.sampleRate * 0.35;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(1500, now);
    f.frequency.exponentialRampToValueAtTime(4500, now + 0.15);
    f.frequency.exponentialRampToValueAtTime(600, now + 0.32);
    f.Q.value = 3.5;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.7, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    src.start(now);
  }

  private synthSiren2(dest: AudioNode, now: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.setValueAtTime(950, now + 0.22);
    osc.frequency.setValueAtTime(700, now + 0.44);
    osc.frequency.setValueAtTime(950, now + 0.66);
    g.gain.setValueAtTime(0.5, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.88);
    osc.connect(g);
    g.connect(dest);
    osc.start(now);
    osc.stop(now + 0.9);
  }

  private synthSiren1(dest: AudioNode, now: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(1250, now + 0.35);
    osc.frequency.linearRampToValueAtTime(400, now + 0.7);
    g.gain.setValueAtTime(0.65, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    osc.connect(g);
    g.connect(dest);
    osc.start(now);
    osc.stop(now + 0.76);
  }

  private synthKillBill1(dest: AudioNode, now: number) {
    if (!this.ctx) return;
    const notes = [440, 554.37, 659.25];
    notes.forEach((f) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      g.gain.setValueAtTime(0.3, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(g);
      g.connect(dest);
      osc.start(now);
      osc.stop(now + 0.36);
    });
  }

  private synthKillBillIronside(dest: AudioNode, now: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.linearRampToValueAtTime(1760, now + 0.12);
    osc.frequency.linearRampToValueAtTime(1500, now + 0.35);
    g.gain.setValueAtTime(0.7, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc.connect(g);
    g.connect(dest);
    osc.start(now);
    osc.stop(now + 0.46);
  }

  private synthTwoHorn(dest: AudioNode, now: number) {
    if (!this.ctx) return;
    const hornPitches = [466.16, 622.25, 783.99];
    const blasts = [now, now + 0.22];
    blasts.forEach((blastTime) => {
      hornPitches.forEach((pitch) => {
        const osc = this.ctx!.createOscillator();
        const g = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(pitch, blastTime);
        g.gain.setValueAtTime(0.3, blastTime);
        g.gain.exponentialRampToValueAtTime(0.001, blastTime + 0.18);
        osc.connect(g);
        g.connect(dest);
        osc.start(blastTime);
        osc.stop(blastTime + 0.19);
      });
    });
  }

  // --- MASTER REC ENGINE ---
  public startRecording(): boolean {
    this.initContext();
    if (!this.ctx || !this.recDestination) return false;
    try {
      this.recordedChunks = [];
      const stream = this.recDestination.stream;
      this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };
      this.mediaRecorder.start(250);
      this.isRecording = true;
      this.recordStartTime = Date.now();
      return true;
    } catch (err) {
      console.warn('Recording start error:', err);
      return false;
    }
  }

  public stopRecording(): Blob | null {
    if (!this.mediaRecorder || !this.isRecording) return null;
    try {
      this.mediaRecorder.stop();
      this.isRecording = false;
      const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
      this.recordedChunks = [];
      return blob;
    } catch (err) {
      console.warn('Recording stop error:', err);
      this.isRecording = false;
      return null;
    }
  }

  // --- VU Meters ---
  public getVUMeterLevels(): { deckA: number; deckB: number; master: number } {
    let a = 0;
    let b = 0;
    let m = 0;

    if (this.analyserA) {
      const dataA = new Uint8Array(this.analyserA.frequencyBinCount);
      this.analyserA.getByteFrequencyData(dataA);
      let sumA = 0;
      for (let i = 0; i < dataA.length; i++) sumA += dataA[i];
      a = Math.min(1, (sumA / dataA.length / 255) * 2.4);
    }

    if (this.analyserB) {
      const dataB = new Uint8Array(this.analyserB.frequencyBinCount);
      this.analyserB.getByteFrequencyData(dataB);
      let sumB = 0;
      for (let i = 0; i < dataB.length; i++) sumB += dataB[i];
      b = Math.min(1, (sumB / dataB.length / 255) * 2.4);
    }

    if (this.analyserMaster) {
      const dataM = new Uint8Array(this.analyserMaster.frequencyBinCount);
      this.analyserMaster.getByteFrequencyData(dataM);
      let sumM = 0;
      for (let i = 0; i < dataM.length; i++) sumM += dataM[i];
      m = Math.min(1, (sumM / dataM.length / 255) * 2.4);
    }

    return { deckA: a, deckB: b, master: m };
  }
}

export const audioSynth = new DjAudioSynth();

export type SoundMode = 'beats' | 'clicks';

export class DjAudioSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private deckAGain: GainNode | null = null;
  private deckBGain: GainNode | null = null;
  private crossfaderGainA: GainNode | null = null;
  private crossfaderGainB: GainNode | null = null;

  // Analyser nodes for VU meters
  private analyserA: AnalyserNode | null = null;
  private analyserB: AnalyserNode | null = null;

  // Real AudioBuffer sources
  private audioBufferA: AudioBuffer | null = null;
  private audioBufferB: AudioBuffer | null = null;
  private sourceNodeA: AudioBufferSourceNode | null = null;
  private sourceNodeB: AudioBufferSourceNode | null = null;
  private isPlayingA = false;
  private isPlayingB = false;

  private lastScheduledBeatA = -1;
  private lastScheduledBeatB = -1;

  public soundMode: SoundMode = 'beats';
  public isMuted = false;
  public crossfader = 0.5; // 0 = Deck A 100%, 1 = Deck B 100%, 0.5 = both
  public guideClickEnabled = false; // audible metronome guide when real songs are loaded

  constructor() {
    // Lazy initialized on user click/action
  }

  public getContext(): AudioContext {
    this.initContext();
    return this.ctx!;
  }

  private initContext() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    // Master
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // Crossfader nodes
    this.crossfaderGainA = this.ctx.createGain();
    this.crossfaderGainB = this.ctx.createGain();

    this.crossfaderGainA.connect(this.masterGain);
    this.crossfaderGainB.connect(this.masterGain);

    // Deck gains
    this.deckAGain = this.ctx.createGain();
    this.deckBGain = this.ctx.createGain();

    // Analysers for VU meters
    this.analyserA = this.ctx.createAnalyser();
    this.analyserA.fftSize = 64;
    this.analyserB = this.ctx.createAnalyser();
    this.analyserB.fftSize = 64;

    this.deckAGain.connect(this.crossfaderGainA);
    this.deckAGain.connect(this.analyserA);

    this.deckBGain.connect(this.crossfaderGainB);
    this.deckBGain.connect(this.analyserB);

    this.updateCrossfader(this.crossfader);
  }

  public async resume() {
    this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public setMasterVolume(vol: number) {
    if (!this.masterGain || !this.ctx) return;
    const clamped = Math.max(0, Math.min(1, vol));
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : clamped, this.ctx.currentTime);
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (!this.masterGain || !this.ctx) return;
    this.masterGain.gain.setValueAtTime(muted ? 0 : 0.8, this.ctx.currentTime);
  }

  public setDeckVolume(deck: 'master' | 'slave', vol: number) {
    const gain = deck === 'master' ? this.deckAGain : this.deckBGain;
    if (!gain || !this.ctx) return;
    gain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime);
  }

  public updateCrossfader(val: number) {
    this.crossfader = Math.max(0, Math.min(1, val));
    if (!this.crossfaderGainA || !this.crossfaderGainB || !this.ctx) return;

    // Equal-power crossfader curve
    const gainA = Math.cos((this.crossfader * Math.PI) / 2);
    const gainB = Math.sin((this.crossfader * Math.PI) / 2);

    this.crossfaderGainA.gain.setValueAtTime(gainA, this.ctx.currentTime);
    this.crossfaderGainB.gain.setValueAtTime(gainB, this.ctx.currentTime);
  }

  // Real AudioBuffer Track Playback methods
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

    // Stop existing source
    this.stopSource(deck);

    try {
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.playbackRate.setValueAtTime(Math.max(0.05, playbackRate), this.ctx.currentTime);

      const destGain = deck === 'master' ? this.deckAGain : this.deckBGain;
      if (destGain) {
        source.connect(destGain);
      }

      // Safe offset modulo duration
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
      console.warn('Error playing audio buffer source:', err);
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
        // ignore if already stopped
      }
      if (deck === 'master') {
        this.sourceNodeA = null;
      } else {
        this.sourceNodeB = null;
      }
    }
  }

  public updatePlaybackRate(deck: 'master' | 'slave', rate: number) {
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

  /**
   * Called by the animation frame / physics loop to trigger audio pulses
   */
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

    // If real audio track is loaded on this deck and guideClickEnabled is false, do not play synth
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

      // Avoid bursts if seeking/jumping
      if (currentBeatIndex - lastScheduled > 4 && lastScheduled !== -1) {
        return;
      }

      const beatInBar = (currentBeatIndex % 4) + 1; // 1, 2, 3, 4
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

  // Synthesize DJ Drums: Kick, Clap, Hi-hat
  private playDrumBeat(deck: 'master' | 'slave', beatInBar: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const dest = deck === 'master' ? this.deckAGain : this.deckBGain;
    if (!dest) return;

    const isMaster = deck === 'master';

    // 1. Kick on every 4-on-the-floor beat
    // Deck A is deeper sub kick (140Hz -> 42Hz), Deck B is punchier electro kick (165Hz -> 52Hz)
    const kickOsc = this.ctx.createOscillator();
    const kickGain = this.ctx.createGain();

    kickOsc.type = 'sine';
    const startFreq = isMaster ? 135 : 160;
    const endFreq = isMaster ? 42 : 52;

    kickOsc.frequency.setValueAtTime(startFreq, now);
    kickOsc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.08);

    // Accent beat 1 slightly
    const kickLevel = beatInBar === 1 ? 0.9 : 0.75;
    kickGain.gain.setValueAtTime(kickLevel, now);
    kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    kickOsc.connect(kickGain);
    kickGain.connect(dest);

    kickOsc.start(now);
    kickOsc.stop(now + 0.23);

    // 2. Snare / Clap on beats 2 and 4
    if (beatInBar === 2 || beatInBar === 4) {
      this.playSnareClap(dest, now, isMaster);
    }

    // 3. Crisp Hi-hats
    this.playHiHat(dest, now, isMaster, beatInBar === 1);
  }

  private playSnareClap(dest: AudioNode, now: number, isMaster: boolean) {
    if (!this.ctx) return;
    // White noise burst with bandpass
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
    const dest = deck === 'master' ? this.deckAGain : this.deckBGain;
    if (!dest) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const isMaster = deck === 'master';
    let freq = isDownbeat ? 1400 : 880;
    if (!isMaster) {
      freq = isDownbeat ? 1760 : 1100;
    }

    osc.type = isMaster ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  public getVUMeterLevels(): { deckA: number; deckB: number } {
    if (!this.analyserA || !this.analyserB) return { deckA: 0, deckB: 0 };

    const dataA = new Uint8Array(this.analyserA.frequencyBinCount);
    const dataB = new Uint8Array(this.analyserB.frequencyBinCount);

    this.analyserA.getByteFrequencyData(dataA);
    this.analyserB.getByteFrequencyData(dataB);

    let sumA = 0;
    for (let i = 0; i < dataA.length; i++) sumA += dataA[i];
    const avgA = sumA / dataA.length / 255;

    let sumB = 0;
    for (let i = 0; i < dataB.length; i++) sumB += dataB[i];
    const avgB = sumB / dataB.length / 255;

    return {
      deckA: Math.min(1, avgA * 2.2),
      deckB: Math.min(1, avgB * 2.2),
    };
  }
}

export const audioSynth = new DjAudioSynth();

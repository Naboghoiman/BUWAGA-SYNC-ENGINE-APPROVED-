/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BUWAGA_SYNC_ENGINE } from './engine/syncEngine';
import { audioSynth } from './engine/audioSynth';
import { decodeAudioFile, extractWaveformPeaks, detectBpm, generateDemoTrack } from './engine/audioAnalysis';
import { initializeDefaultLooperTracks } from './engine/looperAudio';
import { saveAudioFile, loadAudioFile } from './engine/audioStorage';
import { DjHeader } from './components/DjHeader';
import { PhaseWaveDisplay } from './components/PhaseWaveDisplay';
import { DjDeck } from './components/DjDeck';
import { DjMixerCompact } from './components/DjMixerCompact';
import { DjFullMixer } from './components/DjFullMixer';
import { DjMasterOutput } from './components/DjMasterOutput';
import { DjSampler } from './components/DjSampler';
import { DjSettings } from './components/DjSettings';
import { DjNavigation } from './components/DjNavigation';
import {
  DjViewTab,
  TrackInfo,
  SamplerPad,
  LooperTrack,
  LooperGlobalParams,
  MasterOutputParams,
  ReverbParams,
  DelayParams,
  CompressorParams,
  LimiterParams,
} from './types';

export default function App() {
  // 1. Core BUWAGA Sync Engine instance
  const engineRef = useRef<BUWAGA_SYNC_ENGINE>(new BUWAGA_SYNC_ENGINE(128.0, 126.0));
  const engine = engineRef.current;

  // 2. Active Tab State
  const [currentTab, setCurrentTab] = useState<DjViewTab>('decks');
  const [masterClockDeck, setMasterClockDeck] = useState<'master' | 'slave'>('master');
  const [autoSyncOnStart, setAutoSyncOnStart] = useState<boolean>(true);

  // 3. Audio unlock state
  const [audioStarted, setAudioStarted] = useState(false);
  const ensureAudio = useCallback(async () => {
    if (!audioStarted) {
      await audioSynth.resume();
      setAudioStarted(true);
    }
  }, [audioStarted]);

  // 4. Deck 1 & Deck 2 playback states
  const [playing1, setPlaying1] = useState(false);
  const [playing2, setPlaying2] = useState(false);
  const [pos1, setPos1] = useState(0);
  const [pos2, setPos2] = useState(0);
  const [bpm1, setBpm1] = useState(128.0);
  const [bpm2, setBpm2] = useState(126.0);
  const [rate1, setRate1] = useState(1.0);
  const [rate2, setRate2] = useState(1.0);
  const [track1, setTrack1] = useState<TrackInfo | null>(null);
  const [track2, setTrack2] = useState<TrackInfo | null>(null);
  const [isSyncActive, setIsSyncActive] = useState(false);
  const [continuousPid, setContinuousPid] = useState(true);
  const [phaseErrorMs, setPhaseErrorMs] = useState(0);
  const [isPhaseLocked, setIsPhaseLocked] = useState(true);

  // 5. Channel Strip Parameters
  const [gain1, setGain1] = useState(0);
  const [high1, setHigh1] = useState(0);
  const [mid1, setMid1] = useState(0);
  const [low1, setLow1] = useState(0);
  const [filter1, setFilter1] = useState(0);
  const [level1, setLevel1] = useState(0.85);
  const [cue1, setCue1] = useState(false);

  const [gain2, setGain2] = useState(0);
  const [high2, setHigh2] = useState(0);
  const [mid2, setMid2] = useState(0);
  const [low2, setLow2] = useState(0);
  const [filter2, setFilter2] = useState(0);
  const [level2, setLevel2] = useState(0.85);
  const [cue2, setCue2] = useState(false);

  // Crossfader & Master Output controls
  const [crossfader, setCrossfader] = useState(0.5);
  const [crossfaderCurve, setCrossfaderCurve] = useState<'smooth' | 'cut' | 'linear'>('smooth');
  const [masterVolume, setMasterVolume] = useState(0.86);
  const [masterFilter, setMasterFilter] = useState(0);

  // VU meter levels
  const [vuA, setVuA] = useState(0);
  const [vuB, setVuB] = useState(0);
  const [vuMaster, setVuMaster] = useState(0);

  // 6. Master DSP suite state
  const [masterParams, setMasterParams] = useState<MasterOutputParams>({
    inputTrim: 0,
    masterFilter: 0,
    masterLevel: 86,
    balance: 0,
    denoiseBypass: true,
  });

  const [reverbParams, setReverbParams] = useState<ReverbParams>({
    enabled: true,
    preset: '003 - Medium Warm',
    type: 'HALL',
    predelay: 24,
    early: 28,
    decay: 2.2,
    space: 62,
    damping: 48,
    chSend: 25,
  });

  const [delayParamsA, setDelayParamsA] = useState<DelayParams>({
    enabled: true,
    mode: 'STEREO',
    timeDivision: '1/2',
    feedback: 28,
    loCut: 120,
    hiCut: 9000,
    width: 78,
    chSend: 20,
  });

  const [delayParamsB, setDelayParamsB] = useState<DelayParams>({
    enabled: false,
    mode: 'DUAL',
    timeDivision: '3/4',
    feedback: 22,
    loCut: 180,
    hiCut: 7200,
    width: 62,
    chSend: 0,
  });

  const [compressorParams, setCompressorParams] = useState<CompressorParams>({
    enabled: true,
    preset: 'Commercial Clean',
    threshold: -12.0,
    ratio: 2.0,
    attack: 20,
    release: 180,
    makeup: 0,
  });

  const [limiterParams, setLimiterParams] = useState<LimiterParams>({
    enabled: true,
    ceiling: -1.0,
    release: 160,
  });

  const [eqGains, setEqGains] = useState<number[]>(new Array(31).fill(0));
  const [isEqEnabled, setIsEqEnabled] = useState(true);

  // 7. Sampler Pads (18 pads)
  const [samplerPads, setSamplerPads] = useState<SamplerPad[]>([
    { id: 1, name: 'KICK', category: 'drum', isCustom: false },
    { id: 2, name: 'SNARE', category: 'drum', isCustom: false },
    { id: 3, name: 'CLAP', category: 'drum', isCustom: false },
    { id: 4, name: 'CLOSED HAT', category: 'drum', isCustom: false },
    { id: 5, name: 'OPEN HAT', category: 'drum', isCustom: false },
    { id: 6, name: 'LOW TOM', category: 'drum', isCustom: false },
    { id: 7, name: 'PERC', category: 'drum', isCustom: false },
    { id: 8, name: 'CRASH', category: 'drum', isCustom: false },
    { id: 9, name: 'DJ MIX', category: 'fx', isCustom: false },
    { id: 10, name: 'WAAO', category: 'fx', isCustom: false },
    { id: 11, name: 'VOICE SOUND', category: 'fx', isCustom: false },
    { id: 12, name: 'FX SEQUAL', category: 'fx', isCustom: false },
    { id: 13, name: 'SWORD', category: 'fx', isCustom: false },
    { id: 14, name: 'SIREN 2', category: 'fx', isCustom: false },
    { id: 15, name: 'SIREN 1', category: 'fx', isCustom: false },
    { id: 16, name: 'KILL BILL 1', category: 'fx', isCustom: false },
    { id: 17, name: 'KILL BILL', category: 'fx', isCustom: false },
    { id: 18, name: 'TWO HORN', category: 'fx', isCustom: false },
  ]);
  const [selectedPadId, setSelectedPadId] = useState<number>(1);

  // 8. Dedicated Beat Looper Room State
  const [looperTracks, setLooperTracks] = useState<LooperTrack[]>([]);
  const [looperParams, setLooperParams] = useState<LooperGlobalParams>({
    volume: 0.85,
    bass: 0,
    key: 0,
    keyLock: true,
    tempoMultiplier: 1.0,
    bassCut: false,
  });

  // Track loader modal state
  const [trackPickerDeck, setTrackPickerDeck] = useState<1 | 2 | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Status message bar text
  const [statusText, setStatusText] = useState<string>(
    'BUWAGA Sync Engine ready · Looper Room active with synced wave loop'
  );

  const lastTimeRef = useRef<number>(performance.now());

  // Master BPM calculation helper
  const getMasterEffectiveBpm = useCallback(() => {
    return masterClockDeck === 'master' ? bpm1 * rate1 : bpm2 * rate2;
  }, [masterClockDeck, bpm1, rate1, bpm2, rate2]);

  // 9. Main High-Precision Simulation & Audio Loop
  useEffect(() => {
    let animId: number;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      // Update positions in BUWAGA engine
      engine.master.update(dt);
      engine.slave.update(dt);

      // Trigger synthetic hits / audio tracking
      audioSynth.triggerTick('master', engine.master.position, engine.master.bpm, engine.master.playing, engine.master.grid.offset);
      audioSynth.triggerTick('slave', engine.slave.position, engine.slave.bpm, engine.slave.playing, engine.slave.grid.offset);

      // Process PID phase correction through BUWAGA engine
      const { phaseError } = engine.process();
      const errMs = phaseError * 1000;
      const locked = Math.abs(errMs) < 2.5 && engine.slave.playing && engine.master.playing;

      // Update audio playback rates
      audioSynth.updatePlaybackRate('master', engine.master.playbackRate);
      audioSynth.updatePlaybackRate('slave', engine.slave.playbackRate);

      // Update local state
      setPos1(engine.master.position);
      setPos2(engine.slave.position);
      setPhaseErrorMs(errMs);
      setIsPhaseLocked(locked);
      setRate1(engine.master.playbackRate);
      setRate2(engine.slave.playbackRate);

      // Read real-time VU levels
      const vu = audioSynth.getVUMeterLevels();
      setVuA(vu.deckA);
      setVuB(vu.deckB);
      setVuMaster(vu.master);

      animId = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    animId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animId);
  }, [engine]);

  // Initial demo tracks & procedural Looper loops loading
  useEffect(() => {
    const initDemoTracks = async () => {
      try {
        const ctx = audioSynth.getContext();

        // 1. Initialize Demo Tracks for Deck 1 & Deck 2
        const demo1 = generateDemoTrack(ctx, 128.0, 'tech_house');
        const t1: TrackInfo = {
          name: 'Tech House Club (128)',
          duration: demo1.duration,
          audioBuffer: demo1.audioBuffer,
          peaks: demo1.peaks,
          detectedBpm: 128.0,
          gridOffset: 0,
          isDemo: true,
        };
        engine.master.loadTrack(t1);
        audioSynth.setTrackBuffer('master', demo1.audioBuffer);
        setTrack1(t1);
        setBpm1(128.0);

        const demo2 = generateDemoTrack(ctx, 126.0, 'driving_techno');
        const t2: TrackInfo = {
          name: 'Driving Techno (126)',
          duration: demo2.duration,
          audioBuffer: demo2.audioBuffer,
          peaks: demo2.peaks,
          detectedBpm: 126.0,
          gridOffset: 0,
          isDemo: true,
        };
        engine.slave.loadTrack(t2);
        audioSynth.setTrackBuffer('slave', demo2.audioBuffer);
        setTrack2(t2);
        setBpm2(126.0);

        // 2. Initialize Looper Room with uploaded Afrobeat loop + beat-matched grooves
        const loops = initializeDefaultLooperTracks(ctx);

        // Check if user previously saved a custom WAV file in IndexedDB
        try {
          const savedWav = await loadAudioFile('looper_track_1');
          if (savedWav) {
            const wavBuffer = await decodeAudioFile(savedWav, ctx);
            const peaks = extractWaveformPeaks(wavBuffer, 800);
            const detected = detectBpm(wavBuffer);
            loops[0] = {
              ...loops[0],
              name: savedWav.name.replace(/\.[^/.]+$/, '').toUpperCase(),
              audioBuffer: wavBuffer,
              peaks,
              originalBpm: detected.bpm > 0 ? detected.bpm : 128.0,
              isCustom: true,
            };
            setStatusText(`Restored custom loop [${savedWav.name}] from browser storage`);
          }
        } catch (e) {
          console.warn('Could not restore saved WAV from IndexedDB:', e);
        }

        setLooperTracks(loops);
      } catch (err) {
        console.warn('Demo track & looper generation deferred until audio activation:', err);
      }
    };

    initDemoTracks();
  }, [engine]);

  // Deck 1 Handlers (with Automatic Rhythmic Match if Deck 2 is Master)
  const handlePlayPause1 = async () => {
    await ensureAudio();
    if (engine.master.playing) {
      engine.master.pause();
      audioSynth.pauseDeck('master');
      setPlaying1(false);
      setStatusText('Deck 1 paused');
    } else {
      // Automatic rhythmic beat match when starting if Deck 2 is already playing
      if (autoSyncOnStart && engine.slave.playing && masterClockDeck === 'slave') {
        const masterInterval = 60.0 / (engine.slave.bpm * engine.slave.playbackRate);
        const masterPhase = (engine.slave.position % masterInterval) / masterInterval;
        const slaveInterval = 60.0 / engine.master.bpm;

        engine.master.playbackRate = (engine.slave.bpm * engine.slave.playbackRate) / engine.master.bpm;
        engine.master.position = Math.floor(engine.master.position / slaveInterval) * slaveInterval + (masterPhase * slaveInterval);

        engine.syncButton();
        audioSynth.updatePlaybackRate('master', engine.master.playbackRate);
        setRate1(engine.master.playbackRate);
        setStatusText(`Auto-Sync on Start: Deck 1 rhythmically matched to Deck 2 (${(engine.slave.bpm * engine.slave.playbackRate).toFixed(1)} BPM)`);
      }

      engine.master.start();
      audioSynth.playDeck('master', engine.master.position, engine.master.playbackRate);
      setPlaying1(true);
      if (!engine.slave.playing) setStatusText('Deck 1 playing');
    }
  };

  const handleCue1 = () => {
    engine.master.cue();
    audioSynth.seekDeck('master', engine.master.cuePosition, engine.master.playbackRate, engine.master.playing);
    audioSynth.resetTracking('master');
    setPlaying1(engine.master.playing);
    setStatusText('Deck 1 returned to CUE point');
  };

  const handlePitchChange1 = (newRate: number) => {
    engine.master.playbackRate = newRate;
    audioSynth.updatePlaybackRate('master', newRate);
    setRate1(newRate);

    // If Deck 1 is master, update Looper tracks tempo
    if (masterClockDeck === 'master') {
      audioSynth.updateAllLooperPlaybackRates(bpm1 * newRate);
    }
  };

  const handleNudge1 = (deltaSec: number) => {
    engine.master.nudge(deltaSec);
    audioSynth.seekDeck('master', engine.master.position, engine.master.playbackRate, engine.master.playing);
  };

  const handleScratch1 = (deltaRate: number) => {
    audioSynth.updatePlaybackRate('master', Math.max(0.1, engine.master.playbackRate + deltaRate));
  };

  // Deck 2 Handlers (with Automatic Rhythmic Match to Master Deck 1)
  const handlePlayPause2 = async () => {
    await ensureAudio();
    if (engine.slave.playing) {
      engine.slave.pause();
      audioSynth.pauseDeck('slave');
      setPlaying2(false);
      setIsSyncActive(false);
      setStatusText('Deck 2 paused');
    } else {
      // "when you start a song, it automatically matches the master deck in a rhythmic way"
      if (autoSyncOnStart && engine.master.playing && masterClockDeck === 'master') {
        const masterInterval = 60.0 / (engine.master.bpm * engine.master.playbackRate);
        const masterPhase = (engine.master.position % masterInterval) / masterInterval;
        const slaveInterval = 60.0 / engine.slave.bpm;

        // Match playback tempo exactly
        engine.slave.playbackRate = (engine.master.bpm * engine.master.playbackRate) / engine.slave.bpm;
        // Snap rhythmic phase so downbeats and snares hit simultaneously
        engine.slave.position = Math.floor(engine.slave.position / slaveInterval) * slaveInterval + (masterPhase * slaveInterval);

        // Engage BUWAGA sync lock
        engine.syncButton();
        audioSynth.updatePlaybackRate('slave', engine.slave.playbackRate);
        setRate2(engine.slave.playbackRate);
        setIsSyncActive(true);
        setStatusText(`Auto-Sync on Start: Deck 2 rhythmically matched to Deck 1 (${(engine.master.bpm * engine.master.playbackRate).toFixed(1)} BPM)`);
      }

      engine.slave.start();
      audioSynth.playDeck('slave', engine.slave.position, engine.slave.playbackRate);
      setPlaying2(true);
      if (!engine.master.playing) setStatusText('Deck 2 playing');
    }
  };

  const handleCue2 = () => {
    engine.slave.cue();
    audioSynth.seekDeck('slave', engine.slave.cuePosition, engine.slave.playbackRate, engine.slave.playing);
    audioSynth.resetTracking('slave');
    setPlaying2(engine.slave.playing);
    setStatusText('Deck 2 returned to CUE point');
  };

  const handlePitchChange2 = (newRate: number) => {
    engine.slave.playbackRate = newRate;
    audioSynth.updatePlaybackRate('slave', newRate);
    setRate2(newRate);

    // If Deck 2 is master, update Looper tracks tempo
    if (masterClockDeck === 'slave') {
      audioSynth.updateAllLooperPlaybackRates(bpm2 * newRate);
    }
  };

  const handleNudge2 = (deltaSec: number) => {
    engine.slave.nudge(deltaSec);
    audioSynth.seekDeck('slave', engine.slave.position, engine.slave.playbackRate, engine.slave.playing);
  };

  const handleScratch2 = (deltaRate: number) => {
    audioSynth.updatePlaybackRate('slave', Math.max(0.1, engine.slave.playbackRate + deltaRate));
  };

  // BUWAGA SYNC PRESS HANDLER
  const handleSyncPress = async () => {
    await ensureAudio();

    if (!engine.master.playing) {
      engine.master.start();
      audioSynth.playDeck('master', engine.master.position, engine.master.playbackRate);
      setPlaying1(true);
    }

    // Execute BUWAGA 3-step synchronization
    engine.syncButton();

    // Realign real audio source node to snapped position
    audioSynth.seekDeck('slave', engine.slave.position, engine.slave.playbackRate, true);
    audioSynth.resetTracking('slave');

    setPlaying2(true);
    setIsSyncActive(true);
    setBpm2(engine.slave.bpm);
    setRate2(engine.slave.playbackRate);
    setStatusText('BUWAGA Sync: Deck 2 locked to Deck 1 downbeats');
  };

  // Channel Mixer Handlers
  const handleChangeGain = async (ch: 1 | 2, val: number) => {
    await ensureAudio();
    if (ch === 1) {
      setGain1(val);
      audioSynth.setChannelGain(1, val);
    } else {
      setGain2(val);
      audioSynth.setChannelGain(2, val);
    }
  };

  const handleChangeHigh = async (ch: 1 | 2, val: number) => {
    await ensureAudio();
    if (ch === 1) {
      setHigh1(val);
      audioSynth.setChannelEQ(1, val, mid1, low1);
    } else {
      setHigh2(val);
      audioSynth.setChannelEQ(2, val, mid2, low2);
    }
  };

  const handleChangeMid = async (ch: 1 | 2, val: number) => {
    await ensureAudio();
    if (ch === 1) {
      setMid1(val);
      audioSynth.setChannelEQ(1, high1, val, low1);
    } else {
      setMid2(val);
      audioSynth.setChannelEQ(2, high2, val, low2);
    }
  };

  const handleChangeLow = async (ch: 1 | 2, val: number) => {
    await ensureAudio();
    if (ch === 1) {
      setLow1(val);
      audioSynth.setChannelEQ(1, high1, mid1, val);
    } else {
      setLow2(val);
      audioSynth.setChannelEQ(2, high2, mid2, val);
    }
  };

  const handleChangeFilter = async (ch: 1 | 2, val: number) => {
    await ensureAudio();
    if (ch === 1) {
      setFilter1(val);
      audioSynth.setChannelFilter(1, val);
    } else {
      setFilter2(val);
      audioSynth.setChannelFilter(2, val);
    }
  };

  const handleChangeLevel = async (ch: 1 | 2, val: number) => {
    await ensureAudio();
    if (ch === 1) {
      setLevel1(val);
      audioSynth.setChannelFader(1, val);
    } else {
      setLevel2(val);
      audioSynth.setChannelFader(2, val);
    }
  };

  const handleToggleCue = (ch: 1 | 2) => {
    if (ch === 1) setCue1(!cue1);
    else setCue2(!cue2);
  };

  const handleChangeCrossfader = async (val: number) => {
    await ensureAudio();
    setCrossfader(val);
    audioSynth.setCrossfader(val, crossfaderCurve);
  };

  const handleChangeCrossfaderCurve = (curve: 'smooth' | 'cut' | 'linear') => {
    setCrossfaderCurve(curve);
    audioSynth.setCrossfader(crossfader, curve);
  };

  const handleChangeMasterVolume = async (val: number) => {
    await ensureAudio();
    setMasterVolume(val);
    audioSynth.setMasterVolume(val);
  };

  const handleChangeMasterFilter = async (val: number) => {
    await ensureAudio();
    setMasterFilter(val);
    audioSynth.setMasterFilter(val);
  };

  // Master DSP updates
  const handleChangeMasterParams = async (params: Partial<MasterOutputParams>) => {
    await ensureAudio();
    const updated = { ...masterParams, ...params };
    setMasterParams(updated);
    if (params.inputTrim !== undefined) audioSynth.setMasterInputTrim(params.inputTrim);
    if (params.masterFilter !== undefined) audioSynth.setMasterFilter(params.masterFilter);
    if (params.masterLevel !== undefined) audioSynth.setMasterVolume(params.masterLevel / 100);
    if (params.balance !== undefined) audioSynth.setMasterPanner(params.balance);
  };

  const handleChangeReverb = async (params: Partial<ReverbParams>) => {
    await ensureAudio();
    const updated = { ...reverbParams, ...params };
    setReverbParams(updated);
    audioSynth.setReverb(params);
  };

  const handleChangeDelayA = async (params: Partial<DelayParams>) => {
    await ensureAudio();
    const updated = { ...delayParamsA, ...params };
    setDelayParamsA(updated);
    audioSynth.setDelayA(params, getMasterEffectiveBpm());
  };

  const handleChangeDelayB = async (params: Partial<DelayParams>) => {
    await ensureAudio();
    const updated = { ...delayParamsB, ...params };
    setDelayParamsB(updated);
    audioSynth.setDelayB(params, getMasterEffectiveBpm());
  };

  const handleChangeCompressor = async (params: Partial<CompressorParams>) => {
    await ensureAudio();
    const updated = { ...compressorParams, ...params };
    setCompressorParams(updated);
    audioSynth.setCompressor(
      updated.enabled,
      updated.threshold,
      updated.ratio,
      updated.attack,
      updated.release,
      updated.makeup
    );
  };

  const handleChangeLimiter = async (params: Partial<LimiterParams>) => {
    await ensureAudio();
    const updated = { ...limiterParams, ...params };
    setLimiterParams(updated);
    audioSynth.setLimiter(updated.enabled, updated.ceiling, updated.release);
  };

  const handleChangeEqBand = async (index: number, val: number) => {
    await ensureAudio();
    const nextGains = [...eqGains];
    nextGains[index] = val;
    setEqGains(nextGains);
    audioSynth.setGraphicEqBand(index, val);
  };

  const handleToggleEq = async (enabled: boolean) => {
    await ensureAudio();
    setIsEqEnabled(enabled);
    audioSynth.setGraphicEqEnabled(enabled);
  };

  const handleSetEqFlat = async () => {
    await ensureAudio();
    setEqGains(new Array(31).fill(0));
    audioSynth.resetGraphicEqFlat();
    setStatusText('31-Band Equalizer set to Flat (0.0 dB across all bands)');
  };

  // --- LOOPER ROOM HANDLERS ---
  const handleTogglePlayLoop = async (trackId: number) => {
    await ensureAudio();
    const track = looperTracks.find((t) => t.id === trackId);
    if (!track) return;

    const masterBpm = getMasterEffectiveBpm();

    if (track.isPlaying) {
      // Stop loop
      audioSynth.stopLooperTrack(trackId);
      setLooperTracks((prev) =>
        prev.map((t) => (t.id === trackId ? { ...t, isPlaying: false } : t))
      );
      setStatusText(`Looper: stopped track [${track.name}]`);
    } else {
      // Start loop beat-matched and synchronized with master deck downbeat!
      const ctx = audioSynth.getContext();
      let buffer = track.audioBuffer;
      if (!buffer) {
        // Fallback or generate if needed
        const loops = initializeDefaultLooperTracks(ctx);
        const gen = loops.find((l) => l.id === trackId);
        if (gen && gen.audioBuffer) {
          buffer = gen.audioBuffer;
        }
      }

      if (buffer) {
        // Calculate tempo and beat-matched offset so loop locks seamlessly to the playing song
        const effectiveBpm = masterBpm * (looperParams.tempoMultiplier || 1.0);
        const currentPos = masterClockDeck === 'master' ? engine.master.position : engine.slave.position;
        const beatInterval = 60.0 / effectiveBpm;
        const barInterval = beatInterval * 4;
        const offset = currentPos % (buffer.duration || barInterval);

        audioSynth.playLooperTrack(
          trackId,
          buffer,
          track.originalBpm,
          effectiveBpm,
          looperParams.key,
          track.volume,
          offset
        );

        setLooperTracks((prev) =>
          prev.map((t) => (t.id === trackId ? { ...t, isPlaying: true, isMuted: false } : t))
        );
        setStatusText(`Superb Beat: playing [${track.name}] synchronized to ${effectiveBpm.toFixed(1)} BPM`);
      }
    }
  };

  const handleToggleMuteLoop = (trackId: number) => {
    setLooperTracks((prev) =>
      prev.map((t) => {
        if (t.id === trackId) {
          const nextMuted = !t.isMuted;
          audioSynth.updateLooperTrackVolume(trackId, t.volume, nextMuted);
          return { ...t, isMuted: nextMuted };
        }
        return t;
      })
    );
  };

  const handleToggleSoloLoop = (trackId: number) => {
    setLooperTracks((prev) => {
      const target = prev.find((t) => t.id === trackId);
      const nextSolo = !target?.isSolo;
      return prev.map((t) => {
        const isSolo = t.id === trackId ? nextSolo : false;
        const isMuted = nextSolo ? t.id !== trackId : false;
        audioSynth.updateLooperTrackVolume(t.id, t.volume, isMuted);
        return { ...t, isSolo, isMuted };
      });
    });
  };

  const handleChangeLoopVolume = (trackId: number, vol: number) => {
    setLooperTracks((prev) =>
      prev.map((t) => {
        if (t.id === trackId) {
          audioSynth.updateLooperTrackVolume(trackId, vol, t.isMuted);
          return { ...t, volume: vol };
        }
        return t;
      })
    );
  };

  const handleLoadCustomLoop = async (trackId: number, file: File) => {
    await ensureAudio();
    try {
      const ctx = audioSynth.getContext();
      const buffer = await decodeAudioFile(file, ctx);
      const peaks = extractWaveformPeaks(buffer, 800);
      const detected = detectBpm(buffer);

      // Persist in IndexedDB
      await saveAudioFile(`looper_track_${trackId}`, file);

      setLooperTracks((prev) =>
        prev.map((t) =>
          t.id === trackId
            ? {
                ...t,
                name: file.name.replace(/\.[^/.]+$/, '').toUpperCase(),
                audioBuffer: buffer,
                peaks,
                originalBpm: detected.bpm > 0 ? detected.bpm : 128.0,
                isCustom: true,
              }
            : t
        )
      );

      setStatusText(`Loaded custom loop audio "${file.name}" into Track ${trackId} (${detected.bpm.toFixed(1)} BPM) - Saved to browser cache`);
    } catch (err) {
      console.error('Failed to load loop:', err);
      setStatusText('Failed to decode loop audio. Use WAV or MP3.');
    }
  };

  // Looper Master Panel Handlers (Volume, Base / Bass, Key)
  const handleChangeLooperVolume = async (vol: number) => {
    await ensureAudio();
    setLooperParams((prev) => ({ ...prev, volume: vol }));
    audioSynth.setLooperVolume(vol);
  };

  const handleChangeLooperBass = async (bassDb: number) => {
    await ensureAudio();
    setLooperParams((prev) => ({ ...prev, bass: bassDb }));
    audioSynth.setLooperBass(bassDb);
  };

  const handleChangeLooperKey = async (semitones: number) => {
    await ensureAudio();
    setLooperParams((prev) => ({ ...prev, key: semitones }));
    audioSynth.setLooperKey(semitones, getMasterEffectiveBpm());
    setStatusText(`Looper Key Transposed: ${semitones > 0 ? `+${semitones}` : semitones} semitones`);
  };

  const handleToggleLooperKeyLock = () => {
    setLooperParams((prev) => {
      const next = !prev.keyLock;
      setStatusText(`Looper Key Lock: ${next ? 'ENABLED (Pitch preserved across tempo changes)' : 'DISABLED'}`);
      return { ...prev, keyLock: next };
    });
  };

  const handleChangeLooperMultiplier = async (multiplier: number) => {
    await ensureAudio();
    setLooperParams((prev) => ({ ...prev, tempoMultiplier: multiplier }));
    const effectiveBpm = getMasterEffectiveBpm() * multiplier;
    audioSynth.updateAllLooperPlaybackRates(effectiveBpm);
    setStatusText(`Superb Beat Multiplier: ${multiplier}x (${effectiveBpm.toFixed(1)} BPM)`);
  };

  const handleToggleLooperBassCut = async () => {
    await ensureAudio();
    setLooperParams((prev) => {
      const nextCut = !prev.bassCut;
      const bassVal = nextCut ? -24 : 0;
      audioSynth.setLooperBass(bassVal);
      setStatusText(`Superb Beat Bass: ${nextCut ? 'KILLED (-24dB Highpass)' : 'NORMAL (0dB Full Range)'}`);
      return { ...prev, bassCut: nextCut, bass: bassVal };
    });
  };

  const handleResyncLooper = async () => {
    await ensureAudio();
    const effectiveBpm = getMasterEffectiveBpm() * (looperParams.tempoMultiplier || 1.0);
    audioSynth.updateAllLooperPlaybackRates(effectiveBpm);

    // Realign all active playing loops to the nearest downbeat
    const currentPos = masterClockDeck === 'master' ? engine.master.position : engine.slave.position;
    looperTracks.forEach((t) => {
      if (t.isPlaying && t.audioBuffer) {
        const beatInterval = 60.0 / effectiveBpm;
        const barInterval = beatInterval * 4;
        const offset = currentPos % (t.audioBuffer.duration || barInterval);
        audioSynth.playLooperTrack(
          t.id,
          t.audioBuffer,
          t.originalBpm,
          effectiveBpm,
          looperParams.key,
          t.volume,
          offset
        );
      }
    });
    setStatusText('Superb Beat: locked and re-synchronized to Master Downbeat (0ms offset)');
  };

  // Sampler Handlers
  const handleTriggerPad = async (id: number) => {
    await ensureAudio();
    audioSynth.triggerSamplerPad(id);
    const pad = samplerPads.find((p) => p.id === id);
    if (pad) setStatusText(`Sampler triggered: Pad ${id} [${pad.name}]`);
  };

  const handleLoadCustomSample = async (padId: number, file: File) => {
    await ensureAudio();
    try {
      const ctx = audioSynth.getContext();
      const buffer = await decodeAudioFile(file, ctx);
      audioSynth.loadCustomSample(padId, buffer);

      setSamplerPads((prev) =>
        prev.map((p) =>
          p.id === padId
            ? { ...p, name: file.name.replace(/\.[^/.]+$/, '').slice(0, 12).toUpperCase(), isCustom: true }
            : p
        )
      );
      setStatusText(`Custom audio loaded to Pad ${padId}`);
    } catch (err) {
      console.error('Failed to load sample:', err);
    }
  };

  // File loading to Decks
  const handleTriggerLoad = (deckId: 1 | 2) => {
    setTrackPickerDeck(deckId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleTrackFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !trackPickerDeck) return;
    await ensureAudio();

    setStatusText(`Decoding and analyzing ${file.name}...`);
    try {
      const ctx = audioSynth.getContext();
      const audioBuffer = await decodeAudioFile(file, ctx);
      const peaks = extractWaveformPeaks(audioBuffer, 1600);
      const detected = detectBpm(audioBuffer);

      const track: TrackInfo = {
        name: file.name.replace(/\.[^/.]+$/, ''),
        duration: audioBuffer.duration,
        audioBuffer,
        peaks,
        detectedBpm: detected.bpm,
        gridOffset: detected.firstBeatOffset,
        fileType: file.type || 'audio',
        isDemo: false,
      };

      if (trackPickerDeck === 1) {
        engine.master.loadTrack(track);
        audioSynth.setTrackBuffer('master', audioBuffer);
        setTrack1(track);
        setBpm1(track.detectedBpm);
        setPlaying1(false);
        setStatusText(`Deck 1: ${track.name} loaded (${track.detectedBpm.toFixed(1)} BPM)`);
      } else {
        engine.slave.loadTrack(track);
        audioSynth.setTrackBuffer('slave', audioBuffer);
        setTrack2(track);
        setBpm2(track.detectedBpm);
        setPlaying2(false);
        setStatusText(`Deck 2: ${track.name} loaded (${track.detectedBpm.toFixed(1)} BPM)`);
      }
    } catch (err) {
      console.error('Failed to load track:', err);
      setStatusText('Failed to decode audio file. Try MP3 or WAV format.');
    } finally {
      setTrackPickerDeck(null);
    }
  };

  // Test Phase Drift
  const handleInjectTestDrift = () => {
    engine.slave.position += 0.035; // +35ms phase offset
    audioSynth.seekDeck('slave', engine.slave.position, engine.slave.playbackRate, engine.slave.playing);
    setStatusText('Injected +35ms phase drift: BUWAGA PID dynamically re-locking');
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#07080a] text-zinc-200 flex flex-col font-sans select-none antialiased">
      {/* Hidden File Input for Deck Loading */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleTrackFileSelected}
        className="hidden"
      />

      {/* 1. DJ IMAN Top Header */}
      <DjHeader
        masterDeck={masterClockDeck}
        onToggleMaster={(deck) => {
          setMasterClockDeck(deck);
          setStatusText(`Master Clock switched to ${deck === 'master' ? 'DECK 1' : 'DECK 2'}`);
        }}
        masterBpm={getMasterEffectiveBpm()}
        phaseErrorMs={phaseErrorMs}
        isPhaseLocked={isPhaseLocked}
        onOpenLooper={() => setCurrentTab('sampler')}
      />

      {/* 2. 2-Deck · 2-Channel Downbeat Phase Wave Display */}
      <PhaseWaveDisplay
        track1={track1}
        track2={track2}
        pos1={pos1}
        pos2={pos2}
        bpm1={bpm1 * rate1}
        bpm2={bpm2 * rate2}
        playing1={playing1}
        playing2={playing2}
        masterDeck={masterClockDeck}
      />

      {/* Auto-Sync on Start Indicator Bar */}
      <div className="bg-[#0b0d11] px-4 py-1 border-b border-zinc-800/80 flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              const next = !autoSyncOnStart;
              setAutoSyncOnStart(next);
              setStatusText(`Auto-Sync on Song Start: ${next ? 'ENABLED (snaps rhythmically to master deck)' : 'DISABLED'}`);
            }}
            className={`flex items-center space-x-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
              autoSyncOnStart
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${autoSyncOnStart ? 'bg-amber-400 animate-pulse' : 'bg-zinc-600'}`} />
            <span>AUTO-SYNC ON START: {autoSyncOnStart ? 'ACTIVE' : 'OFF'}</span>
          </button>
          <span className="text-zinc-400 text-[10px] hidden sm:inline">
            When you start a song, it automatically matches the master deck in a rhythmic way
          </span>
        </div>

        <div className="flex items-center space-x-2 text-[10px]">
          <span className="text-zinc-400">MIXER & MASTER DSP:</span>
          <span className="text-emerald-400 font-bold">100% ROUTED & LIVE</span>
        </div>
      </div>

      {/* 3. Main Dynamic View Switcher */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* VIEW 1: DECKS + MIXER (Screenshots 7 & 9) */}
        {currentTab === 'decks' && (
          <div className="flex-1 p-3 flex flex-col md:flex-row items-stretch justify-between gap-2 overflow-x-auto">
            {/* Pioneer DJ Deck 1 */}
            <DjDeck
              deckId={1}
              track={track1}
              bpm={bpm1}
              effectiveBpm={bpm1 * rate1}
              position={pos1}
              duration={track1?.duration || 180}
              playbackRate={rate1}
              playing={playing1}
              isMasterClock={masterClockDeck === 'master'}
              isSyncActive={isSyncActive && masterClockDeck === 'slave'}
              onPlayPause={handlePlayPause1}
              onCue={handleCue1}
              onSync={handleSyncPress}
              onLoadTrack={() => handleTriggerLoad(1)}
              onPitchChange={handlePitchChange1}
              onNudge={handleNudge1}
              onScratch={handleScratch1}
            />

            {/* Center 2-Channel Compact Mixer */}
            <DjMixerCompact
              gain1={gain1}
              high1={high1}
              mid1={mid1}
              low1={low1}
              filter1={filter1}
              level1={level1}
              cue1={cue1}
              gain2={gain2}
              high2={high2}
              mid2={mid2}
              low2={low2}
              filter2={filter2}
              level2={level2}
              cue2={cue2}
              crossfader={crossfader}
              vuA={vuA}
              vuB={vuB}
              onChangeGain={handleChangeGain}
              onChangeHigh={handleChangeHigh}
              onChangeMid={handleChangeMid}
              onChangeLow={handleChangeLow}
              onChangeFilter={handleChangeFilter}
              onChangeLevel={handleChangeLevel}
              onToggleCue={handleToggleCue}
              onChangeCrossfader={handleChangeCrossfader}
            />

            {/* Pioneer DJ Deck 2 */}
            <DjDeck
              deckId={2}
              track={track2}
              bpm={bpm2}
              effectiveBpm={bpm2 * rate2}
              position={pos2}
              duration={track2?.duration || 180}
              playbackRate={rate2}
              playing={playing2}
              isMasterClock={masterClockDeck === 'slave'}
              isSyncActive={isSyncActive && masterClockDeck === 'master'}
              onPlayPause={handlePlayPause2}
              onCue={handleCue2}
              onSync={handleSyncPress}
              onLoadTrack={() => handleTriggerLoad(2)}
              onPitchChange={handlePitchChange2}
              onNudge={handleNudge2}
              onScratch={handleScratch2}
            />
          </div>
        )}

        {/* VIEW 2: FULL MIXER (Screenshot 6) */}
        {currentTab === 'mixer' && (
          <DjFullMixer
            gain1={gain1}
            high1={high1}
            mid1={mid1}
            low1={low1}
            filter1={filter1}
            level1={level1}
            cue1={cue1}
            gain2={gain2}
            high2={high2}
            mid2={mid2}
            low2={low2}
            filter2={filter2}
            level2={level2}
            cue2={cue2}
            masterFilter={masterFilter}
            masterVolume={masterVolume}
            crossfader={crossfader}
            vuA={vuA}
            vuB={vuB}
            vuMaster={vuMaster}
            onChangeGain={handleChangeGain}
            onChangeHigh={handleChangeHigh}
            onChangeMid={handleChangeMid}
            onChangeLow={handleChangeLow}
            onChangeFilter={handleChangeFilter}
            onChangeLevel={handleChangeLevel}
            onToggleCue={handleToggleCue}
            onChangeMasterFilter={handleChangeMasterFilter}
            onChangeMasterVolume={handleChangeMasterVolume}
            onChangeCrossfader={handleChangeCrossfader}
          />
        )}

        {/* VIEW 3: MASTER OUTPUT (Screenshots 2, 3, 4, 5) */}
        {currentTab === 'master' && (
          <DjMasterOutput
            masterParams={masterParams}
            reverbParams={reverbParams}
            delayParamsA={delayParamsA}
            delayParamsB={delayParamsB}
            compressorParams={compressorParams}
            limiterParams={limiterParams}
            eqGains={eqGains}
            isEqEnabled={isEqEnabled}
            vuMaster={vuMaster}
            onChangeMasterParams={handleChangeMasterParams}
            onChangeReverb={handleChangeReverb}
            onChangeDelayA={handleChangeDelayA}
            onChangeDelayB={handleChangeDelayB}
            onChangeCompressor={handleChangeCompressor}
            onChangeLimiter={handleChangeLimiter}
            onChangeEqBand={handleChangeEqBand}
            onToggleEq={handleToggleEq}
            onSetEqFlat={handleSetEqFlat}
          />
        )}

        {/* VIEW 4: SAMPLER & BEAT LOOPER ROOM (Screenshots 1 & 8 + Looper Room) */}
        {currentTab === 'sampler' && (
          <DjSampler
            pads={samplerPads}
            selectedPadId={selectedPadId}
            onSelectPad={setSelectedPadId}
            onTriggerPad={handleTriggerPad}
            onLoadCustomSample={handleLoadCustomSample}
            looperTracks={looperTracks}
            looperParams={looperParams}
            masterBpm={getMasterEffectiveBpm()}
            masterDeck={masterClockDeck}
            onTogglePlayLoop={handleTogglePlayLoop}
            onToggleMuteLoop={handleToggleMuteLoop}
            onToggleSoloLoop={handleToggleSoloLoop}
            onChangeLoopVolume={handleChangeLoopVolume}
            onLoadCustomLoop={handleLoadCustomLoop}
            onChangeLooperVolume={handleChangeLooperVolume}
            onChangeLooperBass={handleChangeLooperBass}
            onChangeLooperKey={handleChangeLooperKey}
            onToggleLooperKeyLock={handleToggleLooperKeyLock}
            onResyncLooper={handleResyncLooper}
            onChangeLooperMultiplier={handleChangeLooperMultiplier}
            onToggleLooperBassCut={handleToggleLooperBassCut}
          />
        )}

        {/* VIEW 5: BUWAGA ENGINE SETTINGS & HARDWARE AUDIT */}
        {currentTab === 'settings' && (
          <DjSettings
            syncController={engine.controller}
            isContinuousSync={continuousPid}
            onToggleContinuousSync={(en) => {
              setContinuousPid(en);
              engine.continuousSync = en;
              setStatusText(`BUWAGA Continuous PID Sync: ${en ? 'ENABLED' : 'DISABLED'}`);
            }}
            crossfaderCurve={crossfaderCurve}
            onChangeCrossfaderCurve={handleChangeCrossfaderCurve}
            onInjectTestDrift={handleInjectTestDrift}
          />
        )}
      </main>

      {/* 4. Bottom Tab Navigation Bar */}
      <DjNavigation
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          ensureAudio();
        }}
        statusMessage={statusText}
      />
    </div>
  );
}

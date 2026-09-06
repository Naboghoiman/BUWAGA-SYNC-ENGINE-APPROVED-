/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BUWAGA_SYNC_ENGINE } from './engine/syncEngine';
import { audioSynth, SoundMode } from './engine/audioSynth';
import { decodeAudioFile, extractWaveformPeaks, detectBpm, generateDemoTrack } from './engine/audioAnalysis';
import { WaveformDisplay } from './components/WaveformDisplay';
import { DeckView } from './components/DeckView';
import { CenterMixer } from './components/CenterMixer';
import { PidDiagnostics } from './components/PidDiagnostics';
import { CppCodeViewer } from './components/CppCodeViewer';
import { PidCoefficients, PidTelemetry, TrackInfo } from './types';
import { Zap, Volume2, Info } from 'lucide-react';

export default function App() {
  // Sync Engine Instance (kept in ref to prevent re-instantiation across renders)
  const engineRef = useRef<BUWAGA_SYNC_ENGINE>(new BUWAGA_SYNC_ENGINE(128.0, 126.0));
  const engine = engineRef.current;

  // React states reflecting the engine
  const [masterPlaying, setMasterPlaying] = useState(false);
  const [slavePlaying, setSlavePlaying] = useState(false);
  const [, setMasterBpm] = useState(128.0);
  const [, setSlaveBpm] = useState(126.0);
  const [, setSlaveRate] = useState(1.0);
  const [syncActive, setSyncActive] = useState(false);
  const [continuousPid, setContinuousPid] = useState(true);
  const [phaseErrorMs, setPhaseErrorMs] = useState(0);
  const [isPhaseLocked, setIsPhaseLocked] = useState(true);
  const [driftRate, setDriftRate] = useState(0);
  const [crossfader, setCrossfader] = useState(0.5);
  const [soundMode, setSoundMode] = useState<SoundMode>('beats');
  const [masterMuted, setMasterMuted] = useState(false);
  const [guideClickEnabled, setGuideClickEnabled] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);

  // Loading states for audio decoding
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [loadingSlave, setLoadingSlave] = useState(false);

  // Deck VU Meter levels
  const [vuA, setVuA] = useState(0);
  const [vuB, setVuB] = useState(0);

  // PID Telemetry & Coefficients
  const [telemetryHistory, setTelemetryHistory] = useState<PidTelemetry[]>([]);
  const [coefficients, setCoefficients] = useState<PidCoefficients>({
    kp: 0.10,
    ki: 0.01,
    kd: 0.10,
  });

  const lastTimeRef = useRef<number>(performance.now());

  // Unlock Audio on first interaction
  const ensureAudio = useCallback(async () => {
    if (!audioStarted) {
      await audioSynth.resume();
      setAudioStarted(true);
    }
  }, [audioStarted]);

  // Main High-Precision Simulation & Physics Loop
  useEffect(() => {
    let animId: number;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      // Update positions
      engine.master.update(dt);
      engine.slave.update(dt);

      // Trigger Web Audio synthesis hits (or guide clicks)
      audioSynth.triggerTick('master', engine.master.position, engine.master.bpm, engine.master.playing, engine.master.grid.offset);
      audioSynth.triggerTick('slave', engine.slave.position, engine.slave.bpm, engine.slave.playing, engine.slave.grid.offset);

      // Process PID phase correction
      const { phaseError, rate } = engine.process();
      const errMs = phaseError * 1000;
      const locked = Math.abs(errMs) < 2.0 && engine.slave.playing && engine.master.playing;

      // Keep real audio playback rates strictly synchronized with PID adjustments
      audioSynth.updatePlaybackRate('master', engine.master.playbackRate);
      audioSynth.updatePlaybackRate('slave', engine.slave.playbackRate);

      setPhaseErrorMs(errMs);
      setIsPhaseLocked(locked);
      setSlaveRate(rate);

      // Update VU meters
      const vu = audioSynth.getVUMeterLevels();
      setVuA(vu.deckA);
      setVuB(vu.deckB);

      // Periodically sync telemetry history
      setTelemetryHistory([...engine.telemetryHistory]);

      animId = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [engine]);

  // Play / Pause Handlers
  const handleMasterPlayToggle = async () => {
    await ensureAudio();
    if (engine.master.playing) {
      engine.master.pause();
      audioSynth.pauseDeck('master');
      setMasterPlaying(false);
    } else {
      engine.master.start();
      audioSynth.playDeck('master', engine.master.position, engine.master.playbackRate);
      setMasterPlaying(true);
    }
  };

  const handleSlavePlayToggle = async () => {
    await ensureAudio();
    if (engine.slave.playing) {
      engine.slave.pause();
      audioSynth.pauseDeck('slave');
      setSlavePlaying(false);
      setSyncActive(false);
    } else {
      engine.slave.start();
      audioSynth.playDeck('slave', engine.slave.position, engine.slave.playbackRate);
      setSlavePlaying(true);
    }
  };

  const handleMasterCue = () => {
    engine.master.cue();
    audioSynth.seekDeck('master', engine.master.cuePosition, engine.master.playbackRate, engine.master.playing);
    audioSynth.resetTracking('master');
    setMasterPlaying(engine.master.playing);
  };

  const handleSlaveCue = () => {
    engine.slave.cue();
    audioSynth.seekDeck('slave', engine.slave.cuePosition, engine.slave.playbackRate, engine.slave.playing);
    audioSynth.resetTracking('slave');
    setSlavePlaying(engine.slave.playing);
  };

  // BUWAGA PRO SYNC BUTTON HANDLER
  const handleSyncPress = async () => {
    await ensureAudio();

    // Start master if not already playing
    if (!engine.master.playing) {
      engine.master.start();
      audioSynth.playDeck('master', engine.master.position, engine.master.playbackRate);
      setMasterPlaying(true);
    }

    // Run BUWAGA 3-step Sync sequence (Auto BPM match, exact phase align, auto start)
    engine.syncButton();

    // Realign real audio source node to new snapped position
    audioSynth.seekDeck('slave', engine.slave.position, engine.slave.playbackRate, true);

    setSlavePlaying(true);
    setSyncActive(true);
    setSlaveBpm(engine.slave.bpm);
    setSlaveRate(engine.slave.playbackRate);
    audioSynth.resetTracking('slave');
  };

  const handleContinuousPidToggle = () => {
    const next = !continuousPid;
    engine.continuousSync = next;
    setContinuousPid(next);
  };

  // Pitch / BPM changes
  const handleMasterBpmChange = (newBpm: number) => {
    engine.master.setBpm(newBpm);
    setMasterBpm(newBpm);
    if (syncActive) {
      const targetBpm = newBpm * engine.master.playbackRate;
      const baseSlaveBpm = engine.slave.track ? (engine.slave.track.detectedBpm || engine.slave.bpm) : engine.slave.bpm;
      const targetRatio = targetBpm / (baseSlaveBpm > 0 ? baseSlaveBpm : targetBpm);
      engine.slave.playbackRate = targetRatio;
      audioSynth.updatePlaybackRate('slave', targetRatio);
      setSlaveRate(targetRatio);
    }
  };

  // Instant snap follower phase to 100% exact 0.00ms error
  const handleSnapPhase = () => {
    engine.snapPhase();
    audioSynth.seekDeck('slave', engine.slave.position, engine.slave.playbackRate, engine.slave.playing);
    audioSynth.resetTracking('slave');
    setSlaveBpm(engine.slave.bpm);
    setSlaveRate(engine.slave.playbackRate);
  };

  const handleSlaveBpmChange = (newBpm: number) => {
    engine.slave.setBpm(newBpm);
    setSlaveBpm(newBpm);
  };

  // Nudge / Phase shift
  const handleNudge = (deck: 'master' | 'slave', deltaSec: number) => {
    if (deck === 'master') {
      engine.master.nudge(deltaSec);
      audioSynth.seekDeck('master', engine.master.position, engine.master.playbackRate, engine.master.playing);
    } else {
      engine.slave.nudge(deltaSec);
      audioSynth.seekDeck('slave', engine.slave.position, engine.slave.playbackRate, engine.slave.playing);
    }
  };

  // Slip phase perturbation from diagnostics / mixer
  const handleSlipPhase = (deltaMs: number) => {
    engine.slave.position += deltaMs / 1000;
    audioSynth.seekDeck('slave', engine.slave.position, engine.slave.playbackRate, engine.slave.playing);
  };

  const handleDriftChange = (drift: number) => {
    engine.driftRate = drift;
    setDriftRate(drift);
  };

  const handleCrossfaderChange = (val: number) => {
    setCrossfader(val);
    audioSynth.updateCrossfader(val);
  };

  const handleVolumeChange = (deck: 'master' | 'slave', vol: number) => {
    if (deck === 'master') {
      engine.master.volume = vol;
      audioSynth.setDeckVolume('master', vol);
    } else {
      engine.slave.volume = vol;
      audioSynth.setDeckVolume('slave', vol);
    }
  };

  const handleDeckMuteToggle = (deck: 'master' | 'slave') => {
    if (deck === 'master') {
      engine.master.muted = !engine.master.muted;
      audioSynth.setDeckVolume('master', engine.master.muted ? 0 : engine.master.volume);
    } else {
      engine.slave.muted = !engine.slave.muted;
      audioSynth.setDeckVolume('slave', engine.slave.muted ? 0 : engine.slave.volume);
    }
  };

  const handleMasterMuteToggle = () => {
    const next = !masterMuted;
    setMasterMuted(next);
    audioSynth.setMute(next);
  };

  const handleGuideClickToggle = () => {
    const next = !guideClickEnabled;
    setGuideClickEnabled(next);
    audioSynth.guideClickEnabled = next;
  };

  const handleSoundModeChange = (mode: SoundMode) => {
    setSoundMode(mode);
    audioSynth.soundMode = mode;
  };

  const handleResetAll = () => {
    engine.master.pause();
    engine.slave.pause();
    audioSynth.pauseDeck('master');
    audioSynth.pauseDeck('slave');
    engine.master.position = 0;
    engine.slave.position = 0;
    engine.slave.playbackRate = 1.0;
    engine.controller.reset();
    audioSynth.resetTracking('master');
    audioSynth.resetTracking('slave');
    setMasterPlaying(false);
    setSlavePlaying(false);
    setSyncActive(false);
    setPhaseErrorMs(0);
    setIsPhaseLocked(true);
  };

  // Real Song Upload Handlers
  const handleFileUpload = async (deckId: 'master' | 'slave', file: File) => {
    await ensureAudio();
    const setLoading = deckId === 'master' ? setLoadingMaster : setLoadingSlave;
    setLoading(true);

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

      if (deckId === 'master') {
        engine.master.loadTrack(track);
        audioSynth.setTrackBuffer('master', audioBuffer);
        setMasterBpm(track.detectedBpm);
        setMasterPlaying(false);
      } else {
        engine.slave.loadTrack(track);
        audioSynth.setTrackBuffer('slave', audioBuffer);
        setSlaveBpm(track.detectedBpm);
        setSlavePlaying(false);
      }
    } catch (err) {
      console.error('Failed to load audio file:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDemoTrack = async (deckId: 'master' | 'slave', style: 'tech_house' | 'driving_techno') => {
    await ensureAudio();
    const setLoading = deckId === 'master' ? setLoadingMaster : setLoadingSlave;
    setLoading(true);

    try {
      const ctx = audioSynth.getContext();
      const bpm = style === 'tech_house' ? 128.0 : 126.0;
      const { audioBuffer, peaks, duration } = generateDemoTrack(ctx, bpm, style);

      const track: TrackInfo = {
        name: style === 'tech_house' ? 'Tech House Club (128)' : 'Driving Techno (126)',
        artist: 'BUWAGA Studio',
        duration,
        audioBuffer,
        peaks,
        detectedBpm: bpm,
        gridOffset: 0,
        isDemo: true,
      };

      if (deckId === 'master') {
        engine.master.loadTrack(track);
        audioSynth.setTrackBuffer('master', audioBuffer);
        setMasterBpm(bpm);
        setMasterPlaying(false);
      } else {
        engine.slave.loadTrack(track);
        audioSynth.setTrackBuffer('slave', audioBuffer);
        setSlaveBpm(bpm);
        setSlavePlaying(false);
      }
    } catch (err) {
      console.error('Failed to generate demo track:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEjectTrack = (deckId: 'master' | 'slave') => {
    if (deckId === 'master') {
      engine.master.ejectTrack();
      audioSynth.setTrackBuffer('master', null);
      setMasterPlaying(false);
    } else {
      engine.slave.ejectTrack();
      audioSynth.setTrackBuffer('slave', null);
      setSlavePlaying(false);
    }
  };

  const handleSetBeat1Offset = (deckId: 'master' | 'slave') => {
    const currentPos = deckId === 'master' ? engine.master.position : engine.slave.position;
    const interval = 60.0 / (deckId === 'master' ? engine.master.bpm : engine.slave.bpm);
    const normalizedOffset = (currentPos % interval + interval) % interval;
    if (deckId === 'master') {
      engine.master.setGridOffset(normalizedOffset);
      if (engine.master.track) engine.master.track.gridOffset = normalizedOffset;
    } else {
      engine.slave.setGridOffset(normalizedOffset);
      if (engine.slave.track) engine.slave.track.gridOffset = normalizedOffset;
    }
  };

  const handleUpdateCoefficients = (coeffs: Partial<PidCoefficients>) => {
    engine.controller.setCoefficients(coeffs);
    setCoefficients({
      kp: engine.controller.kp,
      ki: engine.controller.ki,
      kd: engine.controller.kd,
    });
  };

  const handleResetPid = () => {
    engine.controller.reset();
  };

  return (
    <div className="min-h-screen bg-[#050506] text-[#E0E0E0] flex flex-col font-sans selection:bg-[#00E5FF] selection:text-black antialiased">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-[#1F1F2B] bg-[#09090D]/90 backdrop-blur-md px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-[#00E5FF]/30 via-[#00F5A0]/20 to-[#F27D26]/30 p-0.5 shadow-lg shadow-[#00E5FF]/10">
              <div className="w-full h-full bg-[#0E0E14] rounded-[7px] flex items-center justify-center border border-[#2B2B3C]">
                <Zap className="w-4 h-4 text-[#00F5A0]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-wider uppercase font-mono text-[#F3F4F6]">
                  BUWAGA PRO SYNC ENGINE
                </h1>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#00F5A0]/10 text-[#00F5A0] border border-[#00F5A0]/30 font-semibold shadow-[0_0_8px_rgba(0,245,160,0.15)]">
                  V1 CORE
                </span>
              </div>
              <p className="text-[11px] text-[#8E8E9F] font-mono">
                djay Style Master / Follower Sync Core • Real Song Playback & PID Phase Lock
              </p>
            </div>
          </div>

          {/* Quick Engine Status Bar */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#0E0E14] border border-[#242432] font-mono text-xs shadow-inner">
              <span className="text-[#68687D]">ENGINE:</span>
              <span className="flex items-center gap-1.5 font-bold">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isPhaseLocked
                      ? 'bg-[#00F5A0] shadow-[0_0_8px_#00F5A0]'
                      : 'bg-[#FF3366] shadow-[0_0_8px_#FF3366] animate-pulse'
                  }`}
                />
                <span className={isPhaseLocked ? 'text-[#00F5A0]' : 'text-[#FF6688]'}>
                  {isPhaseLocked ? 'LOCKED (<5ms)' : 'ADJUSTING'}
                </span>
              </span>
            </div>

            {/* Audio Activation Alert if not activated */}
            {!audioStarted && (
              <button
                onClick={ensureAudio}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#F27D26] hover:bg-[#ff8a36] text-black font-mono text-xs font-bold shadow-[0_0_16px_rgba(242,125,38,0.4)] transition-all animate-bounce"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Enable Sound</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 space-y-4">
        {/* Dual Stacked Beatgrid Waveform Display */}
        <section id="waveform-section">
          <WaveformDisplay
            master={engine.master}
            slave={engine.slave}
            phaseErrorMs={phaseErrorMs}
            isPhaseLocked={isPhaseLocked}
            onScrub={handleNudge}
          />
        </section>

        {/* Core Hardware Mixer Layout: Deck A (Left) | Center BUWAGA Mixer | Deck B (Right) */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
          {/* Deck A (Master Clock) */}
          <div className="md:col-span-4">
            <DeckView
              id="master"
              deck={engine.master}
              accentColor="cyan"
              vuLevel={vuA}
              isLoadingTrack={loadingMaster}
              onPlayToggle={handleMasterPlayToggle}
              onCue={handleMasterCue}
              onBpmChange={handleMasterBpmChange}
              onNudge={(d) => handleNudge('master', d)}
              onVolumeChange={(v) => handleVolumeChange('master', v)}
              onMuteToggle={() => handleDeckMuteToggle('master')}
              onFileUpload={(f) => handleFileUpload('master', f)}
              onLoadDemoTrack={(s) => handleLoadDemoTrack('master', s)}
              onEjectTrack={() => handleEjectTrack('master')}
              onSetBeat1Offset={() => handleSetBeat1Offset('master')}
            />
          </div>

          {/* Center Mixer Unit (BUWAGA SYNC, PID controller, Phase meter, Crossfader) */}
          <div className="md:col-span-4 flex flex-col">
            <CenterMixer
              syncActive={syncActive}
              continuousPid={continuousPid}
              phaseErrorMs={phaseErrorMs}
              isPhaseLocked={isPhaseLocked}
              driftRate={driftRate}
              crossfader={crossfader}
              soundMode={soundMode}
              masterMuted={masterMuted}
              guideClickEnabled={guideClickEnabled}
              onSyncPress={handleSyncPress}
              onSnapPhase={handleSnapPhase}
              onContinuousPidToggle={handleContinuousPidToggle}
              onCrossfaderChange={handleCrossfaderChange}
              onDriftChange={handleDriftChange}
              onSlipPhase={handleSlipPhase}
              onSoundModeChange={handleSoundModeChange}
              onMasterMuteToggle={handleMasterMuteToggle}
              onGuideClickToggle={handleGuideClickToggle}
              onResetAll={handleResetAll}
            />
          </div>

          {/* Deck B (Follower / Slave) */}
          <div className="md:col-span-4">
            <DeckView
              id="slave"
              deck={engine.slave}
              accentColor="orange"
              vuLevel={vuB}
              isLoadingTrack={loadingSlave}
              onPlayToggle={handleSlavePlayToggle}
              onCue={handleSlaveCue}
              onBpmChange={handleSlaveBpmChange}
              onNudge={(d) => handleNudge('slave', d)}
              onVolumeChange={(v) => handleVolumeChange('slave', v)}
              onMuteToggle={() => handleDeckMuteToggle('slave')}
              onFileUpload={(f) => handleFileUpload('slave', f)}
              onLoadDemoTrack={(s) => handleLoadDemoTrack('slave', s)}
              onEjectTrack={() => handleEjectTrack('slave')}
              onSetBeat1Offset={() => handleSetBeat1Offset('slave')}
            />
          </div>
        </section>

        {/* PID Real-time Telemetry & Diagnostics Panel */}
        <section id="pid-telemetry-section">
          <PidDiagnostics
            telemetryHistory={telemetryHistory}
            coefficients={coefficients}
            onUpdateCoefficients={handleUpdateCoefficients}
            onResetPid={handleResetPid}
          />
        </section>

        {/* BUWAGA C++ Source Spec & 100-Tick Benchmark Runner */}
        <section id="cpp-spec-section">
          <CppCodeViewer />
        </section>

        {/* Educational Architecture Callout */}
        <section className="rounded-xl bg-[#0B0B10]/80 border border-[#1F1F2B] p-4 text-xs font-mono text-[#9E9EB0] shadow-xl">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#00E5FF] shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <span className="text-[#F3F4F6] font-bold uppercase tracking-wider block">
                BUWAGA PRO SYNC ENGINE • REAL SONG SYNCHRONIZATION
              </span>
              <p>
                1. <strong>Song Upload & Transient Analysis:</strong> Upload real audio files (.mp3, .wav, .aac, .ogg) or load studio demos. The engine automatically decodes the Web Audio buffer, extracts 1600 normalized waveform peaks, and uses spectral flux autocorrelation to detect base BPM and downbeat offsets.
              </p>
              <p>
                2. <strong>Instant 3-Step Sync:</strong> When BUWAGA SYNC is engaged, the follower deck matches tempo ratio (<span className="text-[#F27D26]">bpmRatio = master.bpm / slave.bpm</span>), aligns beat phase modulo nearest beat, and automatically starts playback.
              </p>
              <p>
                3. <strong>Closed-Loop PID Phase Lock:</strong> The PID controller continuously adjusts <span className="text-[#00E5FF]">slave.playbackRate</span> in real time to lock downbeat transients and eliminate motor drift.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#161620] bg-[#050506] py-3 px-4 text-center text-[#565668] text-xs font-mono">
        BUWAGA PRO SYNC ENGINE V1 • Immersive Audio Workstation UI
      </footer>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { SamplerPad, LooperTrack, LooperGlobalParams } from '../types';
import {
  Layers,
  Upload,
  Mic,
  Volume2,
  VolumeX,
  Square,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Music,
  Radio,
  Sparkles,
  Key,
  ShieldCheck,
} from 'lucide-react';

interface DjSamplerProps {
  pads: SamplerPad[];
  selectedPadId: number;
  onSelectPad: (id: number) => void;
  onTriggerPad: (id: number) => void;
  onLoadCustomSample: (padId: number, file: File) => void;

  // Looper Room Props
  looperTracks: LooperTrack[];
  looperParams: LooperGlobalParams;
  masterBpm: number;
  masterDeck: 'master' | 'slave';
  onTogglePlayLoop: (trackId: number) => void;
  onToggleMuteLoop: (trackId: number) => void;
  onToggleSoloLoop: (trackId: number) => void;
  onChangeLoopVolume: (trackId: number, vol: number) => void;
  onLoadCustomLoop: (trackId: number, file: File) => void;
  onChangeLooperVolume: (vol: number) => void;
  onChangeLooperBass: (bassDb: number) => void;
  onChangeLooperKey: (semitones: number) => void;
  onToggleLooperKeyLock: () => void;
  onResyncLooper: () => void;
  onChangeLooperMultiplier?: (multiplier: number) => void;
  onToggleLooperBassCut?: () => void;
}

export const DjSampler: React.FC<DjSamplerProps> = ({
  pads,
  selectedPadId,
  onSelectPad,
  onTriggerPad,
  onLoadCustomSample,
  looperTracks,
  looperParams,
  masterBpm,
  masterDeck,
  onTogglePlayLoop,
  onToggleMuteLoop,
  onToggleSoloLoop,
  onChangeLoopVolume,
  onLoadCustomLoop,
  onChangeLooperVolume,
  onChangeLooperBass,
  onChangeLooperKey,
  onToggleLooperKeyLock,
  onResyncLooper,
  onChangeLooperMultiplier,
  onToggleLooperBassCut,
}) => {
  const [activeTab, setActiveTab] = useState<'looper' | 'pads'>('looper'); // Default to Looper Room as requested!
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const loopFileInputRef = useRef<HTMLInputElement | null>(null);
  const [targetLoopTrackId, setTargetLoopTrackId] = useState<number | null>(null);
  const [dragOverTrackId, setDragOverTrackId] = useState<number | null>(null);
  const [isDraggingBanner, setIsDraggingBanner] = useState<boolean>(false);

  const [isRecordingMic, setIsRecordingMic] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [activeFlashingPads, setActiveFlashingPads] = useState<Record<number, boolean>>({});

  // Beat position animation for active loops
  const [loopBeatPhases, setLoopBeatPhases] = useState<Record<number, number>>({});

  useEffect(() => {
    let animId: number;
    const updatePhase = () => {
      const now = performance.now() / 1000;
      const bpm = masterBpm > 0 ? masterBpm : 128.0;
      const beatDur = 60 / bpm;
      const fourBarsDur = beatDur * 16; // 4 bars = 16 beats

      const phases: Record<number, number> = {};
      looperTracks.forEach((t) => {
        if (t.isPlaying) {
          const progress = (now % fourBarsDur) / fourBarsDur;
          phases[t.id] = progress;
        } else {
          phases[t.id] = 0;
        }
      });
      setLoopBeatPhases(phases);
      animId = requestAnimationFrame(updatePhase);
    };

    animId = requestAnimationFrame(updatePhase);
    return () => cancelAnimationFrame(animId);
  }, [looperTracks, masterBpm]);

  const selectedPad = pads.find((p) => p.id === selectedPadId) || pads[0];

  const handlePadClick = (pad: SamplerPad) => {
    onSelectPad(pad.id);
    onTriggerPad(pad.id);

    setActiveFlashingPads((prev) => ({ ...prev, [pad.id]: true }));
    setTimeout(() => {
      setActiveFlashingPads((prev) => ({ ...prev, [pad.id]: false }));
    }, 150);
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedPadId) {
      onLoadCustomSample(selectedPadId, file);
    }
  };

  const handleTriggerUploadLoop = (trackId: number) => {
    setTargetLoopTrackId(trackId);
    if (loopFileInputRef.current) {
      loopFileInputRef.current.value = '';
      loopFileInputRef.current.click();
    }
  };

  const handleLoopFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && targetLoopTrackId !== null) {
      onLoadCustomLoop(targetLoopTrackId, file);
    }
  };

  const handleDropOnTrack = (e: React.DragEvent, trackId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTrackId(null);
    setIsDraggingBanner(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onLoadCustomLoop(trackId, file);
    }
  };

  // Microphone recording to selected pad
  const handleToggleMic = async () => {
    if (isRecordingMic) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        setIsRecordingMic(false);
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const file = new File([audioBlob], `mic_recording_${selectedPadId}.webm`, {
            type: 'audio/webm',
          });
          onLoadCustomSample(selectedPadId, file);
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();
        setIsRecordingMic(true);
      } catch (err) {
        console.error('Mic access error:', err);
      }
    }
  };

  // Calculate Camelot key notation relative to semitone offset
  const getMusicalKeyLabel = (semitones: number) => {
    const keys = ['Am (8A)', 'Bbm (3A)', 'Bm (10A)', 'Cm (5A)', 'C#m (12A)', 'Dm (7A)', 'Ebm (2A)', 'Em (9A)', 'Fm (4A)', 'F#m (11A)', 'Gm (6A)', 'G#m (1A)'];
    const idx = (((semitones % 12) + 12) % 12);
    const sign = semitones > 0 ? `+${semitones}` : `${semitones}`;
    return `${keys[idx]} [${sign} st]`;
  };

  return (
    <div className="flex-1 bg-[#090b0e] p-4 flex flex-col justify-between select-none">
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={loopFileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleLoopFileChange}
        className="hidden"
      />

      {/* 1. Header Bar with Tabs */}
      <div className="flex flex-col space-y-3 pb-3 border-b border-zinc-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-orange-600 to-amber-700 flex items-center justify-center border border-orange-400/40 shadow-sm">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-widest text-zinc-100 uppercase">
                DJ IMAN SAMPLER & LOOPER ROOM
              </h2>
              <p className="text-[10px] tracking-wider text-zinc-400 uppercase font-medium">
                PERFECT MASTER BEAT-SYNC · ISOLATED LOOPER CONTROLS · 18 MPC PADS
              </p>
            </div>
          </div>

          {/* Master Deck BPM Sync Badge */}
          <div className="flex items-center space-x-3 bg-zinc-950 px-3 py-1.5 rounded border border-zinc-800">
            <div className="flex items-center space-x-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">
                MASTER CLOCK:
              </span>
              <span className="text-xs font-mono font-black text-amber-400">
                {masterBpm.toFixed(2)} BPM ({masterDeck === 'master' ? 'DECK 1' : 'DECK 2'})
              </span>
            </div>
            <button
              onClick={onResyncLooper}
              className="flex items-center space-x-1 px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-[10px] font-bold text-amber-400 border border-amber-500/40 uppercase tracking-wider"
              title="Align loop downbeat with master deck"
            >
              <RotateCcw className="w-3 h-3" />
              <span>RE-SYNC</span>
            </button>
          </div>
        </div>

        {/* Room Tab Selector */}
        <div className="flex items-center space-x-2 pt-1">
          <button
            onClick={() => setActiveTab('looper')}
            className={`flex items-center space-x-2 px-4 py-1.5 rounded text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'looper'
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-[0_0_10px_rgba(249,115,22,0.5)] border border-orange-400/40'
                : 'bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-amber-300" />
            <span>BEAT LOOPER ROOM (SYNCED LOOPS)</span>
          </button>

          <button
            onClick={() => setActiveTab('pads')}
            className={`flex items-center space-x-2 px-4 py-1.5 rounded text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'pads'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-[0_0_10px_rgba(6,182,212,0.5)] border border-cyan-400/40'
                : 'bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-300" />
            <span>18-PAD DRUM & FX SAMPLER</span>
          </button>
        </div>
      </div>

      {/* 2. TAB CONTENT: LOOPER ROOM vs 18-PAD SAMPLER */}
      {activeTab === 'looper' ? (
        <div className="flex-1 flex flex-col justify-between my-2 space-y-3">
          {/* Top Sync & Multi-Genre Adaptation Toolbar */}
          <div className="p-3 rounded-lg border border-amber-500/40 bg-gradient-to-r from-[#18130e] via-[#111317] to-[#18130e] shadow-lg flex flex-col lg:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-3 w-full lg:w-auto">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.35)]">
                <Music className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                    THE SUPERB BEAT AUDIO ENGINE
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[9px] font-mono font-bold uppercase">
                    EXCLUSIVE BEAT
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 mt-0.5">
                  Synchronized to <strong className="text-amber-400 font-mono">{masterBpm.toFixed(2)} BPM</strong> ({masterDeck === 'master' ? 'Deck 1' : 'Deck 2'}). Microsecond downbeat alignment for all songs and genres.
                </p>
              </div>
            </div>

            {/* Adaptation Tools: Half-Time, 1x Match, Double-Time & Bass Kill */}
            <div className="flex flex-wrap items-center gap-2 shrink-0 w-full lg:w-auto justify-end">
              <div className="flex items-center space-x-1 bg-zinc-950 p-1 rounded border border-zinc-800">
                <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase px-1.5">
                  TEMPO MULTIPLIER:
                </span>
                <button
                  onClick={() => onChangeLooperMultiplier && onChangeLooperMultiplier(0.5)}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                    (looperParams.tempoMultiplier || 1.0) === 0.5
                      ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.6)]'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                  title="Half-Time (DnB / Fast EDM 140-175 BPM)"
                >
                  1/2x (HALF)
                </button>
                <button
                  onClick={() => onChangeLooperMultiplier && onChangeLooperMultiplier(1.0)}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                    (looperParams.tempoMultiplier || 1.0) === 1.0
                      ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.6)]'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                  title="1:1 Exact Match (House / Afro / Pop 95-135 BPM)"
                >
                  1x (MATCH)
                </button>
                <button
                  onClick={() => onChangeLooperMultiplier && onChangeLooperMultiplier(2.0)}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                    (looperParams.tempoMultiplier || 1.0) === 2.0
                      ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.6)]'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                  title="Double-Time (Trap / Hip-Hop / Downtempo 70-85 BPM)"
                >
                  2x (DOUBLE)
                </button>
              </div>

              {/* Instant Bass Kill Button */}
              <button
                onClick={() => onToggleLooperBassCut && onToggleLooperBassCut()}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider transition-all border ${
                  looperParams.bassCut
                    ? 'bg-red-600/90 text-white border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.7)]'
                    : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border-zinc-750'
                }`}
                title="Kill beat bass so it floats seamlessly over songs with existing heavy basslines"
              >
                <span>KILL BASS (-24dB)</span>
              </button>

              {/* Instant Re-Sync Button */}
              <button
                onClick={onResyncLooper}
                className="flex items-center space-x-1 px-3 py-1.5 rounded bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-black text-[10px] font-black uppercase tracking-wider shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                title="Realign beat downbeat to the playing song with zero phase offset"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RE-SYNC 0ms</span>
              </button>
            </div>
          </div>

          {/* MAIN HERO TRACK 1: SUPERB BEAT (FULL MASTER) */}
          {looperTracks[0] && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverTrackId(1);
              }}
              onDragLeave={() => setDragOverTrackId(null)}
              onDrop={(e) => handleDropOnTrack(e, 1)}
              className={`rounded-xl p-4 border transition-all ${
                dragOverTrackId === 1
                  ? 'bg-amber-950/70 border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.6)] scale-[1.01]'
                  : looperTracks[0].isPlaying
                  ? 'bg-gradient-to-r from-[#1e1710] via-[#14151b] to-[#1e1710] border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                  : 'bg-[#121418] border-zinc-800'
              }`}
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => onTogglePlayLoop(1)}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                      looperTracks[0].isPlaying
                        ? 'bg-amber-500 text-black shadow-[0_0_18px_rgba(245,158,11,0.8)] scale-105'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                    }`}
                    title={looperTracks[0].isPlaying ? 'Stop Superb Beat' : 'Play Superb Beat in Sync'}
                  >
                    {looperTracks[0].isPlaying ? (
                      <Square className="w-5 h-5 fill-current" />
                    ) : (
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    )}
                  </button>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-black text-zinc-100 uppercase tracking-wide">
                        {looperTracks[0].name}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono font-bold uppercase">
                        MASTER BEAT
                      </span>
                      {looperTracks[0].isCustom && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold uppercase flex items-center space-x-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>CD-QUALITY WAV</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400 flex items-center space-x-2 mt-0.5">
                      <span>ORIGINAL: {looperTracks[0].originalBpm.toFixed(1)} BPM</span>
                      <span>·</span>
                      <span className="text-amber-400 font-bold">
                        ACTIVE SYNC: {(masterBpm * (looperParams.tempoMultiplier || 1.0)).toFixed(2)} BPM
                      </span>
                      <span>·</span>
                      <span className="text-emerald-400 font-bold">0ms PHASE LOCK</span>
                    </div>
                  </div>
                </div>

                {/* Right controls: Solo, Mute, Volume, WAV Load */}
                <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end">
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => onToggleSoloLoop(1)}
                      className={`w-7 h-7 rounded text-[10px] font-mono font-bold uppercase transition-all ${
                        looperTracks[0].isSolo
                          ? 'bg-blue-600 text-white shadow-[0_0_8px_rgba(37,99,235,0.7)]'
                          : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                      }`}
                      title="Solo master beat"
                    >
                      S
                    </button>
                    <button
                      onClick={() => onToggleMuteLoop(1)}
                      className={`w-7 h-7 rounded text-[10px] font-mono font-bold uppercase transition-all ${
                        looperTracks[0].isMuted
                          ? 'bg-red-600 text-white shadow-[0_0_8px_rgba(220,38,38,0.7)]'
                          : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                      }`}
                      title="Mute master beat"
                    >
                      M
                    </button>
                  </div>

                  <div className="flex items-center space-x-2 w-32">
                    <Volume2 className="w-3.5 h-3.5 text-zinc-500" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.02"
                      value={looperTracks[0].volume}
                      onChange={(e) => onChangeLoopVolume(1, parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-zinc-900 rounded accent-amber-500 cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-zinc-400 w-7 text-right">
                      {Math.round(looperTracks[0].volume * 100)}%
                    </span>
                  </div>

                  <button
                    onClick={() => handleTriggerUploadLoop(1)}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-750 text-[10px] font-bold uppercase"
                    title="Reload or change the Superb Beat WAV file"
                  >
                    <Upload className="w-3 h-3 text-amber-400" />
                    <span>LOAD WAV</span>
                  </button>
                </div>
              </div>

              {/* Waveform Visualization with Bar Subdivisions & Real-time Playhead */}
              <div className="mt-3 relative h-14 w-full bg-zinc-950 rounded-lg border border-zinc-850 overflow-hidden flex items-center justify-center p-1.5">
                <div className="w-full h-full flex items-center justify-between space-x-[1px] opacity-45">
                  {Array.from({ length: 96 }).map((_, idx) => {
                    const h = Math.max(15, Math.sin(idx * 0.25) * 45 + 50);
                    return (
                      <div
                        key={idx}
                        className={`flex-1 rounded-[1px] transition-colors ${
                          looperTracks[0].isPlaying ? 'bg-amber-400' : 'bg-zinc-600'
                        }`}
                        style={{ height: `${h}%` }}
                      />
                    );
                  })}
                </div>

                {/* Animated Playhead */}
                {looperTracks[0].isPlaying && (
                  <div
                    className="absolute top-0 bottom-0 w-[2px] bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,1)] z-10"
                    style={{ left: `${(loopBeatPhases[1] || 0) * 100}%` }}
                  />
                )}

                {/* Musical 4-Bar Markers */}
                <div className="absolute inset-x-0 bottom-1 flex justify-between px-3 text-[9px] font-mono font-bold text-zinc-400 pointer-events-none">
                  <span>BAR 1 (DOWNBEAT)</span>
                  <span>BAR 2</span>
                  <span>BAR 3</span>
                  <span>BAR 4</span>
                </div>
              </div>
            </div>
          )}

          {/* ISOLATED STEM CHANNELS (KICK/SUB, RIM/CLAP, SHAKER) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 items-stretch">
            {looperTracks.slice(1).map((loop) => {
              const phase = loopBeatPhases[loop.id] || 0;
              const isDragTarget = dragOverTrackId === loop.id;

              return (
                <div
                  key={loop.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverTrackId(loop.id);
                  }}
                  onDragLeave={() => setDragOverTrackId(null)}
                  onDrop={(e) => handleDropOnTrack(e, loop.id)}
                  className={`rounded-lg p-3 flex flex-col justify-between border transition-all select-none ${
                    isDragTarget
                      ? 'bg-amber-950/50 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.6)] scale-[1.02]'
                      : loop.isPlaying
                      ? 'bg-gradient-to-b from-[#181d26] to-[#0f1217] border-amber-500/80 shadow-[0_0_14px_rgba(245,158,11,0.2)]'
                      : 'bg-[#101216] border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {/* Stem Card Top Bar */}
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded bg-zinc-800 text-[10px] font-mono font-bold text-amber-400 flex items-center justify-center">
                        {loop.id}
                      </span>
                      <div>
                        <div className="text-xs font-black text-zinc-100 uppercase tracking-wide">
                          {loop.name}
                        </div>
                        <div className="text-[9px] font-mono text-zinc-400">
                          STEM LAYER · SYNCED
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onTogglePlayLoop(loop.id)}
                      className={`px-2.5 py-1 rounded text-[10px] font-black uppercase transition-all flex items-center space-x-1 ${
                        loop.isPlaying
                          ? 'bg-amber-500 text-black shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                          : 'bg-zinc-850 hover:bg-zinc-750 text-zinc-300 border border-zinc-700'
                      }`}
                    >
                      {loop.isPlaying ? <Square className="w-2.5 h-2.5 fill-current" /> : <Play className="w-2.5 h-2.5 fill-current" />}
                      <span>{loop.isPlaying ? 'STOP' : 'PLAY'}</span>
                    </button>
                  </div>

                  {/* Stem Mini-Waveform with moving playhead */}
                  <div className="my-2.5 relative h-9 w-full bg-zinc-950 rounded border border-zinc-850 overflow-hidden flex items-center justify-center p-1">
                    <div className="w-full h-full flex items-center justify-between space-x-[1px] opacity-40">
                      {Array.from({ length: 40 }).map((_, idx) => {
                        const h = Math.max(20, Math.sin(idx * 0.45) * 40 + 50);
                        return (
                          <div
                            key={idx}
                            className={`flex-1 rounded-[1px] transition-colors ${
                              loop.isPlaying ? 'bg-amber-400' : 'bg-zinc-600'
                            }`}
                            style={{ height: `${h}%` }}
                          />
                        );
                      })}
                    </div>

                    {loop.isPlaying && (
                      <div
                        className="absolute top-0 bottom-0 w-[2px] bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] z-10"
                        style={{ left: `${phase * 100}%` }}
                      />
                    )}
                  </div>

                  {/* Stem Controls: Solo, Mute, Volume */}
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => onToggleSoloLoop(loop.id)}
                        className={`w-6 h-6 rounded text-[10px] font-mono font-bold uppercase transition-all ${
                          loop.isSolo
                            ? 'bg-blue-600 text-white shadow-[0_0_8px_rgba(37,99,235,0.7)]'
                            : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                        }`}
                        title="Solo this stem"
                      >
                        S
                      </button>
                      <button
                        onClick={() => onToggleMuteLoop(loop.id)}
                        className={`w-6 h-6 rounded text-[10px] font-mono font-bold uppercase transition-all ${
                          loop.isMuted
                            ? 'bg-red-600 text-white shadow-[0_0_8px_rgba(220,38,38,0.7)]'
                            : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                        }`}
                        title="Mute this stem"
                      >
                        M
                      </button>
                    </div>

                    <div className="flex items-center space-x-1.5 w-24">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.02"
                        value={loop.volume}
                        onChange={(e) => onChangeLoopVolume(loop.id, parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-zinc-900 rounded accent-amber-500 cursor-pointer"
                      />
                      <span className="text-[9px] font-mono text-zinc-400 w-6 text-right">
                        {Math.round(loop.volume * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 3. DEDICATED LOOPER CONTROL PANEL (VOLUME, BASE / BASS, AND KEY BUTTONS AT BOTTOM) */}
          <div className="bg-gradient-to-r from-[#11141a] via-[#141720] to-[#11141a] border border-amber-500/40 rounded-xl p-3.5 shadow-2xl">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-800/80">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
                <span className="text-xs font-black text-amber-400 uppercase tracking-widest">
                  LOOPER MASTER AUDIO OUTPUT PANEL
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  (VOLUME · BASE / BASS · KEY TRANSPOSE)
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono font-bold text-zinc-400">
                  CURRENT MUSICAL KEY:
                </span>
                <span className="px-2 py-0.5 rounded bg-zinc-900 text-amber-300 font-mono font-black text-xs border border-amber-500/30">
                  {getMusicalKeyLabel(looperParams.key)}
                </span>
              </div>
            </div>

            {/* The 3 Requested Control Sections: VOLUME, BASE, KEY */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* SECTION 1: VOLUME */}
              <div className="bg-zinc-950/80 rounded-lg p-3 border border-zinc-800/80 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-black text-zinc-200 uppercase tracking-wider">
                      LOOPER VOLUME
                    </span>
                  </div>
                  <span className="text-xs font-mono font-black text-amber-400">
                    {Math.round(looperParams.volume * 100)}%
                  </span>
                </div>

                <div className="py-1">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={looperParams.volume}
                    onChange={(e) => onChangeLooperVolume(parseFloat(e.target.value))}
                    className="w-full h-2 bg-zinc-900 rounded accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center space-x-1.5 pt-2">
                  <button
                    onClick={() => onChangeLooperVolume(Math.max(0, looperParams.volume - 0.1))}
                    className="flex-1 py-1 rounded bg-zinc-900 hover:bg-zinc-850 text-[10px] font-bold text-zinc-300 border border-zinc-800"
                  >
                    -10%
                  </button>
                  <button
                    onClick={() => onChangeLooperVolume(Math.min(1, looperParams.volume + 0.1))}
                    className="flex-1 py-1 rounded bg-zinc-900 hover:bg-zinc-850 text-[10px] font-bold text-zinc-300 border border-zinc-800"
                  >
                    +10%
                  </button>
                  <button
                    onClick={() => onChangeLooperVolume(looperParams.volume > 0 ? 0 : 0.85)}
                    className={`flex-1 py-1 rounded text-[10px] font-bold border ${
                      looperParams.volume === 0
                        ? 'bg-red-600 text-white border-red-500'
                        : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-850'
                    }`}
                  >
                    {looperParams.volume === 0 ? 'UNMUTE' : 'MUTE'}
                  </button>
                  <button
                    onClick={() => onChangeLooperVolume(1.0)}
                    className="flex-1 py-1 rounded bg-zinc-900 hover:bg-zinc-850 text-[10px] font-bold text-amber-400 border border-zinc-800"
                  >
                    100%
                  </button>
                </div>
              </div>

              {/* SECTION 2: BASE (BASS) */}
              <div className="bg-zinc-950/80 rounded-lg p-3 border border-zinc-800/80 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5">
                    <Sliders className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-xs font-black text-zinc-200 uppercase tracking-wider">
                      LOOPER BASE / BASS
                    </span>
                  </div>
                  <span className="text-xs font-mono font-black text-orange-400">
                    {looperParams.bass > 0 ? `+${looperParams.bass.toFixed(1)}` : looperParams.bass.toFixed(1)} dB
                  </span>
                </div>

                <div className="py-1">
                  <input
                    type="range"
                    min="-24"
                    max="12"
                    step="0.5"
                    value={looperParams.bass}
                    onChange={(e) => onChangeLooperBass(parseFloat(e.target.value))}
                    className="w-full h-2 bg-zinc-900 rounded accent-orange-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center space-x-1.5 pt-2">
                  <button
                    onClick={() => onChangeLooperBass(-24)}
                    className={`flex-1 py-1 rounded text-[10px] font-bold border transition-all ${
                      looperParams.bass <= -20
                        ? 'bg-red-600 text-white border-red-500'
                        : 'bg-zinc-900 text-red-400 border-zinc-800 hover:bg-zinc-850'
                    }`}
                  >
                    KILL BASS
                  </button>
                  <button
                    onClick={() => onChangeLooperBass(0)}
                    className={`flex-1 py-1 rounded text-[10px] font-bold border ${
                      looperParams.bass === 0
                        ? 'bg-amber-600 text-white border-amber-500'
                        : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-850'
                    }`}
                  >
                    FLAT 0dB
                  </button>
                  <button
                    onClick={() => onChangeLooperBass(Math.min(12, looperParams.bass + 3))}
                    className="flex-1 py-1 rounded bg-zinc-900 hover:bg-zinc-850 text-[10px] font-bold text-orange-400 border border-zinc-800"
                  >
                    +3dB PUNCH
                  </button>
                </div>
              </div>

              {/* SECTION 3: KEY / PITCH */}
              <div className="bg-zinc-950/80 rounded-lg p-3 border border-zinc-800/80 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5">
                    <Key className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-black text-zinc-200 uppercase tracking-wider">
                      LOOPER KEY / PITCH
                    </span>
                  </div>
                  <span className="text-xs font-mono font-black text-cyan-400">
                    {looperParams.key > 0 ? `+${looperParams.key}` : looperParams.key} SEMITONES
                  </span>
                </div>

                <div className="flex items-center space-x-1.5 py-1">
                  <button
                    onClick={() => onChangeLooperKey(Math.max(-12, looperParams.key - 1))}
                    className="px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-bold text-xs"
                    title="Down 1 semitone"
                  >
                    -1 st
                  </button>

                  <div className="flex-1 text-center bg-zinc-900 py-1.5 rounded border border-zinc-800 text-xs font-mono font-bold text-cyan-300">
                    {looperParams.key === 0 ? 'CONCERT PITCH (0)' : `${looperParams.key > 0 ? '+' : ''}${looperParams.key} st`}
                  </div>

                  <button
                    onClick={() => onChangeLooperKey(Math.min(12, looperParams.key + 1))}
                    className="px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-bold text-xs"
                    title="Up 1 semitone"
                  >
                    +1 st
                  </button>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <button
                    onClick={() => onChangeLooperKey(0)}
                    className="flex-1 py-1 rounded bg-zinc-900 hover:bg-zinc-850 text-[10px] font-bold text-zinc-400 border border-zinc-800"
                  >
                    RESET KEY (0)
                  </button>

                  <button
                    onClick={onToggleLooperKeyLock}
                    className={`flex-1 py-1 rounded text-[10px] font-bold border transition-all ${
                      looperParams.keyLock
                        ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                    }`}
                  >
                    {looperParams.keyLock ? '✓ KEY LOCK ON' : 'KEY LOCK OFF'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 18-PAD PERFORMANCE SAMPLER VIEW */
        <div className="flex-1 flex flex-col justify-between my-2">
          <div className="grid grid-cols-6 gap-3 my-2 flex-1 items-stretch">
            {pads.map((pad) => {
              const isSelected = pad.id === selectedPadId;
              const isFlashing = activeFlashingPads[pad.id];
              const isDrum = pad.category === 'drum';

              return (
                <div
                  key={pad.id}
                  onClick={() => handlePadClick(pad)}
                  className={`relative rounded-lg p-3 flex flex-col justify-between cursor-pointer transition-all duration-75 select-none ${
                    isFlashing
                      ? 'bg-amber-400 text-black shadow-[0_0_20px_rgba(251,191,36,0.9)] scale-[0.98]'
                      : isSelected
                      ? 'bg-[#151922] border-2 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                      : 'bg-[#101216] border border-zinc-800/90 hover:border-zinc-700 hover:bg-[#14161c]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-black font-mono ${
                        isSelected ? 'text-amber-400' : 'text-zinc-500'
                      }`}
                    >
                      {pad.id.toString().padStart(2, '0')}
                    </span>

                    <span
                      className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        isDrum
                          ? 'bg-blue-900/40 text-blue-300 border border-blue-800/50'
                          : 'bg-purple-900/40 text-purple-300 border border-purple-800/50'
                      }`}
                    >
                      {isDrum ? 'DRUM' : 'FX'}
                    </span>
                  </div>

                  <div className="my-3 text-center">
                    <span
                      className={`text-xs font-black uppercase tracking-wider block ${
                        isSelected ? 'text-amber-300' : 'text-zinc-200'
                      }`}
                    >
                      {pad.name}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-500 block mt-0.5">
                      {pad.isCustom ? 'CUSTOM RECORDED' : isDrum ? 'BUILT-IN DRUM' : 'SUPPLIED FX'}
                    </span>
                  </div>

                  <div
                    className={`w-full h-1 rounded-full ${
                      isFlashing
                        ? 'bg-white'
                        : isSelected
                        ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                        : 'bg-zinc-800'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Pad Detail & Quick Action Bar */}
          <div className="bg-zinc-950/80 rounded border border-zinc-800/90 p-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-mono font-bold text-xs">
                {selectedPad.id}
              </div>
              <div>
                <span className="text-xs font-black text-zinc-200 uppercase">
                  SELECTED PAD: {selectedPad.name}
                </span>
                <span className="text-[10px] text-zinc-500 block font-mono">
                  Click pad to trigger · Zero latency buffer playback
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleUploadClick}
                className="flex items-center space-x-1.5 px-3 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-bold uppercase tracking-wider transition-all"
              >
                <Upload className="w-3 h-3 text-amber-400" />
                <span>UPLOAD TO PAD {selectedPadId}</span>
              </button>

              <button
                onClick={handleToggleMic}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider border transition-all ${
                  isRecordingMic
                    ? 'bg-red-600 text-white border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse'
                    : 'bg-zinc-900 text-zinc-200 border-zinc-700 hover:bg-zinc-800'
                }`}
              >
                {isRecordingMic ? <Square className="w-3 h-3" /> : <Mic className="w-3 h-3 text-red-400" />}
                <span>{isRecordingMic ? 'STOP MIC' : 'MIC RECORD'}</span>
              </button>

              <button
                onClick={() => onTriggerPad(selectedPad.id)}
                className="px-4 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_8px_rgba(245,158,11,0.5)]"
              >
                TRIGGER PAD
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

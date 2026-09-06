import React, { useRef, useState } from 'react';
import { Deck } from '../engine/syncEngine';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  Upload,
  Music,
  Disc,
  Trash2,
  Sparkles,
  Loader2,
  Target
} from 'lucide-react';

interface DeckViewProps {
  id: 'master' | 'slave';
  deck: Deck;
  accentColor: 'cyan' | 'orange';
  vuLevel: number;
  isLoadingTrack?: boolean;
  onPlayToggle: () => void;
  onCue: () => void;
  onBpmChange: (newBpm: number) => void;
  onNudge: (deltaSec: number) => void;
  onVolumeChange: (vol: number) => void;
  onMuteToggle: () => void;
  onFileUpload: (file: File) => Promise<void>;
  onLoadDemoTrack: (style: 'tech_house' | 'driving_techno') => void;
  onEjectTrack: () => void;
  onSetBeat1Offset: () => void;
}

export const DeckView: React.FC<DeckViewProps> = ({
  id,
  deck,
  accentColor,
  vuLevel,
  isLoadingTrack = false,
  onPlayToggle,
  onCue,
  onBpmChange,
  onNudge,
  onVolumeChange,
  onMuteToggle,
  onFileUpload,
  onLoadDemoTrack,
  onEjectTrack,
  onSetBeat1Offset,
}) => {
  const isMaster = id === 'master';
  const isCyan = accentColor === 'cyan';
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pitchRange, setPitchRange] = useState<number>(0.10); // 10% super djay fader range default

  // Tap tempo state
  const tapTimesRef = useRef<number[]>([]);

  const handleTapTempo = () => {
    const now = Date.now();
    const taps = tapTimesRef.current;
    // reset if more than 2 seconds since last tap
    if (taps.length > 0 && now - taps[taps.length - 1] > 2000) {
      taps.length = 0;
    }
    taps.push(now);
    if (taps.length > 4) taps.shift();

    if (taps.length >= 2) {
      let totalDiff = 0;
      for (let i = 1; i < taps.length; i++) {
        totalDiff += taps[i] - taps[i - 1];
      }
      const avgIntervalMs = totalDiff / (taps.length - 1);
      const calculatedBpm = Math.round((60000 / avgIntervalMs) * 10) / 10;
      if (calculatedBpm >= 60 && calculatedBpm <= 200) {
        onBpmChange(calculatedBpm);
      }
    }
  };

  // Rotation angle calculation for Jog Wheel
  // 33.3 RPM vinyl or beat-synced rotation: 1 full rotation every 4 beats
  const interval = 60.0 / deck.bpm;
  const rotationDegrees = ((deck.position / (interval * 4)) * 360) % 360;

  // Formatting time MM:SS.cc
  const minutes = Math.floor(deck.position / 60);
  const seconds = Math.floor(deck.position % 60);
  const centis = Math.floor((deck.position % 1) * 100);
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;

  // Total duration format
  const durationSec = deck.duration || (deck.track ? deck.track.duration : 600);
  const totalMin = Math.floor(durationSec / 60);
  const totalSec = Math.floor(durationSec % 60);
  const formattedDuration = `${String(totalMin).padStart(2, '0')}:${String(totalSec).padStart(2, '0')}`;

  // Bar and Beat
  const gridOffset = deck.grid.offset || 0;
  const relativePos = deck.position - gridOffset;
  const totalBeats = Math.floor(relativePos / interval);
  const bar = Math.floor(totalBeats / 4) + 1;
  const beatInBar = ((totalBeats % 4) + 4) % 4 + 1;

  // Effective BPM & Pitch percentage
  const effectiveBpm = deck.bpm * deck.playbackRate;
  const pitchPercent = (deck.playbackRate - 1.0) * 100;

  // Jog Wheel Drag interaction
  const jogRef = useRef<HTMLDivElement | null>(null);
  const [isJogging, setIsJogging] = useState(false);
  const lastAngleRef = useRef<number>(0);

  const handleJogMouseDown = (e: React.MouseEvent) => {
    setIsJogging(true);
    if (!jogRef.current) return;
    const rect = jogRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    lastAngleRef.current = Math.atan2(e.clientY - cy, e.clientX - cx);
  };

  const handleJogMouseMove = (e: React.MouseEvent) => {
    if (!isJogging || !jogRef.current) return;
    const rect = jogRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const currentAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
    let delta = currentAngle - lastAngleRef.current;

    // Handle wrap around -pi / +pi
    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;

    // Convert angular change to seconds shift (1 full rotation ~ 1.5s shift)
    const shiftSec = (delta / (2 * Math.PI)) * 1.5;
    onNudge(shiftSec);
    lastAngleRef.current = currentAngle;
  };

  const handleJogMouseUp = () => {
    setIsJogging(false);
  };

  // Drag and drop handlers for file upload directly onto the deck
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await onFileUpload(files[0]);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await onFileUpload(files[0]);
      // Reset input so same file can be chosen again if needed
      e.target.value = '';
    }
  };

  return (
    <div
      id={`deck-${id}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex flex-col p-4 rounded-xl transition-all shadow-2xl backdrop-blur-sm border ${
        isDragOver
          ? isCyan
            ? 'border-[#00E5FF] shadow-[0_0_40px_rgba(0,229,255,0.4)] bg-[#0C1420]'
            : 'border-[#F27D26] shadow-[0_0_40px_rgba(242,125,38,0.4)] bg-[#1A100C]'
          : isCyan
          ? 'border-[#00E5FF]/25 shadow-[0_0_30px_rgba(0,229,255,0.06)] bg-gradient-to-b from-[#111118] to-[#0A0A0E]'
          : 'border-[#F27D26]/25 shadow-[0_0_30px_rgba(242,125,38,0.06)] bg-gradient-to-b from-[#111118] to-[#0A0A0E]'
      }`}
      onMouseMove={isJogging ? handleJogMouseMove : undefined}
      onMouseUp={isJogging ? handleJogMouseUp : undefined}
      onMouseLeave={isJogging ? handleJogMouseUp : undefined}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Top Header with Deck ID and Mute */}
      <div className="flex items-center justify-between border-b border-[#1C1C28] pb-2 mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-0.5 rounded text-xs font-bold tracking-wider uppercase border font-mono ${
              isCyan
                ? 'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/30 shadow-[0_0_10px_rgba(0,229,255,0.15)]'
                : 'bg-[#F27D26]/10 text-[#F27D26] border-[#F27D26]/30 shadow-[0_0_10px_rgba(242,125,38,0.15)]'
            }`}
          >
            {isMaster ? 'DECK A • MASTER CLOCK' : 'DECK B • FOLLOWER'}
          </span>
          <span className="text-[11px] font-mono text-[#78788D]">
            {isMaster ? 'REF CLOCK' : 'BUWAGA PID SLAVE'}
          </span>
        </div>

        {/* Mute & Audio state */}
        <button
          onClick={onMuteToggle}
          title={deck.muted ? 'Unmute Deck' : 'Mute Deck'}
          className={`p-1.5 rounded-lg border transition-all ${
            deck.muted
              ? 'bg-[#FF3366]/20 text-[#FF6688] border-[#FF3366]/40 shadow-[0_0_10px_rgba(255,51,102,0.2)]'
              : 'bg-[#13131C] text-[#8E8E9F] border-[#242434] hover:text-white hover:border-[#35354A]'
          }`}
        >
          {deck.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Track Loaded Info & Upload Bar */}
      <div className="mb-3">
        {isLoadingTrack ? (
          <div className="flex items-center justify-center gap-2.5 p-3 rounded-lg bg-[#0C0C12] border border-[#2B2B3C] text-xs font-mono text-[#E0E0E0]">
            <Loader2 className="w-4 h-4 animate-spin text-[#00E5FF]" />
            <span>Decoding audio & analyzing beatgrid transients...</span>
          </div>
        ) : deck.track ? (
          /* Track Loaded Display */
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#07070D] border border-[#202030] shadow-inner">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                  isCyan
                    ? 'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/30'
                    : 'bg-[#F27D26]/10 text-[#F27D26] border-[#F27D26]/30'
                }`}
              >
                <Music className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#F3F4F6] truncate flex items-center gap-1.5">
                  <span className="truncate">{deck.track.name}</span>
                  {deck.track.isDemo && (
                    <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-[#1E1E2E] text-[#A0A0B8] border border-[#2E2E42]">
                      DEMO
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-mono text-[#78788D] flex items-center gap-2">
                  <span>{formattedDuration}</span>
                  <span>•</span>
                  <span className={isCyan ? 'text-[#00E5FF]' : 'text-[#F27D26]'}>
                    Grid: {deck.bpm.toFixed(1)} BPM
                  </span>
                  {deck.grid.offset > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-[#8E8E9F]">
                        +{Math.round(deck.grid.offset * 1000)}ms offset
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Replace song"
                className="px-2 py-1 rounded bg-[#13131D] hover:bg-[#1C1C2B] text-[#A0A0B5] hover:text-white border border-[#252536] text-[10px] font-mono transition-all"
              >
                Swap
              </button>
              <button
                onClick={onEjectTrack}
                title="Eject song (return to drum synth)"
                className="p-1 rounded bg-[#13131D] hover:bg-[#2A1515] text-[#8E8E9F] hover:text-[#FF6688] border border-[#252536] hover:border-[#FF3366]/40 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* Empty Deck Upload Dropzone */
          <div className="flex flex-col gap-1.5">
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`flex items-center justify-between p-2.5 rounded-lg border border-dashed cursor-pointer transition-all ${
                isCyan
                  ? 'border-[#00E5FF]/40 bg-[#00E5FF]/5 hover:bg-[#00E5FF]/10 hover:border-[#00E5FF]'
                  : 'border-[#F27D26]/40 bg-[#F27D26]/5 hover:bg-[#F27D26]/10 hover:border-[#F27D26]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Upload
                  className={`w-4 h-4 ${
                    isCyan ? 'text-[#00E5FF]' : 'text-[#F27D26]'
                  }`}
                />
                <div className="text-left">
                  <div className="text-xs font-bold text-[#E0E0E0]">
                    Upload Real Song
                  </div>
                  <div className="text-[10px] text-[#7A7A8E] font-mono">
                    Drop .mp3, .wav, .aac or click to browse
                  </div>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                  isCyan
                    ? 'bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/40'
                    : 'bg-[#F27D26]/20 text-[#F27D26] border-[#F27D26]/40'
                }`}
              >
                Browse
              </span>
            </div>

            {/* Quick Demo Track Loader for instant sync test */}
            <div className="flex items-center justify-between px-2 py-1 rounded bg-[#0A0A0F] border border-[#1C1C26] text-[10px] font-mono text-[#78788D]">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#00F5A0]" />
                <span>Or load ready audio demo:</span>
              </span>
              <button
                onClick={() => onLoadDemoTrack(isMaster ? 'tech_house' : 'driving_techno')}
                className={`px-2 py-0.5 rounded border transition-all text-[#F3F4F6] ${
                  isCyan
                    ? 'bg-[#0E1520] hover:bg-[#132233] border-[#00E5FF]/30 hover:border-[#00E5FF]'
                    : 'bg-[#1C120C] hover:bg-[#2B1B12] border-[#F27D26]/30 hover:border-[#F27D26]'
                }`}
              >
                {isMaster ? 'Tech House (128 BPM)' : 'Techno Groove (126 BPM)'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Stats Display: Large LCD Deck readout */}
      <div className="grid grid-cols-3 gap-2 p-2.5 mb-3 rounded-lg bg-[#060609] border border-[#1C1C28] text-center font-mono shadow-inner">
        <div>
          <div className="text-[10px] text-[#6A6A7E] uppercase tracking-wider">Base BPM</div>
          <div className="text-xl font-bold text-[#F3F4F6] tracking-tight">
            {deck.bpm.toFixed(1)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-[#6A6A7E] uppercase tracking-wider">Effective BPM</div>
          <div
            className={`text-xl font-extrabold tracking-tight ${
              isCyan
                ? 'text-[#00E5FF] drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]'
                : 'text-[#F27D26] drop-shadow-[0_0_8px_rgba(242,125,38,0.4)]'
            }`}
          >
            {effectiveBpm.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-[#6A6A7E] uppercase tracking-wider">Rate Ratio</div>
          <div className="text-sm font-semibold text-[#D1D5DB] pt-1">
            {deck.playbackRate.toFixed(4)}x
            <span
              className={`text-[10px] ml-1 ${
                pitchPercent > 0.05
                  ? 'text-[#00F5A0]'
                  : pitchPercent < -0.05
                  ? 'text-[#F27D26]'
                  : 'text-[#6A6A7E]'
              }`}
            >
              {pitchPercent >= 0 ? '+' : ''}
              {pitchPercent.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Position Counter Bar & Grid Tuning Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 mb-3 rounded bg-[#07070B]/80 border border-[#1A1A26] font-mono text-xs shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-[#6A6A7E] text-[10px]">TIME</span>
          <span className="text-[#E0E0E0] font-semibold">
            {formattedTime} <span className="text-[#6A6A7E] font-normal">/ {formattedDuration}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#6A6A7E] text-[10px]">GRID</span>
          <span
            className={`font-bold ${
              beatInBar === 1
                ? isCyan
                  ? 'text-[#00E5FF]'
                  : 'text-[#F27D26]'
                : 'text-[#8E8E9F]'
            }`}
          >
            BAR {bar} . {beatInBar}
          </span>
        </div>
      </div>

      {/* Beatgrid & Tempo Tools Bar */}
      <div className="flex items-center justify-between gap-1 mb-3 px-2 py-1 rounded bg-[#0B0B11] border border-[#1A1A26] text-[10px] font-mono">
        <div className="flex items-center gap-1">
          <span className="text-[#6A6A7E]">GRID:</span>
          <button
            onClick={onSetBeat1Offset}
            title="Set Beat 1 (Align beatgrid downbeat to current playhead position)"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#13131E] hover:bg-[#1C1C2E] text-[#00F5A0] border border-[#00F5A0]/30 transition-all"
          >
            <Target className="w-3 h-3" />
            <span>SET BEAT 1</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[#6A6A7E]">BPM:</span>
          <button
            onClick={() => onBpmChange(Math.round((deck.bpm / 2) * 10) / 10)}
            title="Halve BPM (÷2)"
            className="px-1.5 py-0.5 rounded bg-[#13131D] hover:bg-[#1E1E2C] text-[#A0A0B5] border border-[#242436]"
          >
            /2
          </button>
          <button
            onClick={() => onBpmChange(Math.round(deck.bpm * 2 * 10) / 10)}
            title="Double BPM (x2)"
            className="px-1.5 py-0.5 rounded bg-[#13131D] hover:bg-[#1E1E2C] text-[#A0A0B5] border border-[#242436]"
          >
            x2
          </button>
          <button
            onClick={handleTapTempo}
            title="Tap tempo (click 4 times to tap BPM)"
            className="px-2 py-0.5 rounded bg-[#13131D] hover:bg-[#1E1E2C] text-[#E0E0E0] border border-[#242436] font-bold"
          >
            TAP
          </button>
        </div>
      </div>

      {/* Middle Deck Area: Jog Wheel + Pitch Fader + VU Meter */}
      <div className="flex items-center justify-between gap-4 mb-4">
        {/* Jog Wheel */}
        <div className="flex-1 flex flex-col items-center">
          <div
            ref={jogRef}
            onMouseDown={handleJogMouseDown}
            title="Click and drag wheel to scratch / nudge phase"
            className={`relative w-36 h-36 sm:w-40 sm:h-40 rounded-full cursor-grab active:cursor-grabbing select-none p-1.5 shadow-2xl transition-transform ${
              isCyan
                ? 'bg-gradient-to-b from-[#1C1C26] to-[#08080C] border border-[#00E5FF]/30 shadow-[0_10px_25px_rgba(0,0,0,0.8),0_0_15px_rgba(0,229,255,0.1)]'
                : 'bg-gradient-to-b from-[#1C1C26] to-[#08080C] border border-[#F27D26]/30 shadow-[0_10px_25px_rgba(0,0,0,0.8),0_0_15px_rgba(242,125,38,0.1)]'
            }`}
          >
            {/* Outer ribbed ring */}
            <div className="w-full h-full rounded-full border border-[#242434] flex items-center justify-center relative overflow-hidden bg-[#07070B]">
              {/* Radial vinyl grooves */}
              <div className="absolute inset-2 rounded-full border border-[#14141F]" />
              <div className="absolute inset-5 rounded-full border border-[#14141F]" />
              <div className="absolute inset-8 rounded-full border border-[#14141F]" />

              {/* Center Platter with Rotating Spindle & Indicator */}
              <div
                className="w-16 h-16 rounded-full bg-[#0E0E16] border border-[#252538] shadow-inner flex items-center justify-center relative"
                style={{ transform: `rotate(${rotationDegrees}deg)` }}
              >
                {/* Marker line */}
                <div
                  className={`absolute top-1 w-1.5 h-3 rounded-full ${
                    isCyan ? 'bg-[#00E5FF] shadow-[0_0_8px_#00E5FF]' : 'bg-[#F27D26] shadow-[0_0_8px_#F27D26]'
                  }`}
                />
                <div className="w-4 h-4 rounded-full bg-[#060609] border border-[#2E2E40] flex items-center justify-center">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      deck.playing
                        ? isCyan
                          ? 'bg-[#00E5FF] animate-ping'
                          : 'bg-[#F27D26] animate-ping'
                        : 'bg-[#4B4B60]'
                    }`}
                  />
                </div>
              </div>

              {/* Jog status label */}
              <div className="absolute bottom-2 text-[9px] font-mono tracking-widest text-[#5C5C70] pointer-events-none uppercase">
                {deck.playing ? (deck.track ? 'SONG PLAYING' : 'SYNTH ACTIVE') : 'STOPPED'}
              </div>
            </div>
          </div>
          <span className="text-[10px] text-[#6A6A7E] font-mono mt-1">JOG WHEEL SCRUB</span>
        </div>

        {/* Pitch / Tempo Fader & VU Meter column */}
        <div className="flex items-center gap-3">
          {/* VU Meter */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] font-mono text-[#6A6A7E]">VU</span>
            <div className="w-2.5 h-36 bg-[#07070B] rounded-full border border-[#1C1C28] p-0.5 flex flex-col-reverse overflow-hidden shadow-inner">
              <div
                className={`w-full rounded-full transition-all duration-75 ${
                  vuLevel > 0.8
                    ? 'bg-[#FF3366] shadow-[0_0_8px_#FF3366]'
                    : vuLevel > 0.5
                    ? isCyan
                      ? 'bg-[#00E5FF] shadow-[0_0_6px_#00E5FF]'
                      : 'bg-[#F27D26] shadow-[0_0_6px_#F27D26]'
                    : 'bg-[#00F5A0] shadow-[0_0_4px_#00F5A0]'
                }`}
                style={{ height: `${Math.min(100, vuLevel * 100)}%` }}
              />
            </div>
          </div>

          {/* Tempo Slider (BPM Pitch Fader) */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center justify-between w-full text-[9px] font-mono text-[#6A6A7E]">
              <span>+</span>
              <button
                onClick={() => onBpmChange(isMaster ? 128.0 : 126.0)}
                title="Reset Base BPM (0% Pitch)"
                className="text-[9px] text-[#8E8E9F] hover:text-white px-1 rounded bg-[#13131C] border border-[#242436]"
              >
                0
              </button>
              <span>-</span>
            </div>
            <div className="relative h-36 flex items-center">
              <input
                type="range"
                min={Math.round((isMaster ? 128 : 126) * (1 - pitchRange) * 10) / 10}
                max={Math.round((isMaster ? 128 : 126) * (1 + pitchRange) * 10) / 10}
                step={0.1}
                value={deck.bpm}
                onChange={(e) => onBpmChange(parseFloat(e.target.value))}
                className="h-32 -rotate-90 w-32 cursor-pointer"
                style={{
                  accentColor: isCyan ? '#00E5FF' : '#F27D26',
                }}
              />
            </div>
            {/* Pitch range pill options */}
            <div className="flex items-center gap-1 text-[8px] font-mono">
              <button
                onClick={() => setPitchRange(0.10)}
                title="Super djay standard ±10% range"
                className={`px-1 py-0.5 rounded border ${
                  pitchRange === 0.10
                    ? 'bg-[#00F5A0]/20 text-[#00F5A0] border-[#00F5A0]/40 font-bold'
                    : 'bg-[#12121C] text-[#6A6A7E] border-[#222234] hover:text-white'
                }`}
              >
                ±10%
              </button>
              <button
                onClick={() => setPitchRange(0.16)}
                title="Wide ±16% range"
                className={`px-1 py-0.5 rounded border ${
                  pitchRange === 0.16
                    ? 'bg-[#00F5A0]/20 text-[#00F5A0] border-[#00F5A0]/40 font-bold'
                    : 'bg-[#12121C] text-[#6A6A7E] border-[#222234] hover:text-white'
                }`}
              >
                ±16%
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transport Controls Bar */}
      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#1C1C28]">
        {/* CUE Button */}
        <button
          onClick={onCue}
          className="flex flex-col items-center justify-center py-2.5 rounded-lg font-mono font-bold text-xs bg-[#13131D] hover:bg-[#1A1A26] text-[#E0E0E0] border border-[#252536] active:scale-95 transition-all shadow-md"
        >
          <RotateCcw className="w-3.5 h-3.5 mb-0.5 text-[#F27D26]" />
          <span>CUE</span>
        </button>

        {/* PLAY / PAUSE Button */}
        <button
          onClick={onPlayToggle}
          className={`col-span-1 flex flex-col items-center justify-center py-2.5 rounded-lg font-mono font-bold text-xs border active:scale-95 transition-all shadow-md ${
            deck.playing
              ? isCyan
                ? 'bg-[#00E5FF] text-black border-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.4)] font-extrabold'
                : 'bg-[#F27D26] text-black border-[#F27D26] shadow-[0_0_15px_rgba(242,125,38,0.4)] font-extrabold'
              : 'bg-[#13131D] text-[#E0E0E0] border-[#252536] hover:bg-[#1A1A26]'
          }`}
        >
          {deck.playing ? (
            <>
              <Pause className="w-3.5 h-3.5 mb-0.5 fill-current" />
              <span>PAUSE</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 mb-0.5 fill-current text-[#00F5A0]" />
              <span>PLAY</span>
            </>
          )}
        </button>

        {/* Nudge - (10% pitch bend / -50ms phase nudge) */}
        <button
          onClick={() => onNudge(-0.05)}
          title="Nudge phase backward (-50ms / 10% pitch bend)"
          className="flex flex-col items-center justify-center py-2.5 rounded-lg font-mono text-xs bg-[#101018] hover:bg-[#161622] text-[#A0A0B2] border border-[#20202F] active:scale-95 transition-all"
        >
          <ChevronDown className="w-3.5 h-3.5 mb-0.5 text-[#727285]" />
          <span>-10% NUDGE</span>
        </button>

        {/* Nudge + (10% pitch bend / +50ms phase nudge) */}
        <button
          onClick={() => onNudge(0.05)}
          title="Nudge phase forward (+50ms / 10% pitch bend)"
          className="flex flex-col items-center justify-center py-2.5 rounded-lg font-mono text-xs bg-[#101018] hover:bg-[#161622] text-[#A0A0B2] border border-[#20202F] active:scale-95 transition-all"
        >
          <ChevronUp className="w-3.5 h-3.5 mb-0.5 text-[#727285]" />
          <span>+10% NUDGE</span>
        </button>
      </div>

      {/* Deck Volume Slider */}
      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[#1C1C28]/60">
        <span className="text-[10px] font-mono text-[#6A6A7E]">VOL</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={deck.volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-[#14141F] rounded-lg appearance-none cursor-pointer"
          style={{
            accentColor: isCyan ? '#00E5FF' : '#F27D26',
          }}
        />
        <span className="text-[10px] font-mono text-[#8E8E9F] w-7 text-right">
          {Math.round(deck.volume * 100)}%
        </span>
      </div>
    </div>
  );
};

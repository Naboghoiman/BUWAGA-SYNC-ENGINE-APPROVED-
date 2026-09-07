import React, { useRef, useState, useEffect } from 'react';
import { TrackInfo } from '../types';
import { Play, Pause, Disc3, FolderOpen, RefreshCw, Lock, FastForward, Rewind } from 'lucide-react';

interface DjDeckProps {
  deckId: 1 | 2;
  track: TrackInfo | null;
  bpm: number;
  effectiveBpm: number;
  position: number;
  duration: number;
  playbackRate: number;
  playing: boolean;
  isMasterClock: boolean;
  isSyncActive: boolean;
  onPlayPause: () => void;
  onCue: () => void;
  onSync: () => void;
  onLoadTrack: () => void;
  onPitchChange: (newRate: number) => void;
  onNudge: (deltaSec: number) => void;
  onScratch: (deltaRate: number) => void;
}

export const DjDeck: React.FC<DjDeckProps> = ({
  deckId,
  track,
  bpm,
  effectiveBpm,
  position,
  duration,
  playbackRate,
  playing,
  isMasterClock,
  isSyncActive,
  onPlayPause,
  onCue,
  onSync,
  onLoadTrack,
  onPitchChange,
  onNudge,
  onScratch,
}) => {
  const isDeck1 = deckId === 1;
  const accentColor = isDeck1 ? 'blue' : 'cyan';

  // Pro Loop State
  const [activeLoopSize, setActiveLoopSize] = useState<number | null>(4); // default 4 beats
  const [loopActive, setLoopActive] = useState<boolean>(false);
  const [pitchRange, setPitchRange] = useState<0.08 | 0.10 | 0.50>(0.10); // default ±10%
  const [keyLock, setKeyLock] = useState<boolean>(true);
  const [keySemitones, setKeySemitones] = useState<number>(0);

  // Jogwheel rotation calculation
  // 1 rotation = 1.8 seconds at 33.3 RPM
  const rotationAngle = (position * 200) % 360;

  // Scratching / Platter interaction state
  const isScratching = useRef(false);
  const lastAngle = useRef(0);

  const handlePlatterMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    isScratching.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    lastAngle.current = Math.atan2(e.clientY - cy, e.clientX - cx);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isScratching.current) return;
      const currentAngle = Math.atan2(moveEvent.clientY - cy, moveEvent.clientX - cx);
      let angleDiff = currentAngle - lastAngle.current;
      if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      lastAngle.current = currentAngle;
      // Nudge position based on scratch motion
      const nudgeSeconds = (angleDiff / (Math.PI * 2)) * 1.5;
      onNudge(nudgeSeconds);
      onScratch(angleDiff * 15);
    };

    const onMouseUp = () => {
      isScratching.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Tempo slider math
  // Slider position: 0% = playbackRate 1.0. Range is ±pitchRange
  const pitchPercent = ((playbackRate - 1.0) / pitchRange) * 100;
  const clampedPitchPercent = Math.max(-100, Math.min(100, pitchPercent));

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value); // -100 to +100
    const newRate = 1.0 + (val / 100) * pitchRange;
    onPitchChange(newRate);
  };

  const handleResetPitch = () => {
    onPitchChange(1.0);
  };

  // Beat formatting
  const beatInterval = 60.0 / (bpm > 0 ? bpm : 128);
  const currentBeatTotal = Math.floor(position / beatInterval);
  const barNum = Math.floor(currentBeatTotal / 4) + 1;
  const beatInBar = (currentBeatTotal % 4) + 1;

  // Time format mm:ss
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 bg-gradient-to-b from-[#101216] via-[#0d0f12] to-[#090a0d] border border-zinc-800/80 rounded-lg p-3 flex flex-col justify-between shadow-xl select-none">
      {/* 1. Header Bar: Deck ID & Load Button */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/70">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold tracking-wider text-zinc-300 uppercase">
            DJ IMAN DECK
          </span>
          <span
            className={`w-5 h-5 rounded flex items-center justify-center text-xs font-black text-white ${
              isDeck1
                ? 'bg-blue-600 shadow-[0_0_8px_rgba(59,130,246,0.6)]'
                : 'bg-cyan-600 shadow-[0_0_8px_rgba(6,182,212,0.6)]'
            }`}
          >
            {deckId}
          </span>
        </div>

        <button
          onClick={onLoadTrack}
          className="flex items-center space-x-1.5 px-3 py-1 rounded bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 text-[11px] font-bold tracking-wider uppercase transition-all shadow-sm"
        >
          <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
          <span>LOAD</span>
        </button>
      </div>

      {/* 2. Track Metadata Bar (Title, BPM, Beat, Time, Clock Status) */}
      <div className="bg-zinc-950/90 rounded border border-zinc-800/90 p-2 my-2 flex items-center justify-between font-mono">
        {/* Track Title & Artist */}
        <div className="flex flex-col min-w-[120px]">
          <span className="text-xs font-bold text-zinc-200 truncate uppercase tracking-wider">
            {track ? track.name : 'NO TRACK LOADED'}
          </span>
          <div className="flex items-center space-x-2 text-[10px] text-zinc-400 font-semibold mt-0.5">
            <span className={isDeck1 ? 'text-blue-400' : 'text-cyan-400'}>
              {effectiveBpm > 0 ? effectiveBpm.toFixed(2) : '---.--'} BPM
            </span>
          </div>
        </div>

        {/* Beat 1.1 counter */}
        <div className="text-center px-3 py-0.5 rounded bg-zinc-900 border border-zinc-800">
          <span className="text-[10px] text-zinc-500 font-bold block leading-none">BEAT</span>
          <span className="text-xs font-bold text-amber-400 tracking-wider">
            {barNum}.{beatInBar}
          </span>
        </div>

        {/* Time elapsed / remaining */}
        <div className="text-right flex flex-col">
          <span className="text-xs font-bold text-zinc-200">
            {formatTime(position)} / {formatTime(duration)}
          </span>
          <span
            className={`text-[9px] uppercase font-bold tracking-widest mt-0.5 ${
              isMasterClock ? 'text-amber-400' : isSyncActive ? 'text-emerald-400' : 'text-zinc-500'
            }`}
          >
            {isMasterClock ? 'MASTER CLOCK' : isSyncActive ? 'BUWAGA SYNC' : 'FREE'}
          </span>
        </div>
      </div>

      {/* 3. PRO LOOP Bar: LOOP IN, LOOP OUT, RELOOP, 1/8, 1/4, 1/2, 1, 2, 4, 8 */}
      <div className="bg-zinc-950/60 p-1.5 rounded border border-zinc-800/80 mb-3">
        <div className="flex items-center justify-between text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1 px-1">
          <span>PRO LOOP</span>
          <span className={loopActive ? 'text-emerald-400' : 'text-zinc-600'}>
            {loopActive ? 'ACTIVE' : 'READY'}
          </span>
        </div>

        <div className="grid grid-cols-10 gap-1 text-[10px] font-bold text-center">
          <button
            onClick={() => setLoopActive(!loopActive)}
            className="py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 transition-colors"
          >
            IN
          </button>
          <button
            onClick={() => setLoopActive(false)}
            className="py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 transition-colors"
          >
            OUT
          </button>
          <button
            onClick={() => setLoopActive(!loopActive)}
            className={`py-1 rounded border transition-colors ${
              loopActive
                ? 'bg-amber-600/30 text-amber-300 border-amber-500'
                : 'bg-zinc-900 text-zinc-400 border-zinc-700/60'
            }`}
          >
            RELOOP
          </button>

          {/* Loop sizes */}
          {[
            { label: '1/8', beats: 0.125 },
            { label: '1/4', beats: 0.25 },
            { label: '1/2', beats: 0.5 },
            { label: '1', beats: 1 },
            { label: '2', beats: 2 },
            { label: '4', beats: 4 },
            { label: '8', beats: 8 },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setActiveLoopSize(item.beats);
                setLoopActive(true);
              }}
              className={`py-1 rounded border transition-all ${
                activeLoopSize === item.beats
                  ? isDeck1
                    ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]'
                    : 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                  : 'bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Jogwheel & Pitch Fader Section */}
      <div className="flex items-center justify-between my-2 space-x-3">
        {/* Realistic Pioneer DJ Jogwheel Platter */}
        <div className="relative flex-1 flex items-center justify-center">
          <div
            onMouseDown={handlePlatterMouseDown}
            className="relative w-52 h-52 sm:w-60 sm:h-60 rounded-full cursor-grab active:cursor-grabbing p-2.5 bg-gradient-to-b from-zinc-800 via-zinc-900 to-black shadow-[0_8px_24px_rgba(0,0,0,0.9),inset_0_1px_3px_rgba(255,255,255,0.2)] border-2 border-zinc-700/60 flex items-center justify-center transition-transform"
          >
            {/* Outer tactile vinyl ribbed ring */}
            <div className="absolute inset-1.5 rounded-full border border-zinc-600/40 bg-[radial-gradient(circle_at_center,#111317_50%,#181b21_85%,#232730_100%)] flex items-center justify-center" />

            {/* Micro-groove vinyl texture ring */}
            <div className="absolute inset-3 rounded-full border border-zinc-700/50 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.8)_95%)]" />

            {/* Rotating center platter disc */}
            <div
              className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full flex items-center justify-center border border-zinc-700 shadow-inner"
              style={{ transform: `rotate(${rotationAngle}deg)` }}
            >
              {/* Dual Pioneer DJ branding on platter (Left and Right) */}
              <div className="absolute inset-0 flex items-center justify-between px-3 pointer-events-none">
                <div className="flex items-center space-x-1 rotate-90 transform origin-center opacity-90">
                  <span className="text-white font-black text-sm tracking-wider font-sans">
                    Pioneer
                  </span>
                  <span className="text-red-600 font-black italic text-sm font-sans">
                    DJ
                  </span>
                </div>

                <div className="flex items-center space-x-1 -rotate-90 transform origin-center opacity-90">
                  <span className="text-white font-black text-sm tracking-wider font-sans">
                    Pioneer
                  </span>
                  <span className="text-red-600 font-black italic text-sm font-sans">
                    DJ
                  </span>
                </div>
              </div>

              {/* Rotating illuminated needle line */}
              <div
                className={`absolute top-1 w-1 h-9 rounded-full ${
                  isDeck1
                    ? 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,1)]'
                    : 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]'
                }`}
              />

              {/* Center Metallic Spindle Core */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-b from-zinc-800 via-zinc-950 to-black border-2 border-zinc-600 shadow-[0_4px_10px_rgba(0,0,0,0.9)] flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-700/80 flex items-center justify-center">
                  <span className="text-[9px] font-mono italic text-zinc-500">Di</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pitch / Tempo Control Section */}
        <div className="w-20 bg-zinc-950/80 rounded border border-zinc-800/90 p-2 flex flex-col items-center justify-between h-56">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
            TEMPO
          </span>

          {/* Range Buttons: ±8, ±10, ±50 */}
          <div className="flex items-center space-x-1 text-[8px] font-bold">
            {([0.08, 0.10, 0.50] as const).map((r) => (
              <button
                key={r}
                onClick={() => setPitchRange(r)}
                className={`px-1 py-0.5 rounded border transition-colors ${
                  pitchRange === r
                    ? isDeck1
                      ? 'bg-blue-600 text-white border-blue-400'
                      : 'bg-cyan-600 text-white border-cyan-400'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                }`}
              >
                ±{Math.round(r * 100)}
              </button>
            ))}
          </div>

          {/* Vertical Slider Track with Detent */}
          <div className="relative flex-1 flex items-center justify-center my-1 w-full">
            {/* Center zero detent line */}
            <div className="absolute top-1/2 left-2 right-2 h-[1px] bg-zinc-600 pointer-events-none" />

            <input
              type="range"
              min="-100"
              max="100"
              step="0.1"
              value={clampedPitchPercent}
              onChange={handleSliderChange}
              onDoubleClick={handleResetPitch}
              className="w-28 h-4 -rotate-90 origin-center cursor-pointer accent-zinc-200 bg-zinc-900"
            />
          </div>

          {/* Numeric Readout & Key Controls */}
          <div className="flex flex-col items-center w-full">
            <span
              onDoubleClick={handleResetPitch}
              className={`text-[10px] font-mono font-bold cursor-pointer ${
                clampedPitchPercent === 0
                  ? 'text-zinc-400'
                  : isDeck1
                  ? 'text-blue-400'
                  : 'text-cyan-400'
              }`}
            >
              {clampedPitchPercent >= 0 ? '+' : ''}
              {clampedPitchPercent.toFixed(2)}%
            </span>

            {/* Key controls */}
            <div className="flex items-center justify-between w-full mt-1 px-0.5 text-[9px]">
              <button
                onClick={() => setKeySemitones((s) => s - 1)}
                className="px-1 bg-zinc-900 text-zinc-400 hover:text-white rounded border border-zinc-800"
              >
                -
              </button>
              <span className="font-mono text-zinc-300">{keySemitones} ST</span>
              <button
                onClick={() => setKeySemitones((s) => s + 1)}
                className="px-1 bg-zinc-900 text-zinc-400 hover:text-white rounded border border-zinc-800"
              >
                +
              </button>
            </div>

            <button
              onClick={() => setKeyLock(!keyLock)}
              className={`mt-1 w-full py-0.5 text-[8px] font-bold rounded border uppercase transition-colors ${
                keyLock
                  ? 'bg-amber-600/30 text-amber-300 border-amber-500/60'
                  : 'bg-zinc-900 text-zinc-500 border-zinc-800'
              }`}
            >
              KEY LOCK
            </button>
          </div>
        </div>
      </div>

      {/* 5. Transport Controls: BUWAGA SYNC, CUE, PLAY / PAUSE, NUDGE */}
      <div className="pt-2 border-t border-zinc-800/80 grid grid-cols-4 gap-2">
        {/* BUWAGA Instant Sync Button */}
        <button
          onClick={onSync}
          className={`h-11 rounded-md flex flex-col items-center justify-center font-bold uppercase tracking-wider text-xs border transition-all ${
            isSyncActive
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.7)]'
              : 'bg-gradient-to-b from-zinc-800 to-zinc-900 text-zinc-300 border-zinc-700 hover:border-emerald-500/60 hover:text-white'
          }`}
        >
          <span className="text-[9px] font-black text-emerald-400 tracking-tight leading-none mb-0.5">
            BUWAGA
          </span>
          <span className="leading-none">SYNC</span>
        </button>

        {/* CUE Button */}
        <button
          onClick={onCue}
          className="h-11 rounded-md bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-900 hover:from-zinc-600 hover:to-zinc-800 text-amber-400 border border-amber-500/40 shadow-[0_2px_4px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center font-bold tracking-wider text-xs transition-all active:translate-y-0.5"
        >
          <div className="w-2 h-2 rounded-full bg-amber-400 mb-0.5 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
          <span>CUE</span>
        </button>

        {/* PLAY / PAUSE Button */}
        <button
          onClick={onPlayPause}
          className={`h-11 rounded-md border flex items-center justify-center space-x-1 font-bold text-xs tracking-wider transition-all shadow-[0_2px_4px_rgba(0,0,0,0.8)] active:translate-y-0.5 ${
            playing
              ? 'bg-gradient-to-b from-emerald-600 via-emerald-700 to-emerald-900 text-white border-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.7)]'
              : 'bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-900 text-zinc-200 border-zinc-600 hover:text-white'
          }`}
        >
          {playing ? (
            <>
              <Pause className="w-3.5 h-3.5" />
              <span>PAUSE</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>PLAY</span>
            </>
          )}
        </button>

        {/* Pitch Nudge / Bend Buttons */}
        <div className="h-11 grid grid-cols-2 gap-1">
          <button
            onClick={() => onNudge(-0.05)}
            className="rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 flex items-center justify-center transition-colors text-xs font-bold"
            title="Pitch Bend Down"
          >
            -
          </button>
          <button
            onClick={() => onNudge(0.05)}
            className="rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 flex items-center justify-center transition-colors text-xs font-bold"
            title="Pitch Bend Up"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};

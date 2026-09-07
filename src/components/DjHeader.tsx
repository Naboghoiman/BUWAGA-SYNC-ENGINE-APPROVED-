import React, { useState, useEffect } from 'react';
import { audioSynth } from '../engine/audioSynth';
import { Radio, Download, Disc3, Sparkles } from 'lucide-react';

interface DjHeaderProps {
  masterDeck: 'master' | 'slave';
  onToggleMaster: (deck: 'master' | 'slave') => void;
  masterBpm: number;
  phaseErrorMs: number;
  isPhaseLocked: boolean;
  onOpenLooper?: () => void;
}

export const DjHeader: React.FC<DjHeaderProps> = ({
  masterDeck,
  onToggleMaster,
  masterBpm,
  phaseErrorMs,
  isPhaseLocked,
  onOpenLooper,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    let timer: number;
    if (isRecording) {
      timer = window.setInterval(() => {
        setRecSeconds((s) => s + 1);
      }, 1000);
    } else {
      setRecSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const toggleRecording = () => {
    if (!isRecording) {
      const ok = audioSynth.startRecording();
      if (ok) {
        setIsRecording(true);
        setDownloadUrl(null);
      }
    } else {
      const blob = audioSynth.stopRecording();
      setIsRecording(false);
      if (blob) {
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
      }
    }
  };

  const formatRecTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Phase meter calculation: -50ms to +50ms mapped across meter
  const meterClamped = Math.max(-50, Math.min(50, phaseErrorMs));
  const meterPercent = 50 + (meterClamped / 50) * 45; // 5% to 95%

  return (
    <header className="h-14 bg-gradient-to-b from-[#14161a] via-[#101215] to-[#0b0c0e] border-b border-zinc-800/80 px-4 flex items-center justify-between select-none z-30 shadow-md">
      {/* Brand & Logo */}
      <div className="flex items-center space-x-3">
        {/* DJ Icon Badge */}
        <div className="w-9 h-9 rounded-md bg-gradient-to-br from-orange-500 via-amber-600 to-orange-700 flex items-center justify-center shadow-[0_0_12px_rgba(249,115,22,0.4)] border border-orange-400/40">
          <span className="text-white font-black italic text-lg tracking-tighter drop-shadow font-sans">
            Di
          </span>
        </div>

        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-black tracking-widest text-zinc-100 uppercase">
              DJ IMAN
            </h1>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800/90 text-zinc-400 border border-zinc-700/50 font-mono font-semibold">
              v2.5 PRO
            </span>
          </div>
          <p className="text-[9px] tracking-wider text-zinc-400 uppercase font-medium">
            PROFESSIONAL 2-DECK · 2-CHANNEL BUFFERED SAFE DSP
          </p>
        </div>
      </div>

      {/* Center / Right controls */}
      <div className="flex items-center space-x-5">
        {/* Master Clock Deck Selector */}
        <div className="flex items-center bg-zinc-900/90 border border-zinc-800 rounded-md p-1 space-x-1.5 shadow-inner">
          <div className="flex items-center space-x-1 px-1.5 text-[9px] font-bold text-amber-500 uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>MASTER</span>
          </div>
          <button
            onClick={() => onToggleMaster('master')}
            className={`px-2.5 py-0.5 text-[11px] font-bold tracking-wider rounded transition-all ${
              masterDeck === 'master'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            DECK 1
          </button>
          <button
            onClick={() => onToggleMaster('slave')}
            className={`px-2.5 py-0.5 text-[11px] font-bold tracking-wider rounded transition-all ${
              masterDeck === 'slave'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_8px_rgba(6,182,212,0.5)]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            DECK 2
          </button>
        </div>

        {/* Quick Beat Looper Access */}
        {onOpenLooper && (
          <button
            onClick={onOpenLooper}
            className="flex items-center space-x-1.5 px-3 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 text-[11px] font-bold uppercase tracking-wider shadow-sm transition-all"
            title="Open Beat Looper Room"
          >
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            <span>BEAT LOOPER</span>
          </button>
        )}

        {/* Phase Alignment LED Meter Bar */}
        <div className="hidden md:flex flex-col items-center">
          <div className="text-[9px] uppercase tracking-wider text-zinc-400 font-semibold mb-0.5 flex justify-between w-40">
            <span>DOWNBEAT ALIGNMENT</span>
            <span className={isPhaseLocked ? 'text-emerald-400' : 'text-amber-400 font-mono'}>
              {Math.abs(phaseErrorMs) < 1 ? 'LOCKED' : `${phaseErrorMs.toFixed(1)}ms`}
            </span>
          </div>
          <div className="relative w-40 h-3 bg-zinc-950 rounded-sm border border-zinc-800 overflow-hidden shadow-inner">
            {/* Center target tick */}
            <div className="absolute top-0 bottom-0 left-1/2 w-[2px] -ml-[1px] bg-amber-400 z-10 shadow-[0_0_6px_rgba(251,191,36,0.9)]" />

            {/* Moving Phase Indicator */}
            <div
              className={`absolute top-0 bottom-0 w-2.5 -ml-1.5 rounded-sm transition-all duration-75 ${
                isPhaseLocked
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]'
                  : 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]'
              }`}
              style={{ left: `${meterPercent}%` }}
            />
          </div>
        </div>

        {/* Master Real-Time BPM Display */}
        <div className="bg-zinc-950 px-3 py-1 rounded border border-zinc-800 shadow-inner flex items-baseline space-x-1">
          <span className="text-amber-400 font-mono font-bold text-sm tracking-widest">
            {masterBpm > 0 ? masterBpm.toFixed(2) : '---.--'}
          </span>
          <span className="text-[10px] font-bold text-zinc-500 uppercase">BPM</span>
        </div>

        {/* Live Audio REC Button */}
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleRecording}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase border transition-all ${
              isRecording
                ? 'bg-red-600/90 text-white border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.7)] animate-pulse'
                : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-red-500/60 hover:text-white'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                isRecording ? 'bg-white' : 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.8)]'
              }`}
            />
            <span>{isRecording ? formatRecTime(recSeconds) : 'REC'}</span>
          </button>

          {downloadUrl && (
            <a
              href={downloadUrl}
              download={`DJ_IMAN_LIVE_MIX_${new Date().toISOString().slice(0, 10)}.webm`}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-600/90 text-white border border-emerald-500 hover:bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all"
            >
              <Download className="w-3 h-3" />
              <span>SAVE MIX</span>
            </a>
          )}
        </div>
      </div>
    </header>
  );
};

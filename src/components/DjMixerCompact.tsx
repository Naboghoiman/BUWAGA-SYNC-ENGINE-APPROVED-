import React from 'react';
import { DjKnob } from './DjKnob';

interface DjMixerCompactProps {
  gain1: number;
  high1: number;
  mid1: number;
  low1: number;
  filter1: number;
  level1: number;
  cue1: boolean;

  gain2: number;
  high2: number;
  mid2: number;
  low2: number;
  filter2: number;
  level2: number;
  cue2: boolean;

  crossfader: number;
  vuA: number;
  vuB: number;

  onChangeGain: (ch: 1 | 2, val: number) => void;
  onChangeHigh: (ch: 1 | 2, val: number) => void;
  onChangeMid: (ch: 1 | 2, val: number) => void;
  onChangeLow: (ch: 1 | 2, val: number) => void;
  onChangeFilter: (ch: 1 | 2, val: number) => void;
  onChangeLevel: (ch: 1 | 2, val: number) => void;
  onToggleCue: (ch: 1 | 2) => void;
  onChangeCrossfader: (val: number) => void;
}

export const DjMixerCompact: React.FC<DjMixerCompactProps> = ({
  gain1,
  high1,
  mid1,
  low1,
  filter1,
  level1,
  cue1,
  gain2,
  high2,
  mid2,
  low2,
  filter2,
  level2,
  cue2,
  crossfader,
  vuA,
  vuB,
  onChangeGain,
  onChangeHigh,
  onChangeMid,
  onChangeLow,
  onChangeFilter,
  onChangeLevel,
  onToggleCue,
  onChangeCrossfader,
}) => {
  const renderVuMeter = (level: number) => {
    const barsCount = 14;
    const activeBars = Math.round(level * barsCount);
    return (
      <div className="flex flex-col-reverse justify-between h-40 w-1.5 bg-zinc-950/90 rounded-sm p-0.5 border border-zinc-800">
        {Array.from({ length: barsCount }).map((_, i) => {
          const isActive = i < activeBars;
          let color = 'bg-emerald-500';
          if (i >= 11) color = 'bg-red-500';
          else if (i >= 8) color = 'bg-amber-400';

          return (
            <div
              key={i}
              className={`w-full h-1.5 rounded-[1px] transition-opacity duration-75 ${
                isActive ? color : 'bg-zinc-800/40'
              }`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-80 bg-gradient-to-b from-[#111317] via-[#0e1014] to-[#0a0c0f] border border-zinc-800/80 rounded-lg p-3 flex flex-col justify-between shadow-2xl select-none mx-2">
      {/* Mixer Header */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-bold tracking-wider text-zinc-300 uppercase">
            DJ IMAN
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">2-CHANNEL MIXER</span>
        </div>
        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
      </div>

      {/* Two Channel Strips Side by Side */}
      <div className="grid grid-cols-2 gap-3 my-2">
        {/* Channel 1 (Deck 1) */}
        <div className="flex flex-col items-center space-y-2 bg-zinc-950/40 p-2 rounded border border-zinc-850">
          <div className="flex items-center justify-between w-full text-[10px] font-bold text-zinc-400 px-1">
            <span className="text-blue-400">CH 1</span>
            <span className="text-zinc-600">D1</span>
          </div>

          <DjKnob
            label="GAIN"
            value={gain1}
            min={-12}
            max={12}
            step={0.5}
            unit="dB"
            color="blue"
            size="sm"
            onChange={(v) => onChangeGain(1, v)}
          />

          <DjKnob
            label="HIGH"
            value={high1}
            min={-24}
            max={6}
            step={0.5}
            unit="dB"
            color="blue"
            size="sm"
            onChange={(v) => onChangeHigh(1, v)}
          />

          <DjKnob
            label="MID"
            value={mid1}
            min={-24}
            max={6}
            step={0.5}
            unit="dB"
            color="blue"
            size="sm"
            onChange={(v) => onChangeMid(1, v)}
          />

          <DjKnob
            label="LOW"
            value={low1}
            min={-24}
            max={6}
            step={0.5}
            unit="dB"
            color="blue"
            size="sm"
            onChange={(v) => onChangeLow(1, v)}
          />

          <DjKnob
            label="FILTER"
            value={filter1}
            min={-1}
            max={1}
            step={0.02}
            defaultValue={0}
            color="blue"
            size="sm"
            displayValue={
              Math.abs(filter1) < 0.03 ? 'OPEN' : filter1 < 0 ? `LP ${(filter1 * 100).toFixed(0)}%` : `HP +${(filter1 * 100).toFixed(0)}%`
            }
            onChange={(v) => onChangeFilter(1, v)}
          />

          {/* Fader & VU meter row */}
          <div className="flex items-center space-x-2 pt-2 w-full justify-center">
            {renderVuMeter(vuA)}

            {/* Vertical channel volume fader */}
            <div className="relative h-40 w-10 flex flex-col items-center justify-center bg-zinc-950/80 rounded border border-zinc-800 py-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={level1}
                onChange={(e) => onChangeLevel(1, parseFloat(e.target.value))}
                className="w-32 h-4 -rotate-90 origin-center cursor-pointer accent-blue-500 bg-zinc-900"
              />
            </div>
          </div>
        </div>

        {/* Channel 2 (Deck 2) */}
        <div className="flex flex-col items-center space-y-2 bg-zinc-950/40 p-2 rounded border border-zinc-850">
          <div className="flex items-center justify-between w-full text-[10px] font-bold text-zinc-400 px-1">
            <span className="text-cyan-400">CH 2</span>
            <span className="text-zinc-600">D2</span>
          </div>

          <DjKnob
            label="GAIN"
            value={gain2}
            min={-12}
            max={12}
            step={0.5}
            unit="dB"
            color="cyan"
            size="sm"
            onChange={(v) => onChangeGain(2, v)}
          />

          <DjKnob
            label="HIGH"
            value={high2}
            min={-24}
            max={6}
            step={0.5}
            unit="dB"
            color="cyan"
            size="sm"
            onChange={(v) => onChangeHigh(2, v)}
          />

          <DjKnob
            label="MID"
            value={mid2}
            min={-24}
            max={6}
            step={0.5}
            unit="dB"
            color="cyan"
            size="sm"
            onChange={(v) => onChangeMid(2, v)}
          />

          <DjKnob
            label="LOW"
            value={low2}
            min={-24}
            max={6}
            step={0.5}
            unit="dB"
            color="cyan"
            size="sm"
            onChange={(v) => onChangeLow(2, v)}
          />

          <DjKnob
            label="FILTER"
            value={filter2}
            min={-1}
            max={1}
            step={0.02}
            defaultValue={0}
            color="cyan"
            size="sm"
            displayValue={
              Math.abs(filter2) < 0.03 ? 'OPEN' : filter2 < 0 ? `LP ${(filter2 * 100).toFixed(0)}%` : `HP +${(filter2 * 100).toFixed(0)}%`
            }
            onChange={(v) => onChangeFilter(2, v)}
          />

          {/* Fader & VU meter row */}
          <div className="flex items-center space-x-2 pt-2 w-full justify-center">
            {/* Vertical channel volume fader */}
            <div className="relative h-40 w-10 flex flex-col items-center justify-center bg-zinc-950/80 rounded border border-zinc-800 py-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={level2}
                onChange={(e) => onChangeLevel(2, parseFloat(e.target.value))}
                className="w-32 h-4 -rotate-90 origin-center cursor-pointer accent-cyan-500 bg-zinc-900"
              />
            </div>

            {renderVuMeter(vuB)}
          </div>
        </div>
      </div>

      {/* Master Crossfader */}
      <div className="bg-zinc-950/90 rounded border border-zinc-800/90 p-2 mt-2">
        <div className="flex justify-between text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
          <span className="text-blue-400">1</span>
          <span>MASTER CROSSFADER</span>
          <span className="text-cyan-400">2</span>
        </div>

        <div className="relative flex items-center justify-center py-1">
          {/* Center detent marker */}
          <div className="absolute top-0 bottom-0 left-1/2 w-[2px] -ml-[1px] bg-zinc-600 pointer-events-none" />

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={crossfader}
            onChange={(e) => onChangeCrossfader(parseFloat(e.target.value))}
            className="w-full h-3 cursor-pointer accent-orange-500 bg-zinc-900 rounded"
          />
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { DjKnob } from './DjKnob';
import { Headphones, Sliders, Volume2 } from 'lucide-react';

interface DjFullMixerProps {
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

  masterFilter: number;
  masterVolume: number;
  crossfader: number;
  vuA: number;
  vuB: number;
  vuMaster: number;

  onChangeGain: (ch: 1 | 2, val: number) => void;
  onChangeHigh: (ch: 1 | 2, val: number) => void;
  onChangeMid: (ch: 1 | 2, val: number) => void;
  onChangeLow: (ch: 1 | 2, val: number) => void;
  onChangeFilter: (ch: 1 | 2, val: number) => void;
  onChangeLevel: (ch: 1 | 2, val: number) => void;
  onToggleCue: (ch: 1 | 2) => void;

  onChangeMasterFilter: (val: number) => void;
  onChangeMasterVolume: (val: number) => void;
  onChangeCrossfader: (val: number) => void;
}

export const DjFullMixer: React.FC<DjFullMixerProps> = ({
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
  masterFilter,
  masterVolume,
  crossfader,
  vuA,
  vuB,
  vuMaster,
  onChangeGain,
  onChangeHigh,
  onChangeMid,
  onChangeLow,
  onChangeFilter,
  onChangeLevel,
  onToggleCue,
  onChangeMasterFilter,
  onChangeMasterVolume,
  onChangeCrossfader,
}) => {
  const renderMeter = (level: number, heightClass = 'h-52') => {
    const barsCount = 20;
    const activeBars = Math.round(level * barsCount);
    return (
      <div className={`flex flex-col-reverse justify-between ${heightClass} w-2 bg-zinc-950 rounded-sm p-0.5 border border-zinc-800`}>
        {Array.from({ length: barsCount }).map((_, i) => {
          const isActive = i < activeBars;
          let color = 'bg-emerald-500';
          if (i >= 17) color = 'bg-red-500';
          else if (i >= 12) color = 'bg-amber-400';

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
    <div className="flex-1 bg-[#090b0e] p-4 flex flex-col justify-between select-none">
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-orange-600 to-amber-700 flex items-center justify-center border border-orange-400/40 shadow-sm">
            <Sliders className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-black tracking-widest text-zinc-100 uppercase">
              DJ IMAN 2-CHANNEL MIXER
            </h2>
            <p className="text-[10px] tracking-wider text-zinc-400 uppercase font-medium">
              TWO INDEPENDENT CHANNEL STRIPS · FULL-SIZE CROSSFADER
            </p>
          </div>
        </div>
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.9)]" />
      </div>

      {/* 2. Main Mixing Console Grid */}
      <div className="grid grid-cols-12 gap-4 my-3 flex-1 items-stretch">
        {/* Channel 1 Strip (5 cols) */}
        <div className="col-span-5 bg-gradient-to-b from-[#111317] via-[#0d0f12] to-[#0a0c0f] rounded-lg border border-zinc-800 p-4 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2">
            <span className="text-xs font-black tracking-wider text-blue-400 uppercase">
              CH 1
            </span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase">DECK 1</span>
          </div>

          {/* Knobs row: GAIN, HIGH, MID, LOW, FILTER */}
          <div className="grid grid-cols-5 gap-2 my-2">
            <DjKnob
              label="GAIN"
              value={gain1}
              min={-12}
              max={12}
              step={0.5}
              unit="dB"
              color="cyan"
              size="md"
              onChange={(v) => onChangeGain(1, v)}
            />
            <DjKnob
              label="HIGH"
              value={high1}
              min={-24}
              max={6}
              step={0.5}
              unit="dB"
              color="cyan"
              size="md"
              onChange={(v) => onChangeHigh(1, v)}
            />
            <DjKnob
              label="MID"
              value={mid1}
              min={-24}
              max={6}
              step={0.5}
              unit="dB"
              color="cyan"
              size="md"
              onChange={(v) => onChangeMid(1, v)}
            />
            <DjKnob
              label="LOW"
              value={low1}
              min={-24}
              max={6}
              step={0.5}
              unit="dB"
              color="cyan"
              size="md"
              onChange={(v) => onChangeLow(1, v)}
            />
            <DjKnob
              label="FILTER"
              value={filter1}
              min={-1}
              max={1}
              step={0.02}
              defaultValue={0}
              color="cyan"
              size="md"
              displayValue={
                Math.abs(filter1) < 0.03 ? 'OPEN' : filter1 < 0 ? `LP ${(filter1 * 100).toFixed(0)}%` : `HP +${(filter1 * 100).toFixed(0)}%`
              }
              onChange={(v) => onChangeFilter(1, v)}
            />
          </div>

          {/* CUE / PFL Button */}
          <div className="flex justify-center my-3">
            <button
              onClick={() => onToggleCue(1)}
              className={`flex items-center space-x-1 px-4 py-1 rounded text-xs font-bold uppercase tracking-wider border transition-all ${
                cue1
                  ? 'bg-amber-600/30 text-amber-300 border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>CUE / PFL CHANNEL</span>
            </button>
          </div>

          {/* Channel 1 Fader & VU meters */}
          <div className="flex items-center justify-center space-x-4 my-2">
            {renderMeter(vuA, 'h-52')}

            <div className="relative h-52 w-16 flex flex-col items-center justify-center bg-zinc-950/80 rounded border border-zinc-800/80 p-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={level1}
                onChange={(e) => onChangeLevel(1, parseFloat(e.target.value))}
                className="w-44 h-5 -rotate-90 origin-center cursor-pointer accent-cyan-400 bg-zinc-900"
              />
              <span className="absolute bottom-1 text-[10px] font-mono font-bold text-cyan-400">
                {(level1 * 100).toFixed(0)}%
              </span>
            </div>

            {renderMeter(vuA, 'h-52')}
          </div>
        </div>

        {/* Channel 2 Strip (5 cols) */}
        <div className="col-span-5 bg-gradient-to-b from-[#111317] via-[#0d0f12] to-[#0a0c0f] rounded-lg border border-zinc-800 p-4 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2">
            <span className="text-xs font-black tracking-wider text-cyan-400 uppercase">
              CH 2
            </span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase">DECK 2</span>
          </div>

          {/* Knobs row */}
          <div className="grid grid-cols-5 gap-2 my-2">
            <DjKnob
              label="GAIN"
              value={gain2}
              min={-12}
              max={12}
              step={0.5}
              unit="dB"
              color="cyan"
              size="md"
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
              size="md"
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
              size="md"
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
              size="md"
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
              size="md"
              displayValue={
                Math.abs(filter2) < 0.03 ? 'OPEN' : filter2 < 0 ? `LP ${(filter2 * 100).toFixed(0)}%` : `HP +${(filter2 * 100).toFixed(0)}%`
              }
              onChange={(v) => onChangeFilter(2, v)}
            />
          </div>

          {/* CUE / PFL Button */}
          <div className="flex justify-center my-3">
            <button
              onClick={() => onToggleCue(2)}
              className={`flex items-center space-x-1 px-4 py-1 rounded text-xs font-bold uppercase tracking-wider border transition-all ${
                cue2
                  ? 'bg-amber-600/30 text-amber-300 border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>CUE / PFL CHANNEL</span>
            </button>
          </div>

          {/* Channel 2 Fader & VU meters */}
          <div className="flex items-center justify-center space-x-4 my-2">
            {renderMeter(vuB, 'h-52')}

            <div className="relative h-52 w-16 flex flex-col items-center justify-center bg-zinc-950/80 rounded border border-zinc-800/80 p-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={level2}
                onChange={(e) => onChangeLevel(2, parseFloat(e.target.value))}
                className="w-44 h-5 -rotate-90 origin-center cursor-pointer accent-cyan-400 bg-zinc-900"
              />
              <span className="absolute bottom-1 text-[10px] font-mono font-bold text-cyan-400">
                {(level2 * 100).toFixed(0)}%
              </span>
            </div>

            {renderMeter(vuB, 'h-52')}
          </div>
        </div>

        {/* Master Output Section (2 cols) */}
        <div className="col-span-2 bg-gradient-to-b from-[#14161a] via-[#0f1115] to-[#0a0c0f] rounded-lg border border-zinc-800 p-4 flex flex-col justify-between shadow-xl">
          <div className="border-b border-zinc-800 pb-2 mb-2 text-center">
            <span className="text-xs font-black tracking-wider text-amber-500 uppercase block">
              MASTER OUT
            </span>
            <span className="text-[9px] text-zinc-400 font-mono">CALIBRATED DSP</span>
          </div>

          {/* Master Filter Knob */}
          <div className="flex justify-center my-2">
            <DjKnob
              label="MASTER FILTER"
              value={masterFilter}
              min={-1}
              max={1}
              step={0.02}
              defaultValue={0}
              color="amber"
              size="lg"
              displayValue={
                Math.abs(masterFilter) < 0.03 ? 'OPEN' : masterFilter < 0 ? `LP ${(masterFilter * 100).toFixed(0)}%` : `HP +${(masterFilter * 100).toFixed(0)}%`
              }
              onChange={onChangeMasterFilter}
            />
          </div>

          {/* Master Volume Fader & Stereo Output Meter */}
          <div className="flex flex-col items-center my-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase mb-2">
              MASTER VOLUME
            </span>

            <div className="flex items-center space-x-3">
              <div className="relative h-44 w-12 flex flex-col items-center justify-center bg-zinc-950 rounded border border-zinc-800 py-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={masterVolume}
                  onChange={(e) => onChangeMasterVolume(parseFloat(e.target.value))}
                  className="w-36 h-4 -rotate-90 origin-center cursor-pointer accent-amber-500 bg-zinc-900"
                />
              </div>

              {renderMeter(vuMaster, 'h-44')}
            </div>

            <span className="text-[11px] font-mono font-bold text-amber-400 mt-2">
              {(masterVolume * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* 3. Full-Size Master Crossfader */}
      <div className="bg-gradient-to-b from-[#111317] to-[#090b0e] rounded-lg border border-zinc-800 p-3 shadow-inner">
        <div className="flex justify-between items-center text-xs font-black text-zinc-400 uppercase tracking-widest px-2 mb-1">
          <span className="text-blue-400">DECK 1</span>
          <span className="text-zinc-500 font-mono text-[10px]">MASTER CROSSFADER</span>
          <span className="text-cyan-400">DECK 2</span>
        </div>

        <div className="relative flex items-center justify-center py-2 px-3">
          {/* Visual calibrated scale notches */}
          <div className="absolute top-1/2 left-4 right-4 h-[2px] bg-zinc-700 pointer-events-none" />
          <div className="absolute top-1 bottom-1 left-1/2 w-[2px] -ml-[1px] bg-amber-400 pointer-events-none shadow-[0_0_6px_rgba(251,191,36,0.8)]" />

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={crossfader}
            onChange={(e) => onChangeCrossfader(parseFloat(e.target.value))}
            className="w-full h-5 cursor-pointer accent-amber-500 bg-zinc-950 rounded"
          />
        </div>
      </div>
    </div>
  );
};

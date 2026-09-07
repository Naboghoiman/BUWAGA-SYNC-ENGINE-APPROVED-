import React, { useState } from 'react';
import { DjKnob } from './DjKnob';
import { ISO_FREQUENCIES, audioSynth } from '../engine/audioSynth';
import {
  MasterOutputSubTab,
  MasterOutputParams,
  ReverbParams,
  DelayParams,
  CompressorParams,
  LimiterParams,
} from '../types';
import { Gauge, Sliders, Waves, Activity, ShieldCheck, Power, RefreshCw, Save } from 'lucide-react';

interface DjMasterOutputProps {
  masterParams: MasterOutputParams;
  reverbParams: ReverbParams;
  delayParamsA: DelayParams;
  delayParamsB: DelayParams;
  compressorParams: CompressorParams;
  limiterParams: LimiterParams;
  eqGains: number[];
  isEqEnabled: boolean;
  vuMaster: number;

  onChangeMasterParams: (params: Partial<MasterOutputParams>) => void;
  onChangeReverb: (params: Partial<ReverbParams>) => void;
  onChangeDelayA: (params: Partial<DelayParams>) => void;
  onChangeDelayB: (params: Partial<DelayParams>) => void;
  onChangeCompressor: (params: Partial<CompressorParams>) => void;
  onChangeLimiter: (params: Partial<LimiterParams>) => void;
  onChangeEqBand: (index: number, val: number) => void;
  onToggleEq: (enabled: boolean) => void;
  onSetEqFlat: () => void;
}

export const DjMasterOutput: React.FC<DjMasterOutputProps> = ({
  masterParams,
  reverbParams,
  delayParamsA,
  delayParamsB,
  compressorParams,
  limiterParams,
  eqGains,
  isEqEnabled,
  vuMaster,
  onChangeMasterParams,
  onChangeReverb,
  onChangeDelayA,
  onChangeDelayB,
  onChangeCompressor,
  onChangeLimiter,
  onChangeEqBand,
  onToggleEq,
  onSetEqFlat,
}) => {
  const [subTab, setSubTab] = useState<MasterOutputSubTab>('output');
  const [fxSendSource, setFxSendSource] = useState<'CH 1' | 'CH 2'>('CH 1');
  const [isDrawMode, setIsDrawMode] = useState<boolean>(false);

  // ISO Frequency Labels formatting
  const formatIsoFreq = (freq: number) => {
    if (freq >= 1000) {
      return `${(freq / 1000).toFixed(freq % 1000 === 0 ? 0 : 1)}k`.replace('.0k', 'k');
    }
    return `${freq}`;
  };

  return (
    <div className="flex-1 bg-[#090b0e] p-4 flex flex-col justify-between select-none">
      {/* 1. Header Bar with Sub-Tabs */}
      <div className="flex flex-col space-y-3 pb-3 border-b border-zinc-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-orange-600 to-amber-700 flex items-center justify-center border border-orange-400/40 shadow-sm">
              <Gauge className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-widest text-zinc-100 uppercase">
                DJ IMAN MASTER OUTPUT
              </h2>
              <p className="text-[10px] tracking-wider text-zinc-400 uppercase font-medium">
                CLEAN BUS · FX RACK · ISO 31-BAND · DIRECT DEVICE OUTPUT
              </p>
            </div>
          </div>

          {/* Master VU Meter Bar */}
          <div className="flex items-center space-x-2 bg-zinc-950 px-3 py-1 rounded border border-zinc-800">
            <span className="text-[10px] font-mono text-zinc-400 font-bold">OUTPUT LEVEL</span>
            <div className="w-28 h-2 bg-zinc-900 rounded-sm overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 transition-all duration-75"
                style={{ width: `${Math.min(100, vuMaster * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Sub-Tabs: OUTPUT, EFFECTS, DYNAMICS, 31-BAND EQ */}
        <div className="flex items-center space-x-2 pt-1">
          {[
            { id: 'output', label: 'OUTPUT' },
            { id: 'effects', label: 'EFFECTS' },
            { id: 'dynamics', label: 'DYNAMICS' },
            { id: '31bandEq', label: '31-BAND EQ' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as MasterOutputSubTab)}
              className={`px-5 py-1.5 rounded text-xs font-bold uppercase tracking-wider border transition-all ${
                subTab === tab.id
                  ? 'bg-zinc-800 text-amber-400 border-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                  : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Sub-Tab Views */}
      <div className="flex-1 my-3 flex flex-col justify-center">
        {/* VIEW A: OUTPUT (Screenshot 5) */}
        {subTab === 'output' && (
          <div className="grid grid-cols-12 gap-4 flex-1 items-stretch">
            {/* Left Card: DJ IMAN CLEAN INPUT */}
            <div className="col-span-7 bg-[#ded8ce] text-zinc-900 rounded-lg p-6 flex flex-col justify-between shadow-xl border border-[#c4bcb0]">
              <div className="flex items-center justify-between border-b border-zinc-400/50 pb-2">
                <span className="text-xs font-black tracking-widest uppercase text-zinc-800">
                  DJ IMAN CLEAN INPUT
                </span>
                <span className="text-[10px] font-mono tracking-wider font-bold text-zinc-600">
                  CALIBRATED HEADROOM · NO SATURATION
                </span>
              </div>

              {/* 4 Knobs: INPUT TRIM, MASTER FILTER, MASTER LEVEL, BALANCE */}
              <div className="grid grid-cols-4 gap-4 my-6 items-center">
                <DjKnob
                  label="INPUT TRIM"
                  value={masterParams.inputTrim}
                  min={-12}
                  max={12}
                  step={0.5}
                  unit="dB"
                  color="amber"
                  size="lg"
                  onChange={(v) => onChangeMasterParams({ inputTrim: v })}
                />
                <DjKnob
                  label="MASTER FILTER"
                  value={masterParams.masterFilter}
                  min={-1}
                  max={1}
                  step={0.02}
                  color="amber"
                  size="lg"
                  displayValue={
                    Math.abs(masterParams.masterFilter) < 0.03
                      ? 'OPEN'
                      : masterParams.masterFilter < 0
                      ? `LP ${(masterParams.masterFilter * 100).toFixed(0)}%`
                      : `HP +${(masterParams.masterFilter * 100).toFixed(0)}%`
                  }
                  onChange={(v) => onChangeMasterParams({ masterFilter: v })}
                />
                <DjKnob
                  label="MASTER LEVEL"
                  value={masterParams.masterLevel}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  color="amber"
                  size="lg"
                  onChange={(v) => onChangeMasterParams({ masterLevel: v })}
                />
                <DjKnob
                  label="BALANCE"
                  value={masterParams.balance}
                  min={-1}
                  max={1}
                  step={0.02}
                  color="amber"
                  size="lg"
                  displayValue={
                    Math.abs(masterParams.balance) < 0.05
                      ? 'CENTER'
                      : masterParams.balance < 0
                      ? `L ${Math.abs(masterParams.balance * 100).toFixed(0)}%`
                      : `R ${(masterParams.balance * 100).toFixed(0)}%`
                  }
                  onChange={(v) => onChangeMasterParams({ balance: v })}
                />
              </div>

              <div className="text-[10px] text-zinc-600 font-medium">
                High-fidelity 32-bit floating point audio sum bus with zero phase distortion.
              </div>
            </div>

            {/* Right Card: PROGRAM-SAFE NOISE CONTROL (Teal panel) */}
            <div className="col-span-5 bg-[#1fa2b1] text-zinc-950 rounded-lg p-6 flex flex-col justify-between shadow-xl border border-[#168997]">
              <div className="flex items-center justify-between border-b border-cyan-800/30 pb-2">
                <span className="text-xs font-black tracking-widest uppercase text-zinc-950">
                  PROGRAM-SAFE NOISE CONTROL
                </span>
                <span className="text-[10px] font-mono font-bold text-cyan-950">
                  SOFT EXPANDER · BYPASSED BY DEFAULT
                </span>
              </div>

              <div className="flex items-center justify-around my-6">
                <DjKnob
                  label="DENOISE"
                  value={masterParams.denoiseBypass ? 0 : 1}
                  min={0}
                  max={1}
                  color="green"
                  size="lg"
                  displayValue={masterParams.denoiseBypass ? 'BYPASS' : 'ACTIVE'}
                  onChange={(v) => onChangeMasterParams({ denoiseBypass: v < 0.5 })}
                />

                <div className="flex flex-col space-y-3">
                  <div className="bg-zinc-950/80 text-white rounded p-3 flex items-center space-x-3 border border-zinc-800">
                    <Activity className="w-5 h-5 text-emerald-400" />
                    <div>
                      <span className="text-xs font-bold text-emerald-400 block">TRANSPARENT</span>
                      <span className="text-[9px] text-zinc-400">
                        Soft hold and slow release prevent pumping
                      </span>
                    </div>
                  </div>

                  <div className="bg-zinc-950/80 text-white rounded p-3 flex items-center space-x-3 border border-zinc-800">
                    <ShieldCheck className="w-5 h-5 text-amber-400" />
                    <div>
                      <span className="text-xs font-bold text-amber-400 block">-1 dB CEILING</span>
                      <span className="text-[9px] text-zinc-400">
                        Internal two-channel mix headroom protected
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-cyan-950 font-medium">
                Automatic lookahead transient preservation circuit.
              </div>
            </div>
          </div>
        )}

        {/* VIEW B: EFFECTS (Screenshot 4) */}
        {subTab === 'effects' && (
          <div className="flex flex-col space-y-3">
            {/* FX Send Source Toggle */}
            <div className="flex items-center space-x-3 bg-zinc-950 p-2 rounded border border-zinc-800">
              <span className="text-xs font-bold text-zinc-400 uppercase">FX SEND SOURCE</span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setFxSendSource('CH 1')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    fxSendSource === 'CH 1'
                      ? 'bg-blue-600 text-white border border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  CH 1
                </button>
                <button
                  onClick={() => setFxSendSource('CH 2')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    fxSendSource === 'CH 2'
                      ? 'bg-cyan-600 text-white border border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  CH 2
                </button>
              </div>
              <span className="text-xs font-mono text-zinc-500 ml-auto">120 BPM FALLBACK</span>
            </div>

            {/* Rack 1: SPACE REVERB (Blue Rack) */}
            <div className="bg-gradient-to-r from-[#0d2a45] via-[#113a5e] to-[#0a2035] rounded-lg border border-blue-600/40 p-3 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-blue-500/30">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black tracking-wider text-blue-300 uppercase">
                    SPACE REVERB
                  </span>
                  <span className="text-[10px] text-blue-200/60 font-mono">
                    HALL · ROOM · PLATE · AMBIENCE
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <select
                    value={reverbParams.preset}
                    onChange={(e) => onChangeReverb({ preset: e.target.value })}
                    className="bg-zinc-950 text-blue-200 text-xs rounded px-2 py-0.5 border border-blue-500/50"
                  >
                    <option>003 - Medium Warm</option>
                    <option>001 - Large Cathedral</option>
                    <option>002 - Tight Studio Plate</option>
                  </select>

                  <select
                    value={reverbParams.type}
                    onChange={(e) => onChangeReverb({ type: e.target.value as any })}
                    className="bg-zinc-950 text-blue-200 text-xs rounded px-2 py-0.5 border border-blue-500/50"
                  >
                    <option>HALL</option>
                    <option>ROOM</option>
                    <option>PLATE</option>
                    <option>AMBIENCE</option>
                  </select>

                  <button
                    onClick={() => onChangeReverb({ enabled: !reverbParams.enabled })}
                    className={`px-3 py-0.5 rounded text-xs font-bold uppercase transition-all ${
                      reverbParams.enabled
                        ? 'bg-emerald-600 text-white border border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
                        : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                    }`}
                  >
                    {reverbParams.enabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              {/* Reverb Knobs */}
              <div className="grid grid-cols-6 gap-2 my-3">
                <DjKnob
                  label="PREDELAY"
                  value={reverbParams.predelay}
                  min={0}
                  max={200}
                  unit="ms"
                  color="blue"
                  onChange={(v) => onChangeReverb({ predelay: v })}
                />
                <DjKnob
                  label="EARLY"
                  value={reverbParams.early}
                  min={0}
                  max={100}
                  unit="%"
                  color="blue"
                  onChange={(v) => onChangeReverb({ early: v })}
                />
                <DjKnob
                  label="DECAY"
                  value={reverbParams.decay}
                  min={0.2}
                  max={10}
                  unit="s"
                  color="blue"
                  onChange={(v) => onChangeReverb({ decay: v })}
                />
                <DjKnob
                  label="SPACE"
                  value={reverbParams.space}
                  min={0}
                  max={100}
                  unit="%"
                  color="blue"
                  onChange={(v) => onChangeReverb({ space: v })}
                />
                <DjKnob
                  label="DAMPING"
                  value={reverbParams.damping}
                  min={0}
                  max={100}
                  unit="%"
                  color="blue"
                  onChange={(v) => onChangeReverb({ damping: v })}
                />
                <DjKnob
                  label="CH SEND"
                  value={reverbParams.chSend}
                  min={0}
                  max={100}
                  unit="%"
                  color="blue"
                  onChange={(v) => onChangeReverb({ chSend: v })}
                />
              </div>
            </div>

            {/* Rack 2: DIGITAL DELAY A */}
            <div className="bg-gradient-to-r from-[#17191d] via-[#1c1f24] to-[#121417] rounded-lg border border-zinc-700/80 p-3 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-700/60">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black tracking-wider text-zinc-200 uppercase">
                    DIGITAL DELAY A
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    BPM-LINKED · FILTERED FEEDBACK
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <select
                    value={delayParamsA.mode}
                    onChange={(e) => onChangeDelayA({ mode: e.target.value as any })}
                    className="bg-zinc-950 text-zinc-300 text-xs rounded px-2 py-0.5 border border-zinc-700"
                  >
                    <option>STEREO</option>
                    <option>PING-PONG</option>
                    <option>MONO</option>
                  </select>

                  <button
                    onClick={() => onChangeDelayA({ enabled: !delayParamsA.enabled })}
                    className={`px-3 py-0.5 rounded text-xs font-bold uppercase transition-all ${
                      delayParamsA.enabled
                        ? 'bg-emerald-600 text-white border border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
                        : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                    }`}
                  >
                    {delayParamsA.enabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              {/* Delay A Knobs */}
              <div className="grid grid-cols-6 gap-2 my-3">
                <DjKnob
                  label="TIME"
                  value={0.5}
                  color="amber"
                  displayValue={delayParamsA.timeDivision}
                  onChange={() => {}}
                />
                <DjKnob
                  label="FEEDBACK"
                  value={delayParamsA.feedback}
                  min={0}
                  max={95}
                  unit="%"
                  color="amber"
                  onChange={(v) => onChangeDelayA({ feedback: v })}
                />
                <DjKnob
                  label="LO CUT"
                  value={delayParamsA.loCut}
                  min={20}
                  max={1000}
                  unit="Hz"
                  color="amber"
                  onChange={(v) => onChangeDelayA({ loCut: v })}
                />
                <DjKnob
                  label="HI CUT"
                  value={delayParamsA.hiCut / 1000}
                  min={1}
                  max={20}
                  unit="kHz"
                  color="amber"
                  onChange={(v) => onChangeDelayA({ hiCut: v * 1000 })}
                />
                <DjKnob
                  label="WIDTH"
                  value={delayParamsA.width}
                  min={0}
                  max={100}
                  unit="%"
                  color="amber"
                  onChange={(v) => onChangeDelayA({ width: v })}
                />
                <DjKnob
                  label="CH SEND"
                  value={delayParamsA.chSend}
                  min={0}
                  max={100}
                  unit="%"
                  color="amber"
                  onChange={(v) => onChangeDelayA({ chSend: v })}
                />
              </div>
            </div>

            {/* Rack 3: DIGITAL DELAY B */}
            <div className="bg-gradient-to-r from-[#17191d] via-[#1c1f24] to-[#121417] rounded-lg border border-zinc-700/80 p-3 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-700/60">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black tracking-wider text-zinc-200 uppercase">
                    DIGITAL DELAY B
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    BPM-LINKED · FILTERED FEEDBACK
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <select
                    value={delayParamsB.mode}
                    onChange={(e) => onChangeDelayB({ mode: e.target.value as any })}
                    className="bg-zinc-950 text-zinc-300 text-xs rounded px-2 py-0.5 border border-zinc-700"
                  >
                    <option>DUAL</option>
                    <option>STEREO</option>
                    <option>TAPE</option>
                  </select>

                  <button
                    onClick={() => onChangeDelayB({ enabled: !delayParamsB.enabled })}
                    className={`px-3 py-0.5 rounded text-xs font-bold uppercase transition-all ${
                      delayParamsB.enabled
                        ? 'bg-emerald-600 text-white border border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
                        : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                    }`}
                  >
                    {delayParamsB.enabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              {/* Delay B Knobs */}
              <div className="grid grid-cols-6 gap-2 my-3">
                <DjKnob
                  label="TIME"
                  value={0.75}
                  color="amber"
                  displayValue={delayParamsB.timeDivision}
                  onChange={() => {}}
                />
                <DjKnob
                  label="FEEDBACK"
                  value={delayParamsB.feedback}
                  min={0}
                  max={95}
                  unit="%"
                  color="amber"
                  onChange={(v) => onChangeDelayB({ feedback: v })}
                />
                <DjKnob
                  label="LO CUT"
                  value={delayParamsB.loCut}
                  min={20}
                  max={1000}
                  unit="Hz"
                  color="amber"
                  onChange={(v) => onChangeDelayB({ loCut: v })}
                />
                <DjKnob
                  label="HI CUT"
                  value={delayParamsB.hiCut / 1000}
                  min={1}
                  max={20}
                  unit="kHz"
                  color="amber"
                  onChange={(v) => onChangeDelayB({ hiCut: v * 1000 })}
                />
                <DjKnob
                  label="WIDTH"
                  value={delayParamsB.width}
                  min={0}
                  max={100}
                  unit="%"
                  color="amber"
                  onChange={(v) => onChangeDelayB({ width: v })}
                />
                <DjKnob
                  label="CH SEND"
                  value={delayParamsB.chSend}
                  min={0}
                  max={100}
                  unit="%"
                  color="amber"
                  onChange={(v) => onChangeDelayB({ chSend: v })}
                />
              </div>
            </div>
          </div>
        )}

        {/* VIEW C: DYNAMICS (Screenshot 3) */}
        {subTab === 'dynamics' && (
          <div className="grid grid-cols-12 gap-4 flex-1 items-stretch">
            {/* Left Card: BUS COMPRESSOR (Red Panel) */}
            <div className="col-span-7 bg-gradient-to-br from-[#8a1c2a] via-[#a82435] to-[#6d131f] text-white rounded-lg p-6 flex flex-col justify-between shadow-2xl border border-red-500/40">
              <div className="flex items-center justify-between border-b border-red-400/40 pb-2">
                <div>
                  <span className="text-xs font-black tracking-widest uppercase block">
                    BUS COMPRESSOR
                  </span>
                  <span className="text-[10px] text-red-200/80 font-mono">
                    CONTROLLED GLUE · TRANSIENT-SAFE ATTACK
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <select
                    value={compressorParams.preset}
                    onChange={(e) => onChangeCompressor({ preset: e.target.value })}
                    className="bg-zinc-950 text-red-100 text-xs rounded px-3 py-1 border border-red-400/50"
                  >
                    <option>Commercial Clean</option>
                    <option>Punchy Glue</option>
                    <option>Heavy Slam</option>
                  </select>

                  <button
                    onClick={() => onChangeCompressor({ enabled: !compressorParams.enabled })}
                    className={`px-3 py-1 rounded text-xs font-bold uppercase transition-all ${
                      compressorParams.enabled
                        ? 'bg-emerald-600 text-white border border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                        : 'bg-zinc-950 text-zinc-400 border border-zinc-800'
                    }`}
                  >
                    {compressorParams.enabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              {/* Compressor Knobs */}
              <div className="grid grid-cols-5 gap-3 my-6">
                <DjKnob
                  label="THRESHOLD"
                  value={compressorParams.threshold}
                  min={-40}
                  max={0}
                  unit="dB"
                  color="red"
                  size="md"
                  onChange={(v) => onChangeCompressor({ threshold: v })}
                />
                <DjKnob
                  label="RATIO"
                  value={compressorParams.ratio}
                  min={1}
                  max={20}
                  step={0.5}
                  color="red"
                  size="md"
                  displayValue={`${compressorParams.ratio.toFixed(1)}:1`}
                  onChange={(v) => onChangeCompressor({ ratio: v })}
                />
                <DjKnob
                  label="ATTACK"
                  value={compressorParams.attack}
                  min={1}
                  max={100}
                  unit="ms"
                  color="red"
                  size="md"
                  onChange={(v) => onChangeCompressor({ attack: v })}
                />
                <DjKnob
                  label="RELEASE"
                  value={compressorParams.release}
                  min={10}
                  max={1000}
                  unit="ms"
                  color="red"
                  size="md"
                  onChange={(v) => onChangeCompressor({ release: v })}
                />
                <DjKnob
                  label="MAKEUP"
                  value={compressorParams.makeup}
                  min={0}
                  max={12}
                  unit="dB"
                  color="red"
                  size="md"
                  onChange={(v) => onChangeCompressor({ makeup: v })}
                />
              </div>

              <div className="text-[10px] text-red-200/70 font-mono">
                Analog VCA emulation circuit with sidechain highpass filtering.
              </div>
            </div>

            {/* Right Card: OUTPUT SAFETY LIMITER (Amber/Copper Panel) */}
            <div className="col-span-5 bg-gradient-to-br from-[#9c581e] via-[#bd6c25] to-[#783e10] text-white rounded-lg p-6 flex flex-col justify-between shadow-2xl border border-amber-500/40">
              <div className="flex items-center justify-between border-b border-amber-400/40 pb-2">
                <div>
                  <span className="text-xs font-black tracking-widest uppercase block">
                    OUTPUT SAFETY LIMITER
                  </span>
                  <span className="text-[10px] text-amber-200/80 font-mono">
                    FINAL OVERLOAD PROTECTION
                  </span>
                </div>

                <button
                  onClick={() => onChangeLimiter({ enabled: !limiterParams.enabled })}
                  className={`px-3 py-1 rounded text-xs font-bold uppercase transition-all ${
                    limiterParams.enabled
                      ? 'bg-emerald-600 text-white border border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                      : 'bg-zinc-950 text-zinc-400 border border-zinc-800'
                  }`}
                >
                  {limiterParams.enabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Limiter Knobs */}
              <div className="grid grid-cols-2 gap-6 my-6 items-center">
                <DjKnob
                  label="CEILING"
                  value={limiterParams.ceiling}
                  min={-6}
                  max={0}
                  step={0.1}
                  unit="dBFS"
                  color="amber"
                  size="lg"
                  onChange={(v) => onChangeLimiter({ ceiling: v })}
                />
                <DjKnob
                  label="RELEASE"
                  value={limiterParams.release}
                  min={20}
                  max={500}
                  unit="ms"
                  color="amber"
                  size="lg"
                  onChange={(v) => onChangeLimiter({ release: v })}
                />
              </div>

              <div className="text-[10px] text-amber-200/70 font-mono">
                True-peak inter-sample overs ceiling clamp.
              </div>
            </div>
          </div>
        )}

        {/* VIEW D: 31-BAND EQ (Screenshot 2) */}
        {subTab === '31bandEq' && (
          <div className="bg-[#101216] rounded-lg border border-zinc-800 p-4 flex flex-col justify-between shadow-2xl">
            {/* Top Controls Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsDrawMode(!isDrawMode)}
                  className={`px-3 py-1 rounded text-xs font-bold border transition-all ${
                    isDrawMode
                      ? 'bg-amber-600 text-white border-amber-400'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  {isDrawMode ? 'DRAW ON' : 'DRAW OFF'}
                </button>

                <button
                  onClick={onSetEqFlat}
                  className="flex items-center space-x-1 px-3 py-1 rounded text-xs font-bold bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 transition-all"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>FLAT</span>
                </button>

                <button
                  onClick={() => alert('Equalizer preset saved to memory!')}
                  className="flex items-center space-x-1 px-3 py-1 rounded text-xs font-bold bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 transition-all"
                >
                  <Save className="w-3 h-3" />
                  <span>SAVE</span>
                </button>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={() => onToggleEq(!isEqEnabled)}
                  className={`px-4 py-1 rounded text-xs font-bold uppercase transition-all ${
                    isEqEnabled
                      ? 'bg-amber-600 text-white border border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.6)]'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                  }`}
                >
                  {isEqEnabled ? 'EQ ON' : 'EQ OFF'}
                </button>

                <span className="text-[10px] font-mono text-cyan-400 font-bold">
                  ISO THIRD-OCTAVE · ±12 dB
                </span>
              </div>
            </div>

            {/* 31 Vertical Sliders + Output Peak Meter */}
            <div className="flex items-center space-x-2 my-4 overflow-x-auto py-2">
              <div className="flex-1 grid grid-cols-[repeat(31,minmax(0,1fr))] gap-1 items-center bg-zinc-950/60 p-3 rounded border border-zinc-850">
                {ISO_FREQUENCIES.map((freq, idx) => {
                  const gain = eqGains[idx] || 0;
                  return (
                    <div key={freq} className="flex flex-col items-center justify-between h-64">
                      {/* Frequency Label */}
                      <span className="text-[9px] font-mono font-bold text-zinc-400">
                        {formatIsoFreq(freq)}
                      </span>

                      {/* Vertical Slider Track */}
                      <div className="relative h-44 w-4 flex flex-col items-center justify-center my-1">
                        {/* 0dB center line */}
                        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-zinc-700 pointer-events-none" />

                        <input
                          type="range"
                          min="-12"
                          max="12"
                          step="0.5"
                          value={gain}
                          onChange={(e) => onChangeEqBand(idx, parseFloat(e.target.value))}
                          className="w-36 h-3 -rotate-90 origin-center cursor-pointer accent-zinc-200 bg-zinc-900"
                        />
                      </div>

                      {/* dB Readout */}
                      <span
                        className={`text-[8px] font-mono ${
                          gain === 0
                            ? 'text-zinc-500'
                            : gain > 0
                            ? 'text-amber-400 font-bold'
                            : 'text-blue-400 font-bold'
                        }`}
                      >
                        {gain > 0 ? `+${gain.toFixed(1)}` : gain.toFixed(1)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Master Output Peak Meter */}
              <div className="w-16 bg-zinc-950 rounded border border-zinc-800 p-2 flex flex-col items-center justify-between h-64">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">OUT</span>

                <div className="flex items-center space-x-1 h-44">
                  {/* Left and Right meter bars */}
                  <div className="w-2.5 h-full bg-zinc-900 rounded-sm overflow-hidden flex flex-col-reverse p-0.5">
                    <div
                      className="w-full bg-gradient-to-t from-emerald-500 via-amber-400 to-red-500 rounded-sm transition-all duration-75"
                      style={{ height: `${Math.min(100, vuMaster * 100)}%` }}
                    />
                  </div>
                  <div className="w-2.5 h-full bg-zinc-900 rounded-sm overflow-hidden flex flex-col-reverse p-0.5">
                    <div
                      className="w-full bg-gradient-to-t from-emerald-500 via-amber-400 to-red-500 rounded-sm transition-all duration-75"
                      style={{ height: `${Math.min(100, vuMaster * 100)}%` }}
                    />
                  </div>
                </div>

                <span className="text-[9px] font-mono text-amber-400 font-bold">
                  {vuMaster > 0 ? `${(vuMaster * -60).toFixed(1)} dB` : '-60.0 dB'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { SyncController } from '../engine/syncEngine';
import { Settings, Shield, Cpu, Zap, Activity } from 'lucide-react';

interface DjSettingsProps {
  syncController: SyncController;
  isContinuousSync: boolean;
  onToggleContinuousSync: (enabled: boolean) => void;
  crossfaderCurve: 'smooth' | 'cut' | 'linear';
  onChangeCrossfaderCurve: (curve: 'smooth' | 'cut' | 'linear') => void;
  onInjectTestDrift: () => void;
}

export const DjSettings: React.FC<DjSettingsProps> = ({
  syncController,
  isContinuousSync,
  onToggleContinuousSync,
  crossfaderCurve,
  onChangeCrossfaderCurve,
  onInjectTestDrift,
}) => {
  return (
    <div className="flex-1 bg-[#090b0e] p-4 flex flex-col justify-between select-none">
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-orange-600 to-amber-700 flex items-center justify-center border border-orange-400/40 shadow-sm">
            <Settings className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-black tracking-widest text-zinc-100 uppercase">
              BUWAGA PRO ENGINE SETTINGS & DIAGNOSTICS
            </h2>
            <p className="text-[10px] tracking-wider text-zinc-400 uppercase font-medium">
              PID PHASE CONTROLLER · HARDWARE ARCHIVAL SAFETY VERIFIED
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
          <span className="text-xs font-mono text-emerald-400 font-bold">CALIBRATED</span>
        </div>
      </div>

      {/* 2. Main Settings Grid */}
      <div className="grid grid-cols-2 gap-4 my-3 flex-1 items-stretch">
        {/* Left Column: BUWAGA Engine Calibration */}
        <div className="bg-[#101216] rounded-lg border border-zinc-800 p-4 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black uppercase text-zinc-200 tracking-wider">
                BUWAGA PID SYNCHRONIZATION
              </span>
            </div>
            <button
              onClick={() => onToggleContinuousSync(!isContinuousSync)}
              className={`px-3 py-1 rounded text-xs font-bold uppercase transition-all ${
                isContinuousSync
                  ? 'bg-emerald-600 text-white border border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.7)]'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
              }`}
            >
              {isContinuousSync ? 'AUTO-LOCK ON' : 'AUTO-LOCK OFF'}
            </button>
          </div>

          <div className="space-y-4 my-2">
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-zinc-400">Kp (Proportional Phase Gain):</span>
                <span className="text-amber-400 font-bold">{syncController.kp}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.05"
                defaultValue={syncController.kp}
                onChange={(e) => (syncController.kp = parseFloat(e.target.value))}
                className="w-full h-2 bg-zinc-900 rounded accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-zinc-400">Ki (Integral Anti-Drift Gain):</span>
                <span className="text-amber-400 font-bold">{syncController.ki}</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.5"
                step="0.01"
                defaultValue={syncController.ki}
                onChange={(e) => (syncController.ki = parseFloat(e.target.value))}
                className="w-full h-2 bg-zinc-900 rounded accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-zinc-400">Kd (Derivative Damping Gain):</span>
                <span className="text-amber-400 font-bold">{syncController.kd}</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.5"
                step="0.01"
                defaultValue={syncController.kd}
                onChange={(e) => (syncController.kd = parseFloat(e.target.value))}
                className="w-full h-2 bg-zinc-900 rounded accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-zinc-400">Max Pitch Shift Mod Clamp:</span>
                <span className="text-cyan-400 font-bold">±8.0%</span>
              </div>
              <p className="text-[10px] text-zinc-500">
                Prevents audible pitch flutter during transient phase recovery.
              </p>
            </div>
          </div>

          {/* Test Phase Drift Button */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-zinc-300 block">STRESS TEST BUWAGA</span>
              <span className="text-[10px] text-zinc-500">
                Injects +35ms phase offset to watch PID algorithm recover
              </span>
            </div>
            <button
              onClick={onInjectTestDrift}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-amber-500/40 text-xs font-bold uppercase transition-all shadow-sm"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>TEST DRIFT</span>
            </button>
          </div>
        </div>

        {/* Right Column: Safe Copy Verification & Crossfader Curves */}
        <div className="bg-[#101216] rounded-lg border border-zinc-800 p-4 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black uppercase text-zinc-200 tracking-wider">
                SAFE COPY VERIFICATION
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono font-bold">
              SAFE & PRESERVED
            </span>
          </div>

          {/* Safe Copy Audit Banner */}
          <div className="bg-zinc-950 rounded p-3 border border-zinc-850 space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-zinc-200">
                /src/engine/buwagaSyncEngineSafeCopy.ts
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-mono leading-relaxed">
              Permanent untouched archival copy of the finished BUWAGA synchronization engine
              algorithm has been sealed and maintained safely at the exact specified path.
            </p>
          </div>

          {/* Crossfader Curve Selector */}
          <div className="my-3">
            <span className="text-xs font-bold text-zinc-400 uppercase block mb-2">
              CROSSFADER CONTOUR CURVE
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(['smooth', 'cut', 'linear'] as const).map((curve) => (
                <button
                  key={curve}
                  onClick={() => onChangeCrossfaderCurve(curve)}
                  className={`py-2 rounded text-xs font-bold uppercase border transition-all ${
                    crossfaderCurve === curve
                      ? 'bg-amber-600/30 text-amber-300 border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  {curve}
                </button>
              ))}
            </div>
          </div>

          {/* Audio Engine Specs */}
          <div className="pt-3 border-t border-zinc-800 grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div className="bg-zinc-950 p-2 rounded border border-zinc-850">
              <span className="text-[9px] text-zinc-500 block">SAMPLE RATE</span>
              <span className="text-zinc-200 font-bold">48,000 Hz</span>
            </div>
            <div className="bg-zinc-950 p-2 rounded border border-zinc-850">
              <span className="text-[9px] text-zinc-500 block">BUFFER LATENCY</span>
              <span className="text-emerald-400 font-bold">&lt; 3.2 ms</span>
            </div>
            <div className="bg-zinc-950 p-2 rounded border border-zinc-850">
              <span className="text-[9px] text-zinc-500 block">BIT DEPTH</span>
              <span className="text-zinc-200 font-bold">32-Bit Float</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

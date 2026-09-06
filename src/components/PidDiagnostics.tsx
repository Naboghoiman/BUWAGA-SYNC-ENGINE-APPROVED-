import React, { useEffect, useRef } from 'react';
import { PidCoefficients, PidTelemetry } from '../types';
import { Activity, Sliders, CheckCircle2, RotateCcw } from 'lucide-react';

interface PidDiagnosticsProps {
  telemetryHistory: PidTelemetry[];
  coefficients: PidCoefficients;
  onUpdateCoefficients: (coeffs: Partial<PidCoefficients>) => void;
  onResetPid: () => void;
}

export const PidDiagnostics: React.FC<PidDiagnosticsProps> = ({
  telemetryHistory,
  coefficients,
  onUpdateCoefficients,
  onResetPid,
}) => {
  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Latest telemetry snapshot
  const latest = telemetryHistory[telemetryHistory.length - 1] || {
    error: 0,
    phaseErrorMs: 0,
    integral: 0,
    derivative: 0,
    proportionalTerm: 0,
    integralTerm: 0,
    derivativeTerm: 0,
    totalCorrection: 0,
    playbackRate: 1.0,
  };

  // Draw real-time strip-chart
  useEffect(() => {
    const canvas = chartCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const midY = height / 2;

    // Background
    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = '#181824';
    ctx.lineWidth = 1;
    // Zero center line
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    // +20ms and -20ms reference lines
    ctx.strokeStyle = '#10101A';
    ctx.beginPath();
    ctx.moveTo(0, midY - height * 0.25);
    ctx.lineTo(width, midY - height * 0.25);
    ctx.moveTo(0, midY + height * 0.25);
    ctx.lineTo(width, midY + height * 0.25);
    ctx.stroke();

    if (telemetryHistory.length < 2) return;

    const maxHistory = 100;
    const stepX = width / (maxHistory - 1);
    const startIdx = Math.max(0, telemetryHistory.length - maxHistory);
    const slice = telemetryHistory.slice(startIdx);

    // Scale factor: +/- 50ms maps to full height
    const maxScaleMs = 40;

    // 1. Draw Phase Error Curve (Cyan)
    ctx.beginPath();
    slice.forEach((pt, i) => {
      const x = i * stepX;
      const clampedMs = Math.max(-maxScaleMs, Math.min(maxScaleMs, pt.phaseErrorMs));
      const y = midY - (clampedMs / maxScaleMs) * (height * 0.44);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 2. Draw PID Correction Force (Orange, scaled)
    ctx.beginPath();
    slice.forEach((pt, i) => {
      const x = i * stepX;
      // Correction typically ~ +/- 0.005
      const scaledCorrection = Math.max(-1, Math.min(1, pt.totalCorrection * 200));
      const y = midY - scaledCorrection * (height * 0.4);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#F27D26';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#6A6A7E';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('+40ms', width - 6, midY - height * 0.38);
    ctx.fillText('0ms (SYNC)', width - 6, midY - 4);
    ctx.fillText('-40ms', width - 6, midY + height * 0.42);
  }, [telemetryHistory]);

  const setPreset = (preset: 'super_djay' | 'fast' | 'gentle') => {
    if (preset === 'super_djay') {
      onUpdateCoefficients({ kp: 0.10, ki: 0.01, kd: 0.10 });
    } else if (preset === 'fast') {
      onUpdateCoefficients({ kp: 0.15, ki: 0.02, kd: 0.10 });
    } else if (preset === 'gentle') {
      onUpdateCoefficients({ kp: 0.05, ki: 0.005, kd: 0.05 });
    }
  };

  const isSuperDjayActive =
    Math.abs(coefficients.kp - 0.10) < 0.005 &&
    Math.abs(coefficients.ki - 0.01) < 0.005 &&
    Math.abs(coefficients.kd - 0.10) < 0.005;

  return (
    <div id="pid-diagnostics" className="rounded-xl bg-gradient-to-b from-[#111118] to-[#0A0A0E] border border-[#1F1F2B] p-4 shadow-2xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1C1C28] pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#00F5A0]" />
          <h3 className="text-xs font-mono font-bold text-[#F3F4F6] uppercase tracking-wider">
            BUWAGA PID Sync Diagnostics & Telemetry
          </h3>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#00F5A0]/15 text-[#00F5A0] border border-[#00F5A0]/30 font-bold">
            10% SUPER DJAY ACTIVE
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[#6A6A7E]">Profiles:</span>
          <button
            onClick={() => setPreset('super_djay')}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold border transition-all ${
              isSuperDjayActive
                ? 'bg-[#00F5A0]/20 text-[#00F5A0] border-[#00F5A0] shadow-[0_0_10px_rgba(0,245,160,0.3)]'
                : 'bg-[#13131D] hover:bg-[#1A1A28] text-[#D1D5DB] border-[#242436]'
            }`}
          >
            ★ 10% Super djay
          </button>
          <button
            onClick={() => setPreset('fast')}
            className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#13131D] hover:bg-[#1A1A28] text-[#D1D5DB] border border-[#242436] transition-all"
          >
            Fast (15%)
          </button>
          <button
            onClick={() => setPreset('gentle')}
            className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#13131D] hover:bg-[#1A1A28] text-[#D1D5DB] border border-[#242436] transition-all"
          >
            Gentle (5%)
          </button>
          <button
            onClick={onResetPid}
            title="Reset PID Integral & Error"
            className="p-1 rounded bg-[#13131D] hover:bg-[#1A1A28] text-[#8E8E9F] hover:text-white border border-[#242436] transition-all"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Grid: Chart on Left, Coefficients & Terms on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Oscilloscope Realtime Chart */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between text-[11px] font-mono mb-1.5 px-1 text-[#8E8E9F]">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-[#00E5FF] inline-block shadow-[0_0_6px_#00E5FF]" />
                <span className="text-[#00E5FF]">Phase Error (ms)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-[#F27D26] inline-block shadow-[0_0_6px_#F27D26]" />
                <span className="text-[#F27D26]">PID Correction Force</span>
              </span>
            </div>
            <span className="text-[#5C5C70]">Live 100-tick window</span>
          </div>

          <canvas
            ref={chartCanvasRef}
            width={600}
            height={130}
            className="w-full h-32 rounded-lg border border-[#1C1C28] bg-[#050508] block shadow-inner"
          />

          {/* Math formula indicator */}
          <div className="mt-2 text-[10px] font-mono text-[#6A6A7E] flex items-center justify-between px-1">
            <span>Formula: correction = (Kp × e) + (Ki × ∫e) + (Kd × de/dt)</span>
            <span className="text-[#00F5A0] flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Continuous Closed-Loop Tracking
            </span>
          </div>
        </div>

        {/* Live Term Metrics & Sliders */}
        <div className="flex flex-col justify-between gap-3 bg-[#060609] p-3 rounded-lg border border-[#1C1C28] font-mono text-xs shadow-inner">
          {/* Live Values Breakdown */}
          <div className="grid grid-cols-3 gap-2 text-center pb-2 border-b border-[#1C1C28]">
            <div className="p-1.5 rounded bg-[#0E0E16] border border-[#1F1F2E]">
              <div className="text-[9px] text-[#00E5FF] font-bold uppercase">P Term</div>
              <div className="text-xs text-[#F3F4F6] font-semibold">
                {latest.proportionalTerm >= 0 ? '+' : ''}
                {latest.proportionalTerm.toFixed(5)}
              </div>
            </div>
            <div className="p-1.5 rounded bg-[#0E0E16] border border-[#1F1F2E]">
              <div className="text-[9px] text-[#00F5A0] font-bold uppercase">I Term</div>
              <div className="text-xs text-[#F3F4F6] font-semibold">
                {latest.integralTerm >= 0 ? '+' : ''}
                {latest.integralTerm.toFixed(5)}
              </div>
            </div>
            <div className="p-1.5 rounded bg-[#0E0E16] border border-[#1F1F2E]">
              <div className="text-[9px] text-[#F27D26] font-bold uppercase">D Term</div>
              <div className="text-xs text-[#F3F4F6] font-semibold">
                {latest.derivativeTerm >= 0 ? '+' : ''}
                {latest.derivativeTerm.toFixed(5)}
              </div>
            </div>
          </div>

          {/* Sliders for Kp, Ki, Kd */}
          <div className="flex flex-col gap-2">
            {/* Kp Slider */}
            <div>
              <div className="flex justify-between text-[10px] text-[#8E8E9F] mb-0.5">
                <span>Kp (Proportional Gain):</span>
                <span className="text-[#00E5FF] font-bold">
                  {(coefficients.kp * 100).toFixed(1)}% ({coefficients.kp.toFixed(3)})
                </span>
              </div>
              <input
                type="range"
                min={0.01}
                max={0.30}
                step={0.005}
                value={coefficients.kp}
                onChange={(e) => onUpdateCoefficients({ kp: parseFloat(e.target.value) })}
                className="w-full h-1 bg-[#14141F] rounded appearance-none cursor-pointer"
                style={{ accentColor: '#00E5FF' }}
              />
            </div>

            {/* Ki Slider */}
            <div>
              <div className="flex justify-between text-[10px] text-[#8E8E9F] mb-0.5">
                <span>Ki (Integral Phase Trim):</span>
                <span className="text-[#00F5A0] font-bold">
                  {(coefficients.ki * 100).toFixed(2)}% ({coefficients.ki.toFixed(4)})
                </span>
              </div>
              <input
                type="range"
                min={0.001}
                max={0.05}
                step={0.001}
                value={coefficients.ki}
                onChange={(e) => onUpdateCoefficients({ ki: parseFloat(e.target.value) })}
                className="w-full h-1 bg-[#14141F] rounded appearance-none cursor-pointer"
                style={{ accentColor: '#00F5A0' }}
              />
            </div>

            {/* Kd Slider */}
            <div>
              <div className="flex justify-between text-[10px] text-[#8E8E9F] mb-0.5">
                <span>Kd (Derivative Damping):</span>
                <span className="text-[#F27D26] font-bold">
                  {(coefficients.kd * 100).toFixed(1)}% ({coefficients.kd.toFixed(3)})
                </span>
              </div>
              <input
                type="range"
                min={0.01}
                max={0.30}
                step={0.005}
                value={coefficients.kd}
                onChange={(e) => onUpdateCoefficients({ kd: parseFloat(e.target.value) })}
                className="w-full h-1 bg-[#14141F] rounded appearance-none cursor-pointer"
                style={{ accentColor: '#F27D26' }}
              />
            </div>
          </div>

          {/* Total Output rate summary */}
          <div className="flex items-center justify-between pt-2 border-t border-[#1C1C28] text-[11px]">
            <span className="text-[#6A6A7E]">Total Correction:</span>
            <span
              className={`font-bold ${
                latest.totalCorrection >= 0 ? 'text-[#F27D26]' : 'text-[#FF6688]'
              }`}
            >
              {latest.totalCorrection >= 0 ? '+' : ''}
              {latest.totalCorrection.toFixed(6)} / tick
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

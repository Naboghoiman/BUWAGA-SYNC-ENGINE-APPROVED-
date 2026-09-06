import React from 'react';
import { Zap, Volume2, VolumeX, Radio, Music, ArrowRightLeft, Sparkles, RefreshCw } from 'lucide-react';
import { SoundMode } from '../engine/audioSynth';

interface CenterMixerProps {
  syncActive: boolean;
  continuousPid: boolean;
  phaseErrorMs: number;
  isPhaseLocked: boolean;
  driftRate: number;
  crossfader: number;
  soundMode: SoundMode;
  masterMuted: boolean;
  guideClickEnabled?: boolean;
  onSyncPress: () => void;
  onSnapPhase?: () => void;
  onContinuousPidToggle: () => void;
  onCrossfaderChange: (val: number) => void;
  onDriftChange: (val: number) => void;
  onSlipPhase: (deltaMs: number) => void;
  onSoundModeChange: (mode: SoundMode) => void;
  onMasterMuteToggle: () => void;
  onGuideClickToggle?: () => void;
  onResetAll: () => void;
}

export const CenterMixer: React.FC<CenterMixerProps> = ({
  syncActive,
  continuousPid,
  phaseErrorMs,
  isPhaseLocked,
  driftRate,
  crossfader,
  soundMode,
  masterMuted,
  guideClickEnabled = false,
  onSyncPress,
  onSnapPhase,
  onContinuousPidToggle,
  onCrossfaderChange,
  onDriftChange,
  onSlipPhase,
  onSoundModeChange,
  onMasterMuteToggle,
  onGuideClickToggle,
  onResetAll,
}) => {
  // Calculate gauge position: clamp -100ms to +100ms into 0% to 100%
  const clampedError = Math.max(-100, Math.min(100, phaseErrorMs));
  const gaugePercent = ((clampedError + 100) / 200) * 100;

  return (
    <div
      id="center-mixer"
      className="flex flex-col justify-between p-4 rounded-xl bg-gradient-to-b from-[#111118] to-[#0A0A0E] border border-[#1F1F2B] shadow-2xl backdrop-blur-sm"
    >
      {/* Top Header / Branding */}
      <div className="flex items-center justify-between border-b border-[#1C1C28] pb-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#00F5A0] shadow-[0_0_8px_#00F5A0] animate-pulse" />
          <span className="text-xs font-bold tracking-wider text-[#F3F4F6] uppercase font-mono">
            BUWAGA CORE
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Metronome guide click overlay button */}
          {onGuideClickToggle && (
            <button
              onClick={onGuideClickToggle}
              title={guideClickEnabled ? 'Disable beat click overlay' : 'Enable beat click overlay over real songs'}
              className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                guideClickEnabled
                  ? 'bg-[#00F5A0]/20 text-[#00F5A0] border-[#00F5A0]/50 font-bold shadow-[0_0_8px_rgba(0,245,160,0.2)]'
                  : 'bg-[#13131C] text-[#7A7A8E] border-[#242436] hover:text-white'
              }`}
            >
              CLICK GUIDE
            </button>
          )}

          {/* Sound mode toggle */}
          <div className="flex items-center bg-[#07070B] p-0.5 rounded-lg border border-[#1C1C28] text-[10px] font-mono">
            <button
              onClick={() => onSoundModeChange('beats')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-all ${
                soundMode === 'beats'
                  ? 'bg-[#00E5FF]/20 text-[#00E5FF] font-semibold shadow-[0_0_8px_rgba(0,229,255,0.2)]'
                  : 'text-[#6A6A7E] hover:text-[#D1D5DB]'
              }`}
            >
              <Music className="w-3 h-3" />
              <span>BEATS</span>
            </button>
            <button
              onClick={() => onSoundModeChange('clicks')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-all ${
                soundMode === 'clicks'
                  ? 'bg-[#F27D26]/20 text-[#F27D26] font-semibold shadow-[0_0_8px_rgba(242,125,38,0.2)]'
                  : 'text-[#6A6A7E] hover:text-[#D1D5DB]'
              }`}
            >
              <Radio className="w-3 h-3" />
              <span>CLICKS</span>
            </button>
          </div>

          <button
            onClick={onMasterMuteToggle}
            className={`p-1.5 rounded-lg border text-xs transition-all ${
              masterMuted
                ? 'bg-[#FF3366]/20 text-[#FF6688] border-[#FF3366]/40 shadow-[0_0_8px_rgba(255,51,102,0.2)]'
                : 'bg-[#13131C] text-[#8E8E9F] border-[#242434] hover:text-white'
            }`}
          >
            {masterMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* THE MAIN BUWAGA SYNC BUTTON */}
      <div className="flex flex-col items-center my-2">
        <button
          onClick={onSyncPress}
          className={`relative group w-full py-5 px-6 rounded-xl font-mono font-black text-base sm:text-lg tracking-widest uppercase transition-all duration-150 active:scale-95 shadow-2xl border ${
            syncActive
              ? 'bg-gradient-to-b from-[#00F5A0] to-[#059669] text-black border-[#6EE7B7] shadow-[0_0_30px_rgba(0,245,160,0.4)]'
              : 'bg-gradient-to-b from-[#1C1C28] to-[#0E0E16] text-[#E0E0E0] border-[#2E2E42] hover:border-[#00F5A0]/60 hover:text-white hover:shadow-[0_0_20px_rgba(0,245,160,0.2)]'
          }`}
        >
          {/* Glowing ring animation */}
          <div className="flex items-center justify-center gap-2">
            <Zap className={`w-5 h-5 ${syncActive ? 'fill-current text-black animate-bounce' : 'text-[#00F5A0]'}`} />
            <span>BUWAGA SYNC</span>
          </div>

          <div className="text-[11px] tracking-normal font-sans font-medium mt-1 text-center opacity-90">
            {syncActive ? 'DECKS LOCKED • FOLLOWER MOTOR ACTIVE' : '1. BPM MATCH • 2. ALIGN PHASE • 3. AUTO START'}
          </div>

          {/* Glowing dot indicator */}
          <div
            className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
              syncActive ? 'bg-white shadow-lg shadow-white animate-ping' : 'bg-[#4B4B60]'
            }`}
          />
        </button>

        {/* Continuous PID Tracking Mode toggle */}
        <div className="flex items-center justify-between w-full mt-2 px-2.5 py-1.5 rounded-lg bg-[#07070B] border border-[#1C1C28] text-[11px] font-mono shadow-inner">
          <span className="text-[#8E8E9F] flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#00E5FF]" />
            <span>Continuous Phase Lock (PID):</span>
          </span>
          <button
            onClick={onContinuousPidToggle}
            className={`px-2 py-0.5 rounded font-bold transition-all border ${
              continuousPid
                ? 'bg-[#00F5A0]/15 text-[#00F5A0] border-[#00F5A0]/40 shadow-[0_0_8px_rgba(0,245,160,0.15)]'
                : 'bg-[#14141E] text-[#6A6A7E] border-[#242436]'
            }`}
          >
            {continuousPid ? 'ACTIVE' : 'OFF'}
          </button>
        </div>
      </div>

      {/* PHASE METER GAUGE */}
      <div className="my-3 p-3 rounded-xl bg-[#060609] border border-[#1C1C28] flex flex-col gap-1.5 shadow-inner">
        <div className="flex items-center justify-between font-mono text-[11px]">
          <div className="flex items-center gap-2">
            <span className="text-[#6A6A7E]">BEAT PHASE ERROR</span>
            {onSnapPhase && (
              <button
                onClick={onSnapPhase}
                title="Instantly snap slave deck phase to 0.00ms error"
                className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#00F5A0]/10 hover:bg-[#00F5A0]/25 text-[#00F5A0] border border-[#00F5A0]/30 transition-all active:scale-95"
              >
                SNAP 0.00ms
              </button>
            )}
          </div>
          <span
            className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
              isPhaseLocked
                ? 'bg-[#00F5A0]/15 text-[#00F5A0] border border-[#00F5A0]/30'
                : Math.abs(phaseErrorMs) < 20
                ? 'bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/30'
                : 'bg-[#FF3366]/20 text-[#FF6688] border border-[#FF3366]/30 shadow-[0_0_8px_rgba(255,51,102,0.2)]'
            }`}
          >
            {phaseErrorMs >= 0 ? '+' : ''}
            {phaseErrorMs.toFixed(2)} ms {isPhaseLocked ? '• IN SYNC' : ''}
          </span>
        </div>

        {/* Horizontal gauge line */}
        <div className="relative w-full h-4 bg-[#0E0E16] rounded-full border border-[#1C1C28] overflow-hidden">
          {/* Target green tolerance band (+/- 5ms around center 50%) */}
          <div
            className="absolute top-0 bottom-0 bg-[#00F5A0]/25 border-x border-[#00F5A0]/50"
            style={{ left: '47.5%', width: '5%' }}
            title="Ideal Phase Lock Zone (<5ms)"
          />

          {/* Center line */}
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-[#4B4B60] -translate-x-1/2 z-10" />

          {/* Current Needle */}
          <div
            className={`absolute top-0 bottom-0 w-2 -translate-x-1/2 rounded-full transition-all duration-75 shadow-lg ${
              isPhaseLocked
                ? 'bg-[#00F5A0] shadow-[0_0_10px_#00F5A0]'
                : 'bg-[#FF3366] shadow-[0_0_10px_#FF3366]'
            }`}
            style={{ left: `${gaugePercent}%` }}
          />
        </div>

        <div className="flex justify-between text-[9px] font-mono text-[#5C5C70]">
          <span>-100ms (SLAVE EARLY)</span>
          <span className="text-[#00F5A0]">0 ms (PERFECT)</span>
          <span>+100ms (SLAVE LATE)</span>
        </div>
      </div>

      {/* DRIFT & JITTER TEST LAB */}
      <div className="p-2.5 rounded-lg bg-[#07070B]/80 border border-[#1C1C28]/80 mb-3">
        <div className="flex items-center justify-between text-[11px] font-mono text-[#8E8E9F] mb-1.5">
          <span className="font-semibold text-[#D1D5DB]">Phase Perturbation Test</span>
          <span className="text-[10px] text-[#6A6A7E]">Slip offset</span>
        </div>

        {/* Quick Slip buttons */}
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          <button
            onClick={() => onSlipPhase(-50)}
            title="Slip slave deck backward 50ms"
            className="py-1 px-1.5 rounded text-[10px] font-mono bg-[#13131D] hover:bg-[#1A1A28] text-[#D1D5DB] border border-[#242436] active:scale-95 transition-all"
          >
            -50ms Slip
          </button>
          <button
            onClick={() => onSlipPhase(50)}
            title="Slip slave deck forward 50ms"
            className="py-1 px-1.5 rounded text-[10px] font-mono bg-[#13131D] hover:bg-[#1A1A28] text-[#D1D5DB] border border-[#242436] active:scale-95 transition-all"
          >
            +50ms Slip
          </button>
          <button
            onClick={() => onSlipPhase(240)}
            title="Inject half-beat clash (180 deg out of phase)"
            className="py-1 px-1.5 rounded text-[10px] font-mono bg-[#FF3366]/15 hover:bg-[#FF3366]/25 text-[#FF88A3] border border-[#FF3366]/30 active:scale-95 transition-all"
          >
            ½ Beat Clash
          </button>
        </div>

        {/* Artificial Clock Drift Slider */}
        <div className="flex items-center justify-between text-[10px] font-mono text-[#8E8E9F]">
          <span>Artificial Motor Drift (±10%):</span>
          <span className={driftRate !== 0 ? 'text-[#F27D26] font-bold' : 'text-[#6A6A7E]'}>
            {driftRate >= 0 ? '+' : ''}
            {driftRate.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <input
            type="range"
            min={-10}
            max={10}
            step={0.5}
            value={driftRate}
            onChange={(e) => onDriftChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#14141F] rounded-lg appearance-none cursor-pointer"
            style={{ accentColor: '#F27D26' }}
          />
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onDriftChange(-10)}
              title="Set -10% drift"
              className="text-[9px] px-1 py-0.5 rounded bg-[#13131C] text-[#8E8E9F] hover:text-[#F27D26] border border-[#242436]"
            >
              -10%
            </button>
            <button
              onClick={() => onDriftChange(0)}
              title="Reset drift to 0"
              className="text-[9px] px-1 py-0.5 rounded bg-[#13131C] text-[#8E8E9F] hover:text-white border border-[#242436]"
            >
              0
            </button>
            <button
              onClick={() => onDriftChange(10)}
              title="Set +10% drift"
              className="text-[9px] px-1 py-0.5 rounded bg-[#13131C] text-[#8E8E9F] hover:text-[#F27D26] border border-[#242436]"
            >
              +10%
            </button>
          </div>
        </div>
      </div>

      {/* CROSSFADER */}
      <div className="p-2.5 rounded-lg bg-[#060609] border border-[#1C1C28] shadow-inner">
        <div className="flex items-center justify-between text-[10px] font-mono text-[#8E8E9F] mb-1">
          <span className="text-[#00E5FF] font-bold">DECK A</span>
          <span className="text-[#6A6A7E]">CROSSFADER</span>
          <span className="text-[#F27D26] font-bold">DECK B</span>
        </div>

        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={crossfader}
          onChange={(e) => onCrossfaderChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-[#14141F] rounded-lg appearance-none cursor-pointer accent-[#D1D5DB]"
        />

        <div className="flex justify-between items-center mt-1">
          <button
            onClick={() => onCrossfaderChange(0)}
            className="text-[9px] font-mono text-[#6A6A7E] hover:text-[#00E5FF] px-1 py-0.5"
          >
            [100% A]
          </button>
          <button
            onClick={() => onCrossfaderChange(0.5)}
            className="text-[9px] font-mono text-[#6A6A7E] hover:text-[#E0E0E0] px-1 py-0.5"
          >
            [CENTER]
          </button>
          <button
            onClick={() => onCrossfaderChange(1)}
            className="text-[9px] font-mono text-[#6A6A7E] hover:text-[#F27D26] px-1 py-0.5"
          >
            [100% B]
          </button>
        </div>
      </div>

      {/* Footer Reset Tool */}
      <div className="flex justify-end pt-2">
        <button
          onClick={onResetAll}
          className="flex items-center gap-1 text-[10px] font-mono text-[#6A6A7E] hover:text-[#E0E0E0] transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Reset Decks to 00:00</span>
        </button>
      </div>
    </div>
  );
};

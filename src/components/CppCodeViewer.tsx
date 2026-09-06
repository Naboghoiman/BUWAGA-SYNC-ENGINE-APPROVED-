import React, { useState } from 'react';
import { BUWAGA_SYNC_ENGINE } from '../engine/syncEngine';
import { FileCode, Play, Terminal, Copy, Check } from 'lucide-react';

interface CppCodeViewerProps {
  onApplyBenchmarkToLive?: (history: { tick: number; phaseError: number; correction: number; rate: number }[]) => void;
}

export const CppCodeViewer: React.FC<CppCodeViewerProps> = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [benchmarkLogs, setBenchmarkLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'code' | 'benchmark'>('benchmark');

  const originalCppCode = `// ========================================================
// BUWAGA PRO SYNC ENGINE ARCHITECTURE SPECIFICATION
// MASTER / FOLLOWER BEAT-SYNC ENGINE
//
// Core Pipeline:
// 1. BeatGrid: Tempo calculation and nearest beat-time resolution
// 2. Deck: Clock position, duration, and playbackRate modulation
// 3. SyncController: 10% Super djay PID phase-locked loop
// 4. SyncEngine: Automated BPM matching and continuous drift compensation
// ========================================================

class BeatGrid {
public:
    double bpm;
    std::vector<double> beats;

    BeatGrid(double tempo) : bpm(tempo) {}

    void generate(double duration) {
        double interval = 60.0 / bpm;
        for (double t = 0; t < duration; t += interval) {
            beats.push_back(t);
        }
    }

    double nearestBeat(double position) {
        if (beats.empty()) return 0;
        double closest = beats[0];
        double error = std::abs(position - closest);
        for (double b : beats) {
            double e = std::abs(position - b);
            if (e < error) {
                error = e;
                closest = b;
            }
        }
        return closest;
    }
};

class Deck {
public:
    std::string name;
    double bpm;
    double position;
    double playbackRate;
    bool playing;
    BeatGrid grid;

    Deck(std::string id, double tempo)
        : name(id), bpm(tempo), position(0), playbackRate(1.0), playing(false), grid(tempo) {}

    void start() {
        playing = true;
    }

    void update(double seconds) {
        if (playing) {
            position += seconds * playbackRate;
        }
    }
};

class SyncController {
private:
    double kp;
    double ki;
    double kd;
    double integral;
    double previousError;

public:
    SyncController() {
        // 10% Super djay algorithm parameters
        kp = 0.10;   // 10% proportional gain
        ki = 0.01;   // 1% integral trim
        kd = 0.10;   // 10% derivative damp
        integral = 0;
        previousError = 0;
    }

    double calculate(double error) {
        integral += error;
        // Anti-windup protection
        if (integral > 0.10) integral = 0.10;
        if (integral < -0.10) integral = -0.10;

        double derivative = error - previousError;
        previousError = error;

        double correction = (kp * error) + (ki * integral) + (kd * derivative);
        // Pitch bend clamp (±10%)
        if (correction > 0.10) correction = 0.10;
        if (correction < -0.10) correction = -0.10;
        return correction;
    }
};

class BUWAGA_SYNC_ENGINE {
public:
    Deck master;
    Deck slave;
    SyncController controller;

    BUWAGA_SYNC_ENGINE()
        : master("MASTER", 128.0), slave("SLAVE", 126.0) {
        master.grid.generate(300);
        slave.grid.generate(300);
    }

    void syncButton() {
        // 1. Match BPM ratio
        double bpmRatio = master.bpm / slave.bpm;
        slave.playbackRate = bpmRatio;

        // 2. Align beat phase instantly
        double masterBeat = master.grid.nearestBeat(master.position);
        double slaveBeat = slave.grid.nearestBeat(slave.position);
        double phaseError = masterBeat - slaveBeat;
        slave.position += phaseError;

        // 3. Start slave automatically
        slave.start();
    }

    void process() {
        double phaseError = master.grid.nearestBeat(master.position) - slave.grid.nearestBeat(slave.position);
        double correction = controller.calculate(phaseError);
        slave.playbackRate += correction;
    }

    void runBenchmark(int ticks, double deltaSec) {
        syncButton();
        for (int i = 0; i < ticks; i++) {
            master.update(deltaSec);
            slave.update(deltaSec);
            process();
        }
    }
};`;

  const runBenchmarkSimulation = () => {
    setIsRunning(true);
    const engine = new BUWAGA_SYNC_ENGINE(128.0, 126.0);
    const result = engine.runBenchmark(100, 0.02);
    setBenchmarkLogs(result.logs);
    setIsRunning(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(originalCppCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl bg-gradient-to-b from-[#111118] to-[#0A0A0E] border border-[#1F1F2B] p-4 shadow-2xl backdrop-blur-sm text-xs font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1C1C28] pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-[#00E5FF]" />
          <h3 className="font-bold text-[#F3F4F6] uppercase tracking-wider">
            BUWAGA C++ Architecture & Benchmark Runner
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-[#07070B] p-0.5 rounded-lg border border-[#1C1C28]">
            <button
              onClick={() => setActiveTab('benchmark')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] transition-all ${
                activeTab === 'benchmark'
                  ? 'bg-[#00E5FF]/20 text-[#00E5FF] font-bold shadow-[0_0_8px_rgba(0,229,255,0.2)]'
                  : 'text-[#6A6A7E] hover:text-[#D1D5DB]'
              }`}
            >
              <Terminal className="w-3 h-3" />
              <span>C++ Benchmark (100 Ticks)</span>
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] transition-all ${
                activeTab === 'code'
                  ? 'bg-[#00E5FF]/20 text-[#00E5FF] font-bold shadow-[0_0_8px_rgba(0,229,255,0.2)]'
                  : 'text-[#6A6A7E] hover:text-[#D1D5DB]'
              }`}
            >
              <FileCode className="w-3 h-3" />
              <span>C++ Spec Code</span>
            </button>
          </div>

          {activeTab === 'code' && (
            <button
              onClick={copyCode}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#13131D] hover:bg-[#1A1A28] text-[#D1D5DB] border border-[#242436] text-[11px] transition-all"
            >
              {copied ? <Check className="w-3 h-3 text-[#00F5A0]" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'benchmark' ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between bg-[#060609] p-3 rounded-lg border border-[#1C1C28] shadow-inner">
            <div>
              <div className="text-[#F3F4F6] font-bold text-[12px]">
                Simulate <code className="text-[#00E5FF] font-mono">engine.run()</code> (100 Ticks @ 20ms)
              </div>
              <div className="text-[#6A6A7E] text-[11px] mt-0.5">
                Executes Master (128.0 BPM) vs Slave (126.0 BPM) sync test with console std::cout telemetry.
              </div>
            </div>

            <button
              onClick={runBenchmarkSimulation}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-b from-[#00F5A0] to-[#059669] text-black font-bold text-xs border border-[#6EE7B7] shadow-[0_0_15px_rgba(0,245,160,0.3)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{benchmarkLogs.length > 0 ? 'Re-run Benchmark' : 'Run 100-Tick Benchmark'}</span>
            </button>
          </div>

          {/* Console stdout view */}
          <div className="bg-[#050508] rounded-lg p-3 border border-[#1C1C28] font-mono text-[11px] max-h-56 overflow-y-auto leading-relaxed text-[#D1D5DB] shadow-inner">
            {benchmarkLogs.length > 0 ? (
              benchmarkLogs.map((line, idx) => (
                <div
                  key={idx}
                  className={
                    line.includes('SYNC PRESSED')
                      ? 'text-[#00F5A0] font-bold'
                      : line.includes('BPM ratio')
                      ? 'text-[#00E5FF]'
                      : line.includes('Phase correction')
                      ? 'text-[#F27D26]'
                      : line.includes('Benchmark complete')
                      ? 'text-[#00F5A0] font-bold border-t border-[#1C1C28] pt-1 mt-1'
                      : 'text-[#8E8E9F]'
                  }
                >
                  {line}
                </div>
              ))
            ) : (
              <div className="text-[#5C5C70] italic py-6 text-center">
                Click "Run 100-Tick Benchmark" above to execute the C++ engine loop and view stdout logs.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-[#050508] rounded-lg p-3 border border-[#1C1C28] max-h-80 overflow-y-auto shadow-inner">
          <pre className="text-[#D1D5DB] text-[11px] leading-relaxed select-text font-mono">
            {originalCppCode}
          </pre>
        </div>
      )}
    </div>
  );
};

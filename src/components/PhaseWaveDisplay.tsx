import React, { useRef, useEffect } from 'react';
import { TrackInfo } from '../types';

interface PhaseWaveDisplayProps {
  track1: TrackInfo | null;
  track2: TrackInfo | null;
  pos1: number;
  pos2: number;
  bpm1: number;
  bpm2: number;
  playing1: boolean;
  playing2: boolean;
  masterDeck: 'master' | 'slave';
}

export const PhaseWaveDisplay: React.FC<PhaseWaveDisplayProps> = ({
  track1,
  track2,
  pos1,
  pos2,
  bpm1,
  bpm2,
  playing1,
  playing2,
  masterDeck,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Dark background
      ctx.fillStyle = '#090a0d';
      ctx.fillRect(0, 0, width, height);

      const halfH = height / 2;
      const centerCursorX = width * 0.58; // Position of Master cursor line matching screenshot

      // Helper to draw one deck track phase wave
      const drawDeckWave = (
        deckNum: 1 | 2,
        track: TrackInfo | null,
        pos: number,
        bpm: number,
        playing: boolean,
        yOffset: number,
        waveColor: string,
        beatColor: string
      ) => {
        // Subtle track separator
        ctx.strokeStyle = '#1e2229';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, yOffset + halfH);
        ctx.lineTo(width, yOffset + halfH);
        ctx.stroke();

        const interval = 60.0 / (bpm > 0 ? bpm : 128);
        const pixelsPerSecond = 80; // Scale of zoom

        // Draw Beat Grid vertical lines
        const windowSec = width / pixelsPerSecond;
        const startSec = pos - (centerCursorX / pixelsPerSecond);
        const endSec = startSec + windowSec;

        const firstBeatIndex = Math.floor(startSec / interval);
        const lastBeatIndex = Math.ceil(endSec / interval);

        for (let i = firstBeatIndex; i <= lastBeatIndex; i++) {
          const beatTime = i * interval;
          const x = centerCursorX + (beatTime - pos) * pixelsPerSecond;
          if (x >= 0 && x <= width) {
            const isDownbeat = (i % 4) === 0;
            ctx.fillStyle = isDownbeat ? beatColor : 'rgba(255, 255, 255, 0.15)';
            const barW = isDownbeat ? 2 : 1;
            const barH = isDownbeat ? halfH * 0.85 : halfH * 0.45;
            const barY = yOffset + (halfH - barH) / 2;
            ctx.fillRect(x - barW / 2, barY, barW, barH);

            if (isDownbeat) {
              // Tiny downbeat marker on top
              ctx.fillStyle = beatColor;
              ctx.fillRect(x - 3, yOffset + 2, 6, 2);
            }
          }
        }

        // Draw audio waveform peaks if available or synthetic high-density beat waveform
        if (track && track.peaks && track.peaks.length > 0) {
          const peaks = track.peaks;
          const totalDuration = track.duration || 60;
          const pointsCount = peaks.length;

          ctx.fillStyle = waveColor;
          for (let px = 140; px < width; px += 2) {
            const timeAtPixel = pos + (px - centerCursorX) / pixelsPerSecond;
            if (timeAtPixel >= 0 && timeAtPixel < totalDuration) {
              const peakIdx = Math.floor((timeAtPixel / totalDuration) * pointsCount);
              const amp = (peaks[peakIdx] || 0.1) * (halfH * 0.4);
              ctx.fillRect(px, yOffset + halfH / 2 - amp, 1.5, amp * 2);
            }
          }
        } else {
          // Synthetic procedural rhythmic waveform for demo
          ctx.fillStyle = waveColor;
          for (let px = 150; px < width; px += 3) {
            const t = pos + (px - centerCursorX) / pixelsPerSecond;
            const beatPhase = (((t % interval) + interval) % interval) / interval;
            // Transient spike at beat onset
            const transient = Math.exp(-beatPhase * 6);
            const amp = (0.15 + transient * 0.75) * (halfH * 0.38);
            ctx.fillRect(px, yOffset + halfH / 2 - amp, 1.5, amp * 2);
          }
        }
      };

      // Draw Deck 1 (Upper half)
      drawDeckWave(1, track1, pos1, bpm1, playing1, 0, '#3b82f6', '#60a5fa');

      // Draw Deck 2 (Lower half)
      drawDeckWave(2, track2, pos2, bpm2, playing2, halfH, '#06b6d4', '#22d3ee');

      // Master Center Cursor Line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(centerCursorX, 0);
      ctx.lineTo(centerCursorX, height);
      ctx.stroke();
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [track1, track2, pos1, pos2, bpm1, bpm2, playing1, playing2, masterDeck]);

  return (
    <div className="relative w-full h-24 bg-[#0a0c10] border-b border-zinc-800/80 overflow-hidden select-none">
      {/* Top Header Labels */}
      <div className="absolute top-1.5 left-3 right-3 z-10 flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest pointer-events-none">
        <span className="text-zinc-400">2-DECK · 2-CHANNEL PHASE WAVE</span>
        <div className="flex items-center space-x-1" style={{ position: 'absolute', left: '57.2%', transform: 'translateX(-50%)' }}>
          <span className="text-white text-[9px] bg-zinc-900/80 px-1 rounded border border-zinc-700/60 font-mono tracking-wider">
            MASTER
          </span>
        </div>
        <span className="text-zinc-400">DOWNBEAT ALIGNMENT</span>
      </div>

      {/* Track info overlay badges on left */}
      <div className="absolute top-6 left-3 z-10 flex flex-col space-y-3 pointer-events-none">
        {/* Deck 1 info */}
        <div className="flex items-center space-x-2">
          <span className="w-4 h-4 rounded bg-blue-600/30 text-blue-400 border border-blue-500/40 text-[9px] font-bold flex items-center justify-center">
            1
          </span>
          <span className="text-[10px] font-mono text-zinc-300 font-semibold truncate max-w-[130px]">
            {track1 ? track1.name : 'NO TRACK LOADED'}
          </span>
        </div>

        {/* Deck 2 info */}
        <div className="flex items-center space-x-2">
          <span className="w-4 h-4 rounded bg-cyan-600/30 text-cyan-400 border border-cyan-500/40 text-[9px] font-bold flex items-center justify-center">
            2
          </span>
          <span className="text-[10px] font-mono text-zinc-300 font-semibold truncate max-w-[130px]">
            {track2 ? track2.name : 'NO TRACK LOADED'}
          </span>
        </div>
      </div>

      {/* Render Canvas */}
      <canvas ref={canvasRef} width={1200} height={96} className="w-full h-full block" />
    </div>
  );
};

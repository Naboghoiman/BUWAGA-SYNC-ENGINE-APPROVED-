import React, { useEffect, useRef, useState } from 'react';
import { Deck } from '../engine/syncEngine';

interface WaveformDisplayProps {
  master: Deck;
  slave: Deck;
  phaseErrorMs: number;
  isPhaseLocked: boolean;
  onScrub?: (deck: 'master' | 'slave', deltaSec: number) => void;
}

export const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  master,
  slave,
  phaseErrorMs,
  isPhaseLocked,
  onScrub,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom] = useState(140); // pixels per second
  const isDraggingRef = useRef<{ deck: 'master' | 'slave'; startX: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Clear dark background
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, width, height);

      const midY = height / 2;
      const centerX = width / 2;

      // Top Track: Master (Deck A - Immersive Electric Cyan)
      drawDeckWaveform(
        ctx,
        master,
        0,
        midY - 2,
        centerX,
        zoom,
        '#00E5FF',
        '#042633',
        'DECK A (MASTER)',
        master.bpm
      );

      // Bottom Track: Slave (Deck B - Immersive Studio Orange)
      drawDeckWaveform(
        ctx,
        slave,
        midY + 2,
        midY - 2,
        centerX,
        zoom,
        '#F27D26',
        '#3B1907',
        'DECK B (FOLLOWER)',
        slave.bpm
      );

      // Divider line
      ctx.strokeStyle = '#1C1C28';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();

      // Center Playhead Needle
      ctx.save();
      ctx.shadowColor = isPhaseLocked ? '#00F5A0' : '#FF3366';
      ctx.shadowBlur = isPhaseLocked ? 12 : 8;
      ctx.strokeStyle = isPhaseLocked ? '#00F5A0' : '#FF3366';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, 0);
      ctx.lineTo(centerX, height);
      ctx.stroke();

      // Playhead Top & Bottom Markers
      ctx.fillStyle = isPhaseLocked ? '#00F5A0' : '#FF3366';
      // Top triangle
      ctx.beginPath();
      ctx.moveTo(centerX - 6, 0);
      ctx.lineTo(centerX + 6, 0);
      ctx.lineTo(centerX, 8);
      ctx.closePath();
      ctx.fill();

      // Center lock indicator badge
      ctx.restore();
      ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      const lockText = isPhaseLocked ? '✓ PHASE LOCKED' : `${phaseErrorMs >= 0 ? '+' : ''}${phaseErrorMs.toFixed(1)}ms`;
      const textWidth = ctx.measureText(lockText).width;

      ctx.fillStyle = 'rgba(10, 10, 15, 0.9)';
      ctx.strokeStyle = isPhaseLocked ? '#00F5A0' : '#FF3366';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(centerX - textWidth / 2 - 8, midY - 10, textWidth + 16, 20, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isPhaseLocked ? '#00F5A0' : '#FF6688';
      ctx.fillText(lockText, centerX, midY + 3.5);

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [master, slave, phaseErrorMs, isPhaseLocked, zoom]);

  const drawDeckWaveform = (
    ctx: CanvasRenderingContext2D,
    deck: Deck,
    topY: number,
    deckHeight: number,
    centerX: number,
    pixelsPerSec: number,
    accentColor: string,
    dimColor: string,
    label: string,
    bpm: number
  ) => {
    const centerY = topY + deckHeight / 2;
    const interval = 60.0 / (deck.bpm > 0 ? deck.bpm : 120);
    const rate = Math.max(0.1, deck.playbackRate);

    // Time window visible in real seconds
    const halfWindowSec = centerX / pixelsPerSec;

    // Draw waveform peaks
    const stepPx = 3;
    const hasRealPeaks = deck.track?.peaks && deck.track.duration > 0;

    if (hasRealPeaks && deck.track) {
      const peaks = deck.track.peaks;
      const totalPeaks = peaks.length;
      const duration = deck.track.duration;

      for (let x = 0; x < centerX * 2; x += stepPx) {
        const dtReal = (x - centerX) / pixelsPerSec;
        const t = deck.position + dtReal * rate;
        if (t < 0 || t > duration) continue;

        const peakIdx = Math.floor((t / duration) * totalPeaks);
        if (peakIdx >= 0 && peakIdx < totalPeaks) {
          const peakVal = peaks[peakIdx];
          const h = Math.max(2, Math.min(deckHeight * 0.44, peakVal * deckHeight * 0.44));

          // Highlight wave near playhead with glowing accent
          const distFromCenter = Math.abs(x - centerX);
          if (distFromCenter < 35) {
            ctx.fillStyle = accentColor;
          } else {
            ctx.fillStyle = dimColor;
          }
          ctx.fillRect(x, centerY - h, stepPx - 1, h * 2);
        }
      }
    } else {
      // Fallback pseudo waveform generated from beats
      const gridOffset = deck.grid.offset || 0;
      ctx.fillStyle = dimColor;
      for (let x = 0; x < centerX * 2; x += stepPx) {
        const dtReal = (x - centerX) / pixelsPerSec;
        const t = deck.position + dtReal * rate;
        if (t < 0) continue;

        const relT = t - gridOffset;
        const beatProgress = (((relT % interval) + interval) % interval) / interval;
        let amp = Math.exp(-beatProgress * 8) * 0.9;
        amp += Math.sin(t * 50) * 0.15;
        amp += (Math.sin(t * 12) + 1) * 0.1;
        const barIdx = Math.floor(relT / (interval * 4));
        if (barIdx % 2 === 0) amp *= 1.1;

        const h = Math.min(deckHeight * 0.42, amp * deckHeight * 0.42);
        ctx.fillRect(x, centerY - h, stepPx - 1, h * 2);
      }
    }

    // Draw beatgrid lines accounting for grid offset and rate scaling
    const gridOffset = deck.grid.offset || 0;
    const startTrackTime = deck.position - halfWindowSec * rate;
    const endTrackTime = deck.position + halfWindowSec * rate;
    const firstBeatIdx = Math.floor((startTrackTime - gridOffset) / interval);
    const lastBeatIdx = Math.ceil((endTrackTime - gridOffset) / interval);

    for (let i = firstBeatIdx; i <= lastBeatIdx; i++) {
      const beatTime = gridOffset + i * interval;
      // Real-time delta from current playhead
      const dtReal = (beatTime - deck.position) / rate;
      const x = centerX + dtReal * pixelsPerSec;

      if (x < 0 || x > centerX * 2) continue;

      const beatInBar = ((i % 4) + 4) % 4 + 1; // 1, 2, 3, 4
      const isDownbeat = beatInBar === 1;

      ctx.save();
      if (isDownbeat) {
        // Thick downbeat marker
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.moveTo(x, topY + 4);
        ctx.lineTo(x, topY + deckHeight - 4);
        ctx.stroke();

        // Bar number
        ctx.restore();
        ctx.fillStyle = accentColor;
        ctx.font = 'bold 9px ui-monospace, monospace';
        ctx.textAlign = 'center';
        const barNum = Math.floor(i / 4) + 1;
        ctx.fillText(`${barNum}.1`, x, topY + 12);
      } else {
        // Sub-beat marker
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, topY + 14);
        ctx.lineTo(x, topY + deckHeight - 14);
        ctx.stroke();

        ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
        ctx.font = '8px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${beatInBar}`, x, topY + deckHeight - 4);
      }
    }

    // Song progress bar track strip at bottom of lane
    if (deck.duration && deck.duration > 0) {
      const progress = Math.min(1, Math.max(0, deck.position / deck.duration));
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.fillRect(0, topY + deckHeight - 3, centerX * 2, 3);
      ctx.fillStyle = accentColor;
      ctx.fillRect(0, topY + deckHeight - 3, (centerX * 2) * progress, 3);
    }

    // Label in corner
    ctx.fillStyle = accentColor;
    ctx.font = '600 10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    const trackTitle = deck.track ? ` • ${deck.track.name}` : ' • Synth Drum Loop';
    ctx.fillText(`${label}${trackTitle}`, 12, topY + 16);

    // Deck status badge (BPM & Rate)
    const effectiveBpm = (bpm * deck.playbackRate).toFixed(2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = '10px ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${effectiveBpm} BPM (${deck.playbackRate.toFixed(4)}x)`, centerX * 2 - 12, topY + 16);
  };

  // Mouse drag scrubbing handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const deck = y < rect.height / 2 ? 'master' : 'slave';
    isDraggingRef.current = { deck, startX: e.clientX };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !onScrub) return;
    const deltaX = e.clientX - isDraggingRef.current.startX;
    if (Math.abs(deltaX) > 2) {
      // Invert because dragging left moves playhead forward
      const deltaSec = -deltaX / zoom;
      onScrub(isDraggingRef.current.deck, deltaSec);
      isDraggingRef.current.startX = e.clientX;
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = null;
  };

  return (
    <div id="waveform-container" className="relative w-full rounded-xl overflow-hidden border border-[#1F1F2B] bg-[#07070C] shadow-2xl">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#0B0B11] border-b border-[#1F1F2B] text-xs font-mono text-[#8E8E9F]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-[#00E5FF] shadow-[0_0_6px_#00E5FF]" />
            <span className="text-[#00E5FF] font-semibold">DECK A (MASTER)</span>
          </span>
          <span className="text-[#2F2F3D]">|</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-[#F27D26] shadow-[0_0_6px_#F27D26]" />
            <span className="text-[#F27D26] font-semibold">DECK B (FOLLOWER)</span>
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="text-[#727285]">
            Drag waveform to slip phase & test PID recovery
          </span>
          <span className="px-2 py-0.5 rounded bg-[#13131C] text-[#C5C5D3] border border-[#242436]">
            Grid Interval: 60/BPM
          </span>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={960}
        height={190}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-44 sm:h-48 cursor-ew-resize block"
      />
    </div>
  );
};

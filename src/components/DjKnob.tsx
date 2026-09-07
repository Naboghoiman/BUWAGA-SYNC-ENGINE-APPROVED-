import React, { useRef, useState, useEffect, useCallback } from 'react';

interface DjKnobProps {
  label: string;
  value: number; // current value
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
  unit?: string;
  color?: 'cyan' | 'amber' | 'blue' | 'red' | 'green' | 'white';
  size?: 'sm' | 'md' | 'lg';
  displayValue?: string;
  onChange: (val: number) => void;
  id?: string;
}

export const DjKnob: React.FC<DjKnobProps> = ({
  label,
  value,
  min = -1,
  max = 1,
  step = 0.01,
  defaultValue = 0,
  unit = '',
  color = 'cyan',
  size = 'md',
  displayValue,
  onChange,
  id,
}) => {
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startVal = useRef(0);
  const [active, setActive] = useState(false);

  // Map value to angle (-135deg to +135deg = 270deg sweep)
  const norm = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const angle = -135 + norm * 270;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startY.current = e.clientY;
    startVal.current = value;
    setActive(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return;
      const dy = startY.current - moveEvent.clientY;
      const range = max - min;
      // 150px drag for full range
      const delta = (dy / 150) * range;
      let newVal = startVal.current + delta;
      newVal = Math.max(min, Math.min(max, newVal));
      if (step > 0) {
        newVal = Math.round(newVal / step) * step;
      }
      onChange(newVal);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      setActive(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleDoubleClick = () => {
    onChange(defaultValue);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const dir = e.deltaY < 0 ? 1 : -1;
    const range = max - min;
    const stepSize = step > 0 ? step : range / 100;
    const newVal = Math.max(min, Math.min(max, value + dir * stepSize * 2));
    onChange(newVal);
  };

  const colorStyles = {
    cyan: {
      line: 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]',
      text: 'text-cyan-400',
      activeRing: 'border-cyan-500/50',
    },
    amber: {
      line: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
      text: 'text-amber-400',
      activeRing: 'border-amber-500/50',
    },
    blue: {
      line: 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]',
      text: 'text-blue-400',
      activeRing: 'border-blue-500/50',
    },
    red: {
      line: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]',
      text: 'text-red-400',
      activeRing: 'border-red-500/50',
    },
    green: {
      line: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]',
      text: 'text-emerald-400',
      activeRing: 'border-emerald-500/50',
    },
    white: {
      line: 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]',
      text: 'text-zinc-200',
      activeRing: 'border-white/50',
    },
  }[color];

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }[size];

  const knobCapSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  }[size];

  const textVal =
    displayValue !== undefined
      ? displayValue
      : `${value > 0 && unit.includes('dB') ? '+' : ''}${value.toFixed(1)}${unit ? ' ' + unit : ''}`;

  return (
    <div id={id} className="flex flex-col items-center select-none text-center group cursor-pointer">
      <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase mb-1 whitespace-nowrap">
        {label}
      </span>

      <div
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        className={`relative ${sizeClasses} rounded-full flex items-center justify-center p-1 bg-gradient-to-b from-zinc-800 to-zinc-950 shadow-[inset_0_1px_3px_rgba(255,255,255,0.1),0_3px_6px_rgba(0,0,0,0.8)] border border-zinc-700/60 ${
          active ? colorStyles.activeRing : ''
        }`}
      >
        {/* Outer radial tick ring */}
        <div className="absolute inset-0 rounded-full border border-zinc-600/30" />

        {/* Center rotating knob cap */}
        <div
          className={`relative ${knobCapSizes} rounded-full bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-900 border border-zinc-600/80 shadow-[0_2px_4px_rgba(0,0,0,0.9)] flex items-center justify-center`}
          style={{ transform: `rotate(${angle}deg)` }}
        >
          {/* Ribbed knurled edge simulation */}
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.4)_100%)]" />

          {/* Indicator pointer line */}
          <div className={`absolute top-0.5 w-[2px] h-3 rounded-full ${colorStyles.line}`} />

          {/* Center cap core */}
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-700/80 shadow-inner" />
        </div>
      </div>

      <span className={`text-[10px] font-mono mt-1 ${colorStyles.text} transition-colors whitespace-nowrap`}>
        {textVal}
      </span>
    </div>
  );
};

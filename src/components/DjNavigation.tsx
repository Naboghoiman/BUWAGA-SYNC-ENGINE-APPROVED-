import React from 'react';
import { DjViewTab } from '../types';
import { Disc, Sliders, Gauge, Layers, Settings } from 'lucide-react';

interface DjNavigationProps {
  currentTab: DjViewTab;
  onSelectTab: (tab: DjViewTab) => void;
  statusMessage?: string;
}

export const DjNavigation: React.FC<DjNavigationProps> = ({
  currentTab,
  onSelectTab,
  statusMessage = 'Buffered Safe DSP ready · load a song into either deck',
}) => {
  const tabs = [
    { id: 'decks', label: 'DECKS + MIXER', icon: Disc },
    { id: 'mixer', label: 'FULL MIXER', icon: Sliders },
    { id: 'master', label: 'MASTER OUTPUT', icon: Gauge },
    { id: 'sampler', label: 'BEAT LOOPER & SAMPLER', icon: Layers },
    { id: 'settings', label: 'SETTINGS', icon: Settings },
  ] as const;

  return (
    <footer className="bg-[#0b0c0f] border-t border-zinc-800/90 select-none z-20">
      {/* Primary Navigation Tabs */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-zinc-900">
        <div className="flex items-center space-x-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id as DjViewTab)}
                className={`flex items-center space-x-2 px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                  isActive
                    ? 'bg-zinc-800 text-amber-400 border border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                    : 'bg-zinc-950/60 text-zinc-400 border border-transparent hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-zinc-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Status Badge */}
        <div className="hidden sm:flex items-center space-x-2 text-[10px] font-mono font-bold text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>BUFFERED SAFE DSP READY · 2 DECKS · 2 CHANNELS</span>
        </div>
      </div>

      {/* Sub Status Bar */}
      <div className="px-4 py-1 flex items-center justify-between text-[11px] font-mono text-zinc-400 bg-black/40">
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>{statusMessage}</span>
        </div>

        <div className="flex items-center space-x-4 text-[10px]">
          <span className="text-zinc-400">BUWAGA SYNC: PID ACTIVE</span>
          <span className="text-amber-500 font-bold">24-BIT / 48kHz</span>
        </div>
      </div>
    </footer>
  );
};

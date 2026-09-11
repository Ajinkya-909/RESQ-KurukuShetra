import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Home,
  Radio,
  AlertTriangle,
  Zap,
  MoreHorizontal
} from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const {
    activeNavTab,
    setActiveNavTab,
    openReallocationModal,
    openNewEmergencyModal
  } = useApp();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
      <button
        onClick={() => setActiveNavTab('Dashboard')}
        className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
          activeNavTab === 'Dashboard'
            ? 'text-blue-600'
            : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <Home className="w-4 h-4" />
        <span>Home</span>
      </button>

      <button
        onClick={() => {
          setActiveNavTab('Dashboard');
          const el = document.getElementById('map-container-section');
          el?.scrollIntoView({ behavior: 'smooth' });
        }}
        className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
      >
        <Radio className="w-4 h-4" />
        <span>Live Map</span>
      </button>

      <button
        onClick={openNewEmergencyModal}
        className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-bold text-rose-600 cursor-pointer"
      >
        <AlertTriangle className="w-4 h-4" />
        <span>Simulate</span>
      </button>

      <button
        onClick={openReallocationModal}
        className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-bold text-blue-600 cursor-pointer"
      >
        <Zap className="w-4 h-4" />
        <span>Re-run</span>
      </button>

      <button
        onClick={() => setActiveNavTab('Analytics')}
        className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
          activeNavTab === 'Analytics'
            ? 'text-blue-600'
            : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <MoreHorizontal className="w-4 h-4" />
        <span>Analytics</span>
      </button>
    </div>
  );
};

import React from 'react';
import { useApp } from '../context/AppContext';
import {
  AlertTriangle,
  RefreshCw,
  Zap,
  ShieldAlert,
  ArrowRight,
  Radio,
  Split
} from 'lucide-react';

export const Hero: React.FC = () => {
  const {
    openConflictModal,
    openNewEmergencyModal,
    openReallocationModal,
    emergencySimulated,
    reallocationApproved
  } = useApp();

  return (
    <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
      {/* Background Banner with Disaster Operations Backdrop */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200/90 shadow-xs bg-slate-950 text-white min-h-[200px] sm:min-h-[220px] flex flex-col justify-center p-6 sm:p-8">
        {/* Subtle satellite flood imagery overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-luminosity pointer-events-none"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=1600&q=80')`
          }}
        />
        {/* Deep blue/slate tactical gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-blue-950/80 pointer-events-none" />

        {/* Tactical Grid Lines Accent */}
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)',
            backgroundSize: '24px 24px'
          }}
        />

        {/* Content Container */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left Column: Headings and Descriptive copy */}
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-blue-300 backdrop-blur-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span>Autonomous Emergency Coordination Platform</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
              RESQ: Safer People. Smarter Response.
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed max-w-xl">
              Resolves mission conflicts, coordinates cross-agency response, and dynamically reallocates critical resources in real-time.
            </p>
          </div>

          {/* Right Column: 3 Primary Interactive Simulation Triggers */}
          <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            {/* 1. Simulate Mission Conflict Button */}
            <button
              id="btn-simulate-conflict"
              onClick={openConflictModal}
              className="inline-flex items-center justify-center gap-2 bg-slate-800/90 hover:bg-slate-700/90 active:bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-xl border border-slate-700 shadow-xs hover:border-amber-400/50 transition-all cursor-pointer group"
            >
              <Split className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
              <span>Simulate Mission Conflict</span>
            </button>

            {/* 2. Simulate New Emergency Button */}
            <button
              id="btn-simulate-emergency"
              onClick={openNewEmergencyModal}
              className="inline-flex items-center justify-center gap-2 bg-rose-600/90 hover:bg-rose-600 active:bg-rose-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl border border-rose-500/80 shadow-sm shadow-rose-900/30 transition-all cursor-pointer group"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-200 group-hover:scale-110 transition-transform" />
              <span>Simulate New Emergency</span>
            </button>

            {/* 3. Re-run Allocation Button */}
            <button
              id="btn-rerun-hero"
              onClick={openReallocationModal}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-sm shadow-blue-500/30 transition-all cursor-pointer group"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-100 group-hover:rotate-180 transition-transform duration-500" />
              <span>Re-run Allocation</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

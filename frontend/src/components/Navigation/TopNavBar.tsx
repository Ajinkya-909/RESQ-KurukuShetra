import React from 'react';
import { Shield, Plus, Activity, Compass, Layers } from 'lucide-react';
import { Scenario } from '../../types';

interface TopNavBarProps {
  currentRoute: 'home' | 'setup' | 'dashboard' | 'depots' | 'agency' | 'not-found';
  onNavigate: (to: string) => void;
  activeScenario: Scenario | null;
  onNewScenarioClick?: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  currentRoute,
  onNavigate,
  activeScenario,
  onNewScenarioClick,
}) => {
  const scenarioId = activeScenario?.scenario_id || 'scn_pune_monsoon';

  return (
    <header className="h-18 bg-white border-b border-slate-200 px-8 py-3 flex items-center justify-between shrink-0 shadow-xs z-30 font-sans">
      {/* Left: Brand Identity with Official Logo */}
      <div className="flex items-center gap-10 shrink-0">
        <div
          onClick={() => onNavigate('/')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <img
            src="/logo.png"
            alt="RESQ Logo"
            className="w-10 h-10 object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
          />
          <div className="flex flex-col">
            <span className="font-black text-2xl tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors leading-none">
              RESQ
            </span>
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mt-0.5">
              Emergency Response
            </span>
          </div>
        </div>

        {/* Center: Navigation Tabs (Clean, Single Line, No Wrapping) */}
        <nav className="hidden lg:flex items-center gap-1.5">
          <button
            onClick={() => onNavigate('/')}
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-extrabold transition-all cursor-pointer ${
              currentRoute === 'home'
                ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-100'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Home & Scenarios
          </button>

          <button
            onClick={() => onNavigate(`/setup/${scenarioId}`)}
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
              currentRoute === 'setup'
                ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-100'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Compass className="w-4 h-4 text-blue-600" />
            <span>Setup Engine</span>
          </button>

          <button
            onClick={() => onNavigate(`/dashboard/${scenarioId}`)}
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
              currentRoute === 'dashboard'
                ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-100'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-600" />
            <span>Command Dashboard</span>
            {activeScenario?.status === 'running' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            )}
          </button>

          <button
            onClick={() => onNavigate('/depots')}
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
              currentRoute === 'depots'
                ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-100'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Depots Hub</span>
          </button>

          <button
            onClick={() => onNavigate('/agency')}
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
              currentRoute === 'agency'
                ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-100'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Shield className="w-4 h-4 text-amber-600" />
            <span>Agency Dispatch</span>
          </button>
        </nav>
      </div>

      {/* Right: New Session Button strictly on ONE line */}
      <div className="flex items-center gap-4 shrink-0">
        <button
          onClick={onNewScenarioClick}
          className="whitespace-nowrap flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Session</span>
        </button>
      </div>
    </header>
  );
};

import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Flame,
  AlertTriangle,
  Users,
  Layers,
  ArrowUpRight
} from 'lucide-react';

export const KpiStrip: React.FC = () => {
  const { kpiData, openNewEmergencyModal, openZoneDetail, openReallocationModal } = useApp();

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Incidents */}
        <div 
          onClick={openNewEmergencyModal}
          className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Incidents
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
              <ArrowUpRight className="w-3 h-3" />
              <span>+3 in last hour</span>
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {kpiData.activeIncidents}
            </div>
            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 group-hover:scale-105 transition-transform">
              <Flame className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2 text-[11px] text-slate-400 font-medium">
            18 critical medical • 9 structural alerts
          </div>
        </div>

        {/* Card 2: Critical Zones */}
        <div 
          onClick={() => openZoneDetail('Zone A')}
          className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Critical Zones
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              <span>High Risk</span>
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {kpiData.criticalZones}
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2 text-[11px] text-slate-400 font-medium">
            Zones A, B & C requiring dynamic staging
          </div>
        </div>

        {/* Card 3: People Affected */}
        <div 
          onClick={() => openZoneDetail('Zone A')}
          className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              People Affected
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              <span>Live Tally</span>
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {kpiData.peopleAffected.toLocaleString()}
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2 text-[11px] text-slate-400 font-medium">
            Across 4 operational zones
          </div>
        </div>

        {/* Card 4: Resources Deployed */}
        <div 
          onClick={openReallocationModal}
          className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Resources Deployed
            </span>
            <span className="text-xs font-bold text-slate-700 font-mono">
              {kpiData.resourcesDeployedFraction}
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {kpiData.resourcesDeployedPercent}%
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-blue-600 h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${kpiData.resourcesDeployedPercent}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

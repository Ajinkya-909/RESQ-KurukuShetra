import React from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  MapPin,
  Waves,
  Navigation
} from 'lucide-react';
import { Zone } from '../types';

export const ZoneDetailModal: React.FC = () => {
  const { isZoneModalOpen, closeZoneDetail, selectedZone, openReallocationModal } = useApp();

  if (!isZoneModalOpen || !selectedZone) return null;

  const getSeverityBadge = (severity: Zone['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'ELEVATED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'MONITOR':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <MapPin className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">
                  {selectedZone.code}
                </span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${getSeverityBadge(selectedZone.severity)}`}>
                  {selectedZone.severity}
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-900 leading-tight">
                {selectedZone.name} Sector Analysis
              </h2>
            </div>
          </div>
          <button
            onClick={closeZoneDetail}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
          {/* Summary Banner */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Field Telemetry Overview
            </div>
            <p className="text-slate-700 font-medium leading-relaxed">
              {selectedZone.summary}
            </p>
          </div>

          {/* Metric Quad */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-slate-400">Priority Score</span>
              <div className="text-lg font-black text-slate-900 mt-0.5">
                {selectedZone.priority} <span className="text-xs text-slate-400 font-normal">/ 100</span>
              </div>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-slate-400">Affected</span>
              <div className="text-lg font-black text-slate-900 mt-0.5">
                {selectedZone.peopleAffected}
              </div>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-slate-400">Evacuated</span>
              <div className="text-lg font-black text-emerald-600 mt-0.5">
                {selectedZone.evacuatedCount}
              </div>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-slate-400">Shelter Load</span>
              <div className="text-lg font-black text-blue-600 mt-0.5">
                {selectedZone.shelterCapacityUsed}%
              </div>
            </div>
          </div>

          {/* Hydrological Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-sky-50/70 p-3 rounded-xl border border-sky-100 flex items-start gap-2.5">
              <Waves className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-bold text-sky-800 uppercase block">Water Surge Telemetry</span>
                <span className="font-extrabold text-slate-900 text-xs">{selectedZone.waterLevel}</span>
              </div>
            </div>
            <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-100 flex items-start gap-2.5">
              <Navigation className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-bold text-amber-800 uppercase block">Road & Access Status</span>
                <span className="font-extrabold text-slate-900 text-xs">{selectedZone.accessStatus}</span>
              </div>
            </div>
          </div>

          {/* Needs Breakdown */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Risk & Needs Decomposition
            </div>
            {selectedZone.breakdown.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-slate-700">
                  <span>{item.label}</span>
                  <span className="font-bold">{item.percentage}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage * 3.5}%`, maxWidth: '100%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={closeZoneDetail}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={() => {
              closeZoneDetail();
              openReallocationModal();
            }}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
          >
            Re-evaluate Allocation
          </button>
        </div>
      </div>
    </div>
  );
};

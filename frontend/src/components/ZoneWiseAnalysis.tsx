import React from 'react';
import { useApp } from '../context/AppContext';
import { MapPin, ChevronDown, ArrowRight } from 'lucide-react';
import { Zone } from '../types';

export const ZoneWiseAnalysis: React.FC = () => {
  const { zones, openZoneDetail, selectedZoneFilter, setSelectedZoneFilter } = useApp();

  const filteredZones = zones.slice(0, 4).filter(z => {
    if (selectedZoneFilter === 'All Zones') return true;
    return z.code === selectedZoneFilter || z.name === selectedZoneFilter;
  });

  const getSeverityBadge = (severity: Zone['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'HIGH':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ELEVATED':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'MONITOR':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getBarColor = (severity: Zone['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-500';
      case 'HIGH':
        return 'bg-amber-500';
      case 'ELEVATED':
        return 'bg-yellow-500';
      case 'MONITOR':
        return 'bg-emerald-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getRingColor = (severity: Zone['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return '#ef4444';
      case 'HIGH':
        return '#f97316';
      case 'ELEVATED':
        return '#eab308';
      case 'MONITOR':
        return '#10b981';
      default:
        return '#3b82f6';
    }
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950 tracking-tight">
            Zone-wise Analysis
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Detailed insights, needs and resource allocation for each zone
          </p>
        </div>

        {/* Filter Dropdown */}
        <div className="relative self-start sm:self-auto">
          <select
            value={selectedZoneFilter}
            onChange={(e) => setSelectedZoneFilter(e.target.value)}
            className="appearance-none bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 py-1.5 pl-3 pr-8 shadow-xs cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            <option value="All Zones">All Zones</option>
            <option value="Zone A">Zone A (Riverside)</option>
            <option value="Zone B">Zone B (Lakeview)</option>
            <option value="Zone C">Zone C (Greenfield)</option>
            <option value="Zone D">Zone D (Mapleton)</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {filteredZones.map((zone) => {
          const radius = 30;
          const circumference = 2 * Math.PI * radius;
          const strokeDashoffset = circumference - (zone.priority / 100) * circumference;

          return (
            <div
              key={zone.id}
              className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all group"
            >
              {/* Card Top: Zone ID, Name, Severity Badge, Circular Gauge */}
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                      <MapPin className={`w-4 h-4 ${
                        zone.severity === 'CRITICAL' ? 'text-rose-600' :
                        zone.severity === 'HIGH' ? 'text-amber-600' :
                        zone.severity === 'ELEVATED' ? 'text-yellow-600' : 'text-emerald-600'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">
                          {zone.code}
                        </span>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase ${getSeverityBadge(zone.severity)}`}>
                          {zone.severity}
                        </span>
                      </div>
                      <div className="text-sm font-extrabold text-slate-800">
                        {zone.name}
                      </div>
                    </div>
                  </div>

                  {/* Circular Priority Gauge */}
                  <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 72 72">
                      <circle
                        cx="36"
                        cy="36"
                        r={radius}
                        className="text-slate-100"
                        strokeWidth="5"
                        stroke="currentColor"
                        fill="transparent"
                      />
                      <circle
                        cx="36"
                        cy="36"
                        r={radius}
                        stroke={getRingColor(zone.severity)}
                        strokeWidth="5"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                        style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-sm font-black text-slate-900 leading-none">
                        {zone.priority}
                      </span>
                      <span className="text-[9px] font-semibold text-slate-400 leading-none mt-0.5">
                        /100
                      </span>
                    </div>
                  </div>
                </div>

                {/* People Affected & Main Need */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-[11px] text-slate-400 font-medium">People Affected</div>
                    <div className="text-sm font-extrabold text-slate-900">
                      {zone.peopleAffected}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400 font-medium">Main Need</div>
                    <div className="text-xs font-bold text-slate-800 truncate max-w-[130px]">
                      {zone.mainNeed}
                    </div>
                  </div>
                </div>

                {/* Breakdown Progress Bars */}
                <div className="mt-3 space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Risk & Needs Breakdown
                  </div>
                  {zone.breakdown.slice(0, 6).map((item, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between text-[10px] font-medium text-slate-600">
                        <span className="truncate pr-1">{item.label}</span>
                        <span className="font-bold text-slate-700">{item.percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getBarColor(zone.severity)} transition-all duration-500`}
                          style={{ width: `${item.percentage * 3.2}%`, maxWidth: '100%' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  id={`btn-view-${zone.id}`}
                  onClick={() => openZoneDetail(zone)}
                  className="w-full text-center py-1.5 px-2.5 rounded-lg text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50/70 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>View {zone.code} Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

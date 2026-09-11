import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  AlertTriangle,
  Users,
  Truck,
  CheckCircle2,
  ChevronDown,
  ArrowRight,
  Radio
} from 'lucide-react';
import { LiveUpdate } from '../types';

export const LiveUpdates: React.FC = () => {
  const { liveUpdates, openAuditModal, openZoneDetail } = useApp();
  const [filter, setFilter] = useState<'All Updates' | 'Critical' | 'High' | 'Info'>('All Updates');

  const filteredUpdates = liveUpdates.filter(u => {
    if (filter === 'All Updates') return true;
    return u.badgeType === filter;
  });

  const getBadgeStyle = (badgeType: LiveUpdate['badgeType']) => {
    switch (badgeType) {
      case 'Critical':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'High':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Info':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Success':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getItemIcon = (update: LiveUpdate) => {
    if (update.title.toLowerCase().includes('road')) {
      return <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />;
    }
    if (update.title.toLowerCase().includes('report') || update.title.toLowerCase().includes('people')) {
      return <Users className="w-3.5 h-3.5 text-rose-600" />;
    }
    if (update.title.toLowerCase().includes('ambulance') || update.title.toLowerCase().includes('team') || update.title.toLowerCase().includes('resource')) {
      return <Truck className="w-3.5 h-3.5 text-blue-600" />;
    }
    if (update.title.toLowerCase().includes('completed') || update.badgeType === 'Success') {
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
    }
    return <Radio className="w-3.5 h-3.5 text-slate-600" />;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col h-[560px] sm:h-[620px] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Live Updates
          </h2>
        </div>

        {/* Filter Dropdown */}
        <div className="relative">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 py-1 pl-2.5 pr-7 cursor-pointer transition-colors focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            <option value="All Updates">All Updates</option>
            <option value="Critical">Critical Only</option>
            <option value="High">High Priority</option>
            <option value="Info">Informational</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Timeline List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredUpdates.map((item, index) => (
          <div 
            key={item.id} 
            className="relative flex items-start gap-3 group cursor-pointer"
            onClick={() => {
              if (item.zone) {
                openZoneDetail(item.zone);
              } else {
                openAuditModal();
              }
            }}
          >
            {/* Timeline Vertical Track */}
            {index < filteredUpdates.length - 1 && (
              <span 
                className="absolute left-3.5 top-8 -bottom-4 w-0.5 bg-slate-100 group-hover:bg-slate-200 transition-colors" 
                aria-hidden="true" 
              />
            )}

            {/* Icon Node */}
            <div className="w-7 h-7 rounded-full bg-slate-50 border border-slate-200/90 flex items-center justify-center shrink-0 group-hover:border-blue-400 group-hover:bg-blue-50 transition-colors">
              {getItemIcon(item)}
            </div>

            {/* Event Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                  {item.title}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${getBadgeStyle(item.badgeType)}`}>
                  {item.badgeType}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="truncate">{item.subtitle}</span>
                <span className="font-mono text-[10px] text-slate-400 shrink-0 ml-2">
                  {item.time}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Link */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <button
          id="btn-view-full-activity"
          onClick={openAuditModal}
          className="w-full text-center py-2 px-3 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50/60 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <span>View Full Activity Log</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

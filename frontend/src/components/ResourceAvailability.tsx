import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Truck,
  Waves,
  Stethoscope,
  Home,
  Droplets,
  Package,
  Shield
} from 'lucide-react';
import { ResourceCategory } from '../types';

export const ResourceAvailability: React.FC = () => {
  const {
    resources,
    openResourceDrawer,
    activeResourceFilter,
    setActiveResourceFilter
  } = useApp();

  const getResourceIcon = (type: ResourceCategory) => {
    switch (type) {
      case 'Ambulance':
        return <Truck className="w-5 h-5 text-rose-600" />;
      case 'Rescue Boat':
        return <Waves className="w-5 h-5 text-blue-600" />;
      case 'Medical Team':
        return <Stethoscope className="w-5 h-5 text-purple-600" />;
      case 'Shelter':
        return <Home className="w-5 h-5 text-indigo-600" />;
      case 'Water Supply':
        return <Droplets className="w-5 h-5 text-sky-600" />;
      case 'Food Supply':
        return <Package className="w-5 h-5 text-emerald-600" />;
      default:
        return <Shield className="w-5 h-5 text-slate-600" />;
    }
  };

  const getIconBg = (type: ResourceCategory) => {
    switch (type) {
      case 'Ambulance':
        return 'bg-rose-50 border-rose-100';
      case 'Rescue Boat':
        return 'bg-blue-50 border-blue-100';
      case 'Medical Team':
        return 'bg-purple-50 border-purple-100';
      case 'Shelter':
        return 'bg-indigo-50 border-indigo-100';
      case 'Water Supply':
        return 'bg-sky-50 border-sky-100';
      case 'Food Supply':
        return 'bg-emerald-50 border-emerald-100';
      default:
        return 'bg-slate-50 border-slate-100';
    }
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage > 70) return 'bg-blue-600';
    if (percentage > 50) return 'bg-sky-500';
    return 'bg-indigo-500';
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950 tracking-tight">
            Resource Availability
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time status of all emergency resources
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          {(['all', 'available', 'deployed', 'maintenance'] as const).map((tab) => {
            const labels = {
              all: 'All Resources',
              available: 'Available',
              deployed: 'Deployed',
              maintenance: 'In Maintenance'
            };
            const isActive = activeResourceFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveResourceFilter(tab)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 6 Resource Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {resources.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition-all group"
          >
            <div>
              {/* Card Top: Icon & Resource Name */}
              <div className="flex items-center gap-2.5 mb-3">
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${getIconBg(item.type)} group-hover:scale-105 transition-transform`}>
                  {getResourceIcon(item.type)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-slate-900 truncate leading-tight">
                    {item.displayName}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium block truncate">
                    {item.subLocation || 'Operational'}
                  </span>
                </div>
              </div>

              {/* Stat Value & Percentage */}
              <div className="flex items-baseline justify-between mb-1.5">
                <div className="text-sm sm:text-base font-black text-slate-950 tracking-tight">
                  {item.currentInUse.toLocaleString()}{' '}
                  {item.unitLabel && <span className="text-xs font-semibold text-slate-500">{item.unitLabel}</span>}
                  {item.total > 0 && item.type !== 'Water Supply' && item.type !== 'Food Supply' && (
                    <span className="text-xs font-medium text-slate-400"> / {item.total.toLocaleString()}</span>
                  )}
                </div>
                <span className="text-xs font-extrabold text-slate-700">
                  {item.percentage}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full ${getProgressBarColor(item.percentage)} transition-all duration-700`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>

              {/* Available & Deployed Subtext */}
              <div className="space-y-0.5 text-[11px] font-medium text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate">{item.availableLabel}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  <span className="truncate">{item.deployedLabel}</span>
                </div>
              </div>
            </div>

            {/* View Details Button */}
            <div className="mt-4 pt-2.5 border-t border-slate-100">
              <button
                id={`btn-resource-${item.id}`}
                onClick={() => openResourceDrawer(item)}
                className="w-full text-center py-1.5 px-2 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 rounded-lg text-xs font-semibold text-slate-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>View Details</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

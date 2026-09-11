import React from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Truck,
  Waves,
  Stethoscope,
  Home,
  Droplets,
  Package,
  MapPin,
  Clock,
  Shield,
  AlertCircle
} from 'lucide-react';
import { ResourceCategory } from '../types';

export const ResourceDrawer: React.FC = () => {
  const { isResourceDrawerOpen, closeResourceDrawer, selectedResource } = useApp();

  if (!isResourceDrawerOpen || !selectedResource) return null;

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Available':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Reserved':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Committed':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'In Transit':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity">
      <div 
        className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 transform transition-transform duration-300 ease-in-out"
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs">
              {getResourceIcon(selectedResource.type)}
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Resource Commitment Detail
              </div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                {selectedResource.displayName}
              </h3>
            </div>
          </div>
          <button
            onClick={closeResourceDrawer}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Breakdown Metric Strip (5 Columns) */}
        <div className="p-5 bg-white border-b border-slate-100">
          <div className="text-xs font-bold text-slate-700 mb-2">
            Inventory & Allocation State
          </div>
          <div className="grid grid-cols-5 gap-2 text-center">
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total</div>
              <div className="text-sm font-black text-slate-900 mt-0.5">
                {selectedResource.breakdown.total.toLocaleString()}
              </div>
            </div>
            <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-100">
              <div className="text-[10px] uppercase font-bold text-emerald-700">Available</div>
              <div className="text-sm font-black text-emerald-700 mt-0.5">
                {selectedResource.breakdown.available.toLocaleString()}
              </div>
            </div>
            <div className="bg-amber-50/70 p-2 rounded-lg border border-amber-100">
              <div className="text-[10px] uppercase font-bold text-amber-700">Reserved</div>
              <div className="text-sm font-black text-amber-700 mt-0.5">
                {selectedResource.breakdown.reserved.toLocaleString()}
              </div>
            </div>
            <div className="bg-blue-50/70 p-2 rounded-lg border border-blue-100">
              <div className="text-[10px] uppercase font-bold text-blue-700">Committed</div>
              <div className="text-sm font-black text-blue-700 mt-0.5">
                {selectedResource.breakdown.committed.toLocaleString()}
              </div>
            </div>
            <div className="bg-purple-50/70 p-2 rounded-lg border border-purple-100">
              <div className="text-[10px] uppercase font-bold text-purple-700">In Transit</div>
              <div className="text-sm font-black text-purple-700 mt-0.5">
                {selectedResource.breakdown.inTransit.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="mt-3 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Total fleet inventory reflects all tracked municipal and NGO assets, guarded against over-commitment.</span>
          </div>
        </div>

        {/* Units / Deployments List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
            <span>Active Units & Mission Status</span>
            <span className="text-[11px] text-slate-400 font-normal">{selectedResource.units.length} units listed</span>
          </div>

          {selectedResource.units.map((unit) => (
            <div
              key={unit.id}
              className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs space-y-2.5 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="font-bold text-sm text-slate-900">
                  {unit.name}
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(unit.status)}`}>
                  {unit.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-medium text-slate-400 block">Agency</span>
                  <span className="font-semibold text-slate-700">{unit.agency}</span>
                </div>
                <div>
                  <span className="text-[10px] font-medium text-slate-400 block">ETA / Readiness</span>
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {unit.eta}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-medium text-slate-400 block">Current Location</span>
                  <span className="font-medium text-slate-600 truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    {unit.currentLocation}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-medium text-slate-400 block">Destination</span>
                  <span className="font-medium text-slate-600 truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                    {unit.destination}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">Mission: <strong className="text-slate-800">{unit.mission}</strong></span>
                <span className="text-slate-400 font-mono text-[10px]">{unit.lastUpdated}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Live telemetry synced
          </span>
          <button
            onClick={closeResourceDrawer}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};

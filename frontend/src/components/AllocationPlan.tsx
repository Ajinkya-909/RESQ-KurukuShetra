import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  RefreshCw,
  ChevronDown,
  Truck,
  Waves,
  Stethoscope,
  Package,
  Droplets,
  MapPin,
  Clock,
  Shield
} from 'lucide-react';
import { AllocationPlanItem, ResourceCategory } from '../types';

export const AllocationPlan: React.FC = () => {
  const {
    allocations,
    openReallocationModal,
    planVersion
  } = useApp();

  const [zoneFilter, setZoneFilter] = useState('All Zones');

  const filteredAllocations = allocations.filter(item => {
    if (zoneFilter === 'All Zones') return true;
    return item.to.includes(zoneFilter);
  });

  const getPriorityBadge = (priority: AllocationPlanItem['priority']) => {
    switch (priority) {
      case 'Critical':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'High':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Elevated':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'Monitor':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (status: AllocationPlanItem['status']) => {
    switch (status) {
      case 'En Route':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Dispatched':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Scheduled':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'On Scene':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getResourceIcon = (resourceType: ResourceCategory) => {
    switch (resourceType) {
      case 'Ambulance':
        return <Truck className="w-3.5 h-3.5 text-rose-600" />;
      case 'Rescue Boat':
        return <Waves className="w-3.5 h-3.5 text-blue-600" />;
      case 'Medical Team':
        return <Stethoscope className="w-3.5 h-3.5 text-purple-600" />;
      case 'Water Supply':
        return <Droplets className="w-3.5 h-3.5 text-sky-600" />;
      case 'Food Supply':
        return <Package className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <Shield className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-950 tracking-tight">
              Current Resource Allocation Plan
            </h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {planVersion}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Live and upcoming deployments across all zones
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Re-run Allocation Button (Matching Screenshot) */}
          <button
            id="btn-rerun-allocation"
            onClick={openReallocationModal}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs px-3.5 py-2 rounded-lg shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Re-run Allocation</span>
          </button>

          {/* Zone Filter */}
          <div className="relative">
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="appearance-none bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 py-2 pl-3 pr-8 shadow-xs cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-blue-500"
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
      </div>

      {/* Desktop Enterprise Table */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3 px-4">Resource</th>
              <th className="py-3 px-4">From</th>
              <th className="py-3 px-4">To</th>
              <th className="py-3 px-4">Purpose</th>
              <th className="py-3 px-4">ETA</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredAllocations.map((item) => (
              <tr 
                key={item.id} 
                className="hover:bg-slate-50/70 transition-colors group"
              >
                {/* Resource */}
                <td className="py-3.5 px-4 font-bold text-slate-900">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                      {getResourceIcon(item.resourceType)}
                    </div>
                    <span>{item.resource}</span>
                  </div>
                </td>

                {/* From */}
                <td className="py-3.5 px-4 text-slate-600 font-medium">
                  {item.from}
                </td>

                {/* To */}
                <td className="py-3.5 px-4 font-semibold text-slate-900">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>{item.to}</span>
                  </div>
                </td>

                {/* Purpose */}
                <td className="py-3.5 px-4 text-slate-700 font-medium">
                  {item.purpose}
                </td>

                {/* ETA */}
                <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{item.eta}</span>
                  </div>
                </td>

                {/* Status */}
                <td className="py-3.5 px-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadge(item.status)}`}>
                    {item.status}
                  </span>
                </td>

                {/* Priority */}
                <td className="py-3.5 px-4 text-right">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${getPriorityBadge(item.priority)}`}>
                    {item.priority}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Mission Cards */}
      <div className="md:hidden space-y-3">
        {filteredAllocations.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
                  {getResourceIcon(item.resourceType)}
                </div>
                <span>{item.resource}</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPriorityBadge(item.priority)}`}>
                {item.priority}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-medium block">Route</span>
                <span className="font-semibold text-slate-700">{item.from} → {item.to}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium block">ETA</span>
                <span className="font-semibold text-slate-700">{item.eta}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-600">{item.purpose}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(item.status)}`}>
                {item.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

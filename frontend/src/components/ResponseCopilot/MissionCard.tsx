import React from 'react';
import { Truck, CheckCircle2, Clock, MapPin } from 'lucide-react';
import { CopilotMission } from '../../types';

interface MissionCardProps {
  mission: CopilotMission;
}

export const MissionCard: React.FC<MissionCardProps> = ({ mission }) => {
  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'DELIVERED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>DELIVERED</span>
          </span>
        );
      case 'EN_ROUTE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-cyan-100 text-cyan-800 border border-cyan-200 flex items-center gap-1">
            <Truck className="w-3 h-3 text-cyan-600" />
            <span>EN ROUTE</span>
          </span>
        );
      case 'DISPATCHED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
            <Truck className="w-3 h-3 text-blue-600" />
            <span>DISPATCHED</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>APPROVED</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3.5 shadow-2xs space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h5 className="text-xs font-black text-slate-900 truncate">
          {mission.title}
        </h5>
        {getStatusBadge(mission.status)}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-400">Resource:</span>
          <span className="font-bold text-slate-900">
            {mission.resource_name} ({mission.quantity} {mission.unit})
          </span>
        </div>

        <div className="flex items-center gap-1 text-slate-400 text-[11px]">
          <MapPin className="w-3 h-3" />
          <span>{mission.destination_zone}</span>
        </div>
      </div>
    </div>
  );
};

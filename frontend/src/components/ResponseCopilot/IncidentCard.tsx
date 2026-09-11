import React from 'react';
import { AlertTriangle, MapPin, Users, HeartPulse, ShieldAlert, Brain } from 'lucide-react';
import { CopilotIncident } from '../../types';

interface IncidentCardProps {
  incident: CopilotIncident;
  onViewOnMap: (lat: number, lng: number) => void;
  onReviewResponse: (incident: CopilotIncident) => void;
}

export const IncidentCard: React.FC<IncidentCardProps> = ({
  incident,
  onViewOnMap,
  onReviewResponse,
}) => {
  const getBadgeStyle = (level: string) => {
    switch (level.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'MODERATE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const aiBrief = incident.ai_brief;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all space-y-3">
      {/* Header Badge & Title */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border ${getBadgeStyle(
                incident.severity_level
              )}`}
            >
              {incident.severity_level}
            </span>
            <span className="text-[11px] font-bold text-slate-400 font-mono">
              Priority Score: {incident.priority_score}
            </span>
          </div>
          <h4 className="text-sm font-black text-slate-900 leading-tight">
            {incident.name}
          </h4>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
        <div className="flex items-center gap-1.5 text-slate-700">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span className="font-extrabold">{incident.report_count}</span>
          <span className="text-slate-400 text-[11px]">SOS</span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-700">
          <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="font-extrabold">{incident.affected_people}</span>
          <span className="text-slate-400 text-[11px]">People</span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-700">
          <HeartPulse className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="font-extrabold">{incident.medical_cases}</span>
          <span className="text-slate-400 text-[11px]">Medical</span>
        </div>
      </div>

      {/* 🧠 RESQ AI Brief Card */}
      {aiBrief && (
        <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-black text-indigo-900 text-[11px]">
              <Brain className="w-3.5 h-3.5 text-indigo-600" />
              <span>🧠 RESQ AI BRIEF</span>
            </div>
            {aiBrief.ai_available ? (
              <span className="text-[9px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.2 rounded">
                {aiBrief.model_used || 'Gemini AI'}
              </span>
            ) : (
              <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                System Logic
              </span>
            )}
          </div>
          <p className="text-slate-700 font-medium text-[11px] leading-relaxed">
            {aiBrief.incident_summary}
          </p>
        </div>
      )}

      {/* Recommended Resource Line */}
      <div className="text-xs text-slate-700 font-medium flex items-center gap-2 pt-1 border-t border-slate-100">
        <span className="font-bold text-slate-500">Recommended:</span>
        <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
          {incident.recommended_resources.map((r) => `${r.resource_name} ×${r.quantity}`).join(', ') ||
            'Standard Relief Supply'}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={() => onViewOnMap(incident.center_lat, incident.center_lng)}
          className="flex-1 py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <MapPin className="w-3.5 h-3.5 text-blue-600" />
          <span>VIEW ON MAP</span>
        </button>

        <button
          onClick={() => onReviewResponse(incident)}
          className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-rose-500/20 transition-all cursor-pointer"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>REVIEW RESPONSE</span>
        </button>
      </div>
    </div>
  );
};

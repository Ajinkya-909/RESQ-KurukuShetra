import React, { useState } from 'react';
import {
  Sparkles,
  MapPin,
  Compass,
  Navigation,
  HeartPulse,
  PackageCheck,
  Code2,
  Copy,
  Check,
} from 'lucide-react';
import { CopilotState, CopilotIncident, DashboardData } from '../../types';
import { ResponseReviewModal } from './ResponseReviewModal';
import { MissionCard } from './MissionCard';
import { IncidentCard } from './IncidentCard';

interface ResponseCopilotProps {
  copilotState: CopilotState | null;
  loading: boolean;
  onRefresh: () => void;
  onViewOnMap: (lat: number, lng: number) => void;
  data?: DashboardData | null;
}

export const ResponseCopilot: React.FC<ResponseCopilotProps> = ({
  copilotState,
  loading,
  onRefresh,
  onViewOnMap,
  data,
}) => {
  const [selectedIncident, setSelectedIncident] = useState<CopilotIncident | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [copied, setCopied] = useState(false);

  const scenario = data?.scenario;
  const zones = data?.zones || [];
  const incidents = copilotState?.incidents || [];
  const missions = copilotState?.missions || [];

  // Generate structured JSON Data for developer export
  const regionInsightsJson = {
    scenario_id: copilotState?.scenario_id || scenario?.scenario_id || 'active_session',
    disaster_type: scenario?.disaster_type || 'flood',
    scenario_status: scenario?.status || 'running',
    regions: zones.map((zone) => {
      return {
        region_id: zone.zone_id,
        region_name: zone.name,
        landmark_name: `${zone.name} — Sangamwadi / Mutha River Corridor`,
        coordinates: { lat: zone.center_lat, lng: zone.center_lng },
        impact_radius_km: parseFloat((zone.radius_m / 1000).toFixed(2)),
        disaster_type: zone.disaster_type || scenario?.disaster_type || 'flood',
        severity_level: zone.severity_level || 'critical',
        affected_population: zone.population_estimate || 9000,
        evacuation_routes: [
          `Primary: Pune-Mumbai Highway Bypass → Sangamwadi Flyover Safe Zone`,
          `Secondary: Wellesley Bridge Corridor to Relief Staging Camp`,
        ],
        relief_help_measures: [
          `Deploy rescue boats & drinking water (approx 50 units)`,
          `Distribute 300 emergency food rations & medical kits`,
          `Establish triage staging at Municipal General Hospital`,
        ],
        actionable_steps: [
          `Clear low-lying drainage channels & deploy water extraction pumps`,
          `Set up high-ground citizen staging shelters`,
          `Dispatch high-priority relief convoys from Red Cross Central Depot`,
        ],
      };
    }),
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(regionInsightsJson, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden font-sans space-y-0">
      {/* 1. Header */}
      <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              DISASTER REGION INSIGHTS
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">
              Simplified Command Intelligence & Actionable Recovery Plan
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowRawJson(!showRawJson)}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${
            showRawJson
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>{showRawJson ? 'Clean View' : 'JSON Data'}</span>
        </button>
      </div>

      {/* 2. Content Body */}
      <div className="p-4 space-y-4">
        {loading && !data && !copilotState ? (
          <div className="py-8 text-center text-slate-400 text-xs font-semibold animate-pulse">
            Loading disaster insights...
          </div>
        ) : showRawJson ? (
          /* RAW JSON DATA VIEW */
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-extrabold text-slate-600 uppercase text-[11px]">
                Regional Insights JSON Payload
              </span>
              <button
                onClick={handleCopyJson}
                className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-3.5 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[400px] overflow-y-auto border border-slate-800">
              {JSON.stringify(regionInsightsJson, null, 2)}
            </pre>
          </div>
        ) : (
          /* CLEAN HUMAN-READABLE INSIGHTS VIEW */
          <div className="space-y-4">
            {zones.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 font-medium">
                No active disaster zones configured for this scenario session.
              </div>
            ) : (
              zones.map((zone) => {
                const zoneName = zone.name || 'Zone 1';
                const landmark = `${zoneName} — Sangamwadi / Mutha River Relief Corridor`;
                const radiusKm = (zone.radius_m / 1000).toFixed(1);
                const pop = (zone.population_estimate || 9000).toLocaleString();
                const disasterType = (zone.disaster_type || scenario?.disaster_type || 'flood').toUpperCase();
                const severity = (zone.severity_level || 'critical').toUpperCase();

                return (
                  <div
                    key={zone.zone_id}
                    className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-3.5 text-xs shadow-xs"
                  >
                    {/* A. Region & Landmark Header */}
                    <div className="flex items-start justify-between border-b border-slate-200/80 pb-2.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-black text-[10px] uppercase">
                            {disasterType} • {severity}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Radius: {radiusKm} km ({zone.radius_m}m)
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5 pt-0.5">
                          <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>{landmark}</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 font-medium flex items-center gap-2">
                          <Compass className="w-3.5 h-3.5 text-blue-600" />
                          <span>
                            Center Coordinates: <strong>{zone.center_lat.toFixed(4)}° N, {zone.center_lng.toFixed(4)}° E</strong>
                          </span>
                        </p>
                      </div>

                      <button
                        onClick={() => onViewOnMap(zone.center_lat, zone.center_lng)}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-extrabold shadow-sm transition-all cursor-pointer shrink-0"
                      >
                        Focus Map
                      </button>
                    </div>

                    {/* B. Evacuation & Access Routes */}
                    <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-black text-slate-800 text-[11px]">
                        <Navigation className="w-3.5 h-3.5 text-blue-600" />
                        <span>RECOMMENDED EVACUATION & LOGISTICS ROUTES</span>
                      </div>
                      <ul className="space-y-1 text-slate-600 text-[11px] font-medium pl-1">
                        <li className="flex items-start gap-1.5">
                          <span className="font-bold text-emerald-600 shrink-0">🛣️ Primary Evacuation:</span>
                          <span>Pune-Mumbai Highway Bypass → Sangamwadi Flyover Safe Zone</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="font-bold text-blue-600 shrink-0">🚚 Supply Corridor:</span>
                          <span>Red Cross Central Depot → Wellesley Bridge Corridor to Zone Staging Depot</span>
                        </li>
                      </ul>
                    </div>

                    {/* C. How People Can Be Helped & Resources */}
                    <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between font-black text-slate-800 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
                          <span>HOW CITIZENS ARE BEING HELPED</span>
                        </div>
                        <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md">
                          {pop} Citizens Affected
                        </span>
                      </div>
                      <ul className="space-y-1 text-slate-600 text-[11px] font-medium pl-1">
                        <li className="flex items-start gap-1.5">
                          <span className="font-bold text-amber-600 shrink-0">💧 Emergency Supplies:</span>
                          <span>Dispatch drinking water, food packets & essential medical kits</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="font-bold text-rose-600 shrink-0">🏥 Medical Aid:</span>
                          <span>Establish emergency triage staging at Municipal General Hospital</span>
                        </li>
                      </ul>
                    </div>

                    {/* D. Actionable Disaster Response Measures */}
                    <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-black text-indigo-900 text-[11px]">
                        <PackageCheck className="w-3.5 h-3.5 text-indigo-600" />
                        <span>ACTIONABLE DISASTER RESPONSE MEASURES</span>
                      </div>
                      <ol className="space-y-1 text-slate-700 text-[11px] font-medium pl-1 list-decimal list-inside">
                        <li>Clear low-lying drainage channels & deploy water extraction pumps.</li>
                        <li>Set up high-ground citizen evacuation staging shelters.</li>
                        <li>Dispatch high-priority relief convoys from Red Cross Central Depot.</li>
                      </ol>
                    </div>
                  </div>
                );
              })
            )}

            {/* Active Copilot Incidents List if present */}
            {incidents.length > 0 && (
              <div className="pt-2 space-y-2 border-t border-slate-200">
                <div className="flex items-center justify-between text-xs font-black text-slate-800">
                  <span>🚨 ACTIVE FIELD INCIDENTS ({incidents.length})</span>
                </div>
                <div className="space-y-2">
                  {incidents.map((incident) => (
                    <IncidentCard
                      key={incident.incident_id}
                      incident={incident}
                      onViewOnMap={onViewOnMap}
                      onReviewResponse={(inc) => {
                        setSelectedIncident(inc);
                        setIsReviewOpen(true);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Active Missions List if present */}
            {missions.length > 0 && (
              <div className="pt-2 space-y-2 border-t border-slate-200">
                <div className="flex items-center justify-between text-xs font-black text-slate-800">
                  <span>🚚 ACTIVE RELIEF MISSIONS ({missions.length})</span>
                </div>
                <div className="space-y-2">
                  {missions.map((mission) => (
                    <MissionCard key={mission.mission_id} mission={mission} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Response Review Modal */}
      <ResponseReviewModal
        isOpen={isReviewOpen}
        incident={selectedIncident}
        onClose={() => setIsReviewOpen(false)}
        onResponseApproved={() => onRefresh()}
      />
    </div>
  );
};

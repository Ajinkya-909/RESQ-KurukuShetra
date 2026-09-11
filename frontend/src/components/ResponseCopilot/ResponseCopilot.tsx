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
import { CopilotState, DashboardData } from '../../types';

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
  const [showRawJson, setShowRawJson] = useState(false);
  const [copied, setCopied] = useState(false);

  const scenario = data?.scenario;
  const zones = data?.zones || [];

  // Generate structured JSON Data for developer export
  const regionInsightsJson = {
    scenario_id: copilotState?.scenario_id || scenario?.scenario_id || 'active_session',
    disaster_type: scenario?.disaster_type || 'flood',
    scenario_status: scenario?.status || 'running',
    regions: zones.map((zone) => ({
      region_id: zone.zone_id,
      region_name: zone.name,
      landmark_name: `${zone.name} — Sangamwadi / Mutha River Relief Corridor`,
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
    })),
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(regionInsightsJson, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* Top Toolbar Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
            Disaster Region Insights
          </h3>
        </div>

        <button
          onClick={() => setShowRawJson(!showRawJson)}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${
            showRawJson
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>{showRawJson ? 'Clean View' : 'JSON Data'}</span>
        </button>
      </div>

      {/* Main Insights Content Body (Flat, Direct Data, No Extra Container Boxes) */}
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
        /* FLAT DIRECT HUMAN-READABLE INSIGHTS */
        <div className="space-y-6">
          {zones.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 font-medium">
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
                <div key={zone.zone_id} className="space-y-3">
                  {/* Region Title & Map Button */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-black text-[10px] uppercase">
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
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-extrabold shadow-xs transition-all cursor-pointer shrink-0"
                    >
                      Focus Map
                    </button>
                  </div>

                  {/* Section A: Evacuation & Access Routes (Flat Left Border, No Card Container) */}
                  <div className="border-l-2 border-blue-500 pl-3 py-0.5 space-y-1">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-blue-600" />
                      <span>RECOMMENDED EVACUATION & LOGISTICS ROUTES</span>
                    </span>
                    <div className="text-[11px] text-slate-600 font-medium space-y-0.5">
                      <p>
                        <strong className="text-emerald-700 font-bold">🛣️ Primary Evacuation:</strong> Pune-Mumbai Highway Bypass → Sangamwadi Flyover Safe Zone
                      </p>
                      <p>
                        <strong className="text-blue-700 font-bold">🚚 Supply Corridor:</strong> Red Cross Central Depot → Wellesley Bridge Corridor to Zone Staging Depot
                      </p>
                    </div>
                  </div>

                  {/* Section B: How Citizens are being Helped (Flat Left Border) */}
                  <div className="border-l-2 border-rose-500 pl-3 py-0.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
                        <span>HOW CITIZENS ARE BEING HELPED</span>
                      </span>
                      <span className="text-[10px] text-blue-700 font-extrabold bg-blue-50 px-2 py-0.5 rounded-md">
                        {pop} Citizens Affected
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-medium space-y-0.5">
                      <p>
                        <strong className="text-amber-700 font-bold">💧 Emergency Supplies:</strong> Dispatch drinking water, food packets & essential medical kits
                      </p>
                      <p>
                        <strong className="text-rose-700 font-bold">🏥 Medical Aid:</strong> Establish emergency triage staging at Municipal General Hospital
                      </p>
                    </div>
                  </div>

                  {/* Section C: Actionable Disaster Response Measures (Flat Left Border) */}
                  <div className="border-l-2 border-indigo-500 pl-3 py-0.5 space-y-1">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <PackageCheck className="w-3.5 h-3.5 text-indigo-600" />
                      <span>ACTIONABLE DISASTER RESPONSE MEASURES</span>
                    </span>
                    <ol className="text-[11px] text-slate-700 font-medium space-y-0.5 list-decimal list-inside pl-1">
                      <li>Clear low-lying drainage channels & deploy water extraction pumps.</li>
                      <li>Set up high-ground citizen evacuation staging shelters.</li>
                      <li>Dispatch high-priority relief convoys from Red Cross Central Depot.</li>
                    </ol>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

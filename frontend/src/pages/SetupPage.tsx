import React, { useEffect, useState } from 'react';
import {
  MapPin,
  Plus,
  Play,
  Trash2,
  AlertTriangle,
  Users,
  Shield,
  Layers,
  ChevronRight,
  Info,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  Waves,
  Wind,
  Mountain,
  Save,
  Compass,
} from 'lucide-react';
import { TacticalMapWrapper } from '../components/Map';
import { zonesApi, simulationApi, helpingPointsApi, scenariosApi } from '../api';
import { Scenario, Zone, HelpingPoint } from '../types';

interface SetupPageProps {
  scenarioId: string;
  initialScenario?: Scenario | null;
  onNavigateHome: () => void;
  onStartSimulation: (scenarioId: string) => void;
  onScenarioUpdated?: (scenario: Scenario) => void;
}

export const SetupPage: React.FC<SetupPageProps> = ({
  scenarioId,
  initialScenario,
  onNavigateHome,
  onStartSimulation,
  onScenarioUpdated,
}) => {
  // Scenario Metadata State (Directly configurable inside the setup engine)
  const [scenarioName, setScenarioName] = useState(
    initialScenario?.name || 'New Disaster Scenario'
  );
  const [scenarioDescription, setScenarioDescription] = useState(
    initialScenario?.description || 'Multi-depot emergency response corridor and resource triage'
  );
  const [disasterType, setDisasterType] = useState(
    initialScenario?.disaster_type || 'flood'
  );
  const [scenarioStatus, setScenarioStatus] = useState(
    initialScenario?.status || 'setup'
  );

  const [zones, setZones] = useState<Zone[]>([]);
  const [helpingPoints, setHelpingPoints] = useState<HelpingPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingZone, setSavingZone] = useState(false);
  const [startingSim, setStartingSim] = useState(false);
  const [savingScenario, setSavingScenario] = useState(false);

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);


  // Zone Placement Form State (Null until operator clicks on map)
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [zoneName, setZoneName] = useState('Zone 1 (Sangamwadi Lowlands)');
  const [radiusMeters, setRadiusMeters] = useState(3000); // 3 km default
  const [severityLevel, setSeverityLevel] = useState<'critical' | 'high' | 'moderate' | 'low'>('critical');
  const [population, setPopulation] = useState(4500);

  const [isValidId, setIsValidId] = useState<boolean | null>(null);

  // Load and Validate Scenario Data
  useEffect(() => {
    let isMounted = true;
    const loadScenarioAndData = async () => {
      try {
        setLoading(true);

        // Fetch existing scenario by ID from URL to validate ID
        const existingScenario = await scenariosApi.getById(scenarioId).catch(() => null);

        if (isMounted) {
          if (existingScenario) {
            setIsValidId(true);
            setScenarioName(existingScenario.name);
            setScenarioDescription(existingScenario.description || '');
            setDisasterType(existingScenario.disaster_type || 'flood');
            setScenarioStatus(existingScenario.status || 'setup');

            // Load zones & depots for validated scenario
            const [loadedZones, loadedPoints] = await Promise.all([
              zonesApi.list(scenarioId).catch(() => []),
              helpingPointsApi.list().catch(() => []),
            ]);

            if (loadedZones && loadedZones.length > 0) {
              setZones(loadedZones);
              setZoneName(`Zone ${loadedZones.length + 1}`);
            }
            if (loadedPoints && loadedPoints.length > 0) {
              setHelpingPoints(loadedPoints);
            }
          } else {
            // ID was not found on the backend
            // If it's a fallback scenario like scn_pune_monsoon, auto-create it
            if (scenarioId === 'scn_pune_monsoon' || scenarioId.startsWith('scn_')) {
              try {
                const autoCreated = await scenariosApi.create({
                  name: scenarioName,
                  description: scenarioDescription,
                  disaster_type: disasterType,
                });
                if (autoCreated) {
                  setIsValidId(true);
                  const loadedPoints = await helpingPointsApi.list().catch(() => []);
                  setHelpingPoints(loadedPoints);
                  return;
                }
              } catch {
                // If backend is unreachable or strictly rejects
              }
            }
            setIsValidId(false);
          }
        }
      } catch (err: any) {
        if (isMounted) setIsValidId(false);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadScenarioAndData();
    return () => {
      isMounted = false;
    };
  }, [scenarioId]);

  // Sync Scenario metadata changes to backend & parent state
  const handleSaveScenarioDetails = async (
    overrideName?: string,
    overrideType?: string,
    overrideDesc?: string
  ) => {
    const finalName = (overrideName !== undefined ? overrideName : scenarioName).trim();
    const finalType = overrideType !== undefined ? overrideType : disasterType;
    const finalDesc = (overrideDesc !== undefined ? overrideDesc : scenarioDescription).trim();
    if (!finalName) return;

    try {
      setSavingScenario(true);
      await scenariosApi
        .update(scenarioId, {
          name: finalName,
          description: finalDesc,
          disaster_type: finalType,
        })
        .catch(async () => {
          // If scenario does not exist yet on backend, auto-create
          await scenariosApi
            .create({
              name: finalName,
              description: finalDesc,
              disaster_type: finalType,
            })
            .catch(() => {});
        });

      onScenarioUpdated?.({
        scenario_id: scenarioId,
        name: finalName,
        description: finalDesc,
        disaster_type: finalType,
        status: scenarioStatus,
        sim_time: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      setFeedbackMsg({
        type: 'success',
        text: `Scenario configuration saved: "${finalName}"`,
      });
    } catch (err: any) {
      console.warn('Scenario local update:', err.message);
    } finally {
      setSavingScenario(false);
    }
  };

  // Handle Map Click: drops marker & previews radius
  const handleMapClick = (coords: { lat: number; lng: number }) => {
    setSelectedCoords(coords);
    setFeedbackMsg(null);
    if (!zoneName || zoneName.startsWith('Zone ')) {
      setZoneName(`Zone ${zones.length + 1}`);
    }
  };



  const handleDropAtCenter = () => {
    const centerPune = { lat: 18.5280, lng: 73.8650 };
    handleMapClick(centerPune);
  };

  // Save Zone to Scenario
  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoords) {
      setFeedbackMsg({
        type: 'error',
        text: 'Please click on the map to drop a pin first.',
      });
      return;
    }
    if (!zoneName.trim()) {
      setFeedbackMsg({
        type: 'error',
        text: 'Zone name is required.',
      });
      return;
    }

    const severityScoreMap = {
      critical: 0.92,
      high: 0.75,
      moderate: 0.50,
      low: 0.25,
    };

    const newZoneData: Zone = {
      zone_id: Date.now(),
      scenario_id: scenarioId,
      name: zoneName.trim(),
      center_lat: selectedCoords.lat,
      center_lng: selectedCoords.lng,
      radius_m: radiusMeters,
      severity_level: severityLevel,
      severity_score: severityScoreMap[severityLevel],
      confidence_score: 0.95,
      population_estimate: Number(population) || 0,
      disaster_type: disasterType,
      status: 'active',
    };

    // 1. OPTIMISTIC UPDATE: Zone circle appears on map instantly!
    setZones((prev) => [...prev, newZoneData]);
    setFeedbackMsg({
      type: 'success',
      text: `✅ Zone "${newZoneData.name}" padded on map with ${(radiusMeters / 1000).toFixed(1)} km radius!`,
    });

    // 2. Persist to Backend in background
    try {
      setSavingZone(true);
      const serverZone = await zonesApi.create(scenarioId, {
        name: newZoneData.name,
        center_lat: newZoneData.center_lat,
        center_lng: newZoneData.center_lng,
        radius_m: newZoneData.radius_m,
        severity_level: newZoneData.severity_level,
        severity_score: newZoneData.severity_score,
        population_estimate: newZoneData.population_estimate,
        disaster_type: newZoneData.disaster_type,
      });

      if (serverZone?.zone_id) {
        setZones((prev) =>
          prev.map((z) => (String(z.zone_id) === String(newZoneData.zone_id) ? serverZone : z))
        );
      }
    } catch (err: any) {
      console.warn('Zone saved locally:', err.message);
    } finally {
      setSavingZone(false);
      setZoneName(`Zone ${zones.length + 2}`);
      // Clear the temporary preview pin & radius circle so it doesn't linger on map!
      setSelectedCoords(null);
    }
  };

  const handleDeleteZone = async (zoneId: number | string) => {
    // 1. Immediately remove from local state so the circle is instantly deleted from map
    setZones((prev) => prev.filter((z) => String(z.zone_id) !== String(zoneId)));

    // 2. Also clear any active preview coordinate to ensure map is clean
    setSelectedCoords(null);

    // 3. Delete from backend database
    try {
      await zonesApi.delete(scenarioId, Number(zoneId));
    } catch (err) {
      // Ignored for local entries
    }
  };


  const handleStartSimulation = async () => {
    if (zones.length === 0) {
      setFeedbackMsg({
        type: 'error',
        text: 'Please configure at least one disaster zone before starting simulation.',
      });
      return;
    }

    try {
      setStartingSim(true);
      await simulationApi.start(scenarioId, zones).catch(() => {});
      onStartSimulation(scenarioId);
    } catch (err: any) {
      console.warn('Simulation started locally:', err.message);
      onStartSimulation(scenarioId);
    } finally {
      setStartingSim(false);
    }
  };

  // Temporary circle preview on map
  const tempZonePreview = selectedCoords
    ? {
        center_lat: selectedCoords.lat,
        center_lng: selectedCoords.lng,
        radius_m: radiusMeters,
        severity_level: severityLevel,
      }
    : null;

  if (isValidId === false) {
    return (
      <div className="h-[calc(100vh-4rem)] w-full flex items-center justify-center p-6 bg-[#f8fafc]">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-900">Scenario Session Not Found</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              The scenario ID <code className="bg-slate-100 px-1.5 py-0.5 rounded text-rose-600 font-bold">{scenarioId}</code> is not registered on the backend server.
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <button
              onClick={async () => {
                try {
                  const created = await scenariosApi.create({
                    name: `Crisis Session #${Math.floor(100 + Math.random() * 900)}`,
                    description: 'Urban flood coordination corridor and multi-depot triage',
                    disaster_type: 'flood',
                  });
                  if (created?.scenario_id) {
                    window.location.pathname = `/setup/${created.scenario_id}`;
                  }
                } catch {
                  window.location.pathname = `/setup/scn_pune_monsoon`;
                }
              }}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-500/20 cursor-pointer transition-all"
            >
              + Create & Validate New Session
            </button>
            <button
              onClick={onNavigateHome}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer transition-all"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4.5rem)] w-full flex flex-col overflow-hidden bg-[#f8fafc]">
      {/* 1. Top Sub-Header Bar */}
      <div className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-xs z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-1.5 text-sm font-extrabold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer py-1.5 px-3 rounded-xl hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Home</span>
          </button>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-3">
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              {scenarioName}
            </h2>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
              {scenarioId}
            </span>
            <span className="text-xs uppercase font-extrabold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {scenarioStatus}
            </span>
          </div>
          <span className="text-sm text-slate-500 font-mono font-bold hidden md:inline">
            • {zones.length} {zones.length === 1 ? 'Zone' : 'Zones'} Padded
          </span>
        </div>

        {/* Start Simulation Action Button */}
        <button
          onClick={handleStartSimulation}
          disabled={startingSim || zones.length === 0}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-black shadow-md shadow-blue-500/25 transition-all cursor-pointer disabled:cursor-not-allowed"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{startingSim ? 'Starting Engine...' : 'START SIMULATION →'}</span>
        </button>
      </div>

      {/* 2. Main 100vh Work Area: Controlled Map on Left, Spacious De-Cluttered Form on Right */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        {/* Left Side: Interactive Light Map (~60% Width) */}
        <div className="flex-1 min-w-0 relative h-full bg-[#f8fafc] border-r border-slate-200">
          <TacticalMapWrapper
            zones={zones}
            helpingPoints={helpingPoints}
            tempZone={tempZonePreview}
            onMapClick={handleMapClick}
            className="w-full h-full"
          />
        </div>


        {/* Right Side: Clean, Focused Zone Setup Panel (~40% Width: 480px-560px) */}
        <div className="w-full md:w-[480px] lg:w-[520px] xl:w-[560px] bg-white h-full flex flex-col shrink-0 shadow-2xl z-10 overflow-hidden border-l border-slate-200">
          {/* Clean Panel Header */}
          <div className="px-6 py-4.5 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Configure Disaster Zone
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Click map to reposition pin • Adjust radius & severity below
              </p>
            </div>
            <span className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {zones.length} {zones.length === 1 ? 'Zone' : 'Zones'}
            </span>
          </div>

          {/* Form Scroll Container */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Error Feedback Alert (Only shown if validation fails) */}
            {feedbackMsg && feedbackMsg.type === 'error' && (
              <div className="p-3.5 rounded-2xl border text-xs font-semibold flex items-start gap-3 bg-rose-50 border-rose-200 text-rose-800 transition-all">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span className="leading-relaxed">{feedbackMsg.text}</span>
              </div>
            )}

            {/* ZONE CONFIGURATION FORM (Starts immediately, zero clutter) */}
            <form onSubmit={handleSaveZone} className="space-y-6">


              {/* Zone Name Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>Zone Name</span>
                  <span className="text-[11px] text-slate-400 font-normal">Identifies target sector</span>
                </label>
                <input
                  type="text"
                  required
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  placeholder="e.g. Zone 1 (Sangamwadi Lowlands)"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-xs"
                />
              </div>

              {/* Coverage Radius Slider & Live Controls (Spacious with Preset Buttons) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">
                      Zone Radius Perimeter
                    </label>
                    <span className="text-[11px] text-slate-500">Live preview adjusts on map</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1 rounded-xl shadow-xs">
                    <span className="text-sm font-mono font-black">
                      {(radiusMeters / 1000).toFixed(1)} km
                    </span>
                    <span className="text-[10px] opacity-80 font-mono font-medium">
                      ({radiusMeters}m)
                    </span>
                  </div>
                </div>

                {/* Range Slider */}
                <input
                  type="range"
                  min="500"
                  max="10000"
                  step="250"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(Number(e.target.value))}
                  className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />

                {/* Quick Radius Preset Pills */}
                <div className="flex items-center justify-between gap-1.5 pt-1">
                  {[
                    { label: '1.5 km', val: 1500 },
                    { label: '3.0 km', val: 3000 },
                    { label: '5.0 km', val: 5000 },
                    { label: '7.5 km', val: 7500 },
                    { label: '10 km', val: 10000 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setRadiusMeters(preset.val)}
                      className={`flex-1 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                        radiusMeters === preset.val
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Severity Level (2x2 Clean Grid) */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>Severity Classification</span>
                  <span className="text-[11px] text-slate-400 font-normal">Impact score weighting</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSeverityLevel('critical')}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                      severityLevel === 'critical'
                        ? 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-200 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-rose-600 shrink-0" />
                      <span>Critical</span>
                    </div>
                    <span className="text-[10px] font-mono text-rose-600 font-bold">92%</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSeverityLevel('high')}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                      severityLevel === 'high'
                        ? 'bg-orange-50 border-orange-500 text-orange-700 ring-2 ring-orange-200 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-orange-500 shrink-0" />
                      <span>High</span>
                    </div>
                    <span className="text-[10px] font-mono text-orange-600 font-bold">75%</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSeverityLevel('moderate')}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                      severityLevel === 'moderate'
                        ? 'bg-amber-50 border-amber-500 text-amber-700 ring-2 ring-amber-200 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                      <span>Moderate</span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-600 font-bold">50%</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSeverityLevel('low')}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                      severityLevel === 'low'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-200 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-600 shrink-0" />
                      <span>Low</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-600 font-bold">25%</span>
                  </button>
                </div>
              </div>

              {/* Estimated Population */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>Estimated Population</span>
                  <span className="text-[11px] text-slate-400 font-normal">Persons in sector</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={population}
                      onChange={(e) => setPopulation(Number(e.target.value))}
                      placeholder="e.g. 4500"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm font-bold text-slate-900 outline-none transition-all shadow-xs"
                    />
                  </div>
                  {/* Quick Population Presets */}
                  <div className="flex gap-1">
                    {[2500, 5000, 10000].map((pop) => (
                      <button
                        key={pop}
                        type="button"
                        onClick={() => setPopulation(pop)}
                        className={`px-2.5 py-2 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer ${
                          population === pop
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {pop / 1000}k
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Save Zone Action Button (Large, Unmissable) */}
              <button
                type="submit"
                disabled={savingZone}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span>{savingZone ? 'Saving Zone to Scenario...' : '+ SAVE ZONE TO SCENARIO'}</span>
              </button>
            </form>

            {/* C. LIST OF CONFIGURED ZONES */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Configured Impact Zones ({zones.length})
                </h4>
                <span className="text-xs font-mono font-bold text-blue-600">
                  {zones.reduce((sum, z) => sum + (z.population_estimate || 0), 0).toLocaleString()} people affected
                </span>
              </div>

              {zones.length === 0 ? (
                <div className="p-5 text-center rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-xs font-medium space-y-1.5">
                  <p className="font-bold text-slate-700 text-sm">No impact zones configured yet</p>
                  <p className="text-slate-500">
                    Click anywhere on the map to drop the red pin, adjust your radius, and add your first sector.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {zones.map((zone, idx) => (
                    <div
                      key={zone.zone_id || idx}
                      className="p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50/40 border border-slate-200 flex items-center justify-between transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-slate-900">{zone.name}</span>
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                              zone.severity_level === 'critical'
                                ? 'bg-rose-100 text-rose-800'
                                : zone.severity_level === 'high'
                                ? 'bg-orange-100 text-orange-800'
                                : zone.severity_level === 'moderate'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {zone.severity_level}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-mono">
                          Radius: {(zone.radius_m / 1000).toFixed(1)} km • Pop:{' '}
                          {zone.population_estimate?.toLocaleString() || 0}
                        </p>
                      </div>

                      <button
                        onClick={() => handleDeleteZone(zone.zone_id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Zone"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

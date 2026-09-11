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

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>({
    type: 'success',
    text: 'Click anywhere on the map to drop a disaster zone pin with default 3.0 km radius.',
  });

  // Zone Placement Form State
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>({
    lat: 18.5300,
    lng: 73.8600, // Center of Pune corridor
  });
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
    setFeedbackMsg({
      type: 'success',
      text: `📍 Pin dropped at [${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}]. Adjust radius and click "+ Save Zone" below.`,
    });
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
          prev.map((z) => (z.zone_id === newZoneData.zone_id ? serverZone : z))
        );
      }
    } catch (err: any) {
      console.warn('Zone saved locally:', err.message);
    } finally {
      setSavingZone(false);
      setZoneName(`Zone ${zones.length + 2}`);
      setSelectedCoords({
        lat: selectedCoords.lat + 0.012,
        lng: selectedCoords.lng + 0.012,
      });
    }
  };

  const handleDeleteZone = async (zoneId: number) => {
    setZones((prev) => prev.filter((z) => z.zone_id !== zoneId));
    try {
      await zonesApi.delete(scenarioId, zoneId);
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

      {/* 2. Main 100vh Work Area: 68% Light Map on Left, 32% Panel on Right */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        {/* Left Side: Interactive Light Map (68% Width) */}
        <div className="flex-1 relative h-full bg-[#f8fafc] border-r border-slate-200">
          <TacticalMapWrapper
            zones={zones}
            helpingPoints={helpingPoints}
            tempZone={tempZonePreview}
            onMapClick={handleMapClick}
            className="w-full h-full"
          />

          {/* Interactive Help Card */}
          <div className="absolute top-4 left-4 z-[1000] max-w-md px-4 py-3 rounded-2xl bg-white/95 border border-slate-200 text-slate-900 shadow-xl backdrop-blur-md flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold leading-snug text-slate-700">
                <strong>Click anywhere on map</strong> to drop a pin. Preview circle radius:{' '}
                <strong className="text-blue-600 font-bold">{(radiusMeters / 1000).toFixed(1)} km</strong>.
              </p>
            </div>
            <button
              onClick={handleDropAtCenter}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Drop Pin
            </button>
          </div>
        </div>

        {/* Right Side: Setup Panel (Scenario Details + Zone Form) (32% Width) */}
        <div className="w-88 sm:w-96 md:w-[440px] bg-white h-full flex flex-col shrink-0 shadow-xl z-10 overflow-hidden">
          {/* Panel Header */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/80 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Setup & Zone Engine</h3>
                  <p className="text-xs text-slate-500 font-mono">Route: /setup/{scenarioId}</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                100vh Mode
              </span>
            </div>
          </div>

          {/* Form Scroll Container */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Feedback Alert */}
            {feedbackMsg && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-semibold flex items-start gap-2.5 ${
                  feedbackMsg.type === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}
              >
                {feedbackMsg.type === 'error' ? (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                )}
                <span>{feedbackMsg.text}</span>
              </div>
            )}

            {/* A. SCENARIO CONFIGURATION SECTION (Directly inside setup engine) */}
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  Scenario Configuration
                </span>
                <button
                  type="button"
                  onClick={handleSaveScenarioDetails}
                  disabled={savingScenario}
                  className="flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
                >
                  <Save className="w-3 h-3" />
                  <span>{savingScenario ? 'Saving...' : 'Sync Name'}</span>
                </button>
              </div>

              {/* Scenario Name Field */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Scenario Title</label>
                <input
                  type="text"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  onBlur={handleSaveScenarioDetails}
                  placeholder="Scenario Name..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 focus:border-blue-600 text-sm font-extrabold text-slate-900 outline-none"
                />
              </div>

              {/* Disaster Classification Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Disaster Type</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDisasterType('flood');
                      handleSaveScenarioDetails(scenarioName, 'flood');
                    }}
                    className={`flex items-center justify-center gap-1 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                      disasterType === 'flood'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Waves className="w-3.5 h-3.5" />
                    <span>Flood</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDisasterType('cyclone');
                      handleSaveScenarioDetails(scenarioName, 'cyclone');
                    }}
                    className={`flex items-center justify-center gap-1 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                      disasterType === 'cyclone'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Wind className="w-3.5 h-3.5" />
                    <span>Cyclone</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDisasterType('earthquake');
                      handleSaveScenarioDetails(scenarioName, 'earthquake');
                    }}
                    className={`flex items-center justify-center gap-1 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                      disasterType === 'earthquake'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Mountain className="w-3.5 h-3.5" />
                    <span>Quake</span>
                  </button>
                </div>
              </div>
            </div>

            {/* B. ZONE PLACEMENT FORM */}
            <form onSubmit={handleSaveZone} className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  Drop & Configure Zone
                </span>
                <span className="text-[11px] font-mono text-slate-500 font-bold">
                  {selectedCoords
                    ? `${selectedCoords.lat.toFixed(4)}, ${selectedCoords.lng.toFixed(4)}`
                    : 'Click map'}
                </span>
              </div>

              {/* Zone Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Zone Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  placeholder="e.g. Zone 1 (Sangamwadi)"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-xs"
                />
              </div>

              {/* Radius Perimeter Slider (Default 3 km) */}
              <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Zone Radius Perimeter
                  </label>
                  <span className="text-sm font-mono font-extrabold text-blue-600 bg-blue-100 px-2.5 py-0.5 rounded-md">
                    {(radiusMeters / 1000).toFixed(1)} km ({radiusMeters} m)
                  </span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="10000"
                  step="250"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-slate-500 font-mono font-medium">
                  <span>0.5 km</span>
                  <span className="font-bold text-slate-700">Default 3.0 km</span>
                  <span>10.0 km</span>
                </div>
              </div>

              {/* Severity Classification */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Severity Classification
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSeverityLevel('critical')}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                      severityLevel === 'critical'
                        ? 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-200 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>Critical</span>
                    <span className="w-3 h-3 rounded-full bg-rose-600" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setSeverityLevel('high')}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                      severityLevel === 'high'
                        ? 'bg-orange-50 border-orange-500 text-orange-700 ring-2 ring-orange-200 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>High</span>
                    <span className="w-3 h-3 rounded-full bg-orange-500" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setSeverityLevel('moderate')}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                      severityLevel === 'moderate'
                        ? 'bg-amber-50 border-amber-500 text-amber-700 ring-2 ring-amber-200 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>Moderate</span>
                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setSeverityLevel('low')}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                      severityLevel === 'low'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-200 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>Low</span>
                    <span className="w-3 h-3 rounded-full bg-emerald-600" />
                  </button>
                </div>
              </div>

              {/* Estimated Population */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Estimated Affected Population
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={population}
                    onChange={(e) => setPopulation(Number(e.target.value))}
                    placeholder="e.g. 4500"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm font-bold text-slate-900 outline-none transition-all shadow-xs"
                  />
                </div>
              </div>

              {/* Add Zone Action Button */}
              <button
                type="submit"
                disabled={savingZone}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold shadow-md shadow-blue-500/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{savingZone ? 'Saving Zone...' : '+ Save Zone to Scenario'}</span>
              </button>
            </form>

            {/* C. LIST OF CONFIGURED ZONES */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Padded Impact Zones ({zones.length})
                </h4>
                <span className="text-[11px] font-mono font-bold text-blue-600">
                  {zones.reduce((sum, z) => sum + (z.population_estimate || 0), 0).toLocaleString()} people
                </span>
              </div>

              {zones.length === 0 ? (
                <div className="p-4 text-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs font-medium space-y-1">
                  <p className="font-bold">No zones padded yet</p>
                  <p>Click on the map to place your first disaster zone perimeter.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {zones.map((zone, idx) => (
                    <div
                      key={zone.zone_id || idx}
                      className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200 flex items-center justify-between transition-all"
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
                          Perimeter: {(zone.radius_m / 1000).toFixed(1)} km • Pop:{' '}
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

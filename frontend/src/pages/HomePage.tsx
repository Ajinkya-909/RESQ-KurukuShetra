import React, { useEffect, useState } from 'react';
import {
  Shield,
  Plus,
  Compass,
  Layers,
  ArrowRight,
  Activity,
  Users,
  AlertTriangle,
  Clock,
  Trash2,
  ExternalLink,
  Waves,
  RefreshCw,
  MapPin,
  Flame,
} from 'lucide-react';
import { scenariosApi } from '../api';
import { Scenario } from '../types';

interface HomePageProps {
  onNavigate: (to: string) => void;
  onSelectScenario?: (scenario: Scenario) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onSelectScenario,
}) => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScenarios = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await scenariosApi.list();
      setScenarios(data || []);
    } catch (err: any) {
      // Fallback default scenario if backend connection is initializing
      setScenarios([
        {
          scenario_id: 'scn_pune_monsoon',
          name: 'Pune Monsoon Surge — Mula-Mutha Basin',
          description: 'Urban flood coordination corridor with 5 critical helping depots and riverbank zones.',
          disaster_type: 'flood',
          status: 'setup',
          sim_time: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScenarios();
  }, []);

  // Directly create scenario and jump into the Setup Engine route
  const handleCreateNewSession = async () => {
    try {
      setCreating(true);
      const newId = `scn_crisis_${Date.now()}`;
      const defaultName = `Emergency Response Session #${Math.floor(100 + Math.random() * 900)}`;
      
      // Attempt backend creation
      try {
        const created = await scenariosApi.create({
          name: defaultName,
          description: 'Urban disaster coordination corridor and multi-depot triage',
          disaster_type: 'flood',
        });
        if (created?.scenario_id) {
          onNavigate(`/setup/${created.scenario_id}`);
          return;
        }
      } catch {
        // Fallback to client-generated route
      }

      onNavigate(`/setup/${newId}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteScenario = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to remove scenario session "${id}"?`)) return;
    try {
      await scenariosApi.delete(id);
      setScenarios((prev) => prev.filter((s) => s.scenario_id !== id));
    } catch (err: any) {
      setScenarios((prev) => prev.filter((s) => s.scenario_id !== id));
    }
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-10 space-y-12">
      {/* 1. Hero Banner Section (Big Typography & Clean Blue/White Theme) */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white p-10 sm:p-14 shadow-2xl shadow-blue-500/15">
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/20 border border-white/25 text-xs font-extrabold uppercase tracking-wider backdrop-blur-md">
            <Shield className="w-4 h-4 text-blue-200" />
            <span>Disaster Response, Reimagined</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
            From Chaos to Coordinated Action
          </h1>

          <p className="text-lg sm:text-xl text-blue-100 font-medium leading-relaxed">
            AI-powered multi-agent resource coordination delivering precision triage, dynamic
            re-allocation, and real-time inter-agency response during acute disasters.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-3">
            <button
              onClick={handleCreateNewSession}
              disabled={creating}
              className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-white text-blue-700 hover:bg-blue-50 font-black text-sm sm:text-base shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
              <span>{creating ? 'Initializing Engine...' : 'Initialize New Session in Setup Engine →'}</span>
            </button>

            {scenarios.length > 0 && (
              <button
                onClick={() => onNavigate(`/setup/${scenarios[0].scenario_id}`)}
                className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/30 text-white font-extrabold text-sm sm:text-base backdrop-blur-md transition-all cursor-pointer"
              >
                <Compass className="w-5 h-5" />
                <span>Launch 100vh Zone Setup Engine</span>
              </button>
            )}
          </div>
        </div>

        {/* Decorative Graphic Elements */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(#fff_2px,transparent_2px)] [background-size:24px_24px] pointer-events-none" />
      </section>

      {/* 2. Simulation Sessions Browser (Large & Readable Cards) */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Simulation Sessions
            </h2>
            <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">
              Select an active crisis session, drop impact perimeters on the map, and coordinate relief teams.
            </p>
          </div>

          <button
            onClick={fetchScenarios}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs sm:text-sm text-slate-700 font-bold transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Scenarios Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scenarios.map((scenario) => {
            const isRunning = scenario.status === 'running';
            const isSetup = scenario.status === 'setup';

            return (
              <div
                key={scenario.scenario_id}
                onClick={() => onNavigate(`/setup/${scenario.scenario_id}`)}
                className="group relative bg-white rounded-3xl border-2 border-slate-200/90 hover:border-blue-500 p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  {/* Top Status & Code */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-400">
                      {scenario.scenario_id}
                    </span>
                    <span
                      className={`text-xs font-extrabold uppercase px-3 py-1 rounded-full border ${
                        isRunning
                          ? 'bg-rose-50 text-rose-700 border-rose-200 ring-2 ring-rose-100'
                          : isSetup
                          ? 'bg-blue-50 text-blue-700 border-blue-200 ring-2 ring-blue-100'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {scenario.status}
                    </span>
                  </div>

                  {/* Scenario Name (Prominent & Big) */}
                  <div className="space-y-1.5">
                    <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                      {scenario.name}
                    </h3>
                    <p className="text-sm text-slate-600 font-medium line-clamp-2">
                      {scenario.description || 'Disaster relief simulation corridor.'}
                    </p>
                  </div>
                </div>

                {/* Bottom Bar: Action Buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wide">
                    <Waves className="w-4 h-4 text-blue-600" />
                    <span>{scenario.disaster_type || 'flood'}</span>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleDeleteScenario(e, scenario.scenario_id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete Scenario"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onNavigate(`/setup/${scenario.scenario_id}`)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold transition-colors cursor-pointer"
                    >
                      Setup
                    </button>

                    <button
                      onClick={() => onNavigate(`/dashboard/${scenario.scenario_id}`)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-sm transition-colors cursor-pointer"
                    >
                      <span>Live Command</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Operational Highlights Strip (Clean & Large) */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Compass className="w-6 h-6" />
          </div>
          <h4 className="text-lg font-extrabold text-slate-900">Spatial Interactive Mapping</h4>
          <p className="text-sm text-slate-600 font-medium leading-relaxed">
            Drop impact perimeters on an interactive light map with 3.0 km default radii, severity grading, and immediate supply needs.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <h4 className="text-lg font-extrabold text-slate-900">Multi-Agent Optimization</h4>
          <p className="text-sm text-slate-600 font-medium leading-relaxed">
            Needs assessment, proximity routing, and duplicate conflict avoidance agents coordinating across agencies.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <h4 className="text-lg font-extrabold text-slate-900">Human-in-the-Loop Oversight</h4>
          <p className="text-sm text-slate-600 font-medium leading-relaxed">
            Incident Commanders maintain full oversight with one-click Approve, Reject, Dispatch, and Delivery confirmations.
          </p>
        </div>
      </section>
    </div>
  );
};

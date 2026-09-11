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
    <div className="flex-1 w-full max-w-[96rem] mx-auto px-4 sm:px-8 lg:px-12 pt-2 pb-12 space-y-12">
      {/* 1. Modern Hero Section (Expansive Light Canvas with RESQ Brand Theming & Wave Contours) */}
      <section className="relative overflow-hidden rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 lg:p-14 shadow-lg shadow-blue-500/5 w-full">
        {/* Soft Background Flowing Gradients aligned with RESQ Palette (Blue, Cyan, Sky) */}
        <div className="absolute -top-24 -left-20 w-[550px] h-[550px] bg-gradient-to-br from-blue-100/50 via-sky-50/60 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-20 w-[600px] h-[600px] bg-gradient-to-tl from-cyan-100/40 via-blue-50/50 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        {/* Subtle Brand Wave SVG Curves */}
        <div className="absolute -bottom-8 left-0 right-0 h-36 opacity-35 pointer-events-none overflow-hidden">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-[200%] h-full hero-wave-animation fill-none stroke-blue-300/40" strokeWidth="1.5">
            <path d="M0,0 C150,90 350,-40 500,45 C650,130 900,10 1200,60 L1200,120 L0,120 Z" fill="url(#brand-wave-gradient)" opacity="0.35" />
            <defs>
              <linearGradient id="brand-wave-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#818cf8" stopOpacity="0.3" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
          {/* Left Column: Brand Pill Chip, Bold Typography, Descriptive Mission, and Coordinated Actions */}
          <div className="lg:col-span-5 space-y-5 text-left">
            {/* Top Pill Chip in RESQ Theme */}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-xs font-black uppercase tracking-wider text-blue-700 shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
              </span>
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              <span>RESQ Emergency Command System</span>
            </div>

            {/* Original Headline with the replicated font styling, weights & tight tracking */}
            <h1 className="text-4xl sm:text-5xl lg:text-[58px] font-black text-[#0f172a] tracking-[-0.04em] leading-[1.05]">
              From Chaos <br />
              <span className="text-blue-600 font-black">to Coordinated</span> <br />
              <span className="text-[#0f172a] font-black">Action<span className="text-blue-600">.</span></span>
            </h1>

            {/* Original Subtitle with replicated font styling, line-height & tracking */}
            <p className="text-base sm:text-lg text-slate-500 font-normal leading-relaxed tracking-[-0.015em] max-w-xl">
              AI-powered multi-agent resource coordination delivering precision triage, dynamic route optimization, and synchronized multi-agency dispatch across acute crisis corridors.
            </p>

            {/* Action Buttons strictly on ONE LINE with no wrapping */}
            <div className="flex items-center gap-3.5 pt-1 flex-nowrap">
              <button
                onClick={handleCreateNewSession}
                disabled={creating}
                className="whitespace-nowrap inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>{creating ? 'Initializing...' : 'Initialize New Session'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {scenarios.length > 0 && (
                <button
                  onClick={() => onNavigate(`/setup/${scenarios[0].scenario_id}`)}
                  className="whitespace-nowrap inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-blue-50/50 border-2 border-blue-200 text-blue-700 hover:text-blue-800 font-extrabold text-sm sm:text-base shadow-xs hover:border-blue-300 transition-all duration-200 cursor-pointer shrink-0"
                >
                  <Compass className="w-4 h-4 text-blue-600" />
                  <span>Launch Setup Engine</span>
                </button>
              )}
            </div>

            {/* Bottom Highlight Strip in Theme Colors */}
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-blue-50/80 border border-blue-200/70 text-slate-800 shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                <Shield className="w-4 h-4" />
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-700">
                Synchronizing <span className="text-blue-700 font-black">500+</span> Relief Corridors & Priority Depots across active zones.
              </p>
            </div>
          </div>

          {/* Right Column: Hero Illustration Seamlessly on Canvas with Animated Micro-Badges - Extra Large */}
          <div className="lg:col-span-7 relative flex items-center justify-center lg:justify-end">
            {/* Subtle soft backdrop radial glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100/70 via-sky-100/50 to-cyan-50/60 rounded-3xl blur-3xl transform scale-110" />

            {/* Illustration Container seamlessly on the page - Substantially Larger sizing */}
            <div className="relative w-full max-w-2xl lg:max-w-none hero-float-slow">
              <img
                src="/hero.png"
                alt="RESQ Emergency Response Command Coordination"
                className="w-full h-auto object-contain drop-shadow-2xl hover:scale-[1.03] transition-transform duration-500 ease-out"
              />

              {/* Floating Interactive Badge: Live Coordination */}
              <div className="absolute -top-3 right-4 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl px-4 py-2.5 flex items-center gap-3 shadow-lg hero-float-badge">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <div className="text-left">
                  <div className="text-[11px] font-black text-slate-800 leading-tight">Live Spatial Grid</div>
                  <div className="text-[9px] font-semibold text-slate-400">3.0 km Radius Active</div>
                </div>
              </div>

              {/* Floating Interactive Badge: Multi-Agency Sync */}
              <div className="absolute -bottom-4 left-4 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl px-4 py-2.5 flex items-center gap-3 shadow-lg hero-float-badge-delayed">
                <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-black text-slate-800 leading-tight">Multi-Agency Sync</div>
                  <div className="text-[9px] font-bold text-emerald-600">Sub-second Consensus</div>
                </div>
              </div>
            </div>
          </div>
        </div>
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

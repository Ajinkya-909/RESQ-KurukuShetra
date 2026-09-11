import React, { useEffect, useState } from 'react';
import { TopNavBar } from './components/Navigation/TopNavBar';
import { HomePage } from './pages/HomePage';
import { SetupPage } from './pages/SetupPage';
import { DashboardPage } from './pages/DashboardPage';
import { DepotsPage } from './pages/DepotsPage';
import { AgencyPage } from './pages/AgencyPage';
import { useRouter } from './router';
import { scenariosApi } from './api';
import { Scenario } from './types';
import { CheckCircle2 } from 'lucide-react';

const DEFAULT_FALLBACK_SCENARIO: Scenario = {
  scenario_id: 'scn_pune_monsoon',
  name: 'Pune Flood Relief Corridor',
  description: 'Urban flood coordination corridor across Sangamwadi, Mula-Mutha river basin, and Yerawada.',
  disaster_type: 'flood',
  status: 'setup',
  sim_time: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export function App() {
  const { route, navigate } = useRouter();
  const [activeScenario, setActiveScenario] = useState<Scenario>(DEFAULT_FALLBACK_SCENARIO);
  const [simulationStartedBanner, setSimulationStartedBanner] = useState<string | null>(null);

  // Load and validate scenario on initial startup or when route params change
  useEffect(() => {
    let isMounted = true;
    const scenarioId = route.params?.scenarioId;

    const loadScenario = async () => {
      try {
        if (scenarioId) {
          const fetched = await scenariosApi.getById(scenarioId);
          if (isMounted && fetched) {
            setActiveScenario(fetched);
            return;
          }
        }

        const scenarios = await scenariosApi.list();
        if (isMounted && scenarios && scenarios.length > 0) {
          const target = scenarios.find((s) => s.scenario_id === scenarioId) || scenarios[0];
          setActiveScenario(target);
        }
      } catch {
        // Retain fallback scenario
      }
    };

    loadScenario();
    return () => {
      isMounted = false;
    };
  }, [route.params?.scenarioId]);

  const handleStartSimulation = (scenarioId: string) => {
    setSimulationStartedBanner(scenarioId);
    setActiveScenario((prev) => ({ ...prev, status: 'running' }));
    // URL reflects /dashboard/:scenarioId upon starting simulation
    navigate(`/dashboard/${scenarioId}`);
  };

  // Create validated scenario on the backend before routing into Setup Engine
  const handleNewSession = async () => {
    try {
      const created = await scenariosApi.create({
        name: `Emergency Response Session #${Math.floor(100 + Math.random() * 900)}`,
        description: 'Multi-depot emergency response corridor and resource triage',
        disaster_type: 'flood',
      });
      if (created?.scenario_id) {
        setActiveScenario(created);
        navigate(`/setup/${created.scenario_id}`);
        return;
      }
    } catch (err: any) {
      console.warn('Backend scenario creation notice:', err.message);
    }

    // Fallback if backend creates default
    navigate(`/setup/${activeScenario.scenario_id || 'scn_pune_monsoon'}`);
  };

  const activeScenarioId = route.params?.scenarioId || activeScenario.scenario_id;

  return (
    <div className="h-screen w-screen bg-[#f8fafc] text-slate-900 flex flex-col overflow-hidden font-sans selection:bg-blue-600 selection:text-white">
      {/* 1. Global Navigation Bar with Route-Aware Tabs */}
      <TopNavBar
        currentRoute={route.name}
        onNavigate={navigate}
        activeScenario={activeScenario}
        onNewScenarioClick={handleNewSession}
      />

      {/* 2. Simulation Started Success Notification Banner */}
      {simulationStartedBanner && (
        <div className="bg-emerald-600 text-white px-6 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-between shadow-lg shrink-0 animate-in slide-in-from-top duration-200 z-30">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5" />
            <span>
              Simulation session <strong>{simulationStartedBanner}</strong> is now LIVE and running.
              Live Command Center active.
            </span>
          </div>
          <button
            onClick={() => setSimulationStartedBanner(null)}
            className="text-white hover:text-emerald-100 font-extrabold text-xs sm:text-sm underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3. Main View Area (Strict 100vh when in Setup, Dashboard, or Agency) */}
      <main
        className={`flex-1 w-full min-h-0 ${
          route.name === 'setup'
            ? 'overflow-hidden'
            : 'overflow-y-auto'
        }`}
      >
        {/* Page 1: Landing / Home */}
        {route.name === 'home' && (
          <HomePage
            onNavigate={navigate}
            onSelectScenario={(scn) => {
              setActiveScenario(scn);
              navigate(`/setup/${scn.scenario_id}`);
            }}
          />
        )}

        {/* Page 2: Zone Setup Engine */}
        {route.name === 'setup' && (
          <SetupPage
            scenarioId={activeScenarioId}
            initialScenario={activeScenario}
            onNavigateHome={() => navigate('/')}
            onStartSimulation={handleStartSimulation}
            onScenarioUpdated={(scn) => setActiveScenario(scn)}
          />
        )}

        {/* Page 3: Live Operations Command Dashboard */}
        {route.name === 'dashboard' && (
          <DashboardPage
            scenarioId={activeScenarioId}
            onNavigateHome={() => navigate('/')}
            onOpenSetup={() => navigate(`/setup/${activeScenarioId}`)}
          />
        )}

        {/* Page 4: Helping Points & Central Depots */}
        {route.name === 'depots' && (
          <DepotsPage
            onNavigateHome={() => navigate('/')}
            onNavigateToDashboard={() => navigate(`/dashboard/${activeScenarioId}`)}
          />
        )}

        {/* Page 5: Agency Dispatch View */}
        {route.name === 'agency' && (
          <AgencyPage
            scenarioId={activeScenarioId}
            onNavigateHome={() => navigate('/')}
            onNavigateToDashboard={() => navigate(`/dashboard/${activeScenarioId}`)}
          />
        )}
      </main>
    </div>
  );
}

export default App;

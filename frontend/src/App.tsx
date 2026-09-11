import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { KpiStrip } from './components/KpiStrip';
import { LiveDisasterMap } from './components/LiveDisasterMap';
import { LiveUpdates } from './components/LiveUpdates';
import { ZoneWiseAnalysis } from './components/ZoneWiseAnalysis';
import { ResourceAvailability } from './components/ResourceAvailability';
import { AllocationPlan } from './components/AllocationPlan';
import { ResourceDrawer } from './components/ResourceDrawer';
import { ReallocationModal } from './components/ReallocationModal';
import { MissionConflictModal } from './components/MissionConflictModal';
import { NewEmergencyModal } from './components/NewEmergencyModal';
import { ZoneDetailModal } from './components/ZoneDetailModal';
import { AuditLogView } from './components/AuditLogView';
import { AnalyticsView } from './components/AnalyticsView';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Shield, Sparkles, RefreshCw, Layers } from 'lucide-react';

const DashboardContent: React.FC = () => {
  const { activeNavTab, openReallocationModal, openConflictModal, openNewEmergencyModal } = useApp();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white pb-16 md:pb-8">
      {/* Header */}
      <Header />

      {/* Main View Area based on active navigation tab */}
      {activeNavTab === 'Analytics' ? (
        <main className="flex-1">
          <AnalyticsView />
        </main>
      ) : (
        <main className="flex-1 space-y-2">
          {/* Hero Banner Section */}
          <Hero />

          {/* 4 KPI Cards Strip */}
          <KpiStrip />

          {/* Live Disaster Map (70%) + Live Updates (30%) Section */}
          <section id="map-container-section" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Map Canvas: 8 columns on large screens (~67-70%) */}
              <div className="lg:col-span-8">
                <LiveDisasterMap />
              </div>

              {/* Live Updates: 4 columns on large screens (~30-33%) */}
              <div className="lg:col-span-4">
                <LiveUpdates />
              </div>
            </div>
          </section>

          {/* Zone-wise Analysis Grid (Zone A, B, C, D) */}
          <ZoneWiseAnalysis />

          {/* Resource Availability (Tabs + 6 Resource Cards) */}
          <ResourceAvailability />

          {/* Current Resource Allocation Plan (Table + Mobile Cards) */}
          <AllocationPlan />
        </main>
      )}

      {/* Modals & Slide-out Drawers */}
      <ResourceDrawer />
      <ReallocationModal />
      <MissionConflictModal />
      <NewEmergencyModal />
      <ZoneDetailModal />
      <AuditLogView />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Enterprise Footer */}
      <footer className="mt-12 border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center text-white font-black text-[10px]">
              R
            </div>
            <span className="font-bold text-slate-800">RESQ</span>
            <span>— Safer People. Smarter Response.</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px] font-medium">
            <button
              onClick={openNewEmergencyModal}
              className="text-rose-600 hover:text-rose-700 font-bold transition-colors cursor-pointer"
            >
              Simulate Emergency
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={openConflictModal}
              className="text-amber-600 hover:text-amber-700 font-bold transition-colors cursor-pointer"
            >
              Test Conflict Detection
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={openReallocationModal}
              className="text-blue-600 hover:text-blue-700 font-bold transition-colors cursor-pointer"
            >
              Re-run Solver
            </button>
            <span className="text-slate-300">•</span>
            <span>Deterministic Triage Engine v4.2</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <DashboardContent />
    </AppProvider>
  );
}

export default App;

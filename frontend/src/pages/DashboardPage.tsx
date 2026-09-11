import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Activity,
  Shield,
  Clock,
  Play,
  Pause,
  Plus,
  RefreshCw,
  Users,
  AlertTriangle,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Radio,
  ArrowLeft,
  Compass,
  Layers,
  ChevronRight,
  ExternalLink,
  Flame,
  Waves,
  FileText,
  Sparkles,
  Send,
  MessageSquare,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import { TacticalMapWrapper } from '../components/Map';
import { NewSosModal } from '../components/Modals/NewSosModal';
import { dashboardApi, allocationsApi, simulationApi, auditLogApi, scenariosApi } from '../api';
import { socketClient } from '../ws/socketClient';
import { DashboardData, AuditLogItem, Allocation, Report, Zone } from '../types';

interface DashboardPageProps {
  scenarioId: string;
  onNavigateHome: () => void;
  onOpenSetup: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  scenarioId,
  onNavigateHome,
  onOpenSetup,
}) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticking, setTicking] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [activeTab, setActiveTab] = useState<'allocations' | 'intelligence' | 'reports' | 'analytics'>('allocations');
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);

  const [isValidId, setIsValidId] = useState<boolean | null>(null);

  // 1. Fetch Dashboard & Audit Log Payload with ID Validation
  const loadDashboard = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const [dashResult, logsResult] = await Promise.all([
        dashboardApi.getDashboard(scenarioId).catch(() => null),
        auditLogApi.list(scenarioId, { limit: 25 }).catch(() => null),
      ]);

      if (dashResult) {
        setIsValidId(true);
        setData(dashResult);
      } else {
        // Fallback validation check
        const scn = await scenariosApi.getById(scenarioId).catch(() => null);
        if (scn) {
          setIsValidId(true);
        } else if (scenarioId === 'scn_pune_monsoon') {
          setIsValidId(true);
        } else {
          setIsValidId(false);
        }
      }
      if (logsResult && logsResult.logs) {
        setAuditLogs(logsResult.logs);
      }
    } catch (err: any) {
      console.warn('Dashboard fetch notice:', err.message);
      setIsValidId(false);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [scenarioId]);

  // Initial load & Polling Fallback
  useEffect(() => {
    loadDashboard(true);

    // 10s fallback polling
    const interval = setInterval(() => {
      loadDashboard(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [loadDashboard]);

  // 2. WebSocket Real-time Event Subscription
  useEffect(() => {
    socketClient.connect(scenarioId);

    const handleConnect = () => setWsConnected(true);
    const handleDisconnect = () => setWsConnected(false);

    const handleRealtimeUpdate = () => {
      loadDashboard(false);
    };

    const unsubConnect = socketClient.on('connect', handleConnect);
    const unsubDisconnect = socketClient.on('disconnect', handleDisconnect);

    const unsubZoneCreated = socketClient.on('zone.created', handleRealtimeUpdate);
    const unsubZoneUpdated = socketClient.on('zone.updated', handleRealtimeUpdate);
    const unsubReportReceived = socketClient.on('report.received', handleRealtimeUpdate);
    const unsubReportProcessed = socketClient.on('report.processed', handleRealtimeUpdate);
    const unsubAllocApproved = socketClient.on('allocation.approved', handleRealtimeUpdate);
    const unsubAllocDispatched = socketClient.on('allocation.dispatched', handleRealtimeUpdate);
    const unsubAllocDelivered = socketClient.on('allocation.delivered', handleRealtimeUpdate);
    const unsubAllocRejected = socketClient.on('allocation.rejected', handleRealtimeUpdate);
    const unsubSimTick = socketClient.on('simulation.tick', handleRealtimeUpdate);
    const unsubSimPaused = socketClient.on('simulation.paused', handleRealtimeUpdate);
    const unsubSimResumed = socketClient.on('simulation.resumed', handleRealtimeUpdate);

    return () => {
      unsubConnect();
      unsubDisconnect();
      unsubZoneCreated();
      unsubZoneUpdated();
      unsubReportReceived();
      unsubReportProcessed();
      unsubAllocApproved();
      unsubAllocDispatched();
      unsubAllocDelivered();
      unsubAllocRejected();
      unsubSimTick();
      unsubSimPaused();
      unsubSimResumed();
      socketClient.disconnect();
    };
  }, [scenarioId, loadDashboard]);

  // 3. Human-in-the-Loop Actions
  const handleApprove = async (allocationId: number) => {
    try {
      // Optimistic local update
      setData((prev) => {
        if (!prev) return prev;
        const currentKpi = prev.kpi || prev.kpis || {
          total_zones: 0,
          critical_zones: 0,
          affected_population: 0,
          active_sos_reports: 0,
          total_allocations: 0,
          pending_approvals: 0,
          resources_in_transit: 0,
        };
        const updatedKpi = {
          ...currentKpi,
          pending_approvals: Math.max(0, currentKpi.pending_approvals - 1),
          resources_in_transit: currentKpi.resources_in_transit + 1,
        };
        return {
          ...prev,
          pending_approvals: prev.pending_approvals.filter((a) => a.allocation_id !== allocationId),
          kpi: updatedKpi,
          kpis: updatedKpi,
        };
      });

      setFeedback({
        type: 'success',
        text: `Allocation #${allocationId} APPROVED. Stock reserved at source depot.`,
      });

      await allocationsApi.approve(scenarioId, [allocationId]);
      loadDashboard(false);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: `Failed to approve allocation #${allocationId}: ${err.message}`,
      });
      loadDashboard(false);
    }
  };

  const handleReject = async (allocationId: number) => {
    try {
      setData((prev) => {
        if (!prev) return prev;
        const currentKpi = prev.kpi || prev.kpis || {
          total_zones: 0,
          critical_zones: 0,
          affected_population: 0,
          active_sos_reports: 0,
          total_allocations: 0,
          pending_approvals: 0,
          resources_in_transit: 0,
        };
        const updatedKpi = {
          ...currentKpi,
          pending_approvals: Math.max(0, currentKpi.pending_approvals - 1),
        };
        return {
          ...prev,
          pending_approvals: prev.pending_approvals.filter((a) => a.allocation_id !== allocationId),
          kpi: updatedKpi,
          kpis: updatedKpi,
        };
      });

      setFeedback({
        type: 'success',
        text: `Allocation #${allocationId} REJECTED. Resource proposal dismissed.`,
      });

      await allocationsApi.reject(scenarioId, [allocationId], 'Rejected by Incident Commander');
      loadDashboard(false);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: `Failed to reject allocation #${allocationId}: ${err.message}`,
      });
      loadDashboard(false);
    }
  };

  const handleDispatch = async (allocationId: number) => {
    try {
      setFeedback({
        type: 'success',
        text: `Allocation #${allocationId} DISPATCHED. Convoy is in transit.`,
      });
      await allocationsApi.dispatch(scenarioId, [allocationId]);
      loadDashboard(false);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: `Failed to dispatch allocation #${allocationId}: ${err.message}`,
      });
    }
  };

  const handleDeliver = async (allocationId: number) => {
    try {
      setFeedback({
        type: 'success',
        text: `Allocation #${allocationId} DELIVERED. Triage confirmed.`,
      });
      await allocationsApi.deliver(scenarioId, [allocationId]);
      loadDashboard(false);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: `Failed to confirm delivery for #${allocationId}: ${err.message}`,
      });
    }
  };

  // 4. Simulation Engine Clock Controls
  const handleAdvanceTick = async () => {
    try {
      setTicking(true);
      const res = await simulationApi.tick(scenarioId, 1);
      setFeedback({
        type: 'success',
        text: `Clock advanced +1 Hour. Time: ${new Date(res.sim_time).toLocaleTimeString()}. Auto-replenished stock and updated deliveries.`,
      });
      loadDashboard(false);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: `Tick failed: ${err.message}`,
      });
    } finally {
      setTicking(false);
    }
  };

  const handleTogglePause = async () => {
    try {
      setPausing(true);
      const isCurrentlyRunning = data?.scenario?.status === 'running';
      if (isCurrentlyRunning) {
        await simulationApi.pause(scenarioId);
        setFeedback({ type: 'success', text: 'Simulation PAUSED.' });
      } else {
        await simulationApi.resume(scenarioId);
        setFeedback({ type: 'success', text: 'Simulation RESUMED.' });
      }
      loadDashboard(false);
    } catch (err: any) {
      setFeedback({ type: 'error', text: `Failed to toggle simulation status: ${err.message}` });
    } finally {
      setPausing(false);
    }
  };

  const scenarioName = data?.scenario?.name || 'Pune Flood Relief Corridor';
  const disasterType = data?.scenario?.disaster_type || 'flood';
  const scenarioStatus = data?.scenario?.status || 'running';
  const simTime = data?.scenario?.sim_time
    ? new Date(data.scenario.sim_time).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '12:00:00 PM';

  // Derived KPI values
  const totalAffected =
    data?.kpi?.affected_population ||
    data?.kpis?.affected_population ||
    data?.zones?.reduce((sum, z) => sum + (z.population_estimate || 0), 0) ||
    14500;
  const criticalZonesCount =
    data?.kpi?.critical_zones ||
    data?.kpis?.critical_zones ||
    data?.zones?.filter((z) => z.severity_level === 'critical').length ||
    (data?.zones?.length ? 1 : 0);
  const totalAllocations =
    data?.kpi?.total_allocations ||
    data?.kpis?.total_allocations ||
    data?.kpi?.resources_in_transit ||
    12;
  const pendingApprovalsCount =
    data?.pending_approvals?.length ||
    data?.kpi?.pending_approvals ||
    data?.kpis?.pending_approvals ||
    0;

  if (isValidId === false) {
    return (
      <div className="h-[calc(100vh-4rem)] w-full flex items-center justify-center p-6 bg-[#f8fafc]">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-900">Live Dashboard Session Not Found</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              The scenario session <code className="bg-slate-100 px-1.5 py-0.5 rounded text-rose-600 font-bold">{scenarioId}</code> was not found on the backend.
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <button
              onClick={() => onOpenSetup()}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-500/20 cursor-pointer transition-all"
            >
              Configure in Zone Setup Engine
            </button>
            <button
              onClick={onNavigateHome}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer transition-all"
            >
              Return to Scenarios Directory
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4.5rem)] w-full flex flex-col overflow-hidden bg-[#f8fafc] font-sans">
      {/* 1. TOP SUB-NAV BAR: Mission Header, Sim Clock, Actions */}
      <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-xs z-20">
        {/* Left: Back Link & Scenario Info */}
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
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <span>{scenarioName}</span>
            </h2>
            <span className="text-xs uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {disasterType}
            </span>
            <span
              className={`text-xs uppercase font-black px-2.5 py-0.5 rounded-md flex items-center gap-1.5 ${
                scenarioStatus === 'running'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  scenarioStatus === 'running' ? 'bg-emerald-600 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span>{scenarioStatus}</span>
            </span>
          </div>

          {/* Setup Link */}
          <button
            onClick={onOpenSetup}
            className="hidden lg:flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-blue-600 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Adjust Zones in Setup</span>
          </button>
        </div>

        {/* Right: Simulation Clock & Tactical Controls */}
        <div className="flex items-center gap-3">
          {/* WebSocket Status Indicator */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              wsConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                wsConnected ? 'bg-emerald-600 animate-ping' : 'bg-slate-400'
              }`}
            />
            <span className="hidden sm:inline">{wsConnected ? 'Live Socket Sync' : 'Reconnecting...'}</span>
          </div>

          {/* Clock Display */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-mono font-black border border-slate-200 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>{simTime}</span>
          </div>

          {/* +1h Tick Advance Button */}
          <button
            onClick={handleAdvanceTick}
            disabled={ticking}
            title="Advance simulation time by +1 hour"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-extrabold transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${ticking ? 'animate-spin' : ''}`} />
            <span>+1h Tick</span>
          </button>

          {/* Pause / Resume Button */}
          <button
            onClick={handleTogglePause}
            disabled={pausing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-extrabold transition-all cursor-pointer"
          >
            {scenarioStatus === 'running' ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">Resume</span>
              </>
            )}
          </button>

          {/* Quick SOS Trigger */}
          <button
            onClick={() => setIsSosModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md shadow-rose-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Report SOS</span>
          </button>
        </div>
      </header>

      {/* 2. KPI METRIC STRIP (Large Typography & Clean Blue/White Theme) */}
      <section className="bg-white border-b border-slate-200 px-6 py-3.5 grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
        {/* KPI 1: Affected Population */}
        <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-blue-50/50 border border-blue-100">
          <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-extrabold text-blue-900 uppercase tracking-wider block">
              People Affected
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {totalAffected.toLocaleString()}
              </span>
              <span className="text-[11px] font-bold text-slate-500">estimated</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Active Crisis Incidents */}
        <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-rose-50/50 border border-rose-100">
          <div className="w-11 h-11 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-500/20 shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-extrabold text-rose-900 uppercase tracking-wider block">
              Critical Impact Zones
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{criticalZonesCount}</span>
              <span className="text-[11px] font-bold text-rose-700">
                {data?.zones?.length || 0} total zones
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Resources Deployed */}
        <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-extrabold text-indigo-900 uppercase tracking-wider block">
              Dispatches Active
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{totalAllocations}</span>
              <span className="text-[11px] font-bold text-indigo-700">convoys & kits</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Pending Approvals */}
        <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-amber-50/50 border border-amber-100">
          <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-extrabold text-amber-900 uppercase tracking-wider block">
              Commander Approvals
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{pendingApprovalsCount}</span>
              <span className="text-[11px] font-bold text-amber-700">pending AI triage</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Feedback Banner */}
      {feedback && (
        <div
          className={`px-6 py-2.5 text-xs font-bold flex items-center justify-between shadow-xs shrink-0 ${
            feedback.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-blue-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'error' ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-white hover:text-slate-200 underline font-extrabold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 4. MAIN OPERATIONAL WORKSPACE (Strict 100vh Split) */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        {/* Left: Tactical Dual-Engine Map (68% Width) */}
        <div className="flex-1 relative h-full bg-[#f8fafc] border-r border-slate-200">
          <TacticalMapWrapper
            zones={data?.zones || []}
            helpingPoints={data?.helping_points || []}
            reports={data?.active_reports || []}
            supplyLines={data?.supply_lines || []}
            onZoneClick={(zone) => setSelectedZone(zone)}
            className="w-full h-full"
          />

          {/* Selected Zone Quick Float Drawer */}
          {selectedZone && (
            <div className="absolute bottom-5 left-5 z-[1000] max-w-sm w-full bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 p-4 shadow-2xl animate-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <h4 className="text-sm font-extrabold text-slate-900">{selectedZone.name}</h4>
                </div>
                <button
                  onClick={() => setSelectedZone(null)}
                  className="text-xs text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <div className="pt-2 text-xs space-y-1.5 text-slate-600">
                <div className="flex justify-between">
                  <span>Severity:</span>
                  <strong className="text-rose-600 uppercase font-black">
                    {selectedZone.severity_level}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Perimeter Radius:</span>
                  <strong>{(selectedZone.radius_m / 1000).toFixed(1)} km</strong>
                </div>
                <div className="flex justify-between">
                  <span>Affected Population:</span>
                  <strong>{selectedZone.population_estimate?.toLocaleString()}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Operational Command Panel (32% Width) */}
        <div className="w-88 sm:w-96 md:w-[460px] bg-white h-full flex flex-col shrink-0 shadow-xl z-10 overflow-hidden">
          {/* Tab Selector Bar */}
          <div className="p-3 border-b border-slate-200 bg-slate-50/80 shrink-0">
            <div className="grid grid-cols-4 gap-1 bg-slate-200/60 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('allocations')}
                className={`py-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'allocations'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Approvals</span>
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Analytics</span>
              </button>

              <button
                onClick={() => setActiveTab('intelligence')}
                className={`py-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'intelligence'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>AI Log</span>
              </button>

              <button
                onClick={() => setActiveTab('reports')}
                className={`py-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'reports'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-rose-600" />
                <span>SOS</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Human-in-the-Loop Allocations Ledger */}
          {activeTab === 'allocations' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Human-in-the-Loop Decisions
                </span>
                <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  Auto-Triage Active
                </span>
              </div>

              {(!data?.pending_approvals || data.pending_approvals.length === 0) ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">All Allocations Handled</h4>
                  <p className="text-xs text-slate-500 font-medium">
                    No pending resource allocations awaiting Commander review. Advance +1h Tick to generate next optimization cycle.
                  </p>
                </div>
              ) : (
                data.pending_approvals.map((alloc) => (
                  <div
                    key={alloc.allocation_id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs hover:border-blue-400 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-400">
                        #{alloc.allocation_id}
                      </span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                        Needs Approval
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-blue-600" />
                        <span>
                          {alloc.quantity} {alloc.resource_name}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 font-medium">
                        From: <strong className="text-slate-800">{alloc.point_name}</strong> → To:{' '}
                        <strong className="text-blue-700">{alloc.zone_name}</strong>
                      </div>
                    </div>

                    {alloc.reasoning && (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 italic">
                        "{alloc.reasoning}"
                      </div>
                    )}

                    {/* Decision Action Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleApprove(alloc.allocation_id)}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>

                      <button
                        onClick={() => handleReject(alloc.allocation_id)}
                        className="flex-1 py-2 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 text-rose-600 hover:border-rose-300 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 2: Agent Reasoning Audit Stream */}
          {activeTab === 'intelligence' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 block">
                Multi-Agent Reasoning Stream
              </span>

              {auditLogs.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <Sparkles className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">
                    No agent logs recorded yet. Ingest an SOS report or trigger a simulation tick.
                  </p>
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.log_id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wide">
                        {log.agent_name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-slate-800 font-medium leading-relaxed">
                      {log.reasoning_text}
                    </p>
                    {log.zone_name && (
                      <div className="text-[10px] text-slate-500">
                        Target: <strong>{log.zone_name}</strong>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 3: Citizen SOS Incident Reports */}
          {activeTab === 'reports' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Live SOS Ingest Feed
                </span>
                <button
                  onClick={() => setIsSosModalOpen(true)}
                  className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  + Add SOS
                </button>
              </div>

              {(!data?.active_reports || data.active_reports.length === 0) ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <Radio className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">
                    No active SOS reports in this corridor. Click "+ Report SOS" above to submit one.
                  </p>
                </div>
              ) : (
                data.active_reports.map((rpt) => (
                  <div
                    key={rpt.report_id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-400 text-[10px]">
                        SOS #{rpt.report_id}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          rpt.verification_status === 'verified'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {rpt.verification_status}
                      </span>
                    </div>
                    <p className="text-slate-800 font-medium leading-relaxed">
                      {rpt.raw_text || 'Emergency distress call received from citizen.'}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                      <span>
                        Coords: [{rpt.lat.toFixed(4)}, {rpt.lng.toFixed(4)}]
                      </span>
                      <span>
                        {new Date(rpt.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 4: Resource Analytics & Zone Breakdown */}
          {activeTab === 'analytics' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Section A: Resource Distribution Overview */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    Resource Allocation Distribution
                  </span>
                </div>

                {(() => {
                  const resMap: Record<string, { allocated: number; pending: number }> = {};
                  for (const sl of data?.supply_lines || []) {
                    const key = sl.resource_name || 'Unknown';
                    if (!resMap[key]) resMap[key] = { allocated: 0, pending: 0 };
                    resMap[key].allocated += sl.quantity || 0;
                  }
                  for (const pa of data?.pending_approvals || []) {
                    const key = pa.resource_name || 'Unknown';
                    if (!resMap[key]) resMap[key] = { allocated: 0, pending: 0 };
                    resMap[key].pending += pa.quantity || 0;
                  }
                  const resEntries = Object.entries(resMap);
                  const maxQty = Math.max(1, ...resEntries.map(([, v]) => v.allocated + v.pending));

                  if (resEntries.length === 0) {
                    return (
                      <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                        <Package className="w-6 h-6 text-slate-400 mx-auto" />
                        <p className="text-xs text-slate-500 font-medium">
                          No resource allocations yet. Start the simulation and approve allocations to see distribution.
                        </p>
                      </div>
                    );
                  }

                  const RESOURCE_COLORS: Record<string, string> = {
                    water: 'bg-blue-500', food: 'bg-amber-500', medical: 'bg-rose-500',
                    rescue_team: 'bg-emerald-500', ambulance: 'bg-purple-500',
                    shelter: 'bg-orange-500', rescue_boat: 'bg-cyan-500',
                  };

                  return (
                    <div className="space-y-2.5">
                      {resEntries.map(([name, vals]) => {
                        const total = vals.allocated + vals.pending;
                        const pct = Math.round((total / maxQty) * 100);
                        const barColor = RESOURCE_COLORS[name] || 'bg-indigo-500';
                        return (
                          <div key={name} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-700 capitalize">{name.replace('_', ' ')}</span>
                              <div className="flex items-center gap-2">
                                {vals.allocated > 0 && (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                    {vals.allocated.toLocaleString()} active
                                  </span>
                                )}
                                {vals.pending > 0 && (
                                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                    {vals.pending.toLocaleString()} pending
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                              <div
                                className={`h-full ${barColor} rounded-full transition-all duration-500`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Divider */}
              <div className="border-t border-slate-200" />

              {/* Section B: Depot Utilization — Who is giving what */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    Depot Contributions
                  </span>
                </div>

                {(() => {
                  const points = data?.helping_points || [];
                  if (points.length === 0) {
                    return <p className="text-xs text-slate-400 font-medium">No depot data available.</p>;
                  }

                  const TYPE_BADGES: Record<string, string> = {
                    govt: 'bg-blue-100 text-blue-800',
                    ngo: 'bg-rose-100 text-rose-800',
                    hospital: 'bg-emerald-100 text-emerald-800',
                    military: 'bg-amber-100 text-amber-800',
                    private: 'bg-purple-100 text-purple-800',
                  };

                  return (
                    <div className="space-y-2">
                      {points.map((pt) => (
                        <div key={pt.point_id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${TYPE_BADGES[pt.type] || 'bg-slate-100 text-slate-800'}`}>
                                {pt.type}
                              </span>
                              <span className="text-xs font-bold text-slate-800">{pt.name}</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500">
                              {pt.active_allocations || 0} convoys
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  (pt.utilization_pct || 0) > 70 ? 'bg-rose-500' : (pt.utilization_pct || 0) > 40 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, pt.utilization_pct || 0)}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono font-bold text-slate-600">
                              {(pt.utilization_pct || 0).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Divider */}
              <div className="border-t border-slate-200" />

              {/* Section C: Per-Zone Resource Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    Zone-Level Resource Status
                  </span>
                </div>

                {(() => {
                  const zones = data?.zones || [];
                  if (zones.length === 0) {
                    return <p className="text-xs text-slate-400 font-medium">No zone data available.</p>;
                  }

                  const SEVERITY_COLORS: Record<string, string> = {
                    critical: 'bg-rose-600',
                    high: 'bg-orange-500',
                    moderate: 'bg-amber-500',
                    low: 'bg-blue-500',
                  };

                  return (
                    <div className="space-y-3">
                      {zones.map((z) => {
                        const ns = z.needs_summary;
                        const totalNeeds = ns?.total_needed || 0;
                        const shortages = ns?.shortage || 0;
                        const balanced = ns?.balanced || 0;

                        return (
                          <div key={z.zone_id} className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${SEVERITY_COLORS[z.severity_level] || 'bg-slate-400'}`} />
                                <span className="text-xs font-black text-slate-900">{z.name}</span>
                              </div>
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                z.severity_level === 'critical' ? 'bg-rose-100 text-rose-800' :
                                z.severity_level === 'high' ? 'bg-orange-100 text-orange-800' :
                                z.severity_level === 'moderate' ? 'bg-amber-100 text-amber-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {z.severity_level}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                                <div className="text-lg font-black text-slate-900">{z.population_estimate?.toLocaleString() || 0}</div>
                                <div className="text-[10px] font-bold text-slate-500">Population</div>
                              </div>
                              <div className="p-2 rounded-lg bg-rose-50 border border-rose-100">
                                <div className="text-lg font-black text-rose-700">{shortages}</div>
                                <div className="text-[10px] font-bold text-rose-600">Shortages</div>
                              </div>
                              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                                <div className="text-lg font-black text-emerald-700">{balanced}</div>
                                <div className="text-[10px] font-bold text-emerald-600">Fulfilled</div>
                              </div>
                            </div>

                            {totalNeeds > 0 && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                                  <span>Resource Fulfillment</span>
                                  <span>{balanced}/{totalNeeds} types covered</span>
                                </div>
                                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                  <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                                    style={{ width: `${totalNeeds > 0 ? Math.round((balanced / totalNeeds) * 100) : 0}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                                <span>Severity Score</span>
                                <span>{((z.severity_score || 0) * 100).toFixed(0)}%</span>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    (z.severity_score || 0) >= 0.75 ? 'bg-rose-500' :
                                    (z.severity_score || 0) >= 0.5 ? 'bg-orange-500' :
                                    (z.severity_score || 0) >= 0.25 ? 'bg-amber-500' : 'bg-blue-500'
                                  }`}
                                  style={{ width: `${((z.severity_score || 0) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Ingest SOS Modal */}
      <NewSosModal
        isOpen={isSosModalOpen}
        onClose={() => setIsSosModalOpen(false)}
        scenarioId={scenarioId}
        onReportSubmitted={() => {
          setFeedback({
            type: 'success',
            text: 'Citizen SOS report ingested. Multi-agent verification pipeline triggered.',
          });
          loadDashboard(false);
        }}
      />
    </div>
  );
};

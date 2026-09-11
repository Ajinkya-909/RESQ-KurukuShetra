import React, { useEffect, useState, useMemo } from 'react';
import {
  Shield,
  ArrowLeft,
  Truck,
  Package,
  CheckCircle2,
  Clock,
  Send,
  Building,
  Users,
  Compass,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { TacticalMapWrapper } from '../components/Map';
import { helpingPointsApi, allocationsApi, zonesApi, scenariosApi } from '../api';
import { HelpingPoint, Allocation, Zone } from '../types';

interface AgencyPageProps {
  onNavigateHome: () => void;
  onNavigateToDashboard: () => void;
}

const AGENCIES = [
  { id: 'govt', name: 'National Disaster Response Force (NDRF)', icon: Shield, badgeColor: 'bg-blue-600' },
  { id: 'ngo', name: 'Indian Red Cross Society', icon: Users, badgeColor: 'bg-rose-600' },
  { id: 'hospital', name: 'Municipal Health Services', icon: Building, badgeColor: 'bg-emerald-600' },
  { id: 'military', name: 'Army Logistics Corps', icon: Shield, badgeColor: 'bg-amber-600' },
  { id: 'private', name: 'Civil Defence & Volunteers', icon: Users, badgeColor: 'bg-purple-600' },
];

export const AgencyPage: React.FC<AgencyPageProps> = ({
  onNavigateHome,
  onNavigateToDashboard,
}) => {
  const [selectedAgencyId, setSelectedAgencyId] = useState('govt');
  const [depots, setDepots] = useState<HelpingPoint[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeScenarioId, setActiveScenarioId] = useState('scn_pune_monsoon');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadAgencyData = async () => {
    try {
      setLoading(true);
      const [scenariosList, depotsList] = await Promise.all([
        scenariosApi.list().catch(() => []),
        helpingPointsApi.list().catch(() => []),
      ]);

      const scnId = scenariosList?.[0]?.scenario_id || 'scn_pune_monsoon';
      setActiveScenarioId(scnId);

      const [allocList, zonesList] = await Promise.all([
        allocationsApi.list(scnId).catch(() => []),
        zonesApi.list(scnId).catch(() => []),
      ]);

      setDepots(depotsList || []);
      setAllocations(allocList || []);
      setZones(zonesList || []);
    } catch (err: any) {
      console.warn('Agency data load notice:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgencyData();
  }, []);

  // Filter depots & allocations belonging to the selected organization
  const agencyDepots = useMemo(
    () => depots.filter((d) => d.type === selectedAgencyId),
    [depots, selectedAgencyId]
  );

  const agencyDepotIds = useMemo(
    () => new Set(agencyDepots.map((d) => d.point_id)),
    [agencyDepots]
  );

  const agencyAllocations = useMemo(
    () => allocations.filter((a) => agencyDepotIds.has(a.point_id)),
    [allocations, agencyDepotIds]
  );

  const handleDispatch = async (allocationId: number) => {
    try {
      await allocationsApi.dispatch(activeScenarioId, [allocationId]);
      setFeedback({
        type: 'success',
        text: `Convoy for Allocation #${allocationId} DISPATCHED! Tracking active on tactical map.`,
      });
      loadAgencyData();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: `Dispatch failed: ${err.message}`,
      });
    }
  };

  const handleDeliver = async (allocationId: number) => {
    try {
      await allocationsApi.deliver(activeScenarioId, [allocationId]);
      setFeedback({
        type: 'success',
        text: `Delivery for Allocation #${allocationId} CONFIRMED. Triage completed.`,
      });
      loadAgencyData();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: `Confirm delivery failed: ${err.message}`,
      });
    }
  };

  const activeAgency = AGENCIES.find((a) => a.id === selectedAgencyId) || AGENCIES[0];

  // Supply vector lines for the map for this agency
  const agencySupplyLines = useMemo(() => {
    return agencyAllocations
      .filter((a) => a.status === 'en_route' || a.status === 'dispatched')
      .map((a) => {
        const depot = depots.find((d) => d.point_id === a.point_id);
        const zone = zones.find((z) => z.zone_id === a.zone_id);
        return {
          allocation_id: a.allocation_id,
          from_lat: depot?.lat || 18.5204,
          from_lng: depot?.lng || 73.8567,
          to_lat: zone?.center_lat || 18.5300,
          to_lng: zone?.center_lng || 73.8600,
          resource_name: a.resource_name || 'Emergency Aid',
          quantity: a.quantity,
          status: a.status,
        };
      });
  }, [agencyAllocations, depots, zones]);

  return (
    <div className="h-[calc(100vh-4.5rem)] w-full flex flex-col overflow-hidden bg-[#f8fafc] font-sans">
      {/* 1. Header Bar with Agency Selector */}
      <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-xs z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-1.5 text-sm font-extrabold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer py-1.5 px-3 rounded-xl hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Home</span>
          </button>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl ${activeAgency.badgeColor} text-white flex items-center justify-center font-bold`}>
              <activeAgency.icon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Agency Dispatch Console
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {activeAgency.name}
              </p>
            </div>
          </div>
        </div>

        {/* Agency Switcher Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-500 hidden sm:inline">Active Unit:</label>
          <select
            value={selectedAgencyId}
            onChange={(e) => setSelectedAgencyId(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:border-blue-600 text-xs font-extrabold text-slate-900 outline-none cursor-pointer"
          >
            {AGENCIES.map((ag) => (
              <option key={ag.id} value={ag.id}>
                {ag.name}
              </option>
            ))}
          </select>

          <button
            onClick={loadAgencyData}
            className="p-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 cursor-pointer"
            title="Refresh Fleet Telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* 2. Feedback Notification */}
      {feedback && (
        <div
          className={`px-6 py-2.5 text-xs font-bold flex items-center justify-between shadow-xs shrink-0 ${
            feedback.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="underline font-extrabold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* 3. 100vh Split Workspace: Map on Left (65%), Missions on Right (35%) */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        {/* Left: Tactical Map */}
        <div className="flex-1 relative h-full bg-[#f8fafc] border-r border-slate-200">
          <TacticalMapWrapper
            zones={zones}
            helpingPoints={agencyDepots.length > 0 ? agencyDepots : depots}
            supplyLines={agencySupplyLines}
            className="w-full h-full"
          />

          {/* Floating Unit Status */}
          <div className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 p-4 shadow-xl max-w-sm space-y-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <span className={`w-3 h-3 rounded-full ${activeAgency.badgeColor}`} />
              <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                Deployment Overview
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 font-bold block text-[10px]">Assigned Convoys</span>
                <span className="text-base font-black text-slate-900">{agencyAllocations.length}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px]">Active Depots</span>
                <span className="text-base font-black text-slate-900">{agencyDepots.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Assigned Missions & Dispatch Ledger (35% Width) */}
        <div className="w-96 md:w-[460px] bg-white h-full flex flex-col shrink-0 shadow-xl z-10 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/80 shrink-0 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900">Assigned Missions</h3>
              <p className="text-xs text-slate-500 font-medium">
                Shipments originating from {activeAgency.name}
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
              {agencyAllocations.length} Orders
            </span>
          </div>

          {/* Mission Cards Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {agencyAllocations.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <Truck className="w-10 h-10 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-900">No Orders Assigned</h4>
                <p className="text-xs text-slate-500 font-medium">
                  There are currently no active dispatch orders assigned to {activeAgency.name}.
                </p>
              </div>
            ) : (
              agencyAllocations.map((alloc) => (
                <div
                  key={alloc.allocation_id}
                  className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-400">
                      Order #{alloc.allocation_id}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        alloc.status === 'delivered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : alloc.status === 'en_route' || alloc.status === 'dispatched'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {alloc.status}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-blue-600" />
                      <span>
                        {alloc.quantity} {alloc.resource_name || 'Emergency Aid'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 font-medium">
                      Destination: <strong className="text-slate-800">{alloc.zone_name || `Zone #${alloc.zone_id}`}</strong>
                    </div>
                  </div>

                  {/* Dispatch / Delivery Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    {alloc.status === 'confirmed' && (
                      <button
                        onClick={() => handleDispatch(alloc.allocation_id)}
                        className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Dispatch Convoy</span>
                      </button>
                    )}

                    {(alloc.status === 'dispatched' || alloc.status === 'en_route') && (
                      <button
                        onClick={() => handleDeliver(alloc.allocation_id)}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm Delivery</span>
                      </button>
                    )}

                    {alloc.status === 'delivered' && (
                      <div className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Mission Successfully Completed</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

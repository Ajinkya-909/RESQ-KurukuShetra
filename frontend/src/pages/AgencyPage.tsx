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
  Boxes,
  Layers,
  HeartHandshake,
} from 'lucide-react';
import { TacticalMapWrapper } from '../components/Map';
import { helpingPointsApi, allocationsApi, zonesApi, scenariosApi } from '../api';
import { HelpingPoint, Allocation, Zone } from '../types';

interface AgencyPageProps {
  scenarioId?: string;
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
  scenarioId,
  onNavigateHome,
  onNavigateToDashboard,
}) => {
  const [selectedAgencyId, setSelectedAgencyId] = useState('govt');
  const [activeTab, setActiveTab] = useState<'inventory' | 'missions'>('inventory');
  const [depots, setDepots] = useState<HelpingPoint[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeScenarioId, setActiveScenarioId] = useState(scenarioId || 'scn_pune_monsoon');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadAgencyData = async () => {
    try {
      setLoading(true);
      let targetScnId = scenarioId || activeScenarioId;
      if (!scenarioId) {
        const scenariosList = await scenariosApi.list().catch(() => []);
        if (scenariosList?.[0]?.scenario_id) {
          targetScnId = scenariosList[0].scenario_id;
        }
      }
      setActiveScenarioId(targetScnId);

      const [depotsList, allocList, zonesList] = await Promise.all([
        helpingPointsApi.list().catch(() => []),
        allocationsApi.list(targetScnId).catch(() => []),
        zonesApi.list(targetScnId).catch(() => []),
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
    if (scenarioId) {
      setActiveScenarioId(scenarioId);
    }
    loadAgencyData();
  }, [scenarioId]);

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

  // Total committed / approved assistance stock
  const totalApprovedStock = useMemo(() => {
    let total = 0;
    agencyDepots.forEach((d) => {
      d.inventory?.forEach((item) => {
        total += item.reserved_stock || 0;
      });
    });
    return total;
  }, [agencyDepots]);

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
          to_lat: a.target_lat || zone?.center_lat || 18.5300,
          to_lng: a.target_lng || zone?.center_lng || 73.8600,
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
                Agency Dispatch & Relief Console
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
            title="Refresh Agency Telemetry"
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

      {/* 3. 100vh Split Workspace: Map on Left (60%), Details on Right (40%) */}
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
                Agency Deployment Metrics
              </h4>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400 font-bold block text-[10px]">Depots</span>
                <span className="text-base font-black text-slate-900">{agencyDepots.length}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px]">Approved Aid</span>
                <span className="text-base font-black text-emerald-600">{totalApprovedStock}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px]">Missions</span>
                <span className="text-base font-black text-blue-600">{agencyAllocations.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Agency Details & Live Stock / Missions Panel */}
        <div className="w-[460px] lg:w-[500px] bg-white h-full flex flex-col shrink-0 shadow-xl z-10 overflow-hidden border-l border-slate-200">
          {/* Tabs header */}
          <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl w-full">
              <button
                onClick={() => setActiveTab('inventory')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'inventory'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Boxes className="w-3.5 h-3.5 text-emerald-600" />
                <span>Helping Inventory & Aid</span>
              </button>

              <button
                onClick={() => setActiveTab('missions')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'missions'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Truck className="w-3.5 h-3.5 text-blue-600" />
                <span>Active Missions ({agencyAllocations.length})</span>
              </button>
            </div>
          </div>

          {/* TAB 1: HELPING INVENTORY & COMMITTED AID */}
          {activeTab === 'inventory' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-emerald-50 rounded-2xl p-3.5 border border-emerald-200 space-y-1">
                <div className="flex items-center gap-2 text-emerald-900 text-xs font-black">
                  <HeartHandshake className="w-4 h-4 text-emerald-600" />
                  <span>Relief Allocation Tracking</span>
                </div>
                <p className="text-[11px] text-emerald-700 font-medium leading-relaxed">
                  When allocations are approved in the Command Center, resource stock is moved from <strong>Available</strong> to <strong>Approved / Helping Stock</strong> in PostgreSQL DB.
                </p>
              </div>

              {agencyDepots.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <Building className="w-10 h-10 text-slate-400 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-900">No Helping Points Registered</h4>
                  <p className="text-xs text-slate-500 font-medium">
                    No depots currently registered under {activeAgency.name}.
                  </p>
                </div>
              ) : (
                agencyDepots.map((depot) => (
                  <div key={depot.point_id} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div>
                        <h4 className="text-sm font-black text-slate-900">{depot.name}</h4>
                        <span className="text-[11px] text-slate-500 font-semibold">
                          Reliability: {(depot.reliability_score * 100).toFixed(0)}% • Cap: {(depot.arrangement_capability * 100).toFixed(0)}%
                        </span>
                      </div>
                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                        depot.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {depot.status}
                      </span>
                    </div>

                    {/* Stock Inventory Items Breakdown */}
                    <div className="space-y-2">
                      <h5 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                        Helping Resources Stock
                      </h5>
                      {(!depot.inventory || depot.inventory.length === 0) ? (
                        <div className="text-xs text-slate-400 italic">No inventory registered for this point.</div>
                      ) : (
                        depot.inventory.map((inv) => (
                          <div key={inv.resource_id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                                <Package className="w-3.5 h-3.5 text-blue-600" />
                                <span>{inv.resource_name}</span>
                              </span>
                              <span className="text-[11px] font-bold text-slate-500">
                                Total: {inv.total_stock} {inv.unit}
                              </span>
                            </div>

                            {/* Resource Metrics grid */}
                            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                              <div className="p-1.5 rounded-lg bg-white border border-slate-200">
                                <span className="text-slate-400 block text-[9px] font-bold uppercase">Available</span>
                                <span className="font-black text-slate-800">{inv.available_stock} {inv.unit}</span>
                              </div>

                              <div className="p-1.5 rounded-lg bg-emerald-100/70 border border-emerald-300">
                                <span className="text-emerald-700 block text-[9px] font-black uppercase">Approved Aid</span>
                                <span className="font-black text-emerald-900">{inv.reserved_stock} {inv.unit}</span>
                              </div>

                              <div className="p-1.5 rounded-lg bg-blue-100/70 border border-blue-300">
                                <span className="text-blue-700 block text-[9px] font-black uppercase">In Transit</span>
                                <span className="font-black text-blue-900">{inv.in_transit} {inv.unit}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Active Allocations assigned to this depot */}
                    {allocations.filter((a) => a.point_id === depot.point_id).length > 0 && (
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          Helping Destinations:
                        </span>
                        <div className="space-y-1">
                          {allocations
                            .filter((a) => a.point_id === depot.point_id)
                            .slice(0, 3)
                            .map((al) => (
                              <div key={al.allocation_id} className="text-xs font-semibold text-slate-700 flex items-center justify-between bg-slate-100/70 px-2 py-1 rounded-lg">
                                <span>
                                  {al.quantity} {al.resource_name} → {al.report_id ? `SOS #${al.report_id}` : (al.zone_name || `Zone #${al.zone_id}`)}
                                </span>
                                <span className="text-[10px] font-extrabold uppercase text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                  {al.status}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: ACTIVE DISPATCH MISSIONS */}
          {activeTab === 'missions' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {agencyAllocations.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <Truck className="w-10 h-10 text-slate-400 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-900">No Active Missions</h4>
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
                      <div className="text-xs text-slate-600 font-medium flex items-center gap-1.5 flex-wrap">
                        <span>Destination:</span>
                        {alloc.report_id ? (
                          <span className="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 font-extrabold text-[11px] flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>Direct SOS Report #{alloc.report_id}</span>
                          </span>
                        ) : (
                          <strong className="text-slate-800">{alloc.zone_name || `Zone #${alloc.zone_id}`}</strong>
                        )}
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
          )}
        </div>
      </div>
    </div>
  );
};

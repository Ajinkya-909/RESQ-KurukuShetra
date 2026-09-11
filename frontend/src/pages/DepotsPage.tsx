import React, { useEffect, useState } from 'react';
import {
  Shield,
  ArrowLeft,
  RefreshCw,
  Plus,
  Package,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Building,
  Activity,
  Heart,
  Crosshair,
  Sliders,
  X,
  Send,
} from 'lucide-react';
import { helpingPointsApi } from '../api';
import { HelpingPoint, InventoryItem, ResourceType } from '../types';

interface DepotsPageProps {
  onNavigateHome: () => void;
  onNavigateToDashboard: () => void;
}

export const DepotsPage: React.FC<DepotsPageProps> = ({
  onNavigateHome,
  onNavigateToDashboard,
}) => {
  const [depots, setDepots] = useState<HelpingPoint[]>([]);
  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepot, setSelectedDepot] = useState<HelpingPoint | null>(null);
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [isAddDepotOpen, setIsAddDepotOpen] = useState(false);
  const [restockAmount, setRestockAmount] = useState(100);
  const [selectedResourceId, setSelectedResourceId] = useState(1);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Depot Form State
  const [newDepotName, setNewDepotName] = useState('');
  const [newDepotType, setNewDepotType] = useState<'ngo' | 'govt' | 'private' | 'hospital' | 'military'>('govt');
  const [newDepotLat, setNewDepotLat] = useState(18.5204);
  const [newDepotLng, setNewDepotLng] = useState(73.8567);

  const fetchDepots = async () => {
    try {
      setLoading(true);
      const [depotsList, typesList] = await Promise.all([
        helpingPointsApi.list().catch(() => []),
        helpingPointsApi.getResourceTypes().catch(() => []),
      ]);
      setDepots(depotsList || []);
      setResourceTypes(typesList || []);
    } catch (err: any) {
      console.warn('Depots fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepots();
  }, []);

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDepot) return;

    try {
      await helpingPointsApi.updateInventory(selectedDepot.point_id, [
        {
          resource_id: selectedResourceId,
          available_stock: Number(restockAmount),
        },
      ]);
      setFeedback({
        type: 'success',
        text: `Successfully patched stock for ${selectedDepot.name}!`,
      });
      setIsRestockOpen(false);
      fetchDepots();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: `Restock update failed: ${err.message}`,
      });
    }
  };

  const handleCreateDepot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepotName.trim()) return;

    try {
      await helpingPointsApi.create({
        name: newDepotName.trim(),
        type: newDepotType,
        lat: Number(newDepotLat),
        lng: Number(newDepotLng),
        reliability_score: 0.95,
        arrangement_capability: 1000,
        inventory: [
          { resource_id: 1, total_stock: 500, replenish_rate: 50 },
          { resource_id: 2, total_stock: 300, replenish_rate: 30 },
          { resource_id: 3, total_stock: 200, replenish_rate: 20 },
        ],
      });
      setFeedback({
        type: 'success',
        text: `New distribution depot "${newDepotName}" initialized!`,
      });
      setIsAddDepotOpen(false);
      setNewDepotName('');
      fetchDepots();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: `Failed to create depot: ${err.message}`,
      });
    }
  };

  const getAgencyBadge = (type: string) => {
    switch (type) {
      case 'govt':
        return { label: 'NDRF / Govt', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'ngo':
        return { label: 'Red Cross / NGO', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'hospital':
        return { label: 'Emergency Hospital', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'military':
        return { label: 'Army Corps', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      default:
        return { label: 'Volunteers / Private', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
    }
  };

  // Summary Aggregates
  const totalWater = depots.reduce((sum, d) => {
    const item = d.inventory?.find((i) => i.resource_id === 1 || i.resource_name?.toLowerCase().includes('water'));
    return sum + (item?.available_stock || item?.total_stock || 0);
  }, 0);

  const totalFood = depots.reduce((sum, d) => {
    const item = d.inventory?.find((i) => i.resource_id === 2 || i.resource_name?.toLowerCase().includes('food'));
    return sum + (item?.available_stock || item?.total_stock || 0);
  }, 0);

  const totalMedical = depots.reduce((sum, d) => {
    const item = d.inventory?.find((i) => i.resource_id === 3 || i.resource_name?.toLowerCase().includes('medical'));
    return sum + (item?.available_stock || item?.total_stock || 0);
  }, 0);

  return (
    <div className="h-full w-full flex flex-col overflow-y-auto bg-[#f8fafc] font-sans pb-16">
      {/* 1. Header Bar */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-xs">
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
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Helping Points & Central Depots
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Logistics triage, reserve inventories, and automated replenishment
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDepots}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsAddDepotOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Hub</span>
          </button>
        </div>
      </header>

      {/* 2. Feedback Banner */}
      {feedback && (
        <div
          className={`px-6 py-2.5 text-xs font-bold flex items-center justify-between shadow-xs ${
            feedback.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
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
            className="underline font-extrabold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3. Global Inventory Metrics Strip */}
      <section className="max-w-7xl w-full mx-auto px-6 pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-black shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">
                Total Potable Water
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">
                  {totalWater.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-blue-600">Liters Ready</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-black shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">
                Total Food Packets
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">
                  {totalFood.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-amber-600">Rations Stocked</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-black shrink-0">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">
                Emergency Medical Kits
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">
                  {totalMedical.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-rose-600">First-Aid Units</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Depots Grid */}
      <section className="max-w-7xl w-full mx-auto px-6 pt-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              Active Regional Distribution Hubs ({depots.length})
            </h3>
            <p className="text-sm text-slate-500 font-medium">
              Click "Restock Hub" to dispatch replenishment quotas or alter active capacity.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {depots.map((depot) => {
            const badge = getAgencyBadge(depot.type);
            const totalStock = depot.inventory?.reduce((s, i) => s + (i.total_stock || 0), 0) || 1200;
            const availableStock = depot.inventory?.reduce((s, i) => s + (i.available_stock || i.total_stock || 0), 0) || 850;
            const utilPct = totalStock > 0 ? Math.round(((totalStock - availableStock) / totalStock) * 100) : 35;

            return (
              <div
                key={depot.point_id}
                className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm hover:shadow-md transition-all space-y-5"
              >
                {/* Depot Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h4 className="text-lg font-black text-slate-900">{depot.name}</h4>
                      <span className="text-xs font-mono font-bold text-slate-400">
                        #{depot.point_id}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                        {badge.label}
                      </span>
                      <span className="text-xs text-slate-400 font-mono font-bold">
                        [{depot.lat.toFixed(4)}, {depot.lng.toFixed(4)}]
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedDepot(depot);
                      setIsRestockOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-extrabold transition-colors cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Restock Hub</span>
                  </button>
                </div>

                {/* Utilization Meter */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                    <span>Depot Capacity Utilization</span>
                    <span className="text-blue-600 font-extrabold">{utilPct}% Allocated</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${utilPct}%` }}
                    />
                  </div>
                </div>

                {/* Inventory Breakdown Table */}
                <div className="border border-slate-100 rounded-2xl overflow-hidden text-xs">
                  <div className="bg-slate-50/80 px-4 py-2 border-b border-slate-100 grid grid-cols-5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    <span className="col-span-2">Resource</span>
                    <span className="text-right">Available</span>
                    <span className="text-right">Reserved</span>
                    <span className="text-right">Replenish/hr</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {(!depot.inventory || depot.inventory.length === 0) ? (
                      <div className="p-4 text-center text-slate-400 font-medium">
                        Standard emergency reserves active.
                      </div>
                    ) : (
                      depot.inventory.map((inv) => (
                        <div
                          key={inv.resource_id}
                          className="px-4 py-2.5 grid grid-cols-5 items-center font-medium text-slate-800"
                        >
                          <span className="col-span-2 font-bold flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-blue-600" />
                            <span>{inv.resource_name || `Resource #${inv.resource_id}`}</span>
                          </span>
                          <span className="text-right font-black text-emerald-600">
                            {inv.available_stock?.toLocaleString() || inv.total_stock?.toLocaleString()}
                          </span>
                          <span className="text-right text-slate-500">
                            {inv.reserved_stock?.toLocaleString() || 0}
                          </span>
                          <span className="text-right font-mono text-blue-600 font-bold">
                            +{inv.replenish_rate || 25}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Restock Modal */}
      {isRestockOpen && selectedDepot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Restock Distribution Hub</h3>
                <p className="text-xs text-slate-500">{selectedDepot.name}</p>
              </div>
              <button
                onClick={() => setIsRestockOpen(false)}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Select Resource Type</label>
                <select
                  value={selectedResourceId}
                  onChange={(e) => setSelectedResourceId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 outline-none"
                >
                  <option value={1}>Potable Water (Liters)</option>
                  <option value={2}>Food Packets (Rations)</option>
                  <option value={3}>Medical Kits (Units)</option>
                  <option value={4}>Rescue Boats</option>
                  <option value={5}>Emergency Blankets</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Stock Adjustment Quantity</label>
                <input
                  type="number"
                  min="10"
                  step="10"
                  required
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 text-sm font-black text-slate-900 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRestockOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Register New Hub Modal */}
      {isAddDepotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Register Regional Depot</h3>
                <p className="text-xs text-slate-500">Configure new logistics supply point</p>
              </div>
              <button
                onClick={() => setIsAddDepotOpen(false)}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDepot} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Hub / Base Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NDRF Sector 3 Depot"
                  value={newDepotName}
                  onChange={(e) => setNewDepotName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 text-sm font-bold text-slate-900 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Agency Organization</label>
                <select
                  value={newDepotType}
                  onChange={(e) => setNewDepotType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 outline-none"
                >
                  <option value="govt">NDRF / Civil Defence (govt)</option>
                  <option value="ngo">Indian Red Cross (ngo)</option>
                  <option value="hospital">Municipal Hospital (hospital)</option>
                  <option value="military">Army Logistics (military)</option>
                  <option value="private">Volunteers / NGO (private)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newDepotLat}
                    onChange={(e) => setNewDepotLat(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newDepotLng}
                    onChange={(e) => setNewDepotLng(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddDepotOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Save Depot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

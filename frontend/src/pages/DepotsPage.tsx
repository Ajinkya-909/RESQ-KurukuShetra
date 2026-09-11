import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Plus,
  Package,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Heart,
  Sliders,
  X,
  Search,
  LayoutGrid,
  Table as TableIcon,
  Check,
  Edit2,
  Building2,
  ShieldAlert,
  Droplets,
  Utensils,
  Ambulance,
  Compass,
} from 'lucide-react';
import { helpingPointsApi } from '../api';
import { HelpingPoint, ResourceType } from '../types';

interface DepotsPageProps {
  onNavigateHome: () => void;
  onNavigateToDashboard: () => void;
}

export const DepotsPage: React.FC<DepotsPageProps> = ({
  onNavigateHome,
}) => {
  const [depots, setDepots] = useState<HelpingPoint[]>([]);
  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgency, setSelectedAgency] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

  // Inline Stock Edit State (depotId_resourceId -> editing value)
  const [editingItem, setEditingItem] = useState<{
    depotId: number;
    resourceId: number;
    val: number;
  } | null>(null);

  // New Depot Form State
  const [isAddDepotOpen, setIsAddDepotOpen] = useState(false);
  const [newDepotName, setNewDepotName] = useState('');
  const [newDepotType, setNewDepotType] = useState<'ngo' | 'govt' | 'private' | 'hospital' | 'military'>('govt');
  const [newDepotLat, setNewDepotLat] = useState(18.5204);
  const [newDepotLng, setNewDepotLng] = useState(73.8567);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  // Quick Inline Stock Adjustment (+50, +100, +500)
  const handleQuickAdjust = async (
    depotId: number,
    resourceId: number,
    currentAvailable: number,
    delta: number
  ) => {
    const nextStock = Math.max(0, currentAvailable + delta);

    // 1. Optimistic Local Update
    setDepots((prev) =>
      prev.map((d) => {
        if (d.point_id !== depotId) return d;
        return {
          ...d,
          inventory: d.inventory?.map((inv) =>
            inv.resource_id === resourceId ? { ...inv, available_stock: nextStock } : inv
          ),
        };
      })
    );

    setFeedback({
      type: 'success',
      text: `Stock adjusted by ${delta > 0 ? `+${delta}` : delta} units!`,
    });

    // 2. Persist to Backend in background
    try {
      await helpingPointsApi.updateInventory(depotId, [
        { resource_id: resourceId, available_stock: nextStock },
      ]);
    } catch (err: any) {
      console.warn('Inventory sync error:', err.message);
    }
  };

  // Custom Direct Stock Value Edit
  const handleDirectEditSave = async () => {
    if (!editingItem) return;
    const { depotId, resourceId, val } = editingItem;
    const nextStock = Math.max(0, val);

    setDepots((prev) =>
      prev.map((d) => {
        if (d.point_id !== depotId) return d;
        return {
          ...d,
          inventory: d.inventory?.map((inv) =>
            inv.resource_id === resourceId ? { ...inv, available_stock: nextStock } : inv
          ),
        };
      })
    );

    setEditingItem(null);
    setFeedback({
      type: 'success',
      text: `Updated available stock to ${nextStock.toLocaleString()}!`,
    });

    try {
      await helpingPointsApi.updateInventory(depotId, [
        { resource_id: resourceId, available_stock: nextStock },
      ]);
    } catch (err: any) {
      console.warn('Direct edit error:', err.message);
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
        return { label: 'NDRF / Govt', bg: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'ngo':
        return { label: 'Red Cross / NGO', bg: 'bg-rose-100 text-rose-800 border-rose-200' };
      case 'hospital':
        return { label: 'Emergency Hospital', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'military':
        return { label: 'Army Corps', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
      default:
        return { label: 'Volunteers / Private', bg: 'bg-purple-100 text-purple-800 border-purple-200' };
    }
  };

  const getResourceIcon = (name: string = '') => {
    const lower = name.toLowerCase();
    if (lower.includes('water')) return <Droplets className="w-5 h-5 text-blue-600" />;
    if (lower.includes('food') || lower.includes('ration')) return <Utensils className="w-5 h-5 text-amber-600" />;
    if (lower.includes('medical') || lower.includes('kit')) return <Ambulance className="w-5 h-5 text-rose-600" />;
    return <Package className="w-5 h-5 text-slate-600" />;
  };

  // Summary Aggregates
  const totalWater = depots.reduce((sum, d) => {
    const item = d.inventory?.find((i) => i.resource_id === 1 || i.resource_name?.toLowerCase().includes('water'));
    return sum + (item?.available_stock ?? item?.total_stock ?? 0);
  }, 0);

  const totalFood = depots.reduce((sum, d) => {
    const item = d.inventory?.find((i) => i.resource_id === 2 || i.resource_name?.toLowerCase().includes('food'));
    return sum + (item?.available_stock ?? item?.total_stock ?? 0);
  }, 0);

  const totalMedical = depots.reduce((sum, d) => {
    const item = d.inventory?.find((i) => i.resource_id === 3 || i.resource_name?.toLowerCase().includes('medical'));
    return sum + (item?.available_stock ?? item?.total_stock ?? 0);
  }, 0);

  // Filtered Depots
  const filteredDepots = depots.filter((depot) => {
    const matchesAgency = selectedAgency === 'all' || depot.type === selectedAgency;
    const matchesSearch =
      searchQuery.trim() === '' ||
      depot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      depot.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      depot.inventory?.some((inv) =>
        inv.resource_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    return matchesAgency && matchesSearch;
  });

  return (
    <div className="h-full w-full flex flex-col overflow-y-auto bg-[#f8fafc] font-sans pb-20">
      {/* 1. Executive Top Header */}
      <header className="h-18 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-5">
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-2 text-base font-extrabold text-slate-700 hover:text-blue-600 transition-colors cursor-pointer py-2 px-3.5 rounded-xl hover:bg-slate-100"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Home</span>
          </button>
          <span className="text-slate-300 text-lg">|</span>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
                Helping Points & Regional Depots
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Multi-depot resource reserves, instant stock replenishment & dispatch readiness
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDepots}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-sm font-bold text-slate-700 transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsAddDepotOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black shadow-md shadow-blue-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Register Depot</span>
          </button>
        </div>
      </header>

      {/* 2. Feedback Notification */}
      {feedback && (
        <div
          className={`px-8 py-3 text-sm font-bold flex items-center justify-between shadow-xs transition-all ${
            feedback.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="underline font-black text-xs hover:opacity-80 cursor-pointer ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3. Global Readiness KPI Strip (Large, Crisp Typography) */}
      <section className="max-w-7xl w-full mx-auto px-8 pt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Water */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Droplets className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">
                Total Potable Water
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  {totalWater.toLocaleString()}
                </span>
                <span className="text-xs font-extrabold text-blue-600">Liters</span>
              </div>
            </div>
          </div>

          {/* Food */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Utensils className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">
                Food Packets & Rations
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  {totalFood.toLocaleString()}
                </span>
                <span className="text-xs font-extrabold text-amber-600">Packs</span>
              </div>
            </div>
          </div>

          {/* Medical */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <Heart className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">
                Emergency Medical Kits
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  {totalMedical.toLocaleString()}
                </span>
                <span className="text-xs font-extrabold text-rose-600">Kits</span>
              </div>
            </div>
          </div>

          {/* Active Depots */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">
                Distribution Network
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  {depots.length}
                </span>
                <span className="text-xs font-extrabold text-emerald-600">Hubs Online</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Controls Toolbar: Filter, Search & View Switcher */}
      <section className="max-w-7xl w-full mx-auto px-8 pt-8">
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Agency Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: `All Hubs (${depots.length})` },
              { id: 'govt', label: 'NDRF / Govt' },
              { id: 'hospital', label: 'Hospitals' },
              { id: 'military', label: 'Army Corps' },
              { id: 'ngo', label: 'NGOs' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedAgency(f.id)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                  selectedAgency === f.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search & View Toggle */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search hub or resource..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-600 focus:bg-white transition-all"
              />
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  viewMode === 'cards' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Cards</span>
              </button>

              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Master Table View"
              >
                <TableIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Master Table</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Main Content: Visual Cards vs Master Table */}
      <section className="max-w-7xl w-full mx-auto px-8 pt-6">
        {viewMode === 'cards' ? (
          /* A. VISUAL DEPOT CARDS WITH INLINE RESTOCK */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredDepots.map((depot) => {
              const badge = getAgencyBadge(depot.type);
              const totalStock = depot.inventory?.reduce((s, i) => s + (i.total_stock || 0), 0) || 1200;
              const availableStock = depot.inventory?.reduce((s, i) => s + (i.available_stock ?? i.total_stock ?? 0), 0) || 850;
              const utilPct = totalStock > 0 ? Math.round(((totalStock - availableStock) / totalStock) * 100) : 35;

              return (
                <div
                  key={depot.point_id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all space-y-5"
                >
                  {/* Depot Card Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <h4 className="text-xl font-black text-slate-900 tracking-tight">
                          {depot.name}
                        </h4>
                        <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                          #{depot.point_id}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span className={`text-xs font-black uppercase px-3 py-1 rounded-full border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        <span className="text-xs text-slate-400 font-mono font-semibold flex items-center gap-1">
                          <Compass className="w-3.5 h-3.5" />
                          {depot.lat.toFixed(4)}° N, {depot.lng.toFixed(4)}° E
                        </span>
                      </div>
                    </div>

                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-extrabold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Operational
                    </span>
                  </div>

                  {/* Utilization Meter */}
                  <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Capacity Utilization</span>
                      <span className="font-extrabold text-blue-700">
                        {utilPct}% Allocated ({availableStock.toLocaleString()} / {totalStock.toLocaleString()} units)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${utilPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Resource Inventory List (Spacious, Large Typography, Inline Editing) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-400 px-1">
                      <span>Reserve Inventory & One-Click Restock</span>
                      <span>Hourly Rate</span>
                    </div>

                    <div className="space-y-2.5">
                      {(!depot.inventory || depot.inventory.length === 0) ? (
                        <div className="p-4 text-center rounded-2xl bg-slate-50 text-slate-400 text-sm font-bold">
                          Standard emergency reserve active.
                        </div>
                      ) : (
                        depot.inventory.map((inv) => {
                          const isEditingThis =
                            editingItem?.depotId === depot.point_id &&
                            editingItem?.resourceId === inv.resource_id;

                          const currentStock = inv.available_stock ?? inv.total_stock ?? 0;

                          return (
                            <div
                              key={inv.resource_id}
                              className="p-3.5 rounded-2xl bg-slate-50/80 hover:bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                            >
                              {/* Resource Name & Icon */}
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                                  {getResourceIcon(inv.resource_name)}
                                </div>
                                <div>
                                  <p className="text-sm font-black text-slate-900 leading-tight">
                                    {inv.resource_name || `Resource #${inv.resource_id}`}
                                  </p>
                                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                                    Units: <span className="font-bold text-slate-700">{inv.unit || 'Standard'}</span> • Reserved: {inv.reserved_stock || 0}
                                  </p>
                                </div>
                              </div>

                              {/* Available Stock & Direct Quick Adjust Controls */}
                              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                                {/* Direct Stock Number or Edit Input */}
                                {isEditingThis ? (
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="number"
                                      value={editingItem.val}
                                      onChange={(e) =>
                                        setEditingItem({
                                          ...editingItem,
                                          val: Number(e.target.value),
                                        })
                                      }
                                      className="w-24 px-2 py-1 rounded-lg border-2 border-blue-600 text-sm font-black text-slate-900 outline-none"
                                    />
                                    <button
                                      onClick={handleDirectEditSave}
                                      className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                                      title="Save"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setEditingItem(null)}
                                      className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 cursor-pointer"
                                      title="Cancel"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-baseline gap-1.5">
                                    <span className="text-lg font-black text-emerald-600">
                                      {currentStock.toLocaleString()}
                                    </span>
                                    <button
                                      onClick={() =>
                                        setEditingItem({
                                          depotId: depot.point_id,
                                          resourceId: inv.resource_id,
                                          val: currentStock,
                                        })
                                      }
                                      className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                                      title="Type custom quantity"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}

                                {/* Replenish Rate Badge */}
                                <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                                  +{inv.replenish_rate || 25}/h
                                </span>

                                {/* Quick Increment Actions */}
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() =>
                                      handleQuickAdjust(depot.point_id, inv.resource_id, currentStock, 50)
                                    }
                                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-600 hover:text-white border border-slate-200 text-xs font-black text-slate-700 transition-all cursor-pointer shadow-xs"
                                    title="Add 50 units"
                                  >
                                    +50
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleQuickAdjust(depot.point_id, inv.resource_id, currentStock, 100)
                                    }
                                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-600 hover:text-white border border-slate-200 text-xs font-black text-slate-700 transition-all cursor-pointer shadow-xs"
                                    title="Add 100 units"
                                  >
                                    +100
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* B. MASTER INVENTORY TABLE (Full-Width, High-Contrast & Legible) */
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Distribution Hub</th>
                    <th className="py-4 px-6">Agency</th>
                    <th className="py-4 px-6">Resource Item</th>
                    <th className="py-4 px-6 text-right">In-Stock Available</th>
                    <th className="py-4 px-6 text-right">Reserved</th>
                    <th className="py-4 px-6 text-center">Hourly Rate</th>
                    <th className="py-4 px-6 text-center">Quick Stock Dispatch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm font-semibold text-slate-800">
                  {filteredDepots.flatMap((depot) =>
                    (depot.inventory || []).map((inv) => {
                      const badge = getAgencyBadge(depot.type);
                      const currentStock = inv.available_stock ?? inv.total_stock ?? 0;

                      return (
                        <tr
                          key={`${depot.point_id}-${inv.resource_id}`}
                          className="hover:bg-blue-50/40 transition-colors"
                        >
                          {/* Hub Name */}
                          <td className="py-4 px-6">
                            <p className="font-black text-slate-900">{depot.name}</p>
                            <p className="text-xs text-slate-400 font-mono">
                              #{depot.point_id} • [{depot.lat.toFixed(2)}, {depot.lng.toFixed(2)}]
                            </p>
                          </td>

                          {/* Agency */}
                          <td className="py-4 px-6">
                            <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                              {badge.label}
                            </span>
                          </td>

                          {/* Resource Name */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2.5">
                              {getResourceIcon(inv.resource_name)}
                              <div>
                                <p className="font-bold text-slate-900">
                                  {inv.resource_name || `Item #${inv.resource_id}`}
                                </p>
                                <p className="text-xs text-slate-400">Unit: {inv.unit || 'Standard'}</p>
                              </div>
                            </div>
                          </td>

                          {/* Available Stock */}
                          <td className="py-4 px-6 text-right">
                            <span className="text-base font-black text-emerald-600">
                              {currentStock.toLocaleString()}
                            </span>
                          </td>

                          {/* Reserved */}
                          <td className="py-4 px-6 text-right text-slate-500 font-mono">
                            {inv.reserved_stock || 0}
                          </td>

                          {/* Hourly Rate */}
                          <td className="py-4 px-6 text-center">
                            <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md">
                              +{inv.replenish_rate || 25}/h
                            </span>
                          </td>

                          {/* Quick Adjust Buttons */}
                          <td className="py-4 px-6">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() =>
                                  handleQuickAdjust(depot.point_id, inv.resource_id, currentStock, 50)
                                }
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-600 hover:text-white text-xs font-black text-slate-700 transition-all cursor-pointer shadow-xs"
                              >
                                +50
                              </button>
                              <button
                                onClick={() =>
                                  handleQuickAdjust(depot.point_id, inv.resource_id, currentStock, 100)
                                }
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-600 hover:text-white text-xs font-black text-slate-700 transition-all cursor-pointer shadow-xs"
                              >
                                +100
                              </button>
                              <button
                                onClick={() =>
                                  handleQuickAdjust(depot.point_id, inv.resource_id, currentStock, 500)
                                }
                                className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 hover:text-white text-xs font-black text-blue-700 transition-all cursor-pointer shadow-xs border border-blue-200"
                              >
                                +500
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* 6. Register New Hub Modal */}
      {isAddDepotOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-7 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Register Regional Depot</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Configure a new distribution point for relief coordination
                </p>
              </div>
              <button
                onClick={() => setIsAddDepotOpen(false)}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDepot} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Depot / Hub Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NDRF Sector 3 Depot"
                  value={newDepotName}
                  onChange={(e) => setNewDepotName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 text-sm font-bold text-slate-900 outline-none shadow-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Agency Organization
                </label>
                <select
                  value={newDepotType}
                  onChange={(e) => setNewDepotType(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 outline-none shadow-xs bg-white"
                >
                  <option value="govt">NDRF / Civil Defence (Govt)</option>
                  <option value="ngo">Indian Red Cross (NGO)</option>
                  <option value="hospital">Municipal Hospital (Hospital)</option>
                  <option value="military">Army Corps (Military)</option>
                  <option value="private">Volunteers / Relief Private</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newDepotLat}
                    onChange={(e) => setNewDepotLat(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newDepotLng}
                    onChange={(e) => setNewDepotLng(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddDepotOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Initialize Depot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepotsPage;

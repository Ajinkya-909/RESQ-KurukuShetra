import React from 'react';
import { useApp } from '../context/AppContext';
import {
  TrendingUp,
  Users,
  ShieldCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Split,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export const AnalyticsView: React.FC = () => {
  const { kpiData, planVersion, emergencySimulated } = useApp();

  const incidentTrendData = [
    { time: '08:00', active: 8, resolved: 2 },
    { time: '09:00', active: 14, resolved: 5 },
    { time: '10:00', active: 21, resolved: 9 },
    { time: '11:00', active: 27, resolved: 16 },
    { time: '11:45', active: emergencySimulated ? 28 : 27, resolved: 19 }
  ];

  const responseTimeData = [
    { hour: '07:00', time: 24 },
    { hour: '08:00', time: 19 },
    { hour: '09:00', time: 17 },
    { hour: '10:00', time: 14 },
    { hour: '11:00', time: 11 }
  ];

  const zoneDemandData = [
    { name: 'Zone A', demand: 92, covered: 88 },
    { name: 'Zone B', demand: 78, covered: 72 },
    { name: 'Zone C', demand: 64, covered: 60 },
    { name: 'Zone D', demand: emergencySimulated ? 92 : 38, covered: emergencySimulated ? 86 : 38 },
    { name: 'Zone E', demand: 41, covered: 41 }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-950 tracking-tight">
              Operational Analytics & Impact
            </h1>
            <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-0.5 rounded border border-blue-200">
              Live Stream
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time evaluation of coordination efficiency, response debt, and mission coverage
          </p>
        </div>

        <div className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-xs self-start sm:self-auto">
          Active Engine: <strong className="text-blue-600">{planVersion} Optimization</strong>
        </div>
      </div>

      {/* KPI Quad */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Critical Coverage</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900">94%</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center">
              <ArrowUpRight className="w-3 h-3" /> +15%
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-2 block">Above minimum safety baseline</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Avg Response Time</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900">11 min</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center">
              <ArrowDownRight className="w-3 h-3" /> -6 min
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-2 block">Previously 17 min</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Response Debt</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900">14 min</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              Controlled
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-2 block">Unmet triage latency index</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Duplicate Missions Intercepted</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900">4 Missions</span>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
              350 Kits Saved
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-2 block">Multi-agency redundancy avoided</span>
        </div>
      </div>

      {/* Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Active vs Resolved Incidents Trend */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Incident Progression & Resolution
              </h3>
              <span className="text-[11px] text-slate-400">Past 4 hours active timeline</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-slate-600">Active</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600">Resolved</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={incidentTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Area type="monotone" dataKey="active" stroke="#ef4444" fill="#fee2e2" strokeWidth={2} />
                <Area type="monotone" dataKey="resolved" stroke="#10b981" fill="#d1fae5" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Response Time Optimization */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Average Response Time (Minutes)
              </h3>
              <span className="text-[11px] text-slate-400">Continuous AI routing reduction</span>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              -35% Improvement
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Bar dataKey="time" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Demand vs Covered by Zone */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Zone Urgency Score vs Resource Coverage
              </h3>
              <span className="text-[11px] text-slate-400">Targeting 100% parity across all high-severity sectors</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                <span className="text-slate-600">Urgency Priority</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-slate-600">Allocated Coverage</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneDemandData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Bar dataKey="demand" fill="#1e293b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="covered" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

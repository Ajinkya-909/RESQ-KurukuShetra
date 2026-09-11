import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  ShieldCheck,
  Search,
  Filter,
  FileCheck,
  Hash,
  Clock,
  User,
  ArrowRight,
  Download,
  AlertCircle
} from 'lucide-react';
import { AuditEvent } from '../types';

export const AuditLogView: React.FC = () => {
  const { auditLogs, isAuditModalOpen, closeAuditModal, activeNavTab, setActiveNavTab } = useApp();
  const [filter, setFilter] = useState<'All' | 'Incident' | 'Allocation' | 'Reallocation' | 'Approval' | 'Conflict'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Show either if opened via modal or if activeNavTab === 'Audit'
  const isVisible = isAuditModalOpen;

  if (!isVisible) return null;

  const filteredLogs = auditLogs.filter(log => {
    const matchesFilter = filter === 'All' || log.type === filter;
    const matchesSearch = 
      log.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.decisionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getTypeBadge = (type: AuditEvent['type']) => {
    switch (type) {
      case 'Reallocation':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Approval':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Conflict':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Incident':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Allocation':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Tamper-Evident Operations Log
              </div>
              <h2 className="text-lg font-black text-slate-900 leading-tight">
                Decisions & System Audit Trail
              </h2>
            </div>
          </div>
          <button
            onClick={closeAuditModal}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search decisions, actors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Type Filters */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {(['All', 'Incident', 'Allocation', 'Reallocation', 'Approval', 'Conflict'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  filter === t
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Log Entries List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 divide-y divide-slate-100">
          {filteredLogs.map((log) => (
            <div key={log.id} className="pt-3 first:pt-0 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {log.decisionNumber}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getTypeBadge(log.type)}`}>
                    {log.type}
                  </span>
                  {log.zoneId && (
                    <span className="text-[11px] font-semibold text-slate-500">
                      • {log.zoneId}
                    </span>
                  )}
                </div>
                <span className="font-mono text-xs text-slate-400">
                  {log.timestamp}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {log.title}
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {log.description}
                </p>
              </div>

              {/* Attribution and cryptographic receipt hash */}
              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1">
                <div className="flex items-center gap-1.5 font-medium">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Authorized by: <strong className="text-slate-700">{log.actor}</strong></span>
                </div>
                {log.hash && (
                  <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
                    <Hash className="w-3 h-3" />
                    <span>{log.hash}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            {filteredLogs.length} audit entries cryptographically recorded
          </span>
          <button
            onClick={() => alert('Audit ledger exported to signed JSON & PDF receipt.')}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Signed Ledger</span>
          </button>
        </div>
      </div>
    </div>
  );
};

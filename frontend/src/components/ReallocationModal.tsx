import React from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export const ReallocationModal: React.FC = () => {
  const {
    isReallocationModalOpen,
    closeReallocationModal,
    reallocationProposal,
    approveReallocation,
    reallocationApproved
  } = useApp();

  if (!isReallocationModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  AI Optimization Engine
                </span>
                <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-200">
                  v4.2 Deterministic
                </span>
              </div>
              <h2 className="text-base font-black text-slate-900 leading-tight">
                Dynamic Reallocation Proposal
              </h2>
            </div>
          </div>
          <button
            onClick={closeReallocationModal}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Plan Comparison Metric Strip */}
        <div className="p-5 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border-b border-slate-100">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="text-[10px] font-bold uppercase text-slate-400">Current Plan</div>
              <div className="text-base font-black text-slate-800 mt-0.5">
                {reallocationProposal.planVersionOld}
              </div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-xs ring-1 ring-blue-500/20">
              <div className="text-[10px] font-bold uppercase text-blue-600">New Plan</div>
              <div className="text-base font-black text-blue-700 mt-0.5">
                {reallocationProposal.planVersionNew}
              </div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="text-[10px] font-bold uppercase text-slate-400">Resources Moved</div>
              <div className="text-base font-black text-slate-800 mt-0.5">
                {reallocationProposal.resourcesMoved} units
              </div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-xs">
              <div className="text-[10px] font-bold uppercase text-emerald-600">Critical Coverage</div>
              <div className="text-base font-black text-emerald-700 mt-0.5 flex items-center justify-center gap-1">
                <span>{reallocationProposal.criticalCoverageOld}%</span>
                <ArrowRight className="w-3.5 h-3.5" />
                <span>{reallocationProposal.criticalCoverageNew}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Body: Before vs After Comparison */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* BEFORE */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <div className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>BEFORE (Plan v3)</span>
              </div>
              <div className="space-y-2">
                {reallocationProposal.before.map((item, idx) => (
                  <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                    <span className="font-bold text-slate-800">{item.resource}</span>
                    <span className="text-slate-500 font-medium">→ {item.destination}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AFTER */}
            <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200/80">
              <div className="text-xs font-black uppercase tracking-wider text-blue-700 mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span>AFTER (Plan v4 Proposal)</span>
              </div>
              <div className="space-y-2">
                {reallocationProposal.after.map((item, idx) => (
                  <div key={idx} className="bg-white p-2.5 rounded-lg border border-blue-200 text-xs flex items-center justify-between shadow-xs">
                    <span className="font-bold text-slate-900">{item.resource}</span>
                    <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded">
                      → {item.destination}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rationale Section */}
          <div className="bg-amber-50/60 rounded-xl border border-amber-200/80 p-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>WHY DID THE PLAN CHANGE?</span>
            </h3>

            <div className="text-xs space-y-2">
              <div className="font-bold text-slate-900">
                {reallocationProposal.rationale.priorityChange}
              </div>

              <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200/60">
                <span className="text-[11px] font-bold text-slate-700 block mb-1">New Verified Evidence:</span>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600 text-[11px]">
                  {reallocationProposal.rationale.evidence.map((ev, i) => (
                    <li key={i}>{ev}</li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{reallocationProposal.rationale.protection}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            onClick={closeReallocationModal}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 transition-colors cursor-pointer"
          >
            Reject Plan
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                alert('Plan parameters opened in fine-tuning simulator.');
              }}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              Modify Weights
            </button>

            <button
              id="btn-approve-reallocation"
              onClick={approveReallocation}
              disabled={reallocationApproved}
              className={`px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                reallocationApproved
                  ? 'bg-emerald-600 text-white cursor-default'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-blue-500/20'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{reallocationApproved ? 'Plan v4 Approved & Live' : 'Approve Plan v4'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

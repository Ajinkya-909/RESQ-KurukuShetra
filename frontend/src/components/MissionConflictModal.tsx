import React from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  CheckCircle2,
  Package,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

export const MissionConflictModal: React.FC = () => {
  const {
    isConflictModalOpen,
    closeConflictModal,
    conflictData,
    approveConflictRedirect,
    conflictResolved
  } = useApp();

  if (!isConflictModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 border-b border-amber-100 flex items-center justify-between bg-amber-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded">
                  Semantic Conflict Detection
                </span>
                <span className="text-[10px] text-amber-700 font-bold">
                  {conflictData.confidence}% Confidence
                </span>
              </div>
              <h2 className="text-base font-black text-slate-900 leading-tight mt-0.5">
                MISSION OVERLAP DETECTED
              </h2>
            </div>
          </div>
          <button
            onClick={closeConflictModal}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conflict Data Body */}
        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Overlapping Agencies */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Agency A */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                Agency A Dispatch
              </div>
              <div className="font-bold text-slate-900 text-sm mt-1">
                {conflictData.agencyA.name}
              </div>
              <div className="mt-2 text-slate-600">
                Supply: <strong className="text-slate-900">{conflictData.agencyA.amount} {conflictData.agencyA.supply}</strong>
              </div>
              <div className="text-slate-600 mt-0.5">
                Destination: <span className="font-semibold text-blue-600">{conflictData.agencyA.destination}</span>
              </div>
            </div>

            {/* Agency B */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                Agency B Dispatch
              </div>
              <div className="font-bold text-slate-900 text-sm mt-1">
                {conflictData.agencyB.name}
              </div>
              <div className="mt-2 text-slate-600">
                Supply: <strong className="text-slate-900">{conflictData.agencyB.amount} {conflictData.agencyB.supply}</strong>
              </div>
              <div className="text-slate-600 mt-0.5">
                Destination: <span className="font-semibold text-blue-600">{conflictData.agencyB.destination}</span>
              </div>
            </div>
          </div>

          {/* Mathematical Overlap Calculation Strip */}
          <div className="bg-rose-50/60 p-3.5 rounded-xl border border-rose-200/80 text-xs">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Zone C Demand</span>
                <div className="text-base font-black text-slate-900 mt-0.5">
                  {conflictData.zoneDemand} kits
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Committed Total</span>
                <div className="text-base font-black text-rose-600 mt-0.5">
                  {conflictData.committedTotal} kits
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-rose-600">Potential Excess</span>
                <div className="text-base font-black text-rose-700 mt-0.5">
                  +{conflictData.potentialExcess} kits
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-600 mt-2 text-center">
              Two concurrent NGO convoys scheduled to deliver to the same Greenfield depot, exceeding local staging storage.
            </p>
          </div>

          {/* Suggested Redirect Section */}
          <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-blue-900">
                SUGGESTED REDIRECT
              </h3>
            </div>

            <div className="space-y-2 text-xs">
              {conflictData.suggestedRedirects.map((redir, index) => (
                <div key={index} className="bg-white p-3 rounded-lg border border-blue-200/80 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-600" />
                    <span className="font-extrabold text-slate-900 text-sm">
                      {redir.amount} Food Kits
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md">
                    <span>→ {redir.zone} ({redir.zoneName})</span>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-500 mt-2.5">
              Redirecting prevents food spoilage and proactively addresses urgent caloric intake in secondary flooded sectors.
            </p>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={closeConflictModal}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 transition-colors cursor-pointer"
          >
            Dismiss
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alert('Custom redirect adjustment mode initiated.')}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              Modify
            </button>

            <button
              id="btn-approve-redirect"
              onClick={approveConflictRedirect}
              disabled={conflictResolved}
              className={`px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                conflictResolved
                  ? 'bg-emerald-600 text-white cursor-default'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-blue-500/20'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{conflictResolved ? 'Redirect Executed' : 'Approve Redirect'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

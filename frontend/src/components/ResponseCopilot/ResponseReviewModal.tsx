import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2, AlertTriangle, MapPin, Check, XCircle, Brain } from 'lucide-react';
import { CopilotIncident } from '../../types';
import { allocationsApi } from '../../api';

interface ResponseReviewModalProps {
  isOpen: boolean;
  incident: CopilotIncident | null;
  onClose: () => void;
  onResponseApproved: () => void;
}

export const ResponseReviewModal: React.FC<ResponseReviewModalProps> = ({
  isOpen,
  incident,
  onClose,
  onResponseApproved,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !incident) return null;

  const handleApprove = async () => {
    try {
      setSubmitting(true);
      setError(null);

      // Call existing allocation approval endpoint if allocations exist for this incident
      if (incident.allocation_ids && incident.allocation_ids.length > 0) {
        await allocationsApi.approve(incident.scenario_id, incident.allocation_ids);
      }

      onResponseApproved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to approve response allocation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    try {
      setSubmitting(true);
      setError(null);

      if (incident.allocation_ids && incident.allocation_ids.length > 0) {
        await allocationsApi.reject(incident.scenario_id, incident.allocation_ids, 'Rejected by commander');
      }

      onResponseApproved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to reject response allocation');
    } finally {
      setSubmitting(false);
    }
  };

  const aiBrief = incident.ai_brief;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden font-sans flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {incident.severity_level}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Priority Score: {incident.priority_score}
                </span>
              </div>
              <h3 className="text-lg font-black text-white">{incident.name}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Incident Situation Summary */}
          <div className="space-y-2">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>SITUATION SUMMARY — {incident.sector_name}</span>
            </div>

            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">SOS Reports</p>
                <p className="text-lg font-black text-rose-600">{incident.report_count}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">People Affected</p>
                <p className="text-lg font-black text-blue-600">{incident.affected_people}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Medical Cases</p>
                <p className="text-lg font-black text-amber-600">{incident.medical_cases}</p>
              </div>
            </div>
          </div>

          {/* Recommended Response */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>RESQ RECOMMENDS</span>
            </h4>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
              <p className="text-xs font-bold text-slate-700">
                Source Depot:{' '}
                <span className="font-extrabold text-emerald-800">{incident.recommended_depot}</span>
              </p>

              <div className="flex flex-wrap gap-2">
                {incident.recommended_resources.map((res, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 font-black text-xs text-emerald-900 shadow-2xs flex items-center gap-1.5"
                  >
                    <span>{res.resource_name}</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[11px]">
                      ×{res.quantity}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 🧠 RESQ AI Brief & Grounded Explanation */}
          {aiBrief && (
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-black text-indigo-900">
                  <Brain className="w-4 h-4 text-indigo-600" />
                  <span>🧠 AI RESPONSE EXPLANATION</span>
                </div>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                  {aiBrief.ai_available ? (aiBrief.model_used || 'Gemini 2.5 Flash') : 'System Grounding'}
                </span>
              </div>
              <p className="text-slate-700 font-medium leading-relaxed">
                {aiBrief.response_explanation}
              </p>
              <div className="pt-1 text-[11px] text-indigo-800 font-medium">
                <strong>Urgency Factor:</strong> {aiBrief.urgency_explanation}
              </div>
            </div>
          )}

          {/* Ground-Truth WHY? Reasoning */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
              # WHY IS THIS RECOMMENDED?
            </h4>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2 font-medium text-slate-700">
              {incident.ground_truth_reasons.map((reason, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold shrink-0">✓</span>
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            disabled={submitting}
            onClick={handleReject}
            className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <XCircle className="w-4 h-4 text-slate-500" />
            <span>REJECT</span>
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={handleApprove}
            className="flex-1 py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-black shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{submitting ? 'Processing...' : 'APPROVE RESPONSE'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

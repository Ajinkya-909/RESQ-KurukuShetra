import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Zap,
  FileText,
  Brain,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export const NewEmergencyModal: React.FC = () => {
  const {
    isNewEmergencyModalOpen,
    closeNewEmergencyModal,
    executeEmergencySimulation,
    openReallocationModal,
    emergencySimulated
  } = useApp();

  const [currentStep, setCurrentStep] = useState<number>(emergencySimulated ? 4 : 0);
  const [isSimulating, setIsSimulating] = useState(false);

  const steps = [
    { label: 'Report received', icon: FileText, desc: 'Incoming distress report from Mapleton Field Unit' },
    { label: 'Needs extracted', icon: Brain, desc: 'AI parsing: 30 trapped, 8 injured, watercraft needed' },
    { label: 'Priority recalculated', icon: Zap, desc: 'Zone D priority surged from 38 → 92 (CRITICAL)' },
    { label: 'Allocation re-evaluated', icon: RefreshCw, desc: 'Deterministic solver checking constraints' },
    { label: 'Reallocation proposed', icon: ShieldAlert, desc: 'Plan v4 generated for human approval' }
  ];

  const handleStartSimulation = () => {
    setIsSimulating(true);
    setCurrentStep(0);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < steps.length) {
        setCurrentStep(step);
      } else {
        clearInterval(interval);
        setIsSimulating(false);
        executeEmergencySimulation();
      }
    }, 700);
  };

  useEffect(() => {
    if (emergencySimulated) {
      setCurrentStep(4);
    }
  }, [emergencySimulated]);

  if (!isNewEmergencyModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-rose-100 flex items-center justify-between bg-rose-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-rose-800 bg-rose-200/60 px-2 py-0.5 rounded inline-block">
                Emergency Simulation Protocol
              </div>
              <h2 className="text-base font-black text-slate-900 leading-tight mt-0.5">
                NEW EMERGENCY REPORT
              </h2>
            </div>
          </div>
          <button
            onClick={closeNewEmergencyModal}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Report Content */}
        <div className="p-5 space-y-4">
          {/* Transcript card */}
          <div className="bg-slate-900 text-slate-100 p-4 rounded-xl border border-slate-800 text-xs font-mono relative">
            <div className="flex items-center justify-between text-slate-400 text-[10px] mb-2 uppercase tracking-wide border-b border-slate-800 pb-1.5">
              <span>Verified Dispatch Transcript</span>
              <span className="text-rose-400 font-bold animate-pulse">● PRIORITY 1</span>
            </div>
            <p className="leading-relaxed text-slate-200">
              “School shelter in Mapleton is flooding. <br />
              <strong>30 people trapped.</strong> <br />
              <strong>8 injured.</strong> <br />
              Road access deteriorating rapidly.”
            </p>
          </div>

          {/* Stepper Pipeline */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
              <span>Decision Pipeline Execution</span>
              {isSimulating && (
                <span className="text-blue-600 font-semibold animate-pulse">
                  Processing...
                </span>
              )}
            </div>

            {steps.map((s, idx) => {
              const StepIcon = s.icon;
              const isCompleted = currentStep > idx || emergencySimulated;
              const isCurrent = currentStep === idx && isSimulating;

              return (
                <div key={idx} className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                    isCompleted
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-blue-600 border-blue-600 text-white animate-bounce'
                      : 'bg-white border-slate-300 text-slate-400'
                  }`}>
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <StepIcon className="w-3.5 h-3.5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${
                        isCompleted ? 'text-slate-900' : isCurrent ? 'text-blue-600' : 'text-slate-400'
                      }`}>
                        {s.label}
                      </span>
                      {idx === 2 && (isCompleted || isCurrent) && (
                        <span className="text-[10px] font-black bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">
                          Zone D: 38 → 92
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 block truncate">
                      {s.desc}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Alert: URGENT REPLAN REQUIRED */}
          {(emergencySimulated || currentStep >= 4) && (
            <div className="bg-rose-50 border-2 border-rose-500 rounded-xl p-3.5 text-center animate-pulse">
              <div className="text-xs font-black text-rose-900 uppercase tracking-wider">
                🚨 URGENT REPLAN REQUIRED
              </div>
              <p className="text-[11px] text-rose-700 mt-1">
                Zone D priority surged to 92. Immediate reallocation of swiftwater boats and trauma medical units needed.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={closeNewEmergencyModal}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 transition-colors cursor-pointer"
          >
            Close
          </button>

          {!emergencySimulated && currentStep < 4 ? (
            <button
              onClick={handleStartSimulation}
              disabled={isSimulating}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-rose-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>{isSimulating ? 'Injecting Telemetry...' : 'Inject Emergency'}</span>
            </button>
          ) : (
            <button
              id="btn-review-reallocation"
              onClick={() => {
                closeNewEmergencyModal();
                openReallocationModal();
              }}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>Review Reallocation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

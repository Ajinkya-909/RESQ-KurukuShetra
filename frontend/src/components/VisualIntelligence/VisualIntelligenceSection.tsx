import React, { useState } from 'react';
import { Camera, Eye, Layers, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { VisualEvidence } from '../../types';

interface VisualIntelligenceSectionProps {
  visualEvidence?: VisualEvidence | null;
  imageUrl?: string | null;
  imageData?: string | null;
}

export const VisualIntelligenceSection: React.FC<VisualIntelligenceSectionProps> = ({
  visualEvidence,
  imageUrl,
  imageData,
}) => {
  const [showAnnotated, setShowAnnotated] = useState(true);

  const displayImage = showAnnotated && visualEvidence?.annotated_image
    ? visualEvidence.annotated_image
    : imageUrl || imageData || visualEvidence?.annotated_image || null;

  if (!displayImage && (!visualEvidence || !visualEvidence.detections || visualEvidence.detections.length === 0)) {
    return null;
  }

  const detections = visualEvidence?.detections || [];
  const modelName = visualEvidence?.model || 'YOLO Object Detector';

  return (
    <div className="p-4 bg-slate-900 text-white rounded-2xl border border-indigo-900/60 shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black tracking-wider uppercase flex items-center gap-1.5 text-indigo-200">
              <span>Visual Intelligence</span>
              <span className="text-[9px] bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full font-bold border border-indigo-400/30">
                {modelName}
              </span>
            </h4>
            <p className="text-[10px] text-slate-400 font-medium">YOLO Field Evidence & Bounding Boxes</p>
          </div>
        </div>

        {visualEvidence?.annotated_image && (imageUrl || imageData) && (
          <button
            type="button"
            onClick={() => setShowAnnotated((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/50 text-indigo-300 transition-colors cursor-pointer"
          >
            {showAnnotated ? <Layers className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showAnnotated ? 'Showing AI Bounding Boxes' : 'Show Original Photo'}</span>
          </button>
        )}
      </div>

      {/* Image View */}
      {displayImage && (
        <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-black max-h-64 flex items-center justify-center">
          <img
            src={displayImage}
            alt="Disaster Visual Evidence"
            className="w-full h-auto max-h-64 object-contain"
          />
          {visualEvidence?.inference_time_ms && (
            <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-300 border border-white/10">
              Inference: {visualEvidence.inference_time_ms}ms
            </div>
          )}
        </div>
      )}

      {/* Detected Objects Badges */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          Detected Field Evidence ({detections.length})
        </span>

        {detections.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {detections.map((det, idx) => {
              const confPct = Math.round(det.confidence * 100);
              return (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-800/60 text-xs font-bold text-indigo-200"
                >
                  <span className="uppercase text-[11px] tracking-wide text-white">{det.class_name}</span>
                  <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">
                    {confPct}% conf
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-slate-400 italic">
            No supported objects detected above threshold.
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
        <span>
          Informational visual evidence. Severity scoring and OR-Tools allocations remain governed by system optimization.
        </span>
      </div>
    </div>
  );
};

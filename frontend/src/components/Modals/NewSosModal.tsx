import React, { useState } from 'react';
import { X, AlertTriangle, Radio, Send, MapPin } from 'lucide-react';
import { reportsApi } from '../../api';
import { Report } from '../../types';

interface NewSosModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenarioId: string;
  onReportSubmitted: (report: Report) => void;
}

export const NewSosModal: React.FC<NewSosModalProps> = ({
  isOpen,
  onClose,
  scenarioId,
  onReportSubmitted,
}) => {
  const [rawText, setRawText] = useState('');
  const [lat, setLat] = useState(18.5280);
  const [lng, setLng] = useState(73.8650);
  const [source, setSource] = useState('citizen');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) {
      setError('Emergency transcript is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await reportsApi.submit(scenarioId, {
        lat: Number(lat),
        lng: Number(lng),
        raw_text: rawText.trim(),
        source,
      });
      onReportSubmitted(res);
      onClose();
      setRawText('');
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch SOS field alert');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-6 py-5 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Ingest Citizen SOS Report</h3>
              <p className="text-xs text-rose-800 font-medium">
                Direct transmission into AI triage & Verification pipeline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-rose-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Transcript */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Emergency Message / Call Transcript <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="e.g. 5 families trapped in 2nd floor near Sangamwadi river edge. Need drinking water and life jackets immediately..."
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Coordinates Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>Latitude</span>
              </label>
              <input
                type="number"
                step="0.0001"
                required
                value={lat}
                onChange={(e) => setLat(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 text-sm font-bold text-slate-900 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>Longitude</span>
              </label>
              <input
                type="number"
                step="0.0001"
                required
                value={lng}
                onChange={(e) => setLng(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 text-sm font-bold text-slate-900 outline-none"
              />
            </div>
          </div>

          {/* Source Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Source Ingestion Channel
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'citizen', label: 'Citizen Phone' },
                { id: 'first_responder', label: 'First Responder' },
                { id: 'social_media', label: 'Social / Radio' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSource(s.id)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    source === s.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-extrabold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white text-sm font-black shadow-lg shadow-rose-500/20 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Transmitting...' : 'Dispatch SOS Alert'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

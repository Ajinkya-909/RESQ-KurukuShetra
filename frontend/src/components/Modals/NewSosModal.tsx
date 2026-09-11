import React, { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, Send, MapPin, CheckCircle2, RotateCcw, Camera, Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import L from 'leaflet';
import { reportsApi } from '../../api';
import { Report } from '../../types';
import { DEFAULT_MAP_CENTER, VOYAGER_LIGHT_TILES } from '../Map/mapStyles';
import { getDroppedPinLeafletIcon } from '../Map/markerIcons';

interface NewSosModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenarioId: string;
  onReportSubmitted: (report: Report) => void;
}

interface SosMapPickerProps {
  lat: number | null;
  lng: number | null;
  onSelectLocation: (lat: number, lng: number) => void;
}

const SosMapPicker: React.FC<SosMapPickerProps> = ({ lat, lng, onSelectLocation }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialCenter: [number, number] =
      lat !== null && lng !== null
        ? [lat, lng]
        : [DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng];

    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer(VOYAGER_LIGHT_TILES.url, {
      attribution: VOYAGER_LIGHT_TILES.attribution,
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      onSelectLocation(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;

    // Leaflet modal size recalculation fixes
    const timer1 = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    const timer2 = setTimeout(() => {
      map.invalidateSize();
    }, 300);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Update marker position when lat / lng changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (lat !== null && lng !== null) {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const marker = L.marker([lat, lng], {
          icon: getDroppedPinLeafletIcon('critical'),
        }).addTo(map);
        markerRef.current = marker;
      }
    } else {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    }
  }, [lat, lng]);

  return (
    <div className="relative w-full h-[260px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner group">
      <div ref={containerRef} className="w-full h-full cursor-crosshair z-0" />
    </div>
  );
};

export const NewSosModal: React.FC<NewSosModalProps> = ({
  isOpen,
  onClose,
  scenarioId,
  onReportSubmitted,
}) => {
  const [rawText, setRawText] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [channelId, setChannelId] = useState<'citizen' | 'first_responder' | 'social_radio'>('citizen');
  const [neededResources, setNeededResources] = useState<string[]>([]);
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleResource = (resId: string) => {
    setNeededResources((prev) =>
      prev.includes(resId) ? prev.filter((r) => r !== resId) : [...prev, resId]
    );
  };

  const handleClearPin = () => {
    setLat(null);
    setLng(null);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImageError(null);
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setImageError('Unsupported image format. Please select JPG, PNG, or WEBP.');
      return;
    }

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setImageError('Image file size exceeds maximum limit of 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setImageData(event.target.result);
        setImageFileName(file.name);
      }
    };
    reader.onerror = () => {
      setImageError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageData(null);
    setImageFileName(null);
    setImageError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) {
      setError('Emergency transcript is required.');
      return;
    }

    if (lat === null || lng === null) {
      setError('Please pin the SOS location on the map.');
      return;
    }

    const source = channelId === 'citizen' ? 'field_report' : 'agency_update';

    try {
      setSubmitting(true);
      setError(null);
      const res = await reportsApi.submit(scenarioId, {
        lat: Number(lat),
        lng: Number(lng),
        raw_text: rawText.trim(),
        source,
        needed_resources: neededResources,
        image_data: imageData || undefined,
      });
      onReportSubmitted(res);
      onClose();
      setRawText('');
      setLat(null);
      setLng(null);
      setNeededResources([]);
      setImageData(null);
      setImageFileName(null);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch SOS field alert');
    } finally {
      setSubmitting(false);
    }
  };

  const resourceOptions = [
    { id: 'water', label: '💧 Drinking Water' },
    { id: 'food', label: '📦 Food Packets' },
    { id: 'medical', label: '🩹 Medical Kits' },
    { id: 'rescue_boat', label: '🚤 Rescue Boat' },
    { id: 'rescue_team', label: '🦺 Rescue Team' },
    { id: 'ambulance', label: '🚑 Ambulance' },
    { id: 'shelter', label: '⛺ Tents / Shelter' },
  ];

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden font-sans max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-rose-50 border-b border-rose-100 flex items-center justify-between shrink-0">
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
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

          {/* Target Required Resources Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Explicitly Required Resources</span>
              <span className="text-[10px] text-slate-400 font-medium lowercase">(optional micro-target)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {resourceOptions.map((res) => {
                const selected = neededResources.includes(res.id);
                return (
                  <button
                    key={res.id}
                    type="button"
                    onClick={() => toggleResource(res.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      selected
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {res.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SOS Location Section with Interactive Map */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-600" />
                <span>SOS Location</span>
                <span className="text-rose-500">*</span>
              </label>

              {lat !== null && lng !== null ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Location pinned</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleClearPin}
                    className="text-[11px] font-bold text-slate-500 hover:text-rose-600 flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Clear location pin"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear Pin</span>
                  </button>
                </div>
              ) : (
                <span className="text-xs font-medium text-slate-500">
                  Click on the map to pin the emergency location
                </span>
              )}
            </div>

            {/* Interactive Leaflet Map */}
            <SosMapPicker
              lat={lat}
              lng={lng}
              onSelectLocation={(selectedLat, selectedLng) => {
                setLat(selectedLat);
                setLng(selectedLng);
                if (error) setError(null);
              }}
            />

            {/* Coordinates Read-Only Display */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-slate-400 font-sans font-bold uppercase tracking-wider text-[10px] mr-1.5">Latitude:</span>
                  <span className="font-bold text-slate-800">
                    {lat !== null ? lat.toFixed(6) : 'Not selected'}
                  </span>
                </div>
                <div className="h-3 w-px bg-slate-300" />
                <div>
                  <span className="text-slate-400 font-sans font-bold uppercase tracking-wider text-[10px] mr-1.5">Longitude:</span>
                  <span className="font-bold text-slate-800">
                    {lng !== null ? lng.toFixed(6) : 'Not selected'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Optional Field Image Upload (YOLO Visual Intelligence) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-indigo-600" />
                <span>Field Disaster Photo</span>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">OPTIONAL</span>
              </span>
              <span className="text-[11px] font-medium text-slate-400">YOLO Visual Intelligence</span>
            </label>

            {imageData ? (
              <div className="relative rounded-2xl overflow-hidden border border-indigo-200 bg-slate-900 group">
                <img
                  src={imageData}
                  alt="Field Evidence Preview"
                  className="w-full h-44 object-cover object-center group-hover:opacity-90 transition-opacity"
                />
                <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-white shadow-lg">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="max-w-[140px] truncate">{imageFileName || 'Image Attached'}</span>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="ml-1 p-0.5 text-rose-300 hover:text-rose-100 transition-colors cursor-pointer"
                    title="Remove attached photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <label className="relative flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl cursor-pointer bg-slate-50 hover:bg-indigo-50/40 transition-all group">
                <div className="flex flex-col items-center justify-center pt-3 pb-3 text-center px-4">
                  <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-600 group-hover:scale-110 transition-all mb-1" />
                  <p className="text-xs font-bold text-slate-700">
                    <span className="text-indigo-600">Click to upload photo</span> or drag & drop
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    JPG, PNG, WEBP up to 5MB (Analyzed by YOLO object detector)
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
              </label>
            )}

            {imageError && (
              <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                <span>{imageError}</span>
              </div>
            )}
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
                { id: 'social_radio', label: 'Social / Radio' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setChannelId(s.id as any)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    channelId === s.id
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


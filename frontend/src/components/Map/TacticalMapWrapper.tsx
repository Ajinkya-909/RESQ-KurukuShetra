import React, { useState } from 'react';
import { useLoadScript } from '@react-google-maps/api';
import { GoogleMapEngine } from './GoogleMapEngine';
import { LeafletMapEngine } from './LeafletMapEngine';
import { TacticalMapProps, MapLayersState } from './types';
import { Layers, Eye, EyeOff } from 'lucide-react';

const GOOGLE_MAPS_LIBRARIES: ('places' | 'geometry')[] = ['geometry'];

export const TacticalMapWrapper: React.FC<TacticalMapProps> = (props) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const hasApiKey = Boolean(apiKey.trim());

  // Engine selection state: 'google' or 'leaflet' (defaults to Leaflet for reliable, zero-quota map rendering)
  const [selectedEngine, setSelectedEngine] = useState<'google' | 'leaflet'>('leaflet');

  // Default internal layer toggle state if not controlled externally
  const [internalLayers, setInternalLayers] = useState<MapLayersState>({
    zones: true,
    depots: true,
    reports: true,
    supplyLines: true,
  });

  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const activeLayers = props.activeLayers || internalLayers;

  const toggleLayer = (layer: keyof MapLayersState) => {
    setInternalLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  // Google Maps loader
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
    preventGoogleFontsLoading: true,
  });

  React.useEffect(() => {
    if (loadError) {
      setSelectedEngine('leaflet');
    }
  }, [loadError]);

  // Render Google Maps if selected and loaded, else fallback to Leaflet cleanly without error warnings
  const renderGoogleMaps = selectedEngine === 'google' && isLoaded && !loadError;

  return (
    <div className={`relative w-full h-full overflow-hidden ${props.className || ''}`}>
      {/* Map Canvas */}
      {renderGoogleMaps ? (
        <GoogleMapEngine {...props} activeLayers={activeLayers} />
      ) : (
        <LeafletMapEngine {...props} activeLayers={activeLayers} />
      )}

      {/* Engine Status & Layer Controls Overlay (Top Right) - Clean Light Style */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
        {/* Interactive Engine Switcher Toggle Button */}
        <div className="flex items-center gap-1 bg-white/95 p-1 rounded-full border border-slate-200 shadow-md backdrop-blur-md">
          <button
            onClick={() => setSelectedEngine('google')}
            className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              selectedEngine === 'google'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${selectedEngine === 'google' ? 'bg-white' : 'bg-blue-600'}`} />
            <span>Google Maps</span>
          </button>

          <button
            onClick={() => setSelectedEngine('leaflet')}
            className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              selectedEngine === 'leaflet'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${selectedEngine === 'leaflet' ? 'bg-white' : 'bg-emerald-600'}`} />
            <span>Leaflet Map</span>
          </button>
        </div>

        {/* Layers Button */}
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/95 hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 shadow-md backdrop-blur-md transition-colors cursor-pointer"
            title="Toggle Map Layers"
          >
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Map Layers</span>
          </button>

          {/* Layers Dropdown Menu */}
          {showLayerMenu && (
            <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white border border-slate-200 p-3 shadow-2xl text-xs space-y-1 z-30">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                Visible Layers
              </p>

              <button
                onClick={() => toggleLayer('zones')}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-slate-50 text-slate-700 font-medium transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <span>Disaster Zones</span>
                </div>
                {activeLayers.zones ? (
                  <Eye className="w-4 h-4 text-emerald-600" />
                ) : (
                  <EyeOff className="w-4 h-4 text-slate-400" />
                )}
              </button>

              <button
                onClick={() => toggleLayer('depots')}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-slate-50 text-slate-700 font-medium transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-600" />
                  <span>Helping Depots</span>
                </div>
                {activeLayers.depots ? (
                  <Eye className="w-4 h-4 text-emerald-600" />
                ) : (
                  <EyeOff className="w-4 h-4 text-slate-400" />
                )}
              </button>

              <button
                onClick={() => toggleLayer('reports')}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-slate-50 text-slate-700 font-medium transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500" />
                  <span>SOS Reports</span>
                </div>
                {activeLayers.reports ? (
                  <Eye className="w-4 h-4 text-emerald-600" />
                ) : (
                  <EyeOff className="w-4 h-4 text-slate-400" />
                )}
              </button>

              <button
                onClick={() => toggleLayer('supplyLines')}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-slate-50 text-slate-700 font-medium transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-cyan-500" />
                  <span>Supply Lines</span>
                </div>
                {activeLayers.supplyLines ? (
                  <Eye className="w-4 h-4 text-emerald-600" />
                ) : (
                  <EyeOff className="w-4 h-4 text-slate-400" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TacticalMapWrapper;

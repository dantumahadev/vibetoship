/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import { useState, useEffect, useRef } from "react";
import { MapContainer as LeafletMap, TileLayer, Marker, Circle, Popup, useMap, useMapEvents } from "react-leaflet";
import { Issue } from "../types";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Layers, MapPin, X, AlertTriangle, CheckCircle, Clock, Wrench, ChevronRight, LocateFixed, Loader2 } from "lucide-react";

interface MapContainerProps {
  issues: Issue[];
  onSelectCoords: (lat: number, lng: number) => void;
}

// Category color config
const CATEGORY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  roads:  { color: "#F36B4F", bg: "#FEF0EC", label: "Road Damage" },
  water:  { color: "#5284E3", bg: "#EEF3FD", label: "Water Leak" },
  waste:  { color: "#55A971", bg: "#EEF8F2", label: "Waste" },
  lights: { color: "#DFB32F", bg: "#FDF8E8", label: "Street Lights" },
  civic:  { color: "#8E5EC7", bg: "#F4EFFE", label: "Civic Hazard" },
};

const getCategoryConfig = (category: string) => {
  const key = (category || "").toLowerCase();
  for (const [k, v] of Object.entries(CATEGORY_CONFIG)) {
    if (key.includes(k)) return v;
  }
  return CATEGORY_CONFIG.civic;
};

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  reported:    { icon: <AlertTriangle className="w-3 h-3" />, label: "Reported",    color: "text-amber-600 bg-amber-50" },
  verified:    { icon: <CheckCircle  className="w-3 h-3" />, label: "Verified",    color: "text-blue-600 bg-blue-50" },
  "in-progress": { icon: <Wrench    className="w-3 h-3" />, label: "In Progress", color: "text-purple-600 bg-purple-50" },
  resolved:    { icon: <CheckCircle  className="w-3 h-3" />, label: "Resolved",    color: "text-green-600 bg-green-50" },
};

// Custom hook to handle click events on the map
function MapClickHandler({
  onSelectCoords,
  onMapClick,
}: {
  onSelectCoords: (lat: number, lng: number) => void;
  onMapClick?: () => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick?.();
      onSelectCoords(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Auto-fit bounds to show all issues
function BoundsFitter({ issues }: { issues: Issue[] }) {
  const map = useMap();
  useEffect(() => {
    if (issues.length === 0) return;
    const bounds = L.latLngBounds(issues.map(i => [i.location.lat, i.location.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [issues.length]);
  return null;
}

// Controller component: flies map to provided latlng target
function FlyToController({ target }: { target: [number, number] | null }) {
  const map = useMap();
  const prevTarget = useRef<[number, number] | null>(null);
  useEffect(() => {
    if (!target) return;
    if (prevTarget.current?.[0] === target[0] && prevTarget.current?.[1] === target[1]) return;
    prevTarget.current = target;
    map.flyTo(target, 17, { animate: true, duration: 1.4 });
  }, [target]);
  return null;
}

// User location blue dot marker
const getUserLocationIcon = () => L.divIcon({
  html: `
    <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
      <div style="
        position:absolute;
        width:36px;height:36px;
        border-radius:50%;
        background:rgba(37,99,235,0.18);
        animation:mapPulse 1.8s ease-out infinite;
      "></div>
      <div style="
        width:16px;height:16px;
        border-radius:50%;
        background:#2563EB;
        border:3px solid white;
        box-shadow:0 2px 10px rgba(37,99,235,0.5);
        position:relative;z-index:1;
      "></div>
    </div>
  `,
  className: "user-location-icon",
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Build a large, pulsing SVG marker icon
const getMarkerIcon = (category: string, selected = false) => {
  const cfg = getCategoryConfig(category);
  const size = selected ? 22 : 16;
  const ring = selected ? 36 : 28;
  return L.divIcon({
    html: `
      <div style="position:relative;width:${ring}px;height:${ring}px;display:flex;align-items:center;justify-content:center;">
        <div style="
          position:absolute;
          width:${ring}px;height:${ring}px;
          border-radius:50%;
          background:${cfg.color}33;
          animation:mapPulse 2s ease-out infinite;
        "></div>
        <div style="
          width:${size}px;height:${size}px;
          border-radius:50%;
          background:${cfg.color};
          border:3px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.28);
          position:relative;z-index:1;
        "></div>
      </div>
    `,
    className: "custom-marker-icon",
    iconSize: [ring, ring],
    iconAnchor: [ring / 2, ring / 2],
    popupAnchor: [0, -(ring / 2) - 4],
  });
};

// Bottom sheet card for selected issue
function IssueBottomSheet({ issue, onClose }: { issue: Issue; onClose: () => void }) {
  const cfg = getCategoryConfig(issue.category);
  const statusCfg = STATUS_CONFIG[issue.status] || STATUS_CONFIG.reported;
  const severity = issue.impactScore || 0;
  const severityPct = Math.min((severity / 10) * 100, 100);
  const severityColor = severity > 7 ? "#F36B4F" : severity > 4 ? "#DFB32F" : "#55A971";

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-[2000] bg-white rounded-t-3xl shadow-2xl border-t border-slate-100"
      style={{ animation: "slideUp 0.28s cubic-bezier(0.34,1.56,0.64,1)" }}
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 bg-slate-200 rounded-full" />
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
      >
        <X className="w-4 h-4 text-slate-600" />
      </button>

      <div className="px-5 pb-6 pt-1 space-y-4">
        {/* Category + Status row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider"
            style={{ background: cfg.bg, color: cfg.color }}
          >
            {cfg.label}
          </span>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 ${statusCfg.color}`}>
            {statusCfg.icon}
            {statusCfg.label}
          </span>
        </div>

        {/* Title */}
        <div>
          <h3 className="text-base font-extrabold text-slate-900 leading-tight">{issue.title}</h3>
          <div className="flex items-center gap-1.5 mt-1">
            <MapPin className="w-3 h-3 text-slate-400" />
            <p className="text-[11px] text-slate-400 font-semibold">{issue.location.address}</p>
          </div>
        </div>

        {/* Attachment (Image or Video) */}
        {(issue.imageUrl || issue.videoUrl) && (
          <div className="w-full rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
            {issue.videoUrl ? (
              <video 
                src={issue.videoUrl} 
                controls 
                className="w-full max-h-36 object-cover" 
                playsInline
                preload="metadata"
              />
            ) : (
              issue.imageUrl && (
                <img 
                  src={issue.imageUrl} 
                  alt={issue.title} 
                  className="w-full h-36 object-cover"
                />
              )
            )}
          </div>
        )}

        {/* Description */}
        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{issue.description}</p>

        {/* Severity bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">Impact Severity</span>
            <span className="text-[11px] font-extrabold" style={{ color: severityColor }}>{severity}/10</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${severityPct}%`, background: severityColor }}
            />
          </div>
        </div>

        {/* Budget & Danger */}
        {(issue.budget || issue.dangerLevel) && (
          <div className="grid grid-cols-2 gap-3">
            {issue.budget && (
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Est. Budget</p>
                <p className="text-sm font-extrabold text-slate-800">${issue.budget.toLocaleString()}</p>
              </div>
            )}
            {issue.dangerLevel && (
              <div className="bg-red-50 rounded-2xl p-3 border border-red-100">
                <p className="text-[9px] font-extrabold text-red-400 uppercase tracking-wider mb-0.5">Danger</p>
                <p className="text-[10px] font-bold text-red-700 leading-tight line-clamp-2">{issue.dangerLevel}</p>
              </div>
            )}
          </div>
        )}

        {/* Reporter + date */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-[#E0E3F9] flex items-center justify-center">
              <span className="text-[9px] font-black text-[#3F48CC]">
                {(issue.reporterName || "A")[0].toUpperCase()}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-slate-600">{issue.reporterName || "Anonymous"}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <Clock className="w-3 h-3" />
            <span className="text-[10px] font-semibold">
              {new Date(issue.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MapContainer({ issues, onSelectCoords }: MapContainerProps) {
  // Proximity grouping algorithm for complaint hotspots
  const calculateHotspots = () => {
    const unresolved = issues.filter(i => i.status !== 'resolved');
    const threshold = 0.008; // Approx 800m
    const hotspotsList: { lat: number; lng: number; count: number; issues: Issue[] }[] = [];

    const densities = unresolved.map(issue => {
      const neighbors = unresolved.filter(other => {
        const dLat = other.location.lat - issue.location.lat;
        const dLng = other.location.lng - issue.location.lng;
        return Math.sqrt(dLat * dLat + dLng * dLng) <= threshold;
      });
      return {
        center: issue.location,
        neighbors,
        count: neighbors.length
      };
    });

    densities.sort((a, b) => b.count - a.count);

    for (const item of densities) {
      if (item.count < 2) continue; // Minimum 2 complaints to form a hotspot

      let isCovered = false;
      for (const h of hotspotsList) {
        const dLat = item.center.lat - h.lat;
        const dLng = item.center.lng - h.lng;
        if (Math.sqrt(dLat * dLat + dLng * dLng) <= threshold) {
          isCovered = true;
          break;
        }
      }

      if (!isCovered) {
        hotspotsList.push({
          lat: item.center.lat,
          lng: item.center.lng,
          count: item.count,
          issues: item.neighbors
        });
      }
    }

    return hotspotsList;
  };

  const hotspots = calculateHotspots();

  const center: [number, number] = [17.4135, 78.4520];
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showLayers, setShowLayers] = useState(false);
  const [showSurvivalHeatmap, setShowSurvivalHeatmap] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [showWardScorecard, setShowWardScorecard] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocateError("Geolocation not supported");
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        setFlyTarget(coords);
        setLocating(false);
      },
      (err) => {
        setLocateError(err.code === 1 ? "Location access denied" : "Could not get location");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Auto-locate user on mount
  useEffect(() => {
    handleLocateMe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filters = ["All", "Roads", "Water", "Waste", "Lights", "Civic"];

  const filteredIssues = issues.filter(issue => {
    if (activeFilter === "All") return true;
    return issue.category.toLowerCase().includes(activeFilter.toLowerCase());
  });

  // Count by category
  const counts = issues.reduce((acc, i) => {
    const key = Object.keys(CATEGORY_CONFIG).find(k => (i.category || "").toLowerCase().includes(k)) || "civic";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="w-full h-full relative z-0 bg-white">
      {/* Pulse animation style */}
      <style>{`
        @keyframes mapPulse {
          0%   { transform: scale(0.8); opacity: 0.8; }
          70%  { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(0.8); opacity: 0; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .leaflet-popup-content-wrapper { border-radius: 1rem !important; box-shadow: 0 4px 24px rgba(0,0,0,0.12) !important; border: 1px solid #f1f5f9 !important; padding: 0 !important; }
        .leaflet-popup-content { margin: 0 !important; }
        .leaflet-popup-tip-container { display: none; }
      `}</style>

      <LeafletMap
        center={center}
        zoom={13}
        style={{ height: "100%", width: "100%", background: "#f8f9fa" }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          attribution="&copy; CARTO"
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <MapClickHandler
          onMapClick={() => setSelectedIssue(null)}
          onSelectCoords={(lat, lng) => {
            onSelectCoords(lat, lng);
          }}
        />
        {filteredIssues.length > 0 && <BoundsFitter issues={filteredIssues} />}
        <FlyToController target={flyTarget} />
        {userLocation && (
          <Marker position={userLocation} icon={getUserLocationIcon()} zIndexOffset={1000}>
            <Popup autoPan={false}>
              <div className="px-3 py-2 text-center">
                <p className="text-[11px] font-extrabold text-blue-600">📍 You are here</p>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  {userLocation[0].toFixed(5)}, {userLocation[1].toFixed(5)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {hotspots.map((hotspot, idx) => (
          <Circle
            key={`hotspot-${idx}`}
            center={[hotspot.lat, hotspot.lng]}
            radius={400}
            pathOptions={{
              fillColor: '#dc2626',
              fillOpacity: 0.12,
              color: '#dc2626',
              weight: 1.5,
              dashArray: '6, 6'
            }}
          >
            <Popup autoPan={false}>
              <div className="p-3 min-w-[200px] text-left">
                <div className="flex items-center gap-2 text-red-650 font-black text-[10px] uppercase tracking-wider mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> High Complaint Zone
                </div>
                <h4 className="text-[11px] font-extrabold text-slate-850 leading-snug">
                  {hotspot.count} Active Complaints
                </h4>
                <p className="text-[10px] text-slate-450 mt-1 leading-normal font-semibold">
                  This sector is flagged as a high-density cluster for unresolved issues.
                </p>
                <div className="border-t border-slate-100 mt-2 pt-2 space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                  {hotspot.issues.map((i, idx) => (
                    <div key={i.id} className="text-[9px] font-bold text-slate-650 truncate flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full shrink-0 bg-red-500" />
                      {idx + 1}. {i.title}
                    </div>
                  ))}
                </div>
              </div>
            </Popup>
          </Circle>
        ))}

        {showSurvivalHeatmap && [
          { name: "Jubilee Hills", lat: 17.432, lng: 78.407, avgDays: 49, status: "critical", color: "#dc2626", label: "Red Zone: Systemic subsoil problem OR contractor fraud" },
          { name: "Ameerpet", lat: 17.4374, lng: 78.4482, avgDays: 180, status: "monitoring", color: "#eab308", label: "Yellow Zone: Mixed quality, monitoring active" },
          { name: "Kukatpally", lat: 17.4875, lng: 78.3953, avgDays: 61, status: "critical", color: "#ea580c", label: "Orange Zone: Drainage infrastructure failure" },
          { name: "Banjara Hills", lat: 17.4156, lng: 78.4347, avgDays: 340, status: "optimal", color: "#16a34a", label: "Green Zone: Good contractors, proper fixes holding" },
        ].map((zone, idx) => (
          <Circle
            key={`survival-${idx}`}
            center={[zone.lat, zone.lng]}
            radius={700}
            pathOptions={{
              fillColor: zone.color,
              fillOpacity: 0.28,
              color: zone.color,
              weight: 2,
            }}
          >
            <Popup autoPan={false}>
              <div className="p-3.5 min-w-[220px] text-left">
                <span className="text-[9px] font-black uppercase tracking-widest block mb-1" style={{ color: zone.color }}>
                  🛡️ Repair Survival Audit
                </span>
                <h4 className="text-xs font-black text-slate-850">{zone.name} Region</h4>
                <div className="border-t border-b border-slate-100 my-2 py-2 space-y-1 text-xs">
                  <div className="flex justify-between font-bold">
                    <span>Average Survival:</span>
                    <span style={{ color: zone.color }}>{zone.avgDays} Days</span>
                  </div>
                  <div className="flex justify-between text-slate-500 font-semibold">
                    <span>Status Grade:</span>
                    <span className="uppercase">{zone.status}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-650 font-semibold leading-normal">
                  {zone.label}
                </p>
              </div>
            </Popup>
          </Circle>
        ))}

        {filteredIssues.map((issue) => (
          <Marker
            key={issue.id}
            position={[issue.location.lat, issue.location.lng]}
            icon={getMarkerIcon(issue.category, selectedIssue?.id === issue.id)}
            eventHandlers={{
              click: (e) => {
                e.originalEvent?.stopPropagation();
                setSelectedIssue(issue);
              },
            }}
          >
            <Popup autoPan={false}>
              <div
                className="p-3 min-w-[200px] bg-white cursor-pointer"
                onClick={() => setSelectedIssue(issue)}
              >
                <div className="flex items-start gap-2 mb-2">
                  <span
                    className="shrink-0 w-2 h-2 rounded-full mt-1.5"
                    style={{ background: getCategoryConfig(issue.category).color }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold text-[12px] text-slate-900 leading-tight line-clamp-2">{issue.title}</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">
                      {getCategoryConfig(issue.category).label}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase flex items-center gap-1 ${
                    STATUS_CONFIG[issue.status]?.color || "text-amber-600 bg-amber-50"
                  }`}>
                    {STATUS_CONFIG[issue.status]?.label || "Reported"}
                  </span>
                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-civic-blue">
                    Details <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </LeafletMap>

      {/* Issue count badge & Ward Scorecard toggle */}
      <div className="absolute top-14 left-4 z-[2000] flex flex-col gap-2">
        <div className="bg-white/95 backdrop-blur-md border border-slate-100 px-3 py-2 rounded-2xl shadow-lg flex items-center gap-2 w-fit">
          <MapPin className="w-3.5 h-3.5 text-civic-blue" />
          <span className="text-[11px] font-extrabold text-slate-800">
            {filteredIssues.length} Incident{filteredIssues.length !== 1 ? "s" : ""}
          </span>
          {activeFilter !== "All" && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{
                background: getCategoryConfig(activeFilter).bg,
                color: getCategoryConfig(activeFilter).color,
              }}
            >
              {activeFilter}
            </span>
          )}
        </div>

        <button
          onClick={() => setShowWardScorecard(true)}
          className="bg-slate-900 hover:bg-slate-800 active:scale-95 text-white border border-slate-700 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 w-fit cursor-pointer transition-all text-xs font-bold uppercase tracking-wider min-w-[160px] touch-manipulation select-none"
        >
          📋 Ward 42 Scorecard
        </button>

        <div className="bg-white/95 backdrop-blur-md border border-slate-100 px-3 py-2 rounded-2xl shadow-lg flex items-center gap-2 w-fit">
          <input 
            type="checkbox" 
            id="survival-heatmap-toggle" 
            checked={showSurvivalHeatmap}
            onChange={(e) => setShowSurvivalHeatmap(e.target.checked)}
            className="w-3.5 h-3.5 text-gov-green focus:ring-gov-green border-slate-300 rounded cursor-pointer"
          />
          <label htmlFor="survival-heatmap-toggle" className="text-[10px] font-black uppercase text-gov-green cursor-pointer tracking-wider flex items-center gap-1">
            <span>🌡️ Survival Heatmap</span>
          </label>
        </div>
      </div>

      {/* Floating Legend - Top Right */}
      <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md border border-slate-100 p-3.5 rounded-2xl shadow-xl z-[1000] w-28 flex flex-col gap-2">
        <h3 className="text-[10px] font-black text-slate-800 tracking-wider uppercase mb-0.5">Legend</h3>
        <div className="space-y-1.5">
          {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setActiveFilter(activeFilter === cfg.label.split(" ")[0] ? "All" : key.charAt(0).toUpperCase() + key.slice(1))}
              className="flex items-center gap-2 w-full group"
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform group-hover:scale-125" style={{ background: cfg.color }} />
              <span className="text-[10px] font-bold text-slate-600 flex-1 text-left">{cfg.label.split(" ")[0]}</span>
              {counts[key] !== undefined && (
                <span className="text-[9px] font-extrabold" style={{ color: cfg.color }}>{counts[key]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Category filter pills */}
      <div className="absolute bottom-40 left-0 right-0 z-[1000] px-4 flex gap-2 overflow-x-auto no-scrollbar">
        {filters.map(f => {
          const isActive = activeFilter === f;
          const cfg = f !== "All" ? getCategoryConfig(f) : null;
          return (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-extrabold border transition-all shadow-sm"
              style={isActive && cfg
                ? { background: cfg.color, color: "white", borderColor: cfg.color }
                : isActive
                ? { background: "#2563EB", color: "white", borderColor: "#2563EB" }
                : { background: "white", color: "#64748b", borderColor: "#e2e8f0" }
              }
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* Locate Me Button — Google Maps style */}
      <div className="absolute bottom-40 right-4 z-[1000] flex flex-col items-end gap-2">
        {locateError && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold px-3 py-1.5 rounded-xl shadow whitespace-nowrap">
            {locateError}
          </div>
        )}
        <button
          onClick={handleLocateMe}
          disabled={locating}
          title="Go to my location"
          className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center border transition-all active:scale-95 ${
            userLocation
              ? "bg-blue-600 border-blue-500 text-white shadow-blue-200"
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
          } ${locating ? "opacity-80 cursor-wait" : ""}`}
        >
          {locating
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : <LocateFixed className={`w-5 h-5 ${userLocation ? "text-white" : "text-civic-blue"}`} />
          }
        </button>
      </div>

      {/* Floating Layers Button */}
      <button
        onClick={() => setShowLayers(p => !p)}
        className="absolute bottom-28 right-4 w-11 h-11 bg-white hover:bg-slate-50 border border-slate-200 rounded-full shadow-lg flex items-center justify-center text-slate-900 active:scale-95 transition-all z-[1000]"
      >
        <Layers className="w-5 h-5 text-civic-blue" />
      </button>

      {/* Selected Issue Bottom Sheet */}
      {selectedIssue && (
        <IssueBottomSheet
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
        />
      )}

      {/* Councillor Performance Scorecard Modal */}
      {showWardScorecard && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[3000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] border border-slate-100 max-w-sm w-full shadow-2xl overflow-hidden text-slate-700 flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider">Ward 42 — Jubilee Hills</h3>
              <button onClick={() => setShowWardScorecard(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Elected Representative</span>
                <h4 className="text-lg font-black text-slate-900">K. Ramesh Rao</h4>
                <span className="text-[10px] text-red-600 font-bold block mt-0.5 animate-pulse">Last active on portal: Never</span>
              </div>
              
              <div className="border-t border-b border-slate-100 py-3 space-y-2.5 text-xs font-bold text-slate-500">
                <div className="flex justify-between">
                  <span>Issues Reported (Month)</span>
                  <span className="text-slate-800">23</span>
                </div>
                <div className="flex justify-between">
                  <span>Resolved within 7 days</span>
                  <span className="text-red-650 flex items-center gap-1">4 (17%) <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /></span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Resolution Time</span>
                  <span className="text-slate-800">19.3 Days</span>
                </div>
                <div className="flex justify-between">
                  <span>Contract Violations Ignored</span>
                  <span className="text-slate-800">3</span>
                </div>
                <div className="flex justify-between">
                  <span>Chronic Issues Unaddressed</span>
                  <span className="text-slate-800">2</span>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black text-red-700 uppercase tracking-widest block">Ward Health Score</span>
                  <span className="text-2xl font-black text-red-800 mt-1 block font-mono">29/100</span>
                </div>
                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-lg text-[9px] font-black uppercase">Critical 🔴</span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-100 flex gap-2">
              <button 
                onClick={() => setShowWardScorecard(false)}
                className="flex-1 py-2.5 bg-slate-205 hover:bg-slate-200 text-slate-705 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border border-slate-200"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  window.open(`/ward/jubilee-hills`, "_blank");
                }}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer text-center shadow-sm"
              >
                View Report Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

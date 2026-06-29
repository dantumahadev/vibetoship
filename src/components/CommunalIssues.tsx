import { ArrowLeft, Info, Plus, CircleDot } from "lucide-react";
import MapContainer from "./MapContainer";
import Dashboard from "./Dashboard";
import { Issue } from "../types";

interface CommunalIssuesProps {
  issues: Issue[];
  onBack: () => void;
  onSelectCoords: (lat: number, lng: number) => void;
}

export default function CommunalIssues({ issues, onBack, onSelectCoords }: CommunalIssuesProps) {
  
  // Default coordinates to prefill if they click the button directly (e.g. Center of region)
  const handleReportDirectly = () => {
    onSelectCoords(12.9716, 77.5946); // Default location or close by
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-sage-bg select-none">
      
      {/* Left Pane: Civic Monitoring Feed */}
      <div className="w-[420px] h-full flex flex-col bg-white border-r border-slate-200/60 shadow-lg relative z-20 shrink-0">
        
        {/* Navigation & Header */}
        <div className="p-6 border-b border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs text-sage-primary hover:text-gov-green font-bold transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Hub
            </button>
            
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1 flex items-center gap-1">
              <CircleDot className="w-2.5 h-2.5 text-emerald-600 animate-pulse" />
              <span className="text-[9px] font-black text-emerald-800 uppercase tracking-widest">
                GIS FEED ONLINE
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-gov-green uppercase tracking-tight">
              Grid Audit Feed
            </h2>
            <p className="text-[10px] text-sage-primary font-bold uppercase tracking-widest leading-none">
              Regional Safety & Defect Registry
            </p>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={handleReportDirectly}
            className="w-full py-3 bg-gov-green hover:bg-gov-green-light text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 text-gold-accent" />
            Report Regional Hazard
          </button>

          {/* Civic Silence Zone Toggle */}
          <div className="pt-2">
            <button className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2">
              <CircleDot className="w-3.5 h-3.5" />
              Toggle Civic Silence Zones
            </button>
            <p className="text-center text-[9px] text-slate-400 font-semibold mt-1">Identifies wards with low report density vs high population</p>
          </div>
        </div>

        {/* Scrollable Feed List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 bg-slate-50/50">
          <Dashboard issues={issues} />
        </div>

      </div>

      {/* Right Pane: GIS Interactive Leaflet Map */}
      <div className="flex-1 h-full relative z-10 bg-[#e9ece9]">
        
        {/* Map Guidelines overlay */}
        <div className="absolute top-4 left-4 z-[1000] glass-panel rounded-2xl px-4 py-3 border border-white max-w-sm shadow-md">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-gov-green flex items-center justify-center text-gold-accent shrink-0 shadow-sm">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] font-black text-gov-green uppercase tracking-widest block leading-none mb-1">
                GIS INTERACTIVE GRID
              </span>
              <p className="text-xs text-sage-primary font-semibold leading-normal">
                Click pins to audit active hazards. Click directly on the map surface to pin a new safety issue.
              </p>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="w-full h-full">
          <MapContainer 
            issues={issues} 
            onSelectCoords={onSelectCoords}
          />
        </div>

      </div>

    </div>
  );
}

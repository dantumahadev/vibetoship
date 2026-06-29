import { AlertTriangle, MapPin, Share2, Wallet, Calendar, FileText, Landmark, Star, ShieldAlert, Award, FileSpreadsheet, ArrowLeft, ArrowUpRight } from "lucide-react";
import { Issue } from "../types";

interface PublicViralPageProps {
  type: "chronic" | "shame" | "ward";
  id: string;
  issue: Issue;
  issues: Issue[];
}

export default function PublicViralPage({ type, id, issue, issues }: PublicViralPageProps) {
  // Share functions
  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`🚨 CITIZEN WAR ROOM ALERT: Check out the infrastructure corruption details for Hyderabad Ward 42! ${window.location.href}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const handleFileRTI = () => {
    alert("Drafting formal RTI query...\nNotice ready to download. You can submit this directly on the RTI online portal.");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Absolute background glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-red-500/5 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-amber-500/5 blur-[120px] pointer-events-none rounded-full" />

      <header className="py-6 px-8 border-b border-slate-900 flex justify-between items-center bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-lg border border-red-500/30">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest text-white">GHMC Accountability Feed</h1>
            <span className="text-[9px] text-red-500 font-extrabold uppercase tracking-[0.25em]">Public Verification Registry</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => window.location.href = "/"}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Portal Home
          </button>
          <button 
            onClick={handleShareWhatsApp}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-emerald-950/20"
          >
            <Share2 className="w-3.5 h-3.5" /> Share
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full p-6 md:p-8 space-y-8 z-10">
        
        {/* CHRONIC INFRASTRUCTURE REPORT CARD */}
        {type === "chronic" && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6 relative overflow-hidden backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest">
                🔁 Chronic Taxpayer Waste
              </span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Ward 42 • Jubilee Hills</span>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-black text-white leading-tight">{issue.title || "Jubilee Hills Road Junction"}</h2>
              <div className="flex items-center gap-1.5 text-slate-400">
                <MapPin className="w-4 h-4 text-red-500" />
                <p className="text-xs font-semibold">{issue.location?.address || "Road No 36, Jubilee Hills, Hyderabad"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950/80 border border-slate-900 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-1.5 text-slate-400">
                  <Wallet className="w-4 h-4 text-amber-500" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Total Sunk Cost</span>
                </div>
                <div className="text-3xl font-black text-amber-500">₹{(issue.totalTaxpayerSpend || 68000).toLocaleString()}</div>
                <p className="text-[9px] text-slate-500 mt-1 font-bold uppercase tracking-wider">Over {issue.chronicReportCount || 4} failed repair cycles</p>
              </div>

              <div className="bg-slate-950/80 border border-slate-900 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-1.5 text-slate-400">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Current Status</span>
                </div>
                <div className="text-xl font-black text-red-500 uppercase tracking-wider mt-1">BROKEN AGAIN</div>
                <p className="text-[9px] text-slate-500 mt-1 font-bold uppercase tracking-wider">Failed within 90 days of last repair</p>
              </div>
            </div>

            <div className="bg-slate-950/60 rounded-2xl p-6 border border-slate-900 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Corruption Timeline</span>
                <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest bg-red-950/20 px-2 py-0.5 rounded border border-red-900/30">Contractors Involved: 2</span>
              </div>
              
              <div className="relative border-l-2 border-slate-800 pl-6 ml-2 space-y-6 text-xs">
                <div className="relative">
                  <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-red-600 border-2 border-slate-950" />
                  <div className="text-[9px] font-black text-red-500 uppercase tracking-widest">Report 4 (Current)</div>
                  <p className="text-slate-200 font-extrabold mt-1">Road collapsed again. Repetitive pavement failure.</p>
                  <p className="text-slate-500 text-[10px] font-semibold">Contractor: M/s Raju Constructions (DLP Ignored)</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-slate-950" />
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Report 3 (43 days ago)</div>
                  <p className="text-slate-300 font-extrabold mt-1">Repaired by M/s Raju Constructions. Sunk cost: ₹18,000.</p>
                  <p className="text-slate-500 text-[10px] font-semibold">AI Verification verdict: Approved, failed 43 days later.</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-slate-700 border-2 border-slate-950" />
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Report 2 (98 days ago)</div>
                  <p className="text-slate-300 font-extrabold mt-1">Repaired by M/s Raju Constructions. Sunk cost: ₹25,500.</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-slate-700 border-2 border-slate-950" />
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Report 1 (18 months ago)</div>
                  <p className="text-slate-300 font-extrabold mt-1">Repaired by M/s Suresh Infrastructure. Sunk cost: ₹24,500.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-900">
              <button onClick={handleShareWhatsApp} className="py-3 bg-emerald-650 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer shadow-md text-center">Share on WhatsApp</button>
              <button onClick={() => alert("Downloading PDF summary report...")} className="py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer text-center">Download PDF</button>
              <button onClick={handleFileRTI} className="py-3 bg-red-650 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer text-center">File RTI Query</button>
            </div>
          </div>
        )}

        {/* HALL OF SHAME - UNRESOLVED FOR 30+ DAYS */}
        {type === "shame" && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6 relative overflow-hidden backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest animate-pulse">
                🚨 Hall of Shame — Unresolved for 30+ Days
              </span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Ward 42 • Councillor: K. Ramesh Rao</span>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-black text-white leading-tight">{issue.title}</h2>
              <div className="flex items-center gap-1.5 text-slate-400">
                <MapPin className="w-4 h-4 text-red-500" />
                <p className="text-xs font-semibold">{issue.location?.address || "Jubilee Hills Road No 36"}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-950/85 border border-slate-900 p-4 rounded-xl text-center">
                <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Days Pending</span>
                <span className="text-2xl font-black text-red-500">34 Days</span>
              </div>
              <div className="bg-slate-950/85 border border-slate-900 p-4 rounded-xl text-center">
                <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Citizen Vouched</span>
                <span className="text-2xl font-black text-white">12 Citizens</span>
              </div>
              <div className="bg-slate-950/85 border border-slate-900 p-4 rounded-xl text-center">
                <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Est. Comm. Loss</span>
                <span className="text-2xl font-black text-amber-500">₹34,000</span>
              </div>
            </div>

            <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-900 space-y-2">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Escalation Logs</span>
              <div className="divide-y divide-slate-900 text-xs space-y-3 pt-1">
                <div className="pt-2 flex justify-between">
                  <span className="font-extrabold text-slate-300">RTI Draft Status</span>
                  <span className="text-emerald-500 font-bold">READY FOR FILING</span>
                </div>
                <div className="pt-3 flex justify-between">
                  <span className="font-extrabold text-slate-300">Collector Escalation</span>
                  <span className="text-amber-500 font-bold">GENERATED (7d delay trigger)</span>
                </div>
                <div className="pt-3 flex justify-between">
                  <span className="font-extrabold text-slate-300">Public Twitter Campaign</span>
                  <span className="text-red-550 font-bold">PENDING CITIZEN RETWEETS</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-900">
              <button onClick={() => alert("Redirecting to Councillor communication desk...")} className="py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer text-center">Contact Councillor</button>
              <button onClick={handleFileRTI} className="py-3 bg-red-650 hover:bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer text-center shadow-md">File RTI Act Petition</button>
            </div>
          </div>
        )}

        {/* COUNCILLOR'S REPORT CARD */}
        {type === "ward" && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6 relative overflow-hidden backdrop-blur-md">
            <div className="flex justify-between items-start gap-4 flex-wrap">
              <div>
                <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest">
                  📋 Councillor Performance Report Card
                </span>
                <h2 className="text-2xl font-black text-white leading-tight mt-3">K. Ramesh Rao</h2>
                <p className="text-xs text-slate-500 font-extrabold uppercase mt-0.5">Ward 42 • Jubilee Hills (Elected 2024)</p>
              </div>

              <div className="bg-slate-950/80 border border-slate-900 px-4 py-3 rounded-2xl text-center shrink-0">
                <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Citizen Rating</span>
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="w-4 h-4 fill-amber-500" />
                  <Star className="w-4 h-4 fill-amber-500" />
                  <Star className="w-4 h-4 text-slate-700" />
                  <Star className="w-4 h-4 text-slate-700" />
                  <Star className="w-4 h-4 text-slate-700" />
                  <span className="text-xs font-black text-white ml-1">2.1/5</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-950/85 border border-slate-900 p-4 rounded-xl text-center">
                <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Resolution Rate</span>
                <span className="text-2xl font-black text-red-500">17%</span>
                <span className="text-[8px] text-slate-500 font-semibold block mt-0.5">City avg: 54%</span>
              </div>
              <div className="bg-slate-950/85 border border-slate-900 p-4 rounded-xl text-center">
                <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Response Time</span>
                <span className="text-2xl font-black text-red-550">19 Days</span>
                <span className="text-[8px] text-slate-500 font-semibold block mt-0.5">City avg: 6 days</span>
              </div>
              <div className="bg-slate-950/85 border border-slate-900 p-4 rounded-xl text-center">
                <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Taxpayer Waste</span>
                <span className="text-2xl font-black text-amber-500">₹1.2 Lakhs</span>
                <span className="text-[8px] text-slate-500 font-semibold block mt-0.5">In repeated repairs</span>
              </div>
            </div>

            {/* Worst Unresolved Issues */}
            <div className="bg-slate-950/60 rounded-2xl p-6 border border-slate-900 space-y-4">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Worst Unresolved Issues in Ward 42</span>
              
              <div className="space-y-3">
                <div className="bg-slate-950/80 border border-slate-900 p-3 rounded-xl flex items-center justify-between gap-4 text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span className="text-slate-200">1. Jubilee Hills Junction pothole</span>
                  </div>
                  <span className="text-slate-400 font-semibold text-[10px]">34 days pending</span>
                </div>
                <div className="bg-slate-950/80 border border-slate-900 p-3 rounded-xl flex items-center justify-between gap-4 text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span className="text-slate-200">2. Ameerpet drain overflow</span>
                  </div>
                  <span className="text-slate-400 font-semibold text-[10px]">28 days pending</span>
                </div>
                <div className="bg-slate-950/80 border border-slate-900 p-3 rounded-xl flex items-center justify-between gap-4 text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span className="text-slate-200">3. Kondapur streetlight failure</span>
                  </div>
                  <span className="text-slate-400 font-semibold text-[10px]">41 days pending</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

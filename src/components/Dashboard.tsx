import { useState } from "react";
import { Issue } from "../types";
import IssueCard from "./IssueCard";

export default function Dashboard({ issues }: { issues: Issue[] }) {
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = ["All", "Roads", "Water", "Waste", "Lights"];

  const filteredIssues = issues.filter(i => 
    activeCategory === "All" || i.category.toLowerCase().includes(activeCategory.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-6">
      {/* WhatsApp Banner */}
      <a 
        href="https://wa.me/14155238886?text=join%20something-something"
        target="_blank"
        rel="noopener noreferrer"
        className="block bg-gradient-to-r from-green-500 to-emerald-600 rounded-3xl p-6 shadow-md border border-green-400 hover:shadow-lg transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shrink-0">
            <svg className="w-7 h-7 text-green-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
            </svg>
          </div>
          <div className="text-white">
            <h3 className="font-extrabold text-lg flex items-center gap-2">
              Report via WhatsApp
              <span className="bg-red-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full animate-pulse">Live</span>
            </h3>
            <p className="text-white/90 text-xs font-semibold mt-1">Send a photo to +1 415 523 8886 and our AI will file it instantly!</p>
          </div>
        </div>
      </a>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 custom-scrollbar no-scrollbar shrink-0">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border cursor-pointer ${
              activeCategory === cat
              ? "bg-sage-light text-gov-green border-sage-primary/30 shadow-sm"
              : "bg-white text-sage-primary border-slate-200 hover:border-slate-300"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Feed List */}
      <div className="space-y-4">
        {filteredIssues.length === 0 ? (
          <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-3xl p-6">
            <p className="text-sage-primary font-bold text-xs uppercase tracking-wide">No active hazards</p>
            <p className="text-slate-400 text-[11px] mt-1 font-semibold">Reports for this sector are currently empty.</p>
          </div>
        ) : (
          filteredIssues.map((issue) => (
            <IssueCard 
              key={issue.id} 
              issue={issue} 
            />
          ))
        )}
      </div>
    </div>
  );
}

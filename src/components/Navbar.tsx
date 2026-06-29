/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Map as MapIcon, BarChart3, Plus, ShieldAlert } from "lucide-react";

interface NavbarProps {
  onAddClick: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Navbar({ onAddClick, activeTab, setActiveTab }: NavbarProps) {
  const tabs = [
    { id: 'issues', label: 'Communal Issues', icon: MapIcon },
    { id: 'hero', label: 'Community Hero', icon: BarChart3 },
    { id: 'justice', label: 'Community Justice', icon: ShieldAlert },
  ];

  return (
    <>
      {/* FAB (Only visible in Communal Issues section) */}
      {activeTab === 'issues' && (
        <button 
          onClick={onAddClick}
          className="absolute bottom-24 right-6 w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 z-[60] hover:scale-105 active:scale-95 transition-all border border-white/10"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* Bottom Nav */}
      <nav className="shrink-0 glass-nav px-4 py-3.5 z-[50] relative border-t border-white/20">
        <div className="max-w-md mx-auto flex justify-between items-center px-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex flex-col items-center gap-1 transition-all"
              >
                <div className={`px-6 py-1.5 rounded-full transition-all flex items-center justify-center ${
                  isActive 
                    ? 'bg-blue-600/10 text-blue-600 border border-blue-500/10 shadow-[0_2px_10px_-3px_rgba(59,130,246,0.2)]' 
                    : 'bg-transparent text-slate-500 hover:text-slate-700'
                }`}>
                  <tab.icon className="w-5 h-5 stroke-[2.25]" />
                </div>
                <span className={`text-[10px] tracking-tight ${
                  isActive ? 'text-blue-600 font-black' : 'text-slate-500 font-bold'
                }`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}

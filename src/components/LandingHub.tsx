import { useState, useEffect } from 'react';
import { useAuth } from './FirebaseProvider';
import { ShieldCheck, Award, LogOut, ArrowRight, User, CircleDot, Users, Mail, CheckCircle2, Sparkles, Map, Heart, Landmark, HardHat, ShieldAlert, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Issue } from '../types';
import CommunalIssues from './CommunalIssues';
import StructuralScanner from './StructuralScanner';
import Leaderboard from './Leaderboard';
import Profile from './Profile';

interface LandingHubProps {
  onSelectSection: (section: string) => void;
  issues: Issue[];
  onSelectCoords: (lat: number, lng: number) => void;
  onReportHazard?: () => void;
}

export default function LandingHub({ onSelectSection, issues, onSelectCoords, onReportHazard }: LandingHubProps) {
  const { profile, signOut } = useAuth();
  const [showWelcomeToast, setShowWelcomeToast] = useState(false);
  const [activeCitizenTab, setActiveCitizenTab] = useState<'issues' | 'scanner' | 'directory'>('issues');
  const [heroSubTab, setHeroSubTab] = useState<'leaderboard' | 'profile'>('leaderboard');

  const isAdmin = profile?.role === 'administration';
  const isContractor = profile?.role === 'contractor';

  useEffect(() => {
    if (sessionStorage.getItem("justRegistered") === "true") {
      setShowWelcomeToast(true);
      sessionStorage.removeItem("justRegistered");
      const timer = setTimeout(() => setShowWelcomeToast(false), 8000);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#f4f6f4] flex flex-col font-sans select-none relative">
      
      {/* Premium State-Grade Hub Header */}
      <header className="bg-gov-green text-white shadow-xl relative z-10 border-b-2 border-gold-accent">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(201,162,39,0.15),_transparent_70%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo & Seal */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gov-green-dark border-2 border-gold-accent flex items-center justify-center shadow-lg relative shrink-0">
              <div className="absolute inset-0.5 border border-dashed border-gold-accent/40 rounded-lg" />
              <Landmark className="w-6 h-6 text-gold-accent" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white uppercase leading-none flex items-center gap-1.5">
                MUNICIPAL AUDIT GRID
              </h1>
              <span className="text-[10px] text-gold-accent uppercase font-black tracking-widest mt-1 block">
                DEPARTMENT OF CIVIC SAFETY & INFRASTRUCTURE • STATE PORTAL
              </span>
            </div>
          </div>

          {/* User Profile Info & Sign Out */}
          <div className="flex items-center gap-6">
            {profile && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gov-green-light border border-gold-accent/30 flex items-center justify-center text-gold-accent shrink-0 shadow-md">
                  <User className="w-5 h-5" />
                </div>
                <div className="text-left hidden md:block">
                  <span className="text-xs text-white font-bold block leading-tight">
                    {profile.displayName}
                  </span>
                  <span className="text-[10px] text-gold-accent uppercase font-black tracking-widest leading-none">
                    {profile.role === 'administration' 
                      ? `ADMIN • ${profile.heroType?.replace('_', ' ').toUpperCase() || 'OFFICER'}` 
                      : profile.role === 'contractor'
                        ? 'CONTRACTOR • VENDOR'
                        : `CITIZEN • ${profile.points} XP`}
                  </span>
                </div>
              </div>
            )}

            {profile && signOut && (
              <button
                onClick={() => signOut()}
                className="px-4 py-2 bg-gov-green-dark hover:bg-red-950/40 border border-white/10 hover:border-red-900/40 rounded-xl transition-all text-xs font-bold text-sage-light hover:text-red-400 flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col space-y-8">
        
        {/* Civic Alert Ticker */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gov-green/5 border border-gov-green/20 rounded-full shadow-inner">
            <CircleDot className="w-3.5 h-3.5 text-gold-accent animate-pulse" />
            <span className="text-[10px] font-black text-gov-green uppercase tracking-widest">
              State Civic Portal Active • Region-1 GIS Grid Online
            </span>
          </div>
          <h2 className="text-3xl font-extrabold text-gov-green uppercase tracking-tight">
            Regional Infrastructure Command Hub
          </h2>
          <p className="text-xs text-sage-primary max-w-xl mx-auto font-medium">
            Authorized citizen portal to report municipal issues, scan critical structural assets using AI, and locate verified proximity-sorted heroes.
          </p>
        </div>

        {/* Welcome Toast */}
        <AnimatePresence>
          {showWelcomeToast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="max-w-md mx-auto w-full bg-emerald-500/10 border-2 border-emerald-500/30 backdrop-blur-md rounded-2xl p-5 shadow-lg flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">Registration Successful!</span>
                </div>
                <p className="text-[11px] text-emerald-800/80 font-semibold leading-relaxed">
                  Welcome to Community Hero! A verification welcome email has been sent to <strong className="text-emerald-950 font-bold">{profile?.email || 'your registered address'}</strong>. Check your inbox!
                </p>
              </div>
              <button
                onClick={() => setShowWelcomeToast(false)}
                className="text-[10px] font-black uppercase text-emerald-800 hover:text-emerald-900 transition-colors pl-2 cursor-pointer"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── CENTRAL CONSOLIDATED CITIZEN APP BOARD ── */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col min-h-[650px]">
          
          {/* State Navigation Tabs */}
          <div className="bg-gov-green/5 border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Tab switchers */}
            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-2xl p-1 w-full md:w-auto">
              <button
                onClick={() => setActiveCitizenTab('issues')}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeCitizenTab === 'issues'
                    ? 'bg-gov-green text-white shadow-md'
                    : 'text-sage-primary hover:text-gov-green hover:bg-slate-50'
                }`}
              >
                <Map className="w-4 h-4" />
                GIS Issue Grid
              </button>

              <button
                onClick={() => setActiveCitizenTab('scanner')}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeCitizenTab === 'scanner'
                    ? 'bg-gov-green text-white shadow-md'
                    : 'text-sage-primary hover:text-gov-green hover:bg-slate-50'
                }`}
              >
                <Sparkles className="w-4 h-4 text-gold-accent" />
                AI Health Scanner
              </button>

              <button
                onClick={() => setActiveCitizenTab('directory')}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeCitizenTab === 'directory'
                    ? 'bg-gov-green text-white shadow-md'
                    : 'text-sage-primary hover:text-gov-green hover:bg-slate-50'
                }`}
              >
                <Trophy className="w-4 h-4 text-gold-accent animate-pulse" />
                Workforce Ledger
              </button>
            </div>

            {/* Report Hazard CTA */}
            <div className="flex items-center gap-3">
              {onReportHazard && (
                <button
                  onClick={onReportHazard}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-[0.97] cursor-pointer border border-red-500"
                >
                  <ShieldAlert className="w-4 h-4" />
                  Report Hazard
                </button>
              )}
              <a
                href="https://wa.me/14155238886?text=Report%20Issue:%20"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all cursor-pointer border border-[#20c45a]"
                title="Report via WhatsApp"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </a>
            </div>
          </div>

          {/* Embedded Sub-View Frame */}
          <div className="flex-1 min-h-[500px] relative bg-slate-50">
            {activeCitizenTab === 'issues' && (
              <CommunalIssues
                issues={issues}
                onBack={() => {}}
                onSelectCoords={onSelectCoords}
              />
            )}

            {activeCitizenTab === 'scanner' && (
              <StructuralScanner
                onBack={() => {}}
                onSuccessReport={() => setActiveCitizenTab('issues')}
              />
            )}

            {activeCitizenTab === 'directory' && (
              <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col h-full bg-slate-50">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
                  <div>
                    <h3 className="text-lg font-black text-gov-green uppercase">Proximity Workforce Directory</h3>
                    <p className="text-xs text-slate-500 font-medium">Search and contact proximity-sorted verified heroes and volunteer officers.</p>
                  </div>
                  
                  {/* Hero inner tab switcher */}
                  <div className="flex bg-slate-200/50 p-1 rounded-xl border border-slate-200">
                    <button
                      onClick={() => setHeroSubTab('leaderboard')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                        heroSubTab === 'leaderboard' ? 'bg-gov-green text-white shadow-sm' : 'text-slate-500 hover:text-gov-green'
                      }`}
                    >
                      Leaderboard
                    </button>
                    <button
                      onClick={() => setHeroSubTab('profile')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                        heroSubTab === 'profile' ? 'bg-gov-green text-white shadow-sm' : 'text-slate-500 hover:text-gov-green'
                      }`}
                    >
                      My Profile
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {heroSubTab === 'leaderboard' ? (
                    <Leaderboard />
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-xl mx-auto shadow-sm">
                      {profile ? (
                        <Profile />
                      ) : (
                        <div className="text-center py-12 space-y-4">
                          <ShieldAlert className="w-10 h-10 text-gold-accent mx-auto" />
                          <h4 className="text-sm font-bold text-gov-green uppercase">Citizen Signature Required</h4>
                          <p className="text-xs text-slate-500 max-w-xs mx-auto">
                            To view or claim points on your personal profile, please authenticate using Google OAuth or register as a Community Hero.
                          </p>
                          <button
                            onClick={() => onSelectSection('hero')}
                            className="px-5 py-2.5 bg-gov-green text-white hover:bg-gov-green-light rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                          >
                            Sign In / Register
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── GOVERNMENT ADMINISTRATION GATEWAYS (SECURE SIGN IN) ── */}
        <section className="bg-gov-green text-white rounded-3xl border-2 border-gold-accent p-8 relative overflow-hidden shadow-xl mt-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(201,162,39,0.1),_transparent_60%)] pointer-events-none" />
          <div className="relative z-10 space-y-6">
            
            <div className="text-center max-w-lg mx-auto space-y-2">
              <div className="w-10 h-10 rounded-xl bg-gov-green-dark border border-gold-accent/40 flex items-center justify-center mx-auto text-gold-accent">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-white">
                Authorized Personnel Gateways
              </h3>
              <p className="text-[11px] text-white/70 font-semibold leading-relaxed">
                Authorized state personnel and contracted corporate vendors must sign in below to manage tenders, active contracts, and administrative verification queues.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
              
              {/* CONTRACTOR GATE */}
              <div 
                onClick={() => onSelectSection('contractor-portal')}
                className="bg-gov-green-dark/60 hover:bg-gov-green-dark border border-gold-accent/30 hover:border-gold-accent/70 rounded-2xl p-5 transition-all duration-300 cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-gold-accent/15 border border-gold-accent/30 flex items-center justify-center text-gold-accent shrink-0 group-hover:scale-105 transition-all">
                    <HardHat className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white group-hover:text-gold-accent transition-colors">Contractor Exchange</h4>
                    <span className="text-[8px] text-white/50 font-black uppercase tracking-widest block mt-0.5">VENDOR LOGIN</span>
                    <p className="text-[10px] text-white/60 mt-2 leading-relaxed font-semibold">
                      Bid on active municipal tenders, update contract stages, and submit liability proofs.
                    </p>
                  </div>
                </div>
                <div className="pt-5 flex items-center justify-between border-t border-white/5 mt-4">
                  <span className="text-[8px] font-black uppercase tracking-widest text-gold-accent">Access Portal</span>
                  <div className="w-6 h-6 rounded-md bg-white/5 group-hover:bg-gold-accent group-hover:text-gov-green-dark text-white flex items-center justify-center transition-all">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* CORPORATOR GATE */}
              <div 
                onClick={() => onSelectSection('admin-portal')}
                className="bg-gov-green-dark/60 hover:bg-gov-green-dark border border-gold-accent/30 hover:border-gold-accent/70 rounded-2xl p-5 transition-all duration-300 cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-gold-accent/15 border border-gold-accent/30 flex items-center justify-center text-gold-accent shrink-0 group-hover:scale-105 transition-all">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white group-hover:text-gold-accent transition-colors">GHMC Corporator</h4>
                    <span className="text-[8px] text-white/50 font-black uppercase tracking-widest block mt-0.5">OFFICER GATEWAY</span>
                    <p className="text-[10px] text-white/60 mt-2 leading-relaxed font-semibold">
                      Publish tenders, verify local workforce, trigger defect liability claims, and review escalations.
                    </p>
                  </div>
                </div>
                <div className="pt-5 flex items-center justify-between border-t border-white/5 mt-4">
                  <span className="text-[8px] font-black uppercase tracking-widest text-gold-accent">Access Portal</span>
                  <div className="w-6 h-6 rounded-md bg-white/5 group-hover:bg-gold-accent group-hover:text-gov-green-dark text-white flex items-center justify-center transition-all">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* COMMUNITY HERO GATE */}
              <div 
                onClick={() => onSelectSection('hero')}
                className="bg-gov-green-dark/60 hover:bg-gov-green-dark border border-gold-accent/30 hover:border-gold-accent/70 rounded-2xl p-5 transition-all duration-300 cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-gold-accent/15 border border-gold-accent/30 flex items-center justify-center text-gold-accent shrink-0 group-hover:scale-105 transition-all">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white group-hover:text-gold-accent transition-colors">Community Hero</h4>
                    <span className="text-[8px] text-white/50 font-black uppercase tracking-widest block mt-0.5">SPECIALIST REGISTRY</span>
                    <p className="text-[10px] text-white/60 mt-2 leading-relaxed font-semibold">
                      Register as a specialist (Plumber, Electrician) to handle verified community defects.
                    </p>
                  </div>
                </div>
                <div className="pt-5 flex items-center justify-between border-t border-white/5 mt-4">
                  <span className="text-[8px] font-black uppercase tracking-widest text-gold-accent">Access Portal</span>
                  <div className="w-6 h-6 rounded-md bg-white/5 group-hover:bg-gold-accent group-hover:text-gov-green-dark text-white flex items-center justify-center transition-all">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

            </div>

          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200/60 text-center bg-white mt-auto">
        <span className="text-[10px] text-sage-primary/60 font-bold uppercase tracking-wider">
          Secured Gateway Connection • Region-1 Node Operations • State Cryptographic Signature Active
        </span>
      </footer>

    </div>
  );
}

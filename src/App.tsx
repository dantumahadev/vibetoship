import { useState, useEffect } from "react";
import CommunalIssues from "./components/CommunalIssues";
import Profile from "./components/Profile";
import Leaderboard from "./components/Leaderboard";
import CommunityJustice from "./components/CommunityJustice";
import ReportIssueModal from "./components/ReportIssueModal";
import Login from "./components/Login";
import LandingHub from "./components/LandingHub";
import AdminPortal from "./components/AdminPortal";
import ContractorPortal from "./components/ContractorPortal";
import PublicViralPage from "./components/PublicViralPage";
import StructuralScanner from "./components/StructuralScanner";
import { useAuth } from "./components/FirebaseProvider";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "./lib/firebase";
import { handleFirestoreError, OperationType } from "./lib/firestore-errors";
import { Issue } from "./types";
import { Loader2, ArrowLeft, Trophy, User } from "lucide-react";

export default function App() {
  const { user, profile, loading, isProfileSetupComplete } = useAuth();
  const [activeTab, setActiveTab] = useState("hub");
  const [heroSubTab, setHeroSubTab] = useState<"profile" | "leaderboard">("profile");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prefilledCoords, setPrefilledCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [backendIssues, setBackendIssues] = useState<Issue[]>([]);
  
  // Public Route parsing
  const [publicRouteId, setPublicRouteId] = useState<string | null>(null);
  const [publicRouteType, setPublicRouteType] = useState<"chronic" | "shame" | "ward" | null>(null);

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith("/chronic/")) {
      setPublicRouteType("chronic");
      setPublicRouteId(path.split("/chronic/")[1]);
    } else if (path.startsWith("/public/hall-of-shame/")) {
      setPublicRouteType("shame");
      setPublicRouteId(path.split("/public/hall-of-shame/")[1]);
    } else if (path.startsWith("/ward/")) {
      setPublicRouteType("ward");
      setPublicRouteId(path.split("/ward/")[1]);
    }
  }, []);

  // Load Firestore issues (real-time)
  // Load Firestore issues (real-time)
  useEffect(() => {
    const issuesPath = "issues";
    const q = query(collection(db, issuesPath), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const issuesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Issue[];
      setIssues(issuesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, issuesPath);
    });
    return () => unsubscribe();
  }, []);

  // Also poll backend issues_db.json (captures WhatsApp submissions) every 10s
  useEffect(() => {
    const fetchBackend = async () => {
      try {
        const res = await fetch("/api/issues");
        if (res.ok) {
          const data = await res.json();
          setBackendIssues((data.issues || []) as Issue[]);
        }
      } catch { /* silent */ }
    };
    fetchBackend();
    const interval = setInterval(fetchBackend, 10000);
    return () => clearInterval(interval);
  }, []);

  // Close reporting modal on navigation or role changes
  useEffect(() => {
    setIsModalOpen(false);
    setPrefilledCoords(null);
  }, [activeTab, profile?.role]);

  const mockChronicIssue: Issue = {
    id: "mock-old-1",
    title: "Jubilee Hills Junction Road Pavement Failure",
    description: "The road pavement has cracked and caved in again for the 4th time. Large potholes are forming, posing a major risk to commuters. Repetitive water drainage clogging has ruined the bitumen layer.",
    category: "Roads",
    status: "reported",
    reportedBy: "mock-citizen-1",
    createdAt: new Date(Date.now() - 34 * 86400000).toISOString(),
    location: {
      lat: 17.432,
      lng: 78.407,
      address: "Jubilee Hills Road No 36, Hyderabad"
    },
    votesCount: 12,
    impactScore: 8,
    reporterName: "Anonymous Citizen",
    updatedAt: new Date(Date.now() - 34 * 86400000).toISOString(),
    dangerLevel: "High: Bitumen erosion causing severe vehicle alignment damage.",
    predictedEffects: "Accidents during night hours and traffic bottlenecking at peak times.",
    budget: 18000,
    suggestions: "Complete base course reconstruction required with deep drainage channels.",
    chronicReportCount: 4,
    totalTaxpayerSpend: 68000
  };

  // Merge: Firestore issues + backend-only issues (no duplicates)
  const firestoreIds = new Set(issues.map(i => i.id));
  const mergedIssues = [
    mockChronicIssue,
    ...issues,
    ...backendIssues.filter(i => !firestoreIds.has(i.id))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sage-bg">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-gov-green animate-spin mx-auto" />
          <span className="text-xs font-bold text-sage-primary uppercase tracking-widest block">
            Establishing Portal Uplink...
          </span>
        </div>
      </div>
    );
  }

  // Public Route Rendering
  if (publicRouteId && publicRouteType) {
    const issue = mergedIssues.find(i => i.id === publicRouteId) || mergedIssues[0];
    return <PublicViralPage type={publicRouteType} id={publicRouteId} issue={issue} issues={mergedIssues} />;
  }

  // Force login for specific dashboard screens if user is not authorized
  if (activeTab === 'admin-portal') {
    if (!user || !isProfileSetupComplete || profile?.role !== 'administration') {
      return <Login onBack={() => setActiveTab('hub')} forceRole="administration" />;
    }
  }

  if (activeTab === 'contractor-portal') {
    if (!user || !isProfileSetupComplete || profile?.role !== 'contractor') {
      return <Login onBack={() => setActiveTab('hub')} forceRole="contractor" />;
    }
  }

  return (
    <div className="min-h-screen bg-sage-bg font-sans antialiased text-gov-green relative flex flex-col">
      
      {/* Dynamic Workplace Loader */}
      <div className="flex-1 flex flex-col">
        {/* Modal Overlay */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden">
              <ReportIssueModal 
                isOpen={isModalOpen} 
                onClose={() => {
                  setIsModalOpen(false);
                  setPrefilledCoords(null);
                }} 
                prefilledCoords={prefilledCoords}
                onSuccess={() => {
                  setIsModalOpen(false);
                  setPrefilledCoords(null);
                }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col">
          {activeTab === 'hub' && (
            <LandingHub 
              onSelectSection={(section) => setActiveTab(section)} 
              issues={mergedIssues}
              onSelectCoords={(lat, lng) => {
                setPrefilledCoords({ lat, lng });
                setIsModalOpen(true);
              }}
              onReportHazard={() => setIsModalOpen(true)}
            />
          )}

          {activeTab === 'issues' && (
            <CommunalIssues 
              issues={mergedIssues}
              onBack={() => setActiveTab('hub')}
              onSelectCoords={(lat, lng) => {
                setPrefilledCoords({ lat, lng });
                setIsModalOpen(true);
              }}
            />
          )}

          {activeTab === 'scanner' && (
            <StructuralScanner 
              onBack={() => setActiveTab('hub')}
              onSuccessReport={() => setActiveTab('issues')}
            />
          )}

          {activeTab === 'admin-portal' && (
            <AdminPortal 
              issues={mergedIssues}
              onBack={() => setActiveTab('hub')}
            />
          )}

          {activeTab === 'contractor-portal' && (
            <ContractorPortal 
              issues={mergedIssues}
              onBack={() => setActiveTab('hub')}
            />
          )}

          {activeTab === 'hero' && (
            <div className="min-h-screen flex flex-col bg-sage-bg">
              <header className="bg-gov-green text-white py-4 px-6 flex items-center justify-between shrink-0 shadow-md">
                <button
                  onClick={() => setActiveTab('hub')}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gov-green-dark hover:bg-gov-green border border-white/10 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Hub
                </button>
                <h2 className="text-sm font-bold uppercase tracking-widest text-gold-accent">Community Hero Node</h2>
                {/* Sub-tab switcher */}
                <div className="flex items-center gap-1 bg-gov-green-dark rounded-xl p-1">
                  <button
                    onClick={() => setHeroSubTab('profile')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      heroSubTab === 'profile'
                        ? 'bg-gold-accent text-gov-green-dark shadow-sm'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" /> Profile
                  </button>
                  <button
                    onClick={() => setHeroSubTab('leaderboard')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      heroSubTab === 'leaderboard'
                        ? 'bg-gold-accent text-gov-green-dark shadow-sm'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    <Trophy className="w-3.5 h-3.5" /> Leaderboard
                  </button>
                </div>
              </header>
              <div className="flex-1 overflow-y-auto">
                {heroSubTab === 'profile' ? (
                  <div className="flex items-center justify-center p-8">
                    <Profile />
                  </div>
                ) : (
                  <div className="max-w-2xl mx-auto px-4 py-8">
                    <Leaderboard />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'justice' && (
            <div className="min-h-screen flex flex-col bg-sage-bg">
              <header className="bg-gov-green text-white py-4 px-6 flex items-center justify-between shrink-0 shadow-md">
                <button
                  onClick={() => setActiveTab('hub')}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gov-green-dark hover:bg-gov-green border border-white/10 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Hub
                </button>
                <h2 className="text-sm font-bold uppercase tracking-widest text-gold-accent">Community Justice Node</h2>
                <div className="w-20" /> {/* Spacer */}
              </header>
              <div className="flex-1 flex items-center justify-center p-8">
                <CommunityJustice />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

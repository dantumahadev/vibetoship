import { useState, useEffect } from "react";
import { useAuth } from "./FirebaseProvider";
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, addDoc, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import { Issue, UserProfile, Tender, Contract, ContractStage } from "../types";
import IssueCard from "./IssueCard";
import { ShieldCheck, Clock, CheckCircle2, ArrowLeft, Sparkles, Building, FileText, Landmark, User, X, Check, MapPin, Award, Plus, Calendar, DollarSign, Tag, Briefcase, ChevronRight, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AdminPortalProps {
  issues: Issue[];
  onBack: () => void;
}

export default function AdminPortal({ issues, onBack }: AdminPortalProps) {
  const { profile } = useAuth();
  const isCorporator = profile?.heroType === 'ghmc_corporator';

  const [activeSubTab, setActiveSubTab] = useState<"grid" | "queue" | "gov" | "corporator" | "contracts" | "contractors" | "mortality">(
    isCorporator ? "corporator" : "grid"
  );
  const [gridFilter, setGridFilter] = useState<"pending" | "resolved">("pending");
  const [aiSort, setAiSort] = useState(true);
  const [pendingHeroes, setPendingHeroes] = useState<UserProfile[]>([]);
  const [processingQueueId, setProcessingQueueId] = useState<string | null>(null);

  // Legal Notice & Escalation states
  const [showLegalNoticeModal, setShowLegalNoticeModal] = useState(false);
  const [legalNoticeText, setLegalNoticeText] = useState("");
  const [activePressureModal, setActivePressureModal] = useState<{
    type: 'rti' | 'collector' | 'social';
    title: string;
    content: string;
    issueId: string;
  } | null>(null);

  // Tender state
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [showTenderForm, setShowTenderForm] = useState(false);
  const [tenderLoading, setTenderLoading] = useState(false);
  const [tenderForm, setTenderForm] = useState({
    title: '',
    description: '',
    wardName: '',
    category: 'road' as NonNullable<Tender['category']>,
    estimatedBudget: '',
    deadlineDays: '14',
  });

  // Listen for pending verification queue
  useEffect(() => {
    const q = query(collection(db, "users"), where("govVerificationStatus", "==", "pending"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => d.data() as UserProfile);
      setPendingHeroes(data);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "users");
    });
    return () => unsubscribe();
  }, []);

  // Listen for live tenders
  useEffect(() => {
    const q = query(collection(db, "tenders"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Tender));
      setTenders(data);
    }, (err) => {
      console.warn("Could not fetch tenders from Firestore:", err);
    });
    return () => unsubscribe();
  }, []);

  // Listen for live contracts
  useEffect(() => {
    const q = query(collection(db, "contracts"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Contract));
      setContracts(data);
    }, (err) => {
      console.warn("Could not fetch contracts from Firestore:", err);
    });
    return () => unsubscribe();
  }, []);

  // Listen for registered contractors (for shadow tracking)
  const [registeredContractors, setRegisteredContractors] = useState<UserProfile[]>([]);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "contractor"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as any));
      setRegisteredContractors(data);
    }, (err) => {
      console.warn("Could not fetch contractors:", err);
    });
    return () => unsubscribe();
  }, []);

  const handleGenerateLegalNotices = () => {
    const text = `FORMAL NOTICE OF CONTRACT BREACH & DEMAND FOR LIQUIDATED DAMAGES
Date: ${new Date().toLocaleDateString()}
To: M/s Raju Constructions (and associated partners)
Ward Zone: Jubilee Hills (Ward 42), GHMC, Hyderabad

SUBJECT: BREACH OF DEFECT LIABILITY PERIOD (DLP) CONTRACT TERMS

Dear Contractor,

Our AI progress and municipal health sensors have detected a total failure and redevelopment of defects at the site: "Jubilee Hills Road Junction", previously marked as completed by your agency under Contract CON-2025-089.

Under Clause 14.2 of the GHMC Standard Contracting Rules, the Defect Liability Period (DLP) of 365 days is active, with 322 days remaining.

You are hereby commanded to:
1. Dispatch remediation crews within 48 hours to fix the road defects FREE of cost.
2. Failure to execute re-work will trigger immediate forfeiture of your bank guarantee amounting to ₹18,000, and permanent revocation of your corporate license on the GHMC Tender Exchange.

Sincerely,
Municipal Commissioner, GHMC`;
    setLegalNoticeText(text);
    setShowLegalNoticeModal(true);
  };
  const filteredGridIssues = issues.filter(issue =>
    gridFilter === "pending" ? issue.status !== "resolved" : issue.status === "resolved"
  );
  const sortedGridIssues = [...filteredGridIssues].sort((a, b) =>
    aiSort ? (b.impactScore || 0) - (a.impactScore || 0) : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const escalatedIssues = issues.filter(i => i.escalated || (i.status !== "resolved" && (i.impactScore || 0) >= 7));
  const activeIssues = issues.filter(i => i.status !== "resolved");
  const totalBudget = activeIssues.reduce((sum, i) => sum + (i.budget || 0), 0);
  const categoriesCount = activeIssues.reduce((acc, i) => { acc[i.category] = (acc[i.category] || 0) + 1; return acc; }, {} as Record<string, number>);

  // Approve/Reject hero
  const handleVerifyHero = async (heroId: string, approve: boolean, hero?: any) => {
    setProcessingQueueId(heroId);
    try {
      const heroRef = doc(db, "users", heroId);
      await updateDoc(heroRef, {
        govVerificationStatus: approve ? "verified" : "rejected",
        rank: approve ? "Verified State Officer" : "Civic Sentinel",
        role: approve ? "administration" : "citizen",
        points: approve ? (profile?.points || 0) + 100 : profile?.points || 0
      });
      const notificationRef = collection(db, "notifications");
      await setDoc(doc(notificationRef), {
        userId: heroId,
        title: approve ? "Government Credentials Approved! 🎖️" : "Verification Request Update",
        message: approve
          ? "Your official government workforce credentials have been verified. You now hold permit access to resolve state hazards."
          : "Your official government verification has been declined. Please re-upload your employment proof document.",
        type: "general",
        read: false,
        createdAt: new Date().toISOString()
      });
      if (approve && hero?.email) {
        fetch("/api/mail/admin-approved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: hero.email, name: hero.displayName || "Government Officer", heroType: hero.heroType || "", govIdNumber: hero.govIdNumber || "" })
        }).catch(err => console.warn("Admin approval email failed:", err));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingQueueId(null);
    }
  };

  // Post a new tender
  const handlePostTender = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenderForm.title.trim() || !tenderForm.description.trim()) return;
    setTenderLoading(true);
    try {
      // 1. Fetch active contractors
      const usersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "contractor")));
      let selectedContractor = {
        uid: "local_1782628963335_toarvo", // Default contractor from users_db.json
        displayName: "Dantu Arunasree",
        contractorCompany: "Dantu Arunasree Constructions"
      };
      if (!usersSnap.empty) {
        const firstDoc = usersSnap.docs[0].data() as UserProfile;
        selectedContractor = {
          uid: firstDoc.uid,
          displayName: firstDoc.displayName,
          contractorCompany: firstDoc.contractorCompany || firstDoc.displayName
        };
      }

      // 2. Call AI to generate timeline stages
      let timelineStages: ContractStage[] = [];
      try {
        const timelineRes = await fetch("/api/ai/generate-timeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: tenderForm.title, description: tenderForm.description })
        });
        if (timelineRes.ok) {
          const resData = await timelineRes.json();
          timelineStages = resData.stages.map((stage: any) => ({
            ...stage,
            status: 'pending' as const
          }));
        } else {
          throw new Error("Failed to fetch timeline");
        }
      } catch (aiErr) {
        console.warn("AI timeline generation failed, falling back to heuristics:", aiErr);
        // Direct local fallback matching title keyword
        const tLower = tenderForm.title.toLowerCase();
        if (tLower.includes("road") || tLower.includes("pothole") || tLower.includes("asphalt")) {
          timelineStages = [
            { id: "stage-1", targetDay: 1, title: "Survey & Road Markings", description: "Cordon off zone, layout topological markings.", metric: "Visual yellow and white guiding paint markings on target road boundaries.", status: "pending" },
            { id: "stage-2", targetDay: 2, title: "Base Excavation & Subgrade Grading", description: "Excavate deteriorated surface layer, grade subgrade base.", metric: "Leveled subgrade aggregate gravel bed under roller compaction.", status: "pending" },
            { id: "stage-3", targetDay: 3, title: "Asphalt Laying & Hot-mix Rolling", description: "Pour hot-mix asphalt concrete, roll with vibratory compactors.", metric: "Smooth, solid black tar asphalt overlay covering the excavation.", status: "pending" },
            { id: "stage-4", targetDay: 4, title: "Curing, Painting & Traffic Handover", description: "Apply line markings, install cat-eyes, clear safety cones.", metric: "Reflective white lines painted and traffic safety cones removed.", status: "pending" }
          ];
        } else {
          timelineStages = [
            { id: "stage-1", targetDay: 1, title: "Site Mobilization & Safety Cordoning", description: "Deliver materials and cordon off work bounds.", metric: "Cordoning tape installed around the work perimeter with warning signs.", status: "pending" },
            { id: "stage-2", targetDay: 2, title: "Core Work Execution & Structural Assembly", description: "Carry out primary structural repairs or component assembly.", metric: "Installed or repaired structural assets anchored securely.", status: "pending" },
            { id: "stage-3", targetDay: 3, title: "Quality Audit & Final Cleanup", description: "Audit completed works against specifications, clear debris.", metric: "Functional repair verified with clean surrounding site.", status: "pending" }
          ];
        }
      }

      const deadlineMs = Date.now() + parseInt(tenderForm.deadlineDays || '14') * 86400000;
      
      // 3. Post awarded tender
      const newTender: Omit<Tender, 'id'> = {
        title: tenderForm.title.trim(),
        description: tenderForm.description.trim(),
        estimatedBudget: parseFloat(tenderForm.estimatedBudget) || 0,
        status: 'awarded', // Automatically awarded
        createdAt: new Date().toISOString(),
        deadline: new Date(deadlineMs).toISOString(),
        bids: [{
          contractorId: selectedContractor.uid,
          contractorName: selectedContractor.contractorCompany,
          bidAmount: parseFloat(tenderForm.estimatedBudget) || 0,
          proposal: "Automatically selected by GHMC instant-award system.",
          submittedAt: new Date().toISOString()
        }],
        postedBy: profile?.uid,
        postedByName: profile?.displayName || 'GHMC Corporator',
        wardName: tenderForm.wardName.trim() || profile?.corporatorWard || 'General Ward',
        category: tenderForm.category,
      };
      
      const tenderDocRef = await addDoc(collection(db, 'tenders'), newTender);

      // 4. Create active Contract
      const contractId = "CON-" + Date.now().toString().slice(-6);
      const newContract: Contract = {
        id: contractId,
        tenderId: tenderDocRef.id,
        contractorId: selectedContractor.uid,
        contractorName: selectedContractor.contractorCompany,
        tenderTitle: newTender.title,
        status: 'active',
        agreedAmount: newTender.estimatedBudget,
        startDate: new Date().toISOString(),
        defectLiabilityPeriodDays: 365,
        stages: timelineStages
      };
      await setDoc(doc(db, 'contracts', contractId), newContract);

      setTenderForm({ title: '', description: '', wardName: '', category: 'road', estimatedBudget: '', deadlineDays: '14' });
      setShowTenderForm(false);
    } catch (err) {
      console.error("Failed to post and award tender:", err);
    } finally {
      setTenderLoading(false);
    }
  };

  const categoryColors: Record<string, string> = {
    road: 'bg-orange-100 text-orange-800 border-orange-200',
    water: 'bg-blue-100 text-blue-800 border-blue-200',
    electric: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    structure: 'bg-slate-100 text-slate-800 border-slate-200',
    other: 'bg-purple-100 text-purple-800 border-purple-200',
  };

  const myTenders = isCorporator ? tenders.filter(t => t.postedBy === profile?.uid) : tenders;

  return (
    <div className="min-h-screen w-screen flex flex-col bg-sage-bg select-none">
      <header className="bg-gov-green text-white py-4 px-6 flex items-center justify-between shrink-0 shadow-md z-30">
        <button onClick={onBack} className="flex items-center gap-2 px-3 py-1.5 bg-gov-green-dark hover:bg-gov-green border border-white/10 rounded-lg text-xs font-bold transition-all cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back to Hub
        </button>
        <h2 className="text-sm font-bold uppercase tracking-widest text-gold-accent flex items-center gap-2">
          <Landmark className="w-4 h-4 text-gold-accent" />
          {isCorporator ? `Corporator Dashboard — ${profile?.displayName}` : 'Administration Control Room'}
        </h2>
        <div className="w-24" />
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-4 space-y-2 flex flex-col justify-start shrink-0">
          <div className="px-3 py-2 mb-4">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block">ADMIN DESK</span>
            <span className="text-xs font-bold text-gov-green">{isCorporator ? '⚡ Corporator Access' : 'Authorized Session active'}</span>
          </div>

          {!isCorporator && (
            <>
              <button onClick={() => setActiveSubTab("grid")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-left transition-all ${activeSubTab === "grid" ? "bg-gov-green text-white" : "text-sage-primary hover:bg-slate-50 hover:text-gov-green"}`}>
                <ShieldCheck className="w-4 h-4" /> Grid Defect Feed
              </button>
              <button onClick={() => setActiveSubTab("queue")} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-left transition-all ${activeSubTab === "queue" ? "bg-gov-green text-white" : "text-sage-primary hover:bg-slate-50 hover:text-gov-green"}`}>
                <span className="flex items-center gap-3"><Clock className="w-4 h-4" /> Workforce Queue</span>
                {pendingHeroes.length > 0 && <span className="bg-red-500 text-white rounded-full px-2 py-0.5 text-[9px] font-black animate-pulse">{pendingHeroes.length}</span>}
              </button>
              <button onClick={() => setActiveSubTab("gov")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-left transition-all ${activeSubTab === "gov" ? "bg-gov-green text-white" : "text-sage-primary hover:bg-slate-50 hover:text-gov-green"}`}>
                <Building className="w-4 h-4" /> Gov Official Desk
              </button>
            </>
          )}

          <button onClick={() => setActiveSubTab("corporator")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-left transition-all ${activeSubTab === "corporator" ? "bg-emerald-700 text-white" : "text-sage-primary hover:bg-emerald-50 hover:text-emerald-700"}`}>
            <Landmark className="w-4 h-4" /> {isCorporator ? 'Tender Management' : 'Corporator Panel'}
          </button>

          <button onClick={() => setActiveSubTab("contracts")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-left transition-all ${activeSubTab === "contracts" ? "bg-emerald-700 text-white" : "text-sage-primary hover:bg-emerald-50 hover:text-emerald-700"}`}>
            <Briefcase className="w-4 h-4" /> Contracts Audit Desk
          </button>

          <button onClick={() => setActiveSubTab("mortality")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-left transition-all ${activeSubTab === "mortality" ? "bg-amber-600 text-white" : "text-sage-primary hover:bg-emerald-50 hover:text-emerald-700"}`}>
            <Clock className="w-4 h-4 text-gold-accent" /> Mortality Tracking
          </button>

          <button onClick={() => setActiveSubTab("contractors")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-left transition-all ${activeSubTab === "contractors" ? "bg-emerald-700 text-white" : "text-sage-primary hover:bg-emerald-50 hover:text-emerald-700"}`}>
            <AlertTriangle className="w-4 h-4" /> Shadow Shell Alerts
          </button>

          <div className="flex-1" />
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center mt-auto">
            <Landmark className="w-8 h-8 text-gov-green mx-auto mb-2" />
            <h4 className="text-xs font-extrabold text-gov-green uppercase">{isCorporator ? (profile?.corporatorWard || 'GHMC Ward') : 'Ward 4 Administration'}</h4>
            <span className="text-[9px] text-slate-400 font-bold block mt-1">GHMC MUNICIPALITY</span>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          <AnimatePresence mode="wait">

            {/* GRID FEED TAB */}
            {activeSubTab === "grid" && (
              <motion.div key="grid" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 max-w-4xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black text-gov-green uppercase">Administrative GIS Defect Feed</h3>
                    <p className="text-xs text-sage-primary font-semibold">Review all submitted neighborhood infrastructure hazards and verify repairs.</p>
                  </div>
                  <div className="flex bg-slate-200/60 p-1 rounded-xl border border-slate-200 shrink-0">
                    <button onClick={() => setGridFilter("pending")} className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${gridFilter === "pending" ? "bg-gov-green text-white shadow-sm" : "text-sage-primary"}`}>Pending ({issues.filter(i => i.status !== "resolved").length})</button>
                    <button onClick={() => setGridFilter("resolved")} className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${gridFilter === "resolved" ? "bg-gov-green text-white shadow-sm" : "text-sage-primary"}`}>Resolved ({issues.filter(i => i.status === "resolved").length})</button>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-white border border-slate-200 px-5 py-3 rounded-2xl shadow-sm">
                  <span className="text-xs font-bold text-gov-green">Showing {sortedGridIssues.length} issue{sortedGridIssues.length !== 1 ? "s" : ""}</span>
                  <button onClick={() => setAiSort(!aiSort)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${aiSort ? "bg-gold-accent/15 border-gold-accent/40 text-gold-accent" : "bg-white border-slate-200 text-slate-500"}`}>
                    <Sparkles className={`w-3.5 h-3.5 ${aiSort ? "text-gold-accent fill-gold-accent" : ""}`} /> Sort by AI Priority: {aiSort ? "ON" : "OFF"}
                  </button>
                </div>
                <div className="space-y-4">
                  {sortedGridIssues.length === 0 ? (
                    <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-3xl p-6"><CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3 animate-bounce" /><p className="text-gov-green font-bold text-xs uppercase tracking-wide">Clean Grid</p></div>
                  ) : sortedGridIssues.map(issue => <IssueCard key={issue.id} issue={issue} isAdminPortal={true} />)}
                </div>
              </motion.div>
            )}

            {/* WORKFORCE QUEUE TAB */}
            {activeSubTab === "queue" && (
              <motion.div key="queue" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 max-w-4xl">
                <div><h3 className="text-xl font-black text-gov-green uppercase">Workforce Verification Ledger</h3><p className="text-xs text-sage-primary font-semibold">Audit, approve or reject credentials for regional government-permit workers.</p></div>
                <div className="space-y-4">
                  {pendingHeroes.length === 0 ? (
                    <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-3xl p-6"><CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" /><p className="text-gov-green font-bold text-xs uppercase tracking-wide">Queue Clear</p></div>
                  ) : pendingHeroes.map(pending => (
                    <div key={pending.uid} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gov-green/10 border border-slate-200 shrink-0 flex items-center justify-center">
                            {pending.heroPhotoUrl ? <img src={pending.heroPhotoUrl} alt="Avatar" className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-gov-green" />}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gov-green leading-snug">{pending.displayName}</h4>
                            <span className="text-[10px] text-gold-accent font-black uppercase tracking-wider block mt-0.5">Specialty: {pending.heroType?.replace("_", " ")}</span>
                          </div>
                        </div>
                        <span className="bg-amber-500/10 text-amber-800 border border-amber-500/20 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase">Pending Review</span>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-2 gap-4">
                        <div><span className="text-[9px] text-slate-400 font-bold uppercase block">Employee ID</span><span className="text-xs font-bold text-gov-green font-mono">{pending.govIdNumber || "N/A"}</span></div>
                        <div><span className="text-[9px] text-slate-400 font-bold uppercase block">Base location</span><span className="text-xs font-bold text-gov-green truncate block">{pending.serviceLocation?.address || "N/A"}</span></div>
                      </div>
                      {pending.govProofUrl && (
                        <div><span className="text-[9px] text-slate-400 font-bold uppercase block pl-1 mb-1.5">Uploaded Credential Proof</span>
                          <div className="w-full h-52 rounded-xl overflow-hidden border border-slate-200"><img src={pending.govProofUrl} alt="Employment ID" className="w-full h-full object-cover" /></div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button disabled={processingQueueId === pending.uid} onClick={() => handleVerifyHero(pending.uid, false, pending)} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"><X className="w-4 h-4" /> Decline</button>
                        <button disabled={processingQueueId === pending.uid} onClick={() => handleVerifyHero(pending.uid, true, pending)} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-md"><Check className="w-4 h-4 text-gold-accent" /> Approve & Verify</button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* GOV OFFICIAL DESK */}
            {activeSubTab === "gov" && (
              <motion.div key="gov" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 max-w-4xl">
                <div><h3 className="text-xl font-black text-gov-green uppercase">Government Official Escalation Desk</h3><p className="text-xs text-sage-primary font-semibold">Review official RTI escalation queries, statutory filings, and complaints regarding action not taken.</p></div>
                <div className="space-y-4">
                  {escalatedIssues.length === 0 ? (
                    <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-3xl p-6"><FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" /><p className="text-gov-green font-bold text-xs uppercase tracking-wide">In-basket Empty</p></div>
                  ) : escalatedIssues.map(issue => (
                    <div key={issue.id} className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${issue.escalated ? "bg-red-500/10 text-red-700 border-red-500/20" : "bg-amber-500/10 text-amber-700 border-amber-500/20"}`}>{issue.escalated ? "Official RTI Escalation" : "Action Not Taken Complaint"}</span>
                        <span className="text-xs font-mono font-bold text-red-600">AI Severity Rating: {issue.impactScore}/10</span>
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-gov-green">{issue.title}</h4>
                        <p className="text-xs text-sage-primary mt-1 font-semibold">{issue.description}</p>
                        <div className="flex items-center gap-1.5 mt-2 text-slate-400 text-[10px] font-bold uppercase"><MapPin className="w-3.5 h-3.5 shrink-0" />{issue.location.address}</div>
                      </div>
                      {issue.escalationLetter && <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 font-mono text-[11px] leading-relaxed text-slate-600 max-h-56 overflow-y-auto">{issue.escalationLetter}</div>}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* CORPORATOR / TENDER MANAGEMENT TAB */}
            {activeSubTab === "corporator" && (
              <motion.div key="corporator" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 max-w-4xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-gov-green uppercase">{isCorporator ? 'Tender Management' : 'Ward Corporator Dashboard'}</h3>
                    <p className="text-xs text-sage-primary font-semibold">Post and manage tenders visible to registered contractors.</p>
                  </div>
                  {isCorporator && (
                    <button onClick={() => setShowTenderForm(v => !v)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md">
                      <Plus className="w-4 h-4" /> Post New Tender
                    </button>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"><span className="text-[9px] text-slate-400 font-extrabold uppercase block tracking-widest">Active Defects</span><span className="text-2xl font-black text-gov-green block mt-1">{activeIssues.length}</span></div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"><span className="text-[9px] text-slate-400 font-extrabold uppercase block tracking-widest">Budget Required</span><span className="text-2xl font-black text-gov-green block mt-1">₹{totalBudget.toLocaleString()}</span></div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"><span className="text-[9px] text-slate-400 font-extrabold uppercase block tracking-widest">Open Tenders</span><span className="text-2xl font-black text-emerald-700 block mt-1">{myTenders.filter(t => t.status === 'open').length}</span></div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"><span className="text-[9px] text-slate-400 font-extrabold uppercase block tracking-widest">Resolution Rate</span><span className="text-2xl font-black text-emerald-600 block mt-1">{issues.length > 0 ? Math.round((issues.filter(i => i.status === "resolved").length / issues.length) * 100) : 0}%</span></div>
                </div>

                {/* Tender form */}
                <AnimatePresence>
                  {showTenderForm && (
                    <motion.div key="tender-form" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white border border-emerald-200 rounded-3xl p-6 shadow-md space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-gov-green uppercase tracking-wide">Post New Tender</h4>
                        <button onClick={() => setShowTenderForm(false)} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"><X className="w-4 h-4" /></button>
                      </div>
                      <form onSubmit={handlePostTender} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="sm:col-span-2 space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Tender Title *</label>
                            <input required value={tenderForm.title} onChange={e => setTenderForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Main Road Asphalt Repaving — Ward 4" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-gov-green outline-none focus:border-emerald-400 transition-all" />
                          </div>
                          <div className="sm:col-span-2 space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Description *</label>
                            <textarea required rows={3} value={tenderForm.description} onChange={e => setTenderForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe the work scope, location, and requirements..." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-gov-green outline-none focus:border-emerald-400 transition-all resize-none" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Ward / Location</label>
                            <input value={tenderForm.wardName} onChange={e => setTenderForm(p => ({ ...p, wardName: e.target.value }))} placeholder="e.g. Ward 4, Hyderabad" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-gov-green outline-none focus:border-emerald-400 transition-all" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Category</label>
                            <select value={tenderForm.category} onChange={e => setTenderForm(p => ({ ...p, category: e.target.value as NonNullable<Tender['category']> }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-gov-green outline-none focus:border-emerald-400 transition-all">
                              <option value="road">Road & Pavement</option>
                              <option value="water">Water & Drainage</option>
                              <option value="electric">Electrical & Lighting</option>
                              <option value="structure">Structural Works</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Estimated Budget (₹)</label>
                            <input type="number" min="0" value={tenderForm.estimatedBudget} onChange={e => setTenderForm(p => ({ ...p, estimatedBudget: e.target.value }))} placeholder="e.g. 500000" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-gov-green outline-none focus:border-emerald-400 transition-all" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Deadline (days from now)</label>
                            <input type="number" min="1" max="180" value={tenderForm.deadlineDays} onChange={e => setTenderForm(p => ({ ...p, deadlineDays: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-gov-green outline-none focus:border-emerald-400 transition-all" />
                          </div>
                        </div>
                        <button type="submit" disabled={tenderLoading} className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-md">
                          {tenderLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                          Publish Tender to Contractor Exchange
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Tender list */}
                <div className="space-y-4">
                  <h4 className="text-sm font-extrabold text-gov-green uppercase tracking-wide">{isCorporator ? 'My Posted Tenders' : 'All Active Tenders'}</h4>
                  {myTenders.length === 0 ? (
                    <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-3xl">
                      <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-gov-green font-bold text-xs uppercase tracking-wide">No Tenders Yet</p>
                      {isCorporator && <p className="text-slate-400 text-[10px] mt-1 font-semibold">Click "Post New Tender" to create your first tender.</p>}
                    </div>
                  ) : myTenders.map(tender => (
                    <div key={tender.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h5 className="text-sm font-black text-gov-green leading-snug">{tender.title}</h5>
                          {tender.wardName && <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{tender.wardName}</span>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {tender.category && <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${categoryColors[tender.category] || categoryColors.other}`}>{tender.category}</span>}
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${tender.status === 'open' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : tender.status === 'awarded' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{tender.status}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 font-semibold leading-relaxed line-clamp-2">{tender.description}</p>
                      <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase">
                        {(tender.estimatedBudget || 0) > 0 && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3 text-emerald-500" />₹{(tender.estimatedBudget || 0).toLocaleString()}</span>}
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-amber-500" />Deadline: {new Date(tender.deadline).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><Tag className="w-3 h-3 text-blue-400" />{tender.bids?.length || 0} Bids</span>
                      </div>
                      {(tender.bids?.length || 0) > 0 && (
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Contractor Bids</span>
                          {tender.bids.map((bid, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <span className="font-bold text-gov-green">{bid.contractorName}</span>
                              <span className="font-black text-emerald-700">₹{bid.bidAmount.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* CONTRACTS AUDIT DESK TAB */}
            {activeSubTab === "contracts" && (
              <motion.div key="contracts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 max-w-4xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-xl font-black text-gov-green uppercase">Contracts Audit Desk</h3>
                    <p className="text-xs text-sage-primary font-semibold">Monitor and audit progress timelines, safety metrics, and AI verification logs for all active and completed contracts.</p>
                  </div>
                </div>

                {/* Durability Trap Alert Panel */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-red-50 border border-red-250 rounded-3xl p-6 shadow-sm flex items-start gap-4">
                    <div className="w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-md shrink-0">
                      <AlertTriangle className="w-6 h-6 text-white animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs font-black text-red-800 uppercase tracking-widest mb-1">Contractor Durability Trap Alerts</h4>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-3xl font-black text-red-900">{contracts.filter(c => c.status === 'violated').length + 3}</span>
                        <span className="text-xs font-extrabold text-red-800 uppercase">Violations Flagged</span>
                      </div>
                      <p className="text-[11px] text-red-700 font-semibold mt-1">Contractors whose repairs failed within the 365-day Defect Liability Period.</p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-205 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Total Sunk Cost Recovery</span>
                      <div className="text-3xl font-black text-slate-900 mt-2">
                        ₹{(contracts.filter(c => c.status === 'violated').reduce((acc, c) => acc + c.agreedAmount, 0) + 47000).toLocaleString()}
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">Pending claims for free re-work or direct recovery from contractor bank guarantees.</p>
                    </div>
                    <button 
                      onClick={() => handleGenerateLegalNotices()}
                      className="mt-4 w-full py-3 bg-slate-950 hover:bg-slate-900 text-white rounded-2xl text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer text-center shadow-sm"
                    >
                      Generate Legal Notices
                    </button>
                  </div>
                </div>

                {contracts.length === 0 ? (
                  <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-3xl">
                    <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-gov-green font-bold text-xs uppercase tracking-wide">No Active Contracts</p>
                    <p className="text-slate-400 text-[10px] mt-1 font-semibold">When a tender is published, a contractor is auto-assigned and a contract appears here.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {contracts.map(contract => (
                      <div key={contract.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div>
                            <span className="text-[10px] font-black text-slate-400 tracking-wider block uppercase">{contract.id} • TENDER: #{contract.tenderId.slice(-6).toUpperCase()}</span>
                            <h4 className="text-base font-black text-gov-green mt-1">{contract.tenderTitle}</h4>
                            <p className="text-xs text-slate-500 font-bold mt-1">Contractor: <span className="text-amber-600 font-black">{contract.contractorName}</span></p>
                          </div>
                          <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase border tracking-wider ${
                            contract.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            contract.status === 'violated' ? 'bg-red-50 text-red-700 border-red-200 animate-pulse font-black' :
                            contract.status === 'active' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            {contract.status === 'violated' ? '⚠️ Violated & Terminated' : contract.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 rounded-2xl p-4 text-xs font-bold text-slate-500">
                          <div>
                            <span className="text-[9px] uppercase text-slate-400 block mb-0.5">Agreed Budget</span>
                            <span className="text-sm font-black text-slate-800">₹{contract.agreedAmount.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase text-slate-400 block mb-0.5">Start Date</span>
                            <span className="text-sm font-black text-slate-800">{new Date(contract.startDate).toLocaleDateString()}</span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase text-slate-400 block mb-0.5">Defect Liability Period</span>
                            <span className="text-sm font-black text-slate-800">{contract.defectLiabilityPeriodDays} Days</span>
                          </div>
                        </div>

                        {/* Timeline Stages */}
                        <div className="space-y-3 pt-2">
                          <span className="text-[10px] font-black text-gov-green uppercase tracking-wider block">AI-Generated Project Timeline & Progress Metrics</span>
                          <div className="relative border-l border-slate-200 pl-6 ml-3 space-y-4">
                            {contract.stages.map((stage, idx) => (
                              <div key={stage.id} className="relative">
                                {/* Bullet indicator */}
                                <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                                  stage.status === 'completed' ? 'border-emerald-500 text-emerald-500 bg-emerald-50' :
                                  contract.status === 'violated' && stage.status === 'pending' && idx === contract.stages.findIndex(s => s.status === 'pending') ? 'border-red-500 text-red-500 bg-red-50' :
                                  'border-slate-300 text-slate-400'
                                }`}>
                                  {stage.status === 'completed' ? (
                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  ) : contract.status === 'violated' && stage.status === 'pending' && idx === contract.stages.findIndex(s => s.status === 'pending') ? (
                                    <X className="w-2.5 h-2.5 stroke-[3]" />
                                  ) : (
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                  )}
                                </div>

                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-black text-slate-700">Stage {idx + 1}: {stage.title}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${
                                      stage.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                      contract.status === 'violated' && stage.status === 'pending' && idx === contract.stages.findIndex(s => s.status === 'pending') ? 'bg-red-50 text-red-700 border-red-200 font-bold' :
                                      'bg-slate-100 text-slate-500 border-slate-200'
                                    }`}>
                                      {contract.status === 'violated' && stage.status === 'pending' && idx === contract.stages.findIndex(s => s.status === 'pending') ? 'Audit Failed' : stage.status}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 font-semibold">{stage.description}</p>
                                  <div className="bg-slate-50/50 rounded-lg p-2 border border-slate-100/85 text-[11px] font-semibold text-slate-600">
                                    <span className="font-extrabold text-gov-green text-[9px] uppercase tracking-wider block mb-0.5">Required AI Metric</span>
                                    {stage.metric}
                                  </div>

                                  {/* Submitted proof */}
                                  {stage.imageUrl && (
                                    <div className="mt-2 bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 max-w-md shadow-sm">
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Contractor Submission Proof</span>
                                      <img src={stage.imageUrl} alt="Progress Proof" className="w-full h-32 object-cover rounded-lg border border-slate-200" />
                                      {stage.progressNotes && <p className="text-xs text-slate-600 font-semibold italic">"{stage.progressNotes}"</p>}
                                      <div className={`p-2 rounded-lg text-[10px] font-bold ${
                                        stage.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
                                      }`}>
                                        <span className="font-black block uppercase mb-0.5">AI Audit Verdict</span>
                                        {stage.status === 'completed' ? '✓ Verification passed: Submitted proof satisfies quality metric.' : '⚠️ Verification failed: Quality metrics not satisfied. Contract terminated.'}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* INFRASTRUCTURE MORTALITY / PREDICTIVE DEATH CERTIFICATES */}
            {activeSubTab === "mortality" && (
              <motion.div key="mortality" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 max-w-4xl">
                <div>
                  <h3 className="text-xl font-black text-gov-green uppercase">Predictive Infrastructure Mortality Ledger</h3>
                  <p className="text-xs text-sage-primary font-semibold">
                    Monitor subsoil failures and target locations at statistical risk of breakdown prior to citizen complaints.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Item 1 */}
                  <div className="bg-white border-2 border-red-300 rounded-3xl p-6 shadow-md relative overflow-hidden space-y-4">
                    <div className="absolute top-0 right-0 px-3 py-1 bg-red-600 text-white text-[9px] font-black uppercase tracking-wider rounded-bl-xl animate-pulse">
                      🔴 Overdue for Failure (40 days)
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center shadow-md shrink-0">
                        <Clock className="w-6 h-6 text-red-650" />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block">WARD 42 REGISTRY</span>
                        <h4 className="text-base font-black text-slate-900 mt-1">Jubilee Hills Junction Road Pavement</h4>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">Asset ID: PAV-JH-442</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs font-bold text-slate-500">
                      <div>
                        <span className="text-[9px] uppercase text-slate-400 block mb-0.5">Current Repair Age</span>
                        <span className="text-xs font-black text-red-755">89 Days</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-slate-400 block mb-0.5">Historical Failure Avg</span>
                        <span className="text-xs font-black text-slate-800">49 Days</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-slate-400 block mb-0.5">Failure Projection</span>
                        <span className="text-xs font-black text-red-700">Immediate (2-3 Weeks)</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-slate-400 block mb-0.5">Contractor</span>
                        <span className="text-xs font-black text-amber-600">M/s Raju Constructions</span>
                      </div>
                    </div>

                    <div className="bg-red-50/50 p-4 rounded-xl border border-red-200 space-y-2 text-xs">
                      <p className="font-extrabold text-red-800 uppercase text-[9px] tracking-wider">Recommended Preventive Actions:</p>
                      <p className="text-slate-700 font-semibold leading-relaxed">
                        Execute full base subgrade excavation and reroute storm water drainage channel within 48 hours. Surface patching will collapse within 30 days due to subsoil drainage saturation.
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-4 flex-wrap gap-2 text-xs font-bold uppercase">
                      <div className="flex gap-4">
                        <div>Proactive Cost: <span className="text-gov-green font-extrabold">₹12,000</span></div>
                        <div>Reactive Cost: <span className="text-red-650 font-extrabold">₹35,000</span></div>
                      </div>
                      <div className="text-emerald-750 font-black flex items-center gap-1">
                        🏆 Net Taxpayer Savings: ₹23,000
                      </div>
                    </div>
                  </div>

                  {/* Item 2 */}
                  <div className="bg-white border border-amber-300 rounded-3xl p-6 shadow-sm relative overflow-hidden space-y-4">
                    <div className="absolute top-0 right-0 px-3 py-1 bg-amber-500 text-slate-950 text-[9px] font-black uppercase tracking-wider rounded-bl-xl">
                      🟡 Approaching Failure (Within 7 Days)
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-amber-50 border border-amber-250 rounded-2xl flex items-center justify-center shadow-md shrink-0">
                        <AlertTriangle className="w-6 h-6 text-amber-500 animate-pulse" />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block">WARD 28 REGISTRY</span>
                        <h4 className="text-base font-black text-slate-900 mt-1">Kukatpally Transit Corridor Base</h4>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">Asset ID: PAV-KK-908</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs font-bold text-slate-500">
                      <div>
                        <span className="text-[9px] uppercase text-slate-400 block mb-0.5">Current Repair Age</span>
                        <span className="text-xs font-black text-amber-700">58 Days</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-slate-400 block mb-0.5">Historical Failure Avg</span>
                        <span className="text-xs font-black text-slate-800">61 Days</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-slate-400 block mb-0.5">Failure Projection</span>
                        <span className="text-xs font-black text-amber-600">7 Days</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-slate-400 block mb-0.5">Contractor</span>
                        <span className="text-xs font-black text-amber-600">Amara Infrastructure</span>
                      </div>
                    </div>

                    <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 space-y-2 text-xs">
                      <p className="font-extrabold text-amber-850 uppercase text-[9px] tracking-wider">Recommended Preventive Actions:</p>
                      <p className="text-slate-700 font-semibold leading-relaxed">
                        Verify and reinforce concrete pillar bases at coordinate cluster. Inspect micro-fissure expansion on support columns due to vehicle vibration loadings.
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-4 flex-wrap gap-2 text-xs font-bold uppercase">
                      <div className="flex gap-4">
                        <div>Proactive Cost: <span className="text-gov-green font-extrabold">₹18,500</span></div>
                        <div>Reactive Cost: <span className="text-red-650 font-extrabold">₹50,000</span></div>
                      </div>
                      <div className="text-emerald-755 font-black flex items-center gap-1">
                        🏆 Net Taxpayer Savings: ₹31,500
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SHADOW SHELL ALERTS TAB */}
            {activeSubTab === "contractors" && (
              <motion.div key="contractors" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 max-w-4xl">
                <div>
                  <h3 className="text-xl font-black text-gov-green uppercase">Tender Shadow Tracking & Shell Alerts</h3>
                  <p className="text-xs text-sage-primary font-semibold">Expose blacklisted contractors attempting to win municipal tenders under new shell companies or aliases.</p>
                </div>

                <div className="space-y-4">
                  {/* Mock Shell Contractor Alert */}
                  <div className="bg-red-50 border-2 border-red-300 rounded-3xl p-6 shadow-md relative overflow-hidden space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center shadow-md shrink-0">
                        <AlertTriangle className="w-6 h-6 text-red-650 animate-bounce" />
                      </div>
                      <div className="flex-1">
                        <span className="bg-red-200 text-red-800 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest animate-pulse">⚠️ POSSIBLE SHELL CONTRACTOR DETECTED</span>
                        <h4 className="text-base font-black text-red-950 mt-1">M/s Raju Infrastructure Pvt Ltd</h4>
                        <p className="text-xs font-semibold text-red-800">License: TS-CON-4421</p>
                      </div>
                    </div>

                    <div className="bg-white/80 p-4 rounded-xl border border-red-200 text-xs font-semibold text-slate-700 space-y-2">
                      <span className="text-[9px] font-black uppercase text-red-700 block tracking-widest">Similarity Vectors Detected:</span>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Contact phone number matches blacklisted contractor <span className="font-bold text-slate-900">M/s Raju Constructions</span></li>
                        <li>Same corporate ward zone application (Jubilee Hills Ward 42)</li>
                        <li>Director name partial match: <span className="font-bold text-slate-900">Raju K. vs. Raju Kumar</span></li>
                      </ul>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => alert("Flagged for Commissioner manual review.")}
                        className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Flag for Manual Review
                      </button>
                      <button 
                        onClick={() => alert("Contractor Blocked and Tender Bids Terminated.")}
                        className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-md"
                      >
                        Block Tender
                      </button>
                    </div>
                  </div>

                  {/* Registered Contractors List */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Registered Contractors Registry</h4>
                    <div className="divide-y divide-slate-100">
                      {registeredContractors.length === 0 ? (
                        <p className="text-slate-400 text-xs py-4 font-semibold">No contractors registered yet.</p>
                      ) : (
                        registeredContractors.map(c => (
                          <div key={c.uid} className="py-3.5 flex items-center justify-between gap-4 text-xs">
                            <div>
                              <div className="font-black text-slate-800">{c.contractorCompany || c.displayName || "Contractor Partner"}</div>
                              <div className="text-slate-400 font-semibold text-[10px]">License: {c.contractorLicense || "N/A"} • Phone: {c.phoneNumber || "N/A"}</div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${c.isBlacklisted ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                              {c.isBlacklisted ? 'Blacklisted' : 'Active Approved'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Legal Notice Modal */}
      <AnimatePresence>
        {showLegalNoticeModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] border border-slate-100 max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className="text-base font-black text-slate-900 tracking-tight uppercase">AI Legal Notice Draft</h3>
                <button onClick={() => setShowLegalNoticeModal(false)} className="text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-8 overflow-y-auto flex-1 font-mono text-xs leading-relaxed text-slate-650 bg-slate-50 border-b border-slate-100 whitespace-pre-wrap select-text">
                {legalNoticeText}
              </div>
              <div className="px-8 py-5 flex items-center justify-between shrink-0 bg-slate-50">
                <button 
                  onClick={() => setShowLegalNoticeModal(false)}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(legalNoticeText);
                    alert("Copied to clipboard!");
                  }}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-md"
                >
                  Copy Notice Text
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

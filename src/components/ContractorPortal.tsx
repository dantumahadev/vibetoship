import { useState, useEffect } from "react";
import { HardHat, FileText, AlertTriangle, CheckCircle2, Calendar, DollarSign, MapPin, Tag, Send, ChevronDown, ChevronUp, Loader2, Briefcase, Camera, Check, X, Ban } from "lucide-react";
import { useAuth } from "./FirebaseProvider";
import { Issue, Tender, Contract, ContractStage } from "../types";
import { collection, query, onSnapshot, doc, updateDoc, arrayUnion, where, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { motion, AnimatePresence } from "motion/react";

export default function ContractorPortal({ onBack, issues }: { onBack: () => void, issues: Issue[] }) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<"tenders" | "contracts" | "violations">("tenders");
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loadingTenders, setLoadingTenders] = useState(true);
  const [expandedTender, setExpandedTender] = useState<string | null>(null);
  const [bidForms, setBidForms] = useState<Record<string, { amount: string; proposal: string }>>({});
  const [submittingBid, setSubmittingBid] = useState<string | null>(null);
  const [bidSuccess, setBidSuccess] = useState<string | null>(null);

  // Live Contracts state
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(true);

  // Progress update state
  const [verifyingStage, setVerifyingStage] = useState<{ contract: Contract, stage: ContractStage } | null>(null);
  const [progressNotes, setProgressNotes] = useState("");
  const [progressImageFile, setProgressImageFile] = useState<File | null>(null);
  const [selectedDemoImage, setSelectedDemoImage] = useState("https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=400&q=80");
  const [useUpload, setUseUpload] = useState(false);
  const [verifyingProgress, setVerifyingProgress] = useState(false);
  const [auditFeedback, setAuditFeedback] = useState<{ success: boolean, message: string } | null>(null);

  const demoImages = [
    { label: "Road Marking / Asphalt Work", url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=400&q=80" },
    { label: "Water Pipeline Replacement", url: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=400&q=80" },
    { label: "Construction Site Excavation", url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80" },
  ];

  // Helper: File to base64
  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

  // Query live contracts
  useEffect(() => {
    if (!profile?.uid) return;
    const q = query(collection(db, "contracts"), where("contractorId", "==", profile.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Contract));
      setContracts(data);
      setLoadingContracts(false);
    }, (err) => {
      console.warn("Could not fetch contracts from Firestore:", err);
      setLoadingContracts(false);
    });
    return () => unsubscribe();
  }, [profile?.uid]);

  // Live Firestore tenders
  useEffect(() => {
    const q = query(collection(db, "tenders"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Tender));
      // Show open tenders first, then by creation date
      data.sort((a, b) => {
        if (a.status === 'open' && b.status !== 'open') return -1;
        if (a.status !== 'open' && b.status === 'open') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setTenders(data);
      setLoadingTenders(false);
    }, (err) => {
      console.warn("Could not fetch tenders:", err);
      setLoadingTenders(false);
    });
    return () => unsubscribe();
  }, []);

  const handleBidChange = (tenderId: string, field: 'amount' | 'proposal', value: string) => {
    setBidForms(prev => ({ ...prev, [tenderId]: { ...prev[tenderId], [field]: value } }));
  };

  const handleSubmitBid = async (tender: Tender) => {
    const form = bidForms[tender.id];
    if (!form?.amount || !profile) return;
    setSubmittingBid(tender.id);
    try {
      const bid = {
        contractorId: profile.uid,
        contractorName: profile.displayName || profile.contractorCompany || 'Contractor',
        bidAmount: parseFloat(form.amount),
        proposal: form.proposal || '',
        submittedAt: new Date().toISOString(),
      };
      const tenderRef = doc(db, 'tenders', tender.id);
      await updateDoc(tenderRef, { bids: arrayUnion(bid) });
      setBidSuccess(tender.id);
      setBidForms(prev => ({ ...prev, [tender.id]: { amount: '', proposal: '' } }));
      setTimeout(() => setBidSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to submit bid:", err);
    } finally {
      setSubmittingBid(null);
    }
  };

  const handleVerifyStageProgress = async () => {
    if (!verifyingStage || !profile) return;
    setVerifyingProgress(true);
    setAuditFeedback(null);

    const { contract, stage } = verifyingStage;
    try {
      let imageUrl = selectedDemoImage;
      
      if (useUpload && progressImageFile) {
        const base64Data = await toBase64(progressImageFile);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file: base64Data,
            filename: `${Date.now()}_progress_${progressImageFile.name}`
          })
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          imageUrl = uploadData.url;
        } else {
          throw new Error("Failed to upload progress image");
        }
      }

      const auditRes = await fetch("/api/ai/validate-stage-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageUrl,
          stageTitle: stage.title,
          metric: stage.metric,
          progressNotes
        })
      });

      if (!auditRes.ok) {
        throw new Error("AI progress validation service error");
      }

      const auditData = await auditRes.json();
      
      if (auditData.success) {
        const updatedStages = contract.stages.map(s => {
          if (s.id === stage.id) {
            return {
              ...s,
              status: 'completed' as const,
              imageUrl,
              progressNotes,
              completedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
          }
          return s;
        });

        const allCompleted = updatedStages.every(s => s.status === 'completed');
        const updatedContractStatus = allCompleted ? 'completed' : 'active';
        
        await updateDoc(doc(db, "contracts", contract.id), {
          stages: updatedStages,
          status: updatedContractStatus,
          ...(allCompleted ? { completionDate: new Date().toISOString() } : {})
        });

        if (allCompleted && contract.issueId) {
          await updateDoc(doc(db, "issues", contract.issueId), {
            status: 'resolved',
            resolvedImageUrl: imageUrl,
            updatedAt: new Date().toISOString()
          });
        }

        setAuditFeedback({ success: true, message: auditData.feedback });
        setTimeout(() => {
          setVerifyingStage(null);
          setProgressNotes("");
          setProgressImageFile(null);
          setAuditFeedback(null);
        }, 3000);
      } else {
        const updatedStages = contract.stages.map(s => {
          if (s.id === stage.id) {
            return {
              ...s,
              imageUrl,
              progressNotes,
              updatedAt: new Date().toISOString()
            };
          }
          return s;
        });

        await updateDoc(doc(db, "contracts", contract.id), {
          status: 'violated',
          stages: updatedStages
        });

        await updateDoc(doc(db, "users", profile.uid), {
          isBlacklisted: true
        });

        setAuditFeedback({ success: false, message: auditData.feedback });
      }
    } catch (err) {
      console.error("Progress verification failed:", err);
      setAuditFeedback({ success: false, message: "Server error during progress validation. Please try again." });
    } finally {
      setVerifyingProgress(false);
    }
  };

  const categoryColors: Record<string, string> = {
    road: 'bg-orange-50 text-orange-700 border-orange-200',
    water: 'bg-blue-50 text-blue-700 border-blue-200',
    electric: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    structure: 'bg-slate-50 text-slate-700 border-slate-200',
    other: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  const openCount = tenders.filter(t => t.status === 'open').length;
  const myBidCount = tenders.filter(t => t.bids?.some(b => b.contractorId === profile?.uid)).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-slate-900 text-white py-5 px-8 flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors cursor-pointer">
            ← Back to Hub
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-slate-900 shadow-sm">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight leading-none text-white">Contractor Exchange</h1>
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em]">{profile?.contractorCompany || profile?.displayName || "Registered Contractor"}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Live Tender Feed
        </div>
      </header>

      {profile?.isBlacklisted && (
        <div className="bg-red-600 text-white py-3 px-8 flex items-center justify-center gap-3 font-bold text-xs uppercase tracking-widest animate-pulse shrink-0">
          <Ban className="w-4 h-4 text-white" /> Access Denied: Profile Blacklisted due to failure to meet construction quality metrics. Bidding is disabled.
        </div>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto p-8 space-y-8">

        {/* Metric Cards */}
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg"><FileText className="w-5 h-5" /></div>
              <span className="text-2xl font-black text-slate-900">{openCount}</span>
            </div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Open Tenders</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle2 className="w-5 h-5" /></div>
              <span className="text-2xl font-black text-slate-900">{myBidCount}</span>
            </div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">My Active Bids</h3>
          </div>
          <div className="bg-red-50 p-6 rounded-2xl border border-red-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-red-100 text-red-600 rounded-lg"><AlertTriangle className="w-5 h-5" /></div>
              <span className="text-2xl font-black text-red-700">1</span>
            </div>
            <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest">Defect Liabilities (DLP)</h3>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-slate-200">
          {[
            { id: "tenders", label: "Open Tenders" },
            { id: "contracts", label: "My Contracts" },
            { id: "violations", label: "DLP Traps & Violations" }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-6 py-4 text-sm font-bold uppercase tracking-wider transition-colors relative cursor-pointer ${
                activeTab === t.id ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {t.label}
              {activeTab === t.id && (
                <motion.div layoutId="contractorTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
              )}
            </button>
          ))}
        </div>

        {/* TENDERS TAB */}
        {activeTab === "tenders" && (
          <div className="space-y-4">
            {loadingTenders ? (
              <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-2xl">
                <Loader2 className="w-8 h-8 text-slate-300 mx-auto mb-3 animate-spin" />
                <p className="text-slate-400 text-sm font-semibold">Loading live tenders...</p>
              </div>
            ) : tenders.length === 0 ? (
              <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-2xl">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-bold text-sm uppercase tracking-wide">No Tenders Posted Yet</p>
                <p className="text-slate-400 text-xs mt-1 font-semibold">GHMC Corporators will post tenders here. Check back soon.</p>
              </div>
            ) : (
              tenders.map(tender => {
                const isExpanded = expandedTender === tender.id;
                const myBid = tender.bids?.find(b => b.contractorId === profile?.uid);
                const daysLeft = Math.ceil((new Date(tender.deadline).getTime() - Date.now()) / 86400000);
                const isUrgent = daysLeft <= 3;
                return (
                  <div key={tender.id} className={`bg-white rounded-2xl border shadow-sm transition-all ${tender.status !== 'open' ? 'opacity-60 border-slate-100' : 'border-slate-200 hover:shadow-md'}`}>
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${tender.status === 'open' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{tender.status}</span>
                            {tender.category && <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${categoryColors[tender.category] || categoryColors.other}`}>{tender.category}</span>}
                            {myBid && <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase border bg-amber-50 text-amber-700 border-amber-200">Bid Submitted ✓</span>}
                          </div>
                          <h3 className="text-base font-extrabold text-slate-900 leading-snug mb-1">{tender.title}</h3>
                          {tender.wardName && <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mb-1"><MapPin className="w-3 h-3" />{tender.wardName}</p>}
                          <p className="text-sm font-medium text-slate-500 line-clamp-2">{tender.description}</p>
                        </div>
                        <div className="text-right shrink-0">
                          {(tender.estimatedBudget || 0) > 0 && <>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Est. Budget</div>
                            <div className="text-xl font-black text-emerald-600 mb-1">₹{(tender.estimatedBudget || 0).toLocaleString()}</div>
                          </>}
                          <div className={`text-[10px] font-bold uppercase flex items-center justify-end gap-1 ${isUrgent ? 'text-red-500' : 'text-slate-400'}`}>
                            <Calendar className="w-3 h-3" />
                            {daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}
                          </div>
                          <div className="text-[10px] font-semibold text-slate-400 mt-0.5 flex items-center justify-end gap-1">
                            <Tag className="w-3 h-3" />{tender.bids?.length || 0} bids
                          </div>
                        </div>
                      </div>

                      {/* Bid toggle */}
                      {tender.status === 'open' && !myBid && (
                        profile?.isBlacklisted ? (
                          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2 max-w-xs">
                            <Ban className="w-4 h-4 text-red-500" /> Bidding blocked. Profile is blacklisted.
                          </div>
                        ) : (
                          <button
                            onClick={() => setExpandedTender(isExpanded ? null : tender.id)}
                            className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            {isExpanded ? <><ChevronUp className="w-4 h-4" /> Hide Bid Form</> : <><Send className="w-4 h-4" /> Submit Bid</>}
                          </button>
                        )
                      )}
                      {myBid && (
                        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-700">
                          ✓ Your bid of <span className="font-black">₹{myBid.bidAmount.toLocaleString()}</span> has been submitted.
                        </div>
                      )}
                    </div>

                    {/* Bid Form */}
                    <AnimatePresence>
                      {isExpanded && tender.status === 'open' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-6 pt-2 border-t border-slate-100 space-y-4">
                            <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest">Submit Your Bid</h4>
                            {bidSuccess === tender.id ? (
                              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                                <p className="text-sm font-bold text-emerald-700">Bid Submitted Successfully!</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Your Bid Amount (₹) *</label>
                                  <input
                                    type="number" min="0"
                                    value={bidForms[tender.id]?.amount || ''}
                                    onChange={e => handleBidChange(tender.id, 'amount', e.target.value)}
                                    placeholder="e.g. 450000"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-amber-400 transition-all"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Brief Proposal</label>
                                  <input
                                    type="text"
                                    value={bidForms[tender.id]?.proposal || ''}
                                    onChange={e => handleBidChange(tender.id, 'proposal', e.target.value)}
                                    placeholder="e.g. 20-day completion with premium asphalt"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-amber-400 transition-all"
                                  />
                                </div>
                                <div className="sm:col-span-2">
                                  <button
                                    onClick={() => handleSubmitBid(tender)}
                                    disabled={!bidForms[tender.id]?.amount || submittingBid === tender.id}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-md"
                                  >
                                    {submittingBid === tender.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    Submit Bid to GHMC
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* CONTRACTS TAB */}
        {activeTab === "contracts" && (
          <div className="space-y-6">
            {loadingContracts ? (
              <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-2xl">
                <Loader2 className="w-8 h-8 text-slate-300 mx-auto mb-3 animate-spin" />
                <p className="text-slate-400 text-sm font-semibold">Loading contracts...</p>
              </div>
            ) : contracts.length === 0 ? (
              <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-2xl">
                <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-bold text-sm uppercase tracking-wide">No Active Contracts</p>
                <p className="text-slate-400 text-xs mt-1 font-semibold">Post a tender to automatically assign a contract to your profile.</p>
              </div>
            ) : (
              contracts.map(contract => {
                const nextPendingStage = contract.stages?.find(s => s.status === 'pending');
                return (
                  <div key={contract.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">{contract.id} • TENDER: #{contract.tenderId?.slice(-6).toUpperCase()}</span>
                        <h3 className="text-lg font-black text-slate-900 mt-1">{contract.tenderTitle}</h3>
                      </div>
                      <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase border tracking-wider ${
                        contract.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        contract.status === 'violated' ? 'bg-red-50 text-red-700 border-red-200 animate-pulse font-black' :
                        contract.status === 'active' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        {contract.status === 'violated' ? '⚠️ Violated & Revoked' : contract.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 rounded-2xl p-4 text-xs font-bold text-slate-500">
                      <div>
                        <span className="text-[9px] uppercase text-slate-400 block mb-0.5">Agreed Amount</span>
                        <span className="text-sm font-black text-slate-800">₹{contract.agreedAmount.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-slate-400 block mb-0.5">Start Date</span>
                        <span className="text-sm font-black text-slate-800">{new Date(contract.startDate).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-slate-400 block mb-0.5">Completion</span>
                        <span className="text-sm font-black text-slate-800">{contract.completionDate ? new Date(contract.completionDate).toLocaleDateString() : 'In Progress'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-slate-400 block mb-0.5">DLP Period</span>
                        <span className="text-sm font-black text-slate-800">{contract.defectLiabilityPeriodDays} Days</span>
                      </div>
                    </div>

                    {/* Timeline Stages */}
                    <div className="space-y-4 pt-2 border-t border-slate-100">
                      <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">Project Track Status (AI Daily Stepper)</span>
                      
                      <div className="relative border-l-2 border-slate-200 pl-6 ml-3 space-y-6">
                        {contract.stages?.map((stage, idx) => {
                          const isCurrentPending = nextPendingStage?.id === stage.id;
                          return (
                            <div key={stage.id} className="relative">
                              {/* Bullet */}
                              <div className={`absolute -left-[32px] top-1.5 w-4.5 h-4.5 rounded-full border-2 bg-white flex items-center justify-center ${
                                stage.status === 'completed' ? 'border-emerald-500 text-emerald-500 bg-emerald-50' :
                                contract.status === 'violated' && isCurrentPending ? 'border-red-500 text-red-500 bg-red-50 bg-red-50' :
                                isCurrentPending ? 'border-amber-500 text-amber-500 bg-amber-50 animate-pulse' :
                                'border-slate-300 text-slate-400'
                              }`}>
                                {stage.status === 'completed' ? (
                                  <Check className="w-3 h-3 stroke-[3]" />
                                ) : contract.status === 'violated' && isCurrentPending ? (
                                  <X className="w-3 h-3 stroke-[3]" />
                                ) : (
                                  <div className={`w-1.5 h-1.5 rounded-full ${isCurrentPending ? 'bg-amber-500' : 'bg-slate-300'}`} />
                                )}
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-extrabold text-slate-800">Stage {idx + 1}: {stage.title}</span>
                                  <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border ${
                                    stage.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    contract.status === 'violated' && isCurrentPending ? 'bg-red-50 text-red-700 border-red-200 font-bold' :
                                    isCurrentPending ? 'bg-amber-50 text-amber-700 border-amber-200 font-bold animate-pulse' :
                                    'bg-slate-100 text-slate-500 border-slate-200'
                                  }`}>
                                    {contract.status === 'violated' && isCurrentPending ? 'Failed' : isCurrentPending ? 'Active Pending' : stage.status}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 font-medium">{stage.description}</p>
                                <div className="bg-amber-50/20 rounded-xl p-3 border border-amber-100/60 text-xs font-semibold text-slate-700 space-y-1">
                                  <span className="text-[9px] font-black uppercase text-amber-600 block tracking-wider">Required Quality Metric</span>
                                  {stage.metric}
                                </div>

                                {/* Display submission detail if completed/violated */}
                                {stage.imageUrl && (
                                  <div className="mt-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 max-w-md shadow-sm space-y-3">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Submission Proof</span>
                                    <img src={stage.imageUrl} alt="Progress Proof" className="w-full h-32 object-cover rounded-xl border border-slate-200" />
                                    {stage.progressNotes && <p className="text-xs text-slate-600 italic font-semibold">"{stage.progressNotes}"</p>}
                                    
                                    <div className={`p-2.5 rounded-xl text-xs font-semibold ${
                                      stage.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
                                    }`}>
                                      <span className="font-black uppercase block text-[9px] mb-0.5">AI Progress Audit Verdict</span>
                                      {stage.status === 'completed' ? '✓ Stage approved: work matches specification.' : '⚠️ Metric failed: quality audit rejected this stage.'}
                                    </div>
                                  </div>
                                )}

                                {/* Action button for current pending */}
                                {isCurrentPending && contract.status === 'active' && (
                                  <button
                                    onClick={() => {
                                      setVerifyingStage({ contract, stage });
                                      setAuditFeedback(null);
                                    }}
                                    disabled={profile?.isBlacklisted}
                                    className="mt-3 flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
                                  >
                                    <Camera className="w-3.5 h-3.5" /> Submit Stage Progress
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* VIOLATIONS TAB */}
        {activeTab === "violations" && (
          <div className="space-y-4">
            {profile?.isBlacklisted && (
              <div className="bg-red-50 p-6 rounded-3xl border-2 border-red-300 flex items-start gap-5 shadow-sm">
                <div className="w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-md shrink-0">
                  <Ban className="w-6 h-6 animate-pulse" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-black text-red-900 tracking-tight flex items-center gap-2 mb-1">🚫 LICENSE SUSPENDED & BLACKLISTED</h3>
                  <p className="text-sm font-semibold text-red-800 mb-4">Your corporate contracting profile has been blacklisted from the GHMC Tender Exchange. You failed to satisfy the AI-mandated quality metrics on your active contracts.</p>
                  <div className="bg-red-100 p-4 rounded-xl border border-red-200 text-xs font-bold text-red-800 space-y-1">
                    <span className="uppercase text-[9px] block text-red-600">Violation Reason</span>
                    Failed progress audit metric during execution. Contract terminated. Re-tendering initiated.
                  </div>
                </div>
              </div>
            )}
            <div className="bg-red-50 p-6 rounded-2xl border border-red-200 flex items-start gap-5 shadow-sm">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-red-600 shadow-sm border border-red-100 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-extrabold text-red-900 tracking-tight flex items-center gap-2 mb-1">🚨 DEFECT LIABILITY TRAP ACTIVATED</h3>
                <p className="text-sm font-semibold text-red-800 mb-4">Your completed contract CON-2025-089 (Main St Repair) failed within 43 days of completion. The Defect Liability Period (DLP) is 365 days.</p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white p-3 rounded-xl border border-red-100"><span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Original Cost</span><span className="text-sm font-black text-slate-700">₹85,000</span></div>
                  <div className="bg-red-100 p-3 rounded-xl border border-red-200"><span className="text-[9px] font-bold text-red-600 uppercase tracking-widest block mb-0.5">Your Liability</span><span className="text-sm font-black text-red-800">FREE REPAIR REQUIRED</span></div>
                </div>
                <button className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors shadow-md cursor-pointer">Accept Liability & Dispatch Crew</button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* AI Progress Audit Modal */}
      <AnimatePresence>
        {verifyingStage && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]"
            >
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <HardHat className="w-5 h-5 text-amber-500" />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider">AI Progress Audit</h3>
                    <span className="text-[9px] font-bold text-slate-400 block tracking-widest">{verifyingStage.contract.id} • STAGE {verifyingStage.contract.stages.indexOf(verifyingStage.stage) + 1}</span>
                  </div>
                </div>
                <button onClick={() => setVerifyingStage(null)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto flex-1 text-slate-700">
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-slate-900">{verifyingStage.stage.title}</h4>
                  <p className="text-xs text-slate-500 font-semibold">{verifyingStage.stage.description}</p>
                </div>

                <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-100/50 text-xs font-semibold text-slate-700">
                  <span className="text-[9px] font-black uppercase text-amber-600 block tracking-wider mb-0.5">Required Audit Metric</span>
                  {verifyingStage.stage.metric}
                </div>

                {/* Progress Notes */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Work Progress Notes *</label>
                  <textarea
                    rows={2}
                    value={progressNotes}
                    onChange={e => setProgressNotes(e.target.value)}
                    placeholder="Describe completed works. (Tip: type 'fail' or 'reject' to test AI validation failure and termination penalty)"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-amber-400 transition-all resize-none"
                  />
                </div>

                {/* Image Selection Toggle */}
                <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-xl border border-slate-200/60 text-xs font-bold text-slate-500">
                  <button onClick={() => setUseUpload(false)} className={`flex-1 py-1.5 rounded-lg transition-all ${!useUpload ? 'bg-white text-slate-900 shadow-sm' : ''}`}>Use Demo Image</button>
                  <button onClick={() => setUseUpload(true)} className={`flex-1 py-1.5 rounded-lg transition-all ${useUpload ? 'bg-white text-slate-900 shadow-sm' : ''}`}>Upload Photo</button>
                </div>

                {!useUpload ? (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Select Demo Progress Photo</label>
                    <div className="grid grid-cols-3 gap-2">
                      {demoImages.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedDemoImage(img.url)}
                          className={`border-2 rounded-xl overflow-hidden relative cursor-pointer group transition-all ${selectedDemoImage === img.url ? 'border-amber-500 scale-95 shadow-md' : 'border-slate-200'}`}
                        >
                          <img src={img.url} alt={img.label} className="w-full h-12 object-cover" />
                          <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/0 transition-all" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Upload Progress Photo</label>
                    <input
                      type="file" accept="image/*"
                      onChange={e => setProgressImageFile(e.target.files?.[0] || null)}
                      className="w-full text-xs font-semibold file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                    />
                  </div>
                )}

                {/* Audit Feedback */}
                {auditFeedback && (
                  <div className={`p-4 rounded-xl border text-xs font-semibold ${
                    auditFeedback.success ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                    <span className="font-black uppercase text-[10px] block mb-1">
                      {auditFeedback.success ? '✓ Progress Audit Approved' : '⚠️ Quality Audit Failed'}
                    </span>
                    {auditFeedback.message}
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-between gap-4 shrink-0">
                <button
                  onClick={() => setVerifyingStage(null)}
                  disabled={verifyingProgress}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerifyStageProgress}
                  disabled={verifyingProgress || (!progressNotes.trim()) || (useUpload && !progressImageFile) || (auditFeedback !== null && !auditFeedback.success)}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-md"
                >
                  {verifyingProgress ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      AI Auditing...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Submit to AI Audit
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

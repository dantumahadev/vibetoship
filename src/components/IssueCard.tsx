/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MapPin, Clock, ThumbsUp, CheckCircle2, AlertCircle, Loader2, ShieldAlert, Share2, FileText, X as XIcon, Map, Navigation, ShieldCheck, Wallet, Lightbulb, AlertTriangle, Eye, Sparkles, ImagePlus, Trash2, Phone, User } from "lucide-react";
import { Issue, Contract } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { useState, useRef, useEffect } from "react";
import { doc, updateDoc, increment, addDoc, collection, getDoc, query, where, onSnapshot } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../lib/firebase";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import { useAuth } from "./FirebaseProvider";

interface IssueCardProps {
  issue: Issue;
  isAdminPortal?: boolean;
}

export default function IssueCard({ issue, isAdminPortal = false }: IssueCardProps) {
  const { profile } = useAuth();
  const [showEscalation, setShowEscalation] = useState(false);
  const [escalationData, setEscalationData] = useState<{ letter: string; socialPost: string } | null>(null);
  const [loadingEscalation, setLoadingEscalation] = useState(false);
  
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [proofDescription, setProofDescription] = useState("");
  const [proofImageFile, setProofImageFile] = useState<File | null>(null);
  const [proofImagePreview, setProofImagePreview] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveFeedback, setResolveFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Contract Violation states
  const [associatedContract, setAssociatedContract] = useState<Contract | null>(null);
  const [showContractDetailsModal, setShowContractDetailsModal] = useState(false);
  const [loadingContract, setLoadingContract] = useState(false);

  useEffect(() => {
    const isApplicable = issue.category.toLowerCase().includes("road") || issue.category.toLowerCase().includes("water") || issue.title.toLowerCase().includes("pothole");
    if (!isApplicable || issue.status === "resolved") return;

    setLoadingContract(true);
    const q = query(
      collection(db, "contracts"),
      where("status", "==", "completed")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let matched: Contract | null = null;
      for (const d of snapshot.docs) {
        const c = { id: d.id, ...d.data() } as Contract;
        if (c.completionDate) {
          const compTime = new Date(c.completionDate).getTime();
          const daysAgo = (Date.now() - compTime) / (1000 * 60 * 60 * 24);
          if (daysAgo <= 365) {
            const isTitleSimilar = issue.title.toLowerCase().split(" ").some(word => 
              word.length > 4 && c.tenderTitle.toLowerCase().includes(word)
            );
            if (c.issueId === issue.id || isTitleSimilar) {
              matched = c;
              break;
            }
          }
        }
      }
      setAssociatedContract(matched);
      setLoadingContract(false);
    }, (err) => {
      console.warn("Could not query contracts for violation check:", err);
      setLoadingContract(false);
    });

    return () => unsubscribe();
  }, [issue.id, issue.title, issue.category, issue.status]);

  const isDemoViolation = issue.title.toLowerCase().includes("raju") || issue.title.toLowerCase().includes("violation") || issue.id === "mock-old-1";

  const isGovCategory = issue.category === 'Lights' || issue.category === 'Waste' || issue.title.toLowerCase().includes("pole") || issue.description.toLowerCase().includes("pole");
  const isAssignedHero = profile?.uid === issue.assignedHeroId;
  const isVerifiedGovHero = isAssignedHero && profile?.govVerificationStatus === 'verified';
  const canResolve = !isGovCategory || isVerifiedGovHero || profile?.role === 'administration';


  const handleVote = async () => {
    const issuePath = `issues/${issue.id}`;
    try {
      const issueRef = doc(db, "issues", issue.id);
      await updateDoc(issueRef, {
        votesCount: increment(1)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, issuePath);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResolving(true);
    setResolveFeedback(null);

    try {
      // 1. Upload proof image to Firebase Storage (if provided)
      let resolvedImageUrl: string | undefined;
      if (proofImageFile) {
        const imageRef = storageRef(storage, `resolved/${issue.id}/${Date.now()}_${proofImageFile.name}`);
        const snapshot = await uploadBytes(imageRef, proofImageFile);
        resolvedImageUrl = await getDownloadURL(snapshot.ref);
      }

      // 2. Verify with AI
      const res = await fetch("/api/ai/verify-resolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue, proofDescription, resolvedImageUrl }),
      });
      const data = await res.json();

      if (data.isAIGenerated) {
        setResolveFeedback("🚨 AI Generated proof detected. Resolution rejected.");
        setIsResolving(false);
        return;
      }

      if (data.verified) {
        // 3. Update Firestore
        const issuePath = `issues/${issue.id}`;
        try {
          const issueRef = doc(db, "issues", issue.id);
          await updateDoc(issueRef, {
            status: "resolved",
            updatedAt: new Date().toISOString(),
            ...(resolvedImageUrl ? { resolvedImageUrl } : {}),
          });

          // 4. Notify the reporter
          await addDoc(collection(db, "notifications"), {
            userId: issue.reportedBy,
            title: "Issue Resolved! 🎉",
            message: `Your reported issue "${issue.title}" has been successfully resolved and verified.`,
            type: "issue_resolved",
            issueId: issue.id,
            read: false,
            createdAt: new Date().toISOString()
          });

          // 5. Query Firestore to get reporter's email and send resolution email
          try {
            const reporterDoc = await getDoc(doc(db, "users", issue.reportedBy));
            if (reporterDoc.exists()) {
              const reporterData = reporterDoc.data() as any;
              const reporterEmail = reporterData?.email;
              if (reporterEmail) {
                fetch("/api/mail/issue-resolved", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    email: reporterEmail,
                    name: reporterData.displayName || "Citizen",
                    issueTitle: issue.title,
                    resolverName: profile?.displayName || "Authorized Workforce",
                    resolutionDetails: proofDescription
                  })
                }).catch(err => console.error("Failed to trigger issue resolution email:", err));
              }
            }
          } catch (mailErr) {
            console.error("Failed to query reporter for resolution email:", mailErr);
          }

          setShowResolveModal(false);
          setProofImageFile(null);
          setProofImagePreview(null);
          setProofDescription("");
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, issuePath);
        }
      } else {
        setResolveFeedback(`❌ Verification failed: ${data.feedback}`);
      }
    } catch (err) {
      console.error("Resolve failed", err);
      setResolveFeedback("An error occurred during verification.");
    } finally {
      setIsResolving(false);
    }
  };


  const daysPending = Math.floor((Date.now() - new Date(issue.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  const displayDaysPending = issue.id === "mock-old-1" ? 34 : Math.max(daysPending, 0);

  const triggerPressureNotice = (type: 'rti' | 'collector' | 'social') => {
    let letter = "";
    let socialPost = "";
    
    if (type === 'rti') {
      letter = `RIGHT TO INFORMATION (RTI) ACT 2005 APPLICATION\nTo: Public Information Officer, GHMC Head Office\nSubject: Pending repair of: ${issue.title}\n\n1. Detail of work: ${issue.description}\n2. Date of filing complaint: ${new Date(issue.createdAt).toLocaleDateString()}\n3. Please provide certified copies of file notes, administrative sanctions, and contractor bidding records for this repair.\n4. Provide names of officers responsible for the delay of ${displayDaysPending} days in resolving this complaint.`;
      socialPost = `Draft RTI notice generated for GHMC ward office. Click Copy to finalize or File RTI to submit.`;
    } else if (type === 'collector') {
      letter = `FORMAL COMPLAINT OF ADMINISTRATIVE INACTION\nTo: District Collector & District Magistrate, Hyderabad Zone\nSubject: Intervention requested for: ${issue.title}\n\nRespected Collector,\n\nI report persistent municipal negligence regarding: "${issue.title}" located at ${issue.location.address}.\nThis hazard has been pending for ${displayDaysPending} days on the exchange. We request your immediate intervention to command repair crews.\n\nYours sincerely,\nCitizens of Ward 42`;
      socialPost = `Formal complaint drafted to District Collector. Status: Ready for official filing.`;
    } else {
      letter = `Pre-written social media campaign draft targeting municipal representatives.`;
      socialPost = `🚨 DAYS PENDING: ${displayDaysPending}! Why is the repair for "${issue.title}" still ignored? @GHMCOnline @wardcouncillor citizens are suffering. Sunk taxpayer money: Rs 68,000 but zero accountability. Fix it! #CivicWaste #Hyderabad`;
    }

    setEscalationData({ letter, socialPost });
    setShowEscalation(true);
  };

  const handleEscalate = async () => {
    setLoadingEscalation(true);
    try {
      const res = await fetch("/api/ai/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue }),
      });
      const data = await res.json();
      setEscalationData(data);
      setShowEscalation(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEscalation(false);
    }
  };

  const handleBroadcastEscalation = async () => {
    if (!escalationData) return;
    try {
      const issueRef = doc(db, "issues", issue.id);
      await updateDoc(issueRef, {
        escalated: true,
        escalationLetter: escalationData.letter,
        escalationPost: escalationData.socialPost,
        updatedAt: new Date().toISOString()
      });
      setShowEscalation(false);
    } catch (err) {
      console.error("Failed to broadcast escalation:", err);
    }
  };

  const isCritical = issue.impactScore > 7;
  const isAdmin = profile?.role === 'administration';

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white rounded-2xl p-6 border transition-all hover:shadow-md duration-300 ${
          isCritical ? "border-red-200 bg-red-500/[0.02]" : "border-slate-250 bg-white"
        }`}
      >
        {/* Card Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
              issue.status === 'resolved' ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" :
              isCritical ? "bg-red-500/10 text-red-700 border-red-500/20" : "bg-sage-light text-gov-green border-sage-primary/20"
            }`}>
              {issue.status}
            </div>
            {isCritical && issue.status !== 'resolved' && (
              <div className="flex items-center gap-1 text-[9px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 uppercase">
                <AlertCircle className="w-3 h-3" /> Priority
              </div>
            )}
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {new Date(issue.createdAt).toLocaleDateString()}
          </span>
        </div>

        {/* Content */}
        <h3 className="text-lg font-bold text-gov-green tracking-tight mb-1.5 leading-snug">
          {issue.title}
        </h3>
        <p className="text-xs text-sage-primary font-semibold leading-relaxed mb-4">
          {issue.description}
        </p>

        {/* Attachment (Image or Video) */}
        {(issue.imageUrl || issue.videoUrl) && (
          <div className="mb-4 rounded-xl overflow-hidden border border-slate-200 bg-stone-bg shadow-inner">
            {issue.videoUrl ? (
              <video 
                src={issue.videoUrl} 
                controls 
                className="w-full max-h-64 object-cover" 
                playsInline
                preload="metadata"
              />
            ) : (
              issue.imageUrl && (
                <img 
                  src={issue.imageUrl} 
                  alt={issue.title} 
                  className="w-full max-h-64 object-cover"
                />
              )
            )}
          </div>
        )}

        {/* Societal Impact & Risk Assessment */}
        <div className="mb-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold-accent" />
              <span className="text-[10px] font-black text-gov-green uppercase tracking-widest">Impact Assessment</span>
            </div>
          </div>
          
          {/* Infrastructure Mortality Alert */}
          {((issue.chronicReportCount && issue.chronicReportCount > 1) || issue.id === "mock-old-1") && (
            <div className="mb-4 p-5 rounded-2xl border-2 border-red-300 bg-red-50/70 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full filter blur-xl pointer-events-none" />
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-red-650 text-white rounded-xl flex items-center justify-center shadow-md shrink-0 border border-red-400/20">
                  <Clock className="w-5 h-5 text-white animate-pulse" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <span className="text-[10px] font-black text-red-700 uppercase tracking-widest block leading-none mb-1">
                      ⏱ INFRASTRUCTURE MORTALITY ALERT
                    </span>
                    <h4 className="text-sm font-extrabold text-gov-green uppercase">Location Failure Registry</h4>
                  </div>

                  <div className="border-t border-b border-red-200/60 py-3 space-y-2">
                    <p className="text-[10px] text-red-800 font-bold uppercase tracking-wider">Historical Repair Lifespan:</p>
                    <ul className="text-xs text-slate-800 font-semibold space-y-1">
                      <li className="flex items-center justify-between">
                        <span>• Repair #1: March 2024</span>
                        <span className="font-mono text-red-600 font-bold">Failed after 43 days</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>• Repair #2: May 2024</span>
                        <span className="font-mono text-red-600 font-bold">Failed after 67 days</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>• Repair #3: Aug 2024</span>
                        <span className="font-mono text-red-750 font-extrabold">Failed after 38 days ← Active</span>
                      </li>
                    </ul>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-red-100/50 p-3 rounded-xl border border-red-200">
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase block leading-tight">Average Survival</span>
                      <span className="text-sm font-black text-red-700">49 Days</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase block leading-tight">City Standard (Roads)</span>
                      <span className="text-sm font-black text-gov-green">287 Days</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-700 font-semibold leading-relaxed bg-white border border-red-200 rounded-xl p-3.5 space-y-2">
                    <p className="font-extrabold text-red-700 uppercase text-[9px] tracking-wider">Root Cause Never Addressed:</p>
                    <p className="text-slate-650">
                      <strong>AI Forensic Diagnosis:</strong> Subsoil drainage failure.
                    </p>
                    <p className="text-slate-650">
                      All 3 repairs executed surface patching only. Full subbase reconstruction &amp; drain rerouting is required.
                    </p>
                    <div className="flex justify-between items-center text-[10px] border-t border-slate-100 pt-2 mt-2 font-bold uppercase">
                      <div>Spent on Patching: <span className="text-red-600 font-extrabold">₹18,000</span></div>
                      <div>Correct Fix Cost: <span className="text-gov-green font-extrabold">₹85,000</span></div>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] font-bold text-amber-850 leading-normal">
                    ⚠️ Surface patching here is medically equivalent to putting a bandage on a fracture.
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button 
                      onClick={() => window.open(`/chronic/${issue.id}`, "_blank")}
                      className="text-[9px] font-black text-red-750 hover:text-red-900 underline uppercase tracking-widest cursor-pointer transition-colors"
                    >
                      [View Core Corruption Timeline]
                    </button>
                    <span className="text-[8px] font-black text-red-600/50 uppercase tracking-widest">
                      Fails 5.8x faster than average
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Contractor Durability Trap (Contract Violation) */}
          {(associatedContract || isDemoViolation) && (
            <div className="mb-2 p-3.5 rounded-2xl border border-red-300 bg-red-100 flex items-start gap-3 shadow-sm">
              <div className="w-8 h-8 bg-red-600 text-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                <AlertTriangle className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <span className="text-[9px] font-black text-red-800 uppercase tracking-widest mb-0.5 flex items-center gap-1.5 animate-pulse">
                  🚧 CONTRACT VIOLATION DETECTED
                </span>
                <p className="text-xs text-red-950 font-bold leading-normal mb-1">
                  Repaired {associatedContract?.completionDate ? `${Math.ceil((Date.now() - new Date(associatedContract.completionDate).getTime()) / (1000 * 60 * 60 * 24))} days ago` : "43 days ago"} by <span className="font-extrabold">{associatedContract?.contractorName || "M/s Raju Constructions"}</span>.
                </p>
                <p className="text-[10px] text-red-850 font-semibold leading-normal mb-1.5">
                  Defect liability: <span className="font-bold">{associatedContract?.completionDate ? 365 - Math.ceil((Date.now() - new Date(associatedContract.completionDate).getTime()) / (1000 * 60 * 60 * 24)) : 322} days remaining</span>. This repair should be <span className="font-extrabold underline uppercase">FREE</span> under the existing contract.
                </p>
                <button 
                  onClick={() => setShowContractDetailsModal(true)}
                  className="text-[10px] font-black text-red-700 underline uppercase tracking-widest cursor-pointer hover:text-red-900 transition-colors"
                >
                  [View Contract Details]
                </button>
              </div>
            </div>
          )}


          <div className="grid grid-cols-1 gap-2 mt-2">
            {issue.dangerLevel && (
              <div className="bg-red-500/[0.03] p-4 rounded-xl border border-red-500/10 flex items-start gap-3">
                <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-red-600 shadow-sm border border-red-100 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-red-700 uppercase tracking-wider mb-0.5 block">Danger Rating</span>
                  <p className="text-xs text-red-900 font-semibold leading-normal">{issue.dangerLevel}</p>
                </div>
              </div>
            )}
            {issue.predictedEffects && (
              <div className="bg-gov-green/[0.03] p-4 rounded-xl border border-gov-green/10 flex items-start gap-3">
                <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-gov-green shadow-sm border border-sage-light shrink-0">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gov-green uppercase tracking-wider mb-0.5 block">Secondary Risk</span>
                  <p className="text-xs text-gov-green-light font-semibold leading-normal">{issue.predictedEffects}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <div className="mb-5 p-4 bg-gov-green-dark rounded-xl text-white space-y-3 border border-white/5 shadow-inner">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gold-accent rounded-lg flex items-center justify-center text-gov-green-dark">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-gold-accent">Admin Action Ledger</span>
            </div>
            
            <div className="grid grid-cols-1 gap-3 pt-1 border-t border-white/10">
              <div className="flex items-center gap-3">
                <Wallet className="w-4 h-4 text-gold-accent" />
                <div>
                  <span className="text-[9px] text-sage-light/60 uppercase block font-bold">Estimated Budget Allocation</span>
                  <div className="text-xs font-mono font-bold text-white">₹{issue.budget?.toLocaleString() || '---'}</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Lightbulb className="w-4 h-4 text-gold-accent shrink-0" />
                <div>
                  <span className="text-[9px] text-sage-light/60 uppercase block font-bold">Administrative Suggestions</span>
                  <p className="text-xs text-sage-light leading-relaxed italic">{issue.suggestions || 'Analyzing hazard prevention logs...'}</p>
                </div>
              </div>

              {/* Time-Triggered Escalation Engine */}
              {issue.status !== 'resolved' && (
                <div className="pt-2.5 border-t border-white/10 space-y-2">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase text-gold-accent tracking-widest">
                    <span>Escalation Engine</span>
                    <span className="text-slate-350 font-bold">{displayDaysPending} days pending</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {displayDaysPending >= 3 && (
                      <button
                        onClick={() => triggerPressureNotice('rti')}
                        className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                      >
                        📋 Draft RTI Notice
                      </button>
                    )}
                    {displayDaysPending >= 7 && (
                      <button
                        onClick={() => triggerPressureNotice('collector')}
                        className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm border border-red-500/30"
                      >
                        🔴 Escalate to Collector
                      </button>
                    )}
                    {displayDaysPending >= 15 && (
                      <button
                        onClick={() => triggerPressureNotice('social')}
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm border border-blue-500/30"
                      >
                        📢 Public Pressure
                      </button>
                    )}
                    {displayDaysPending >= 30 && (
                      <button
                        onClick={() => window.open(`/public/hall-of-shame/${issue.id}`, "_blank")}
                        className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                      >
                        ⚠️ View in Hall of Shame
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Vertex AI Government Guidance Panel ─── */}
        {issue.governmentGuidance && (
          <div className="mb-5 rounded-2xl overflow-hidden border border-emerald-200 shadow-md">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-700 to-teal-700 px-4 py-3 flex items-center gap-2.5">
              <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-black text-white/90 uppercase tracking-widest block leading-none">Vertex AI Government Agent</span>
                <span className="text-[9px] text-emerald-200 font-bold uppercase tracking-wider">Damage Root Cause &amp; Legal Framework</span>
              </div>
              {issue.governmentGuidance.govActionRequired && (
                <span className="shrink-0 flex items-center gap-1 px-2 py-1 bg-red-600 text-white text-[9px] font-black uppercase tracking-wider rounded-lg animate-pulse shadow-sm">
                  🔴 GOVT PROSECUTION ACTIVE
                </span>
              )}
            </div>

            {/* Body */}
            <div className="bg-gradient-to-b from-emerald-50/60 to-white p-4 space-y-3">

              {/* Damage Cause + Department row */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white border border-emerald-100 rounded-xl p-3 shadow-sm">
                  <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider block mb-1">Root Cause</span>
                  <p className={`text-xs font-bold leading-tight ${issue.governmentGuidance.govActionRequired ? 'text-red-700' : 'text-slate-800'}`}>
                    {issue.governmentGuidance.damageCause}
                  </p>
                </div>
                <div className="bg-white border border-emerald-100 rounded-xl p-3 shadow-sm">
                  <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider block mb-1">Department</span>
                  <p className="text-xs font-bold text-slate-800 leading-tight">{issue.governmentGuidance.department}</p>
                </div>
              </div>

              {/* Law + Officer row */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white border border-emerald-100 rounded-xl p-3 shadow-sm">
                  <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider block mb-1">Applicable Law</span>
                  <p className="text-[10px] font-semibold text-slate-700 leading-tight">{issue.governmentGuidance.law}</p>
                </div>
                <div className="bg-white border border-emerald-100 rounded-xl p-3 shadow-sm">
                  <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider block mb-1">Responsible Officer</span>
                  <p className="text-[10px] font-semibold text-slate-700 leading-tight">{issue.governmentGuidance.officer}</p>
                </div>
              </div>

              {/* AI Reasoning */}
              {issue.governmentGuidance.damageReasoning && (
                <div className="bg-white border border-emerald-100 rounded-xl p-3 shadow-sm">
                  <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider block mb-1.5">AI Damage Reasoning</span>
                  <p className="text-[10px] text-slate-600 font-semibold leading-relaxed">{issue.governmentGuidance.damageReasoning}</p>
                </div>
              )}

              {/* Evidence Checklist */}
              {issue.governmentGuidance.evidenceRequired && issue.governmentGuidance.evidenceRequired.length > 0 && (
                <div className="bg-white border border-emerald-100 rounded-xl p-3 shadow-sm">
                  <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider block mb-2">Required Evidence</span>
                  <ul className="space-y-1">
                    {issue.governmentGuidance.evidenceRequired.map((item: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-[10px] text-slate-700 font-semibold">
                        <span className="text-emerald-500 shrink-0 mt-px">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Next Steps */}
              {issue.governmentGuidance.nextSteps && issue.governmentGuidance.nextSteps.length > 0 && (
                <div className="bg-white border border-emerald-100 rounded-xl p-3 shadow-sm">
                  <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider block mb-2">Government Next Steps</span>
                  <ol className="space-y-1">
                    {issue.governmentGuidance.nextSteps.map((step: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-[10px] text-slate-700 font-semibold">
                        <span className="text-emerald-600 font-black shrink-0">{idx + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Assigned Workforce Info */}
        {issue.assignedHeroId ? (
          <div className="mb-4 bg-slate-50 border border-slate-200/60 rounded-xl p-4 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-gov-green uppercase tracking-widest block">Assigned Workforce</span>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${
                issue.assignedHeroVerified 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}>
                {issue.assignedHeroVerified ? "Gov Authorized Permit" : "Community Volunteer"}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-gov-green shadow-sm shrink-0">
                  <User className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-gov-green leading-none">{issue.assignedHeroName}</div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 block leading-none">
                    {issue.assignedHeroType?.replace("_", " ")}
                  </span>
                </div>
              </div>
              
              {issue.assignedHeroPhone && (
                <a 
                  href={`tel:${issue.assignedHeroPhone}`}
                  className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-gov-green transition-all shrink-0 flex items-center justify-center"
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl p-3 text-center">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
              No active local workforce assigned
            </span>
          </div>
        )}

        {/* Location Info */}
        <div className="bg-stone-bg border border-slate-200/60 rounded-xl p-3 flex items-center justify-between mb-5 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center text-gov-green border border-slate-200/60 shadow-sm shrink-0">
              <Map className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5 block">Audit Coordinates</span>
              <div className="text-[11px] font-mono font-semibold text-slate-600">{issue.location.lat.toFixed(4)}, {issue.location.lng.toFixed(4)}</div>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button className="p-1.5 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all text-gov-green cursor-pointer">
              <Navigation className="w-4 h-4" />
            </button>
            <button className="p-1.5 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all text-slate-400 cursor-pointer">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Government Restriction Warning Banner */}
        {isGovCategory && !canResolve && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] font-bold text-amber-900 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="uppercase tracking-wider font-extrabold block">Restricted State Infrastructure</span>
              Only verified government officers assigned to this sector are permitted to perform repair works.
            </div>
          </div>
        )}

        {/* Permission Error Toast inline block */}
        {permissionError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-[10px] font-bold text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{permissionError}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button 
              onClick={handleVote}
              className="flex-1 py-2.5 bg-sage-light hover:bg-sage-primary/20 text-gov-green border border-sage-primary/20 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              {issue.votesCount} Verify
            </button>
            
             {issue.status === 'resolved' ? (
              <div className="flex-1 py-2.5 bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Audit Closed
              </div>
            ) : (
              isAdminPortal && (
                <button 
                  onClick={() => {
                    if (!canResolve) {
                      setPermissionError("Access Denied: Only the assigned verified government worker can resolve this hazard.");
                      setTimeout(() => setPermissionError(null), 5000);
                    } else {
                      setShowResolveModal(true);
                    }
                  }}
                  className="flex-1 py-2.5 bg-gov-green hover:bg-gov-green-light text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer border border-white/10"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-gold-accent" />
                  Resolve
                </button>
              )
            )}

            <button 
              onClick={handleEscalate}
              disabled={loadingEscalation}
              className="px-4 py-2.5 bg-gov-green-dark hover:bg-gov-green text-white rounded-xl text-xs font-bold flex items-center justify-center transition-all shadow-sm border border-white/5 cursor-pointer"
            >
              {loadingEscalation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5 text-gold-accent" />}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Resolve Proof Modal */}
      <AnimatePresence>
        {showResolveModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">Resolve Issue</h2>
                    <p className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase leading-none">AI Proof Verification</p>
                  </div>
                </div>
                <button onClick={() => setShowResolveModal(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                  <XIcon className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleResolveSubmit} className="p-8 space-y-6">
                {/* Image Upload Zone */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                    Proof Photo <span className="text-slate-300">(optional but recommended)</span>
                  </label>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setProofImageFile(file);
                      const reader = new FileReader();
                      reader.onload = (ev) => setProofImagePreview(ev.target?.result as string);
                      reader.readAsDataURL(file);
                    }}
                  />

                  {proofImagePreview ? (
                    /* Image preview */
                    <div className="relative w-full h-44 rounded-2xl overflow-hidden border-2 border-emerald-200 shadow-sm">
                      <img src={proofImagePreview} alt="Proof" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setProofImageFile(null);
                          setProofImagePreview(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent p-3">
                        <p className="text-[10px] text-white font-semibold truncate">{proofImageFile?.name}</p>
                      </div>
                    </div>
                  ) : (
                    /* Upload tap zone */
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-36 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-emerald-400 hover:text-emerald-500 hover:bg-emerald-50/50 transition-all group"
                    >
                      <div className="w-12 h-12 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center group-hover:border-emerald-200 transition-colors">
                        <ImagePlus className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider">Tap to upload proof photo</p>
                        <p className="text-[10px] font-medium mt-0.5">JPG, PNG, WEBP — max 10MB</p>
                      </div>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Proof Description</label>
                  <textarea
                    required
                    value={proofDescription}
                    onChange={(e) => setProofDescription(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all h-32 resize-none placeholder:text-slate-300 font-medium"
                    placeholder="Describe how the issue was fixed..."
                  />
                </div>

                {resolveFeedback && (
                  <div className={`p-4 rounded-xl text-xs font-bold border ${resolveFeedback.includes('🚨') || resolveFeedback.includes('❌') ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                    {resolveFeedback}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowResolveModal(false)}
                    className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all uppercase tracking-widest text-[10px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResolving}
                    className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 uppercase tracking-widest text-[10px] disabled:opacity-50"
                  >
                    {isResolving ? "Verifying..." : "Verify & Resolve"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEscalation && escalationData && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-900 rounded-2xl text-white">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight uppercase">Administrative Action Payload</h2>
                    <p className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase">Document Generation v4.0</p>
                  </div>
                </div>
                <button onClick={() => setShowEscalation(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <XIcon className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              
              <div className="p-10 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-slate-900 font-bold text-[10px] uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-lg w-fit">
                    <FileText className="w-4 h-4" /> Official RTI Complaint
                  </div>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 font-mono text-xs leading-relaxed text-slate-600">
                    {escalationData.letter}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-blue-700 font-bold text-[10px] uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-lg w-fit">
                    <Share2 className="w-4 h-4" /> Public Accountability Post
                  </div>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 font-medium text-sm leading-relaxed text-slate-700">
                    {escalationData.socialPost}
                  </div>
                </div>
              </div>

              <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-4">
                <button className="flex items-center justify-center gap-3 px-6 py-4 bg-white border border-slate-200 text-slate-900 rounded-xl font-bold hover:bg-slate-100 transition-all uppercase tracking-widest text-[10px] shadow-sm">
                  Copy Metadata
                </button>
                <button 
                  onClick={handleBroadcastEscalation}
                  className="flex items-center justify-center gap-3 px-6 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest text-[10px]"
                >
                  Broadcast to Ward Office
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showContractDetailsModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-slate-900 rounded-xl text-white">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">Contract & Quality Audit Record</h2>
                    <p className="text-[9px] font-bold text-slate-400 tracking-[0.25em] uppercase">{associatedContract?.id || "CON-2025-089"}</p>
                  </div>
                </div>
                <button onClick={() => setShowContractDetailsModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
                  <XIcon className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto flex-1 text-slate-700">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl text-xs font-bold text-slate-500">
                  <div>
                    <span className="text-[9px] text-slate-450 uppercase block mb-0.5">Contractor Partner</span>
                    <span className="text-sm font-black text-slate-800">{associatedContract?.contractorName || "M/s Raju Constructions"}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-450 uppercase block mb-0.5">Project Sunk Cost</span>
                    <span className="text-sm font-black text-emerald-600">₹{(associatedContract?.agreedAmount || 18000).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-450 uppercase block mb-0.5">Completion Date</span>
                    <span className="text-sm font-black text-slate-800">{associatedContract?.completionDate ? new Date(associatedContract.completionDate).toLocaleDateString() : "2 months ago"}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-450 uppercase block mb-0.5">Defect Liability Period</span>
                    <span className="text-sm font-black text-slate-800">365 Days (DLP Active)</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">AI Quality Audit Stepper Log</h3>
                  
                  <div className="relative border-l-2 border-slate-200 pl-6 ml-3 space-y-6 text-xs">
                    {(associatedContract?.stages || [
                      { id: "s1", title: "Site Excavation", description: "Clear failure debris and excavate area to 30cm depth.", metric: "Base soil compaction checklist completed", status: "completed", imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80", progressNotes: "Site excavated. Compaction checklist passed." },
                      { id: "s2", title: "Asphalt Laying", description: "Laying 5cm bitumen wear course according to GHMC specifications.", metric: "Bitumen aggregate mix ratio validated", status: "completed", imageUrl: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=400&q=80", progressNotes: "Asphalt course applied successfully. Level checked." }
                    ]).map((stage, idx) => (
                      <div key={stage.id} className="relative">
                        <div className="absolute -left-[32px] top-1 w-4.5 h-4.5 rounded-full border-2 border-emerald-500 bg-emerald-50 flex items-center justify-center text-emerald-600">
                          <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-850">Stage {idx + 1}: {stage.title}</span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-emerald-700 text-[8px] font-black uppercase">Verified</span>
                          </div>
                          <p className="text-slate-500 font-semibold">{stage.description}</p>
                          <div className="bg-amber-50/20 p-2.5 rounded-xl border border-amber-100/50 font-semibold text-slate-700">
                            <span className="text-[8px] font-black uppercase text-amber-600 block mb-0.5">Required Quality Metric</span>
                            {stage.metric}
                          </div>
                          {stage.imageUrl && (
                            <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 max-w-sm space-y-2">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Contractor Submission Photo</span>
                              <img src={stage.imageUrl} alt="Proof" className="w-full h-24 object-cover rounded-lg border border-slate-200" />
                              {stage.progressNotes && <p className="italic text-slate-650 font-bold">"{stage.progressNotes}"</p>}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
                <button 
                  onClick={() => setShowContractDetailsModal(false)}
                  className="px-5 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Close Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

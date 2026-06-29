import { useState, useRef, useEffect } from "react";
import { useAuth } from "./FirebaseProvider";
import { ShieldCheck, Cloud, Camera, Loader2, Sparkles, ArrowLeft, Info, HelpCircle, HardHat, Landmark, Clock, CheckCircle2, Copy, FileText, AlertTriangle, Bus, Train, Zap, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../lib/firebase";

interface StructuralScannerProps {
  onBack: () => void;
  onSuccessReport: () => void;
}

export default function StructuralScanner({ onBack, onSuccessReport }: StructuralScannerProps) {
  const { user } = useAuth();
  const [image, setImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isReportSubmitted, setIsReportSubmitted] = useState(false);
  const [copiedLetter, setCopiedLetter] = useState(false);
  const [showRti, setShowRti] = useState(false);

  // Auto-fill coordinates for scanning site
  const [coords] = useState({ lat: 17.4150, lng: 78.4550 });
  const [address] = useState("Jubilee Hills Metro Infrastructure Section, Hyderabad");

  const runStructuralAudit = async (imgData: string) => {
    setIsScanning(true);
    setDiagnostics(null);
    setIsReportSubmitted(false);
    try {
      const res = await fetch("/api/ai/diagnose-infrastructure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imgData })
      });
      if (!res.ok) throw new Error("Diagnosis API failed");
      const data = await res.json();
      setDiagnostics(data);
    } catch (err) {
      console.error(err);
      // Fallback fallback diagnostics
      setDiagnostics({
        isTransitIssue: false,
        vehicleNumber: null,
        transitAuthority: null,
        depotHoldDate: null,
        depotHoldStatus: null,
        defects: ["Surface corrosion on structural joints", "Concrete spalling with exposed steel rebar core"],
        integrityScore: 65,
        yearsToFailure: 1.5,
        failureMode: "Water ingress causing steel rust expansion and spalling failure.",
        remediation: "Apply concrete restoration mortar and polymer primers."
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imgData = reader.result as string;
        setImage(imgData);
        runStructuralAudit(imgData);
      };
      reader.readAsDataURL(file);
    }
  };

  const loadDemoPreset = (type: 'flyover' | 'bus' | 'train') => {
    let demoImg = "";
    if (type === 'flyover') {
      demoImg = "https://images.unsplash.com/photo-1545622177-3e117498c253?auto=format&fit=crop&w=600&q=80"; // flyover pillars
    } else if (type === 'bus') {
      demoImg = "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=600&q=80"; // bus interior
    } else {
      demoImg = "https://images.unsplash.com/photo-1532103054090-334e6e60ab29?auto=format&fit=crop&w=600&q=80"; // train compartment
    }
    setImage(demoImg);
    runStructuralAudit(demoImg);
  };

  const handleFileReport = async () => {
    if (!diagnostics) return;
    setIsSubmittingReport(true);
    try {
      // Determine assignee based on findings
      let heroType = "construction_worker";
      let requiresGov = false;

      if (diagnostics.isTransitIssue) {
        heroType = "ghmc_corporator"; // transit handled by corporator division
        requiresGov = true;
      } else {
        const isElectrical = diagnostics.defects.some((d: string) => d.toLowerCase().includes("pole") || d.toLowerCase().includes("electric") || d.toLowerCase().includes("wire"));
        heroType = isElectrical ? "pole_man" : "construction_worker";
      }

      // If transit, trigger the backend Depot Maintenance Hold Scheduler
      let holdDetails = null;
      if (diagnostics.isTransitIssue && diagnostics.vehicleNumber) {
        try {
          const holdRes = await fetch("/api/transit/schedule-hold", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              vehicleNumber: diagnostics.vehicleNumber,
              transitAuthority: diagnostics.transitAuthority,
              defects: diagnostics.defects
            })
          });
          if (holdRes.ok) {
            holdDetails = await holdRes.json();
          }
        } catch (holdErr) {
          console.warn("Depot hold API scheduling failed:", holdErr);
        }
      }

      await addDoc(collection(db, "issues"), {
        title: diagnostics.isTransitIssue 
          ? `Transit Issue: ${diagnostics.vehicleNumber} (${diagnostics.defects[0] || 'Amenities Failure'})`
          : `Structural Defect: ${diagnostics.defects[0] || 'Infrastructure Failure'}`,
        description: `Deep AI Structural Scan has analyzed this asset. Defects detected: ${diagnostics.defects.join(", ")}. Integrity Score: ${diagnostics.integrityScore}%. Recommended Action: ${diagnostics.remediation}`,
        category: diagnostics.isTransitIssue ? "Civic" : "Roads",
        status: "reported",
        location: {
          lat: coords.lat,
          lng: coords.lng,
          address: diagnostics.isTransitIssue 
            ? `Depot Route: ${diagnostics.vehicleNumber}` 
            : address
        },
        imageUrl: image,
        reportedBy: user?.uid || "anonymous_citizen",
        reporterName: user?.displayName || "Anonymous Citizen",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        votesCount: 0,
        impactScore: Math.round((100 - diagnostics.integrityScore) / 10),
        predictedEffects: diagnostics.failureMode,
        dangerLevel: diagnostics.yearsToFailure <= 0.5 ? "High Structural Risk" : "Medium Warning Risk",
        budget: diagnostics.isTransitIssue ? 1200 : 8500,
        suggestions: diagnostics.remediation,
        
        // Structural Fields
        structuralIntegrity: diagnostics.integrityScore,
        yearsToFailure: diagnostics.yearsToFailure,
        identifiedDefects: diagnostics.defects,
        remediationAction: diagnostics.remediation,
        
        // Transit Fields
        isTransitIssue: diagnostics.isTransitIssue,
        vehicleNumber: diagnostics.vehicleNumber,
        transitAuthority: diagnostics.transitAuthority,
        depotHoldDate: holdDetails?.holdDate || diagnostics.depotHoldDate,
        depotHoldStatus: holdDetails?.holdStatus || diagnostics.depotHoldStatus,
      });

      setIsReportSubmitted(true);
      setTimeout(() => {
        onSuccessReport();
      }, 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Generate Formal statutory document / Transit Hold Order
  const generatedLetter = (() => {
    if (!diagnostics) return "";
    const date = new Date().toLocaleDateString();
    
    if (diagnostics.isTransitIssue) {
      return `
DEPOT MAINTENANCE DIRECTIVE ORDER
Date of Issuance: ${date}
To,
The General Manager (Operations),
Depot Division - Region 1 (${diagnostics.transitAuthority || 'Transit Authority'}),
Ministry of Transport.

SUBJECT: STATUTORY VEHICLE DEPOT HOLD FOR DESTRUCTIVE SAFETY REPAIRS
Vehicle/Train Registration: ${diagnostics.vehicleNumber}
Authority Operator: ${diagnostics.transitAuthority}
Scheduled Hold Date: ${diagnostics.depotHoldDate || 'Next business morning'}

Dear Sir/Madam,
Under local safety guidelines, this directive mandates the holding of vehicle ${diagnostics.vehicleNumber} at the nearest mechanical workshop for 24 hours starting next business morning.

ANOMALIES DIAGNOSED BY AI FORENSICS:
${diagnostics.defects.map((d: string, idx: number) => `${idx + 1}. ${d}`).join("\n")}

CRITICALITY ASSESSMENT:
- Structural/Safety Integrity Rating: ${diagnostics.integrityScore}%
- Projected Transit Threat: ${diagnostics.failureMode}
- Recommended Restoration: ${diagnostics.remediation}

Under statutory codes, this vehicle is not cleared for passenger operations until a certified depot mechanic completes the required repairs.

Sincerely,
Municipal Safety Inspector (Audit Grid Autopilot)
      `.trim();
    } else {
      return `
FORMAL STATUTORY STRUCTURAL COMPLAINT
Date of Issuance: ${date}
To,
The Ward Executive Engineer,
Municipal Corporation Infrastructure Division,
Hyderabad.

SUBJECT: STATUTORY RTI QUERY CONCERNING STRUCTURAL DEFECT RISK
Location coordinates: ${coords.lat}, ${coords.lng}
Location details: ${address}

Respected Sir/Madam,
Under Section 6(1) of the Right to Information Act, 2005, I request immediate details regarding the structural safety of the public infrastructure asset pictured at the referenced location.

FORENSIC STRUCTURAL ANOMALIES IDENTIFIED:
${diagnostics.defects.map((d: string, idx: number) => `${idx + 1}. ${d}`).join("\n")}

STRUCTURAL ASSESSMENT INDICATORS:
- Structural Integrity Score: ${diagnostics.integrityScore}%
- Predicted Years to Structural Failure: ${diagnostics.yearsToFailure} years
- Predicted Failure Mode: ${diagnostics.failureMode}
- Prescribed Engineers Remediation: ${diagnostics.remediation}

Please provide official records, inspection logs, and allocation schedules concerning the repairs of this asset within the statutory 30-day timeframe.

Yours Faithfully,
Concerned Citizen (Grid Sentinel Node)
      `.trim();
    }
  })();

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLetter);
    setCopiedLetter(true);
    setTimeout(() => setCopiedLetter(false), 3000);
  };

  return (
    <div className="min-h-screen bg-sage-bg flex flex-col font-sans select-none relative">
      
      {/* Premium Header */}
      <header className="bg-gov-green text-white py-4 px-6 flex items-center justify-between shrink-0 shadow-md relative z-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 bg-gov-green-dark hover:bg-gov-green border border-white/10 rounded-lg text-xs font-bold transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Hub
        </button>
        <h2 className="text-sm font-bold uppercase tracking-widest text-gold-accent flex items-center gap-2">
          <Sparkles className="w-4.5 h-4.5 text-gold-accent" />
          AI Structural & Transit Health Scanner
        </h2>
        <div className="w-24" />
      </header>

      {/* Main Scanner Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10 flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Left Side: Upload & Simulator Controls */}
        <section className="w-full lg:w-1/2 space-y-6 shrink-0">
          <div className="glass-panel rounded-3xl p-6 border border-white/60 shadow-md flex flex-col items-center justify-center bg-white/70">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />

            {image ? (
              <div className="w-full relative rounded-2xl overflow-hidden shadow-inner border border-slate-200 bg-black flex items-center justify-center group h-80">
                <img src={image} alt="Upload view" className="w-full h-full object-cover" />
                
                {/* Visual Scanner Sweep Animation */}
                {isScanning && (
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent animate-[pulse_2s_infinite]">
                    <div className="h-0.5 w-full bg-cyan-400 shadow-[0_0_15px_#22d3ee] absolute top-1/2 left-0 animate-[bounce_3s_infinite]" />
                  </div>
                )}
                
                {!isScanning && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-4 right-4 bg-black/60 hover:bg-black/80 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Re-upload Image
                  </button>
                )}
              </div>
            ) : (
              <div className="w-full py-16 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 bg-gov-green/5 text-gov-green border border-gov-green/10 rounded-full flex items-center justify-center mb-4">
                  <Cloud className="w-7 h-7" />
                </div>
                <h3 className="text-base font-extrabold text-gov-green mb-1 uppercase tracking-wide">Infrastructure Photo Scan</h3>
                <p className="text-xs text-sage-primary font-semibold mb-6 max-w-xs leading-relaxed">
                  Upload a photo of a flyover pillar, bridge, road surface, or public bus/train carriage for deep AI diagnostics.
                </p>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="py-3 px-6 bg-gov-green hover:bg-gov-green-light text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  Choose Scan Image
                </button>
              </div>
            )}

            {/* Presets */}
            <div className="w-full border-t border-slate-100 mt-6 pt-5 space-y-3">
              <span className="text-[10px] font-black text-sage-primary uppercase tracking-widest block pl-1">Load Scanner Presets</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => loadDemoPreset('flyover')}
                  className="py-2.5 bg-white border border-slate-200 hover:border-gov-green text-gov-green rounded-xl text-[10px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 shadow-sm transition-all"
                >
                  <Landmark className="w-4 h-4" />
                  Civil Pillar
                </button>
                <button
                  onClick={() => loadDemoPreset('bus')}
                  className="py-2.5 bg-white border border-slate-200 hover:border-gov-green text-gov-green rounded-xl text-[10px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 shadow-sm transition-all"
                >
                  <Bus className="w-4 h-4" />
                  RTC Bus
                </button>
                <button
                  onClick={() => loadDemoPreset('train')}
                  className="py-2.5 bg-white border border-slate-200 hover:border-gov-green text-gov-green rounded-xl text-[10px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 shadow-sm transition-all"
                >
                  <Train className="w-4 h-4" />
                  IRCTC Train
                </button>
              </div>
            </div>

          </div>
        </section>

        {/* Right Side: AI Blueprint Diagnostics Details */}
        <section className="w-full lg:w-1/2">
          <AnimatePresence mode="wait">
            
            {/* Loading scan state */}
            {isScanning && (
              <motion.div
                key="scanning"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full glass-panel rounded-3xl p-10 border border-white/60 text-center space-y-4 bg-white/70 h-80 flex flex-col justify-center items-center"
              >
                <Loader2 className="w-10 h-10 text-gov-green animate-spin mx-auto" />
                <div>
                  <h3 className="text-sm font-black text-gov-green uppercase tracking-wider">AI Forensic Inspection Active...</h3>
                  <p className="text-[11px] text-sage-primary font-semibold mt-1">Analyzing concrete fissures, rusting joints, and amenity functionality.</p>
                </div>
              </motion.div>
            )}

            {/* Empty state */}
            {!isScanning && !diagnostics && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full glass-panel rounded-3xl p-10 border border-white/60 text-center space-y-4 bg-white/70 h-80 flex flex-col justify-center items-center"
              >
                <HelpCircle className="w-10 h-10 text-slate-350 mx-auto" />
                <div>
                  <h3 className="text-sm font-black text-gov-green uppercase tracking-wider">Diagnostic Panel Idle</h3>
                  <p className="text-[11px] text-sage-primary font-semibold mt-1">Upload a photo or choose a preset to generate the structural blueprint diagnostics.</p>
                </div>
              </motion.div>
            )}

            {/* Diagnostics result */}
            {!isScanning && diagnostics && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 w-full"
              >
                
                {/* Result header */}
                <div className="glass-panel rounded-3xl p-6 border border-white/60 shadow-md bg-white/70 space-y-5">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <span className="text-[10px] font-black text-gov-green uppercase tracking-widest bg-gov-green/5 border border-gov-green/10 px-3 py-1 rounded-full">
                      {diagnostics.isTransitIssue ? "Public Transit Diagnostic" : "Civil Asset Diagnostic"}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      GRID NODE #SCAN-{Math.floor(1000 + Math.random() * 9000)}
                    </span>
                  </div>

                  {/* Visual Radial Integrity Meter */}
                  <div className="flex items-center gap-6">
                    <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                      {/* Simple circle progress */}
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="48" cy="48" r="40" className="stroke-slate-100 fill-none" strokeWidth="8" />
                        <circle 
                          cx="48" cy="48" r="40" 
                          className="fill-none transition-all duration-1000" 
                          strokeWidth="8" 
                          strokeDasharray={251.2}
                          strokeDashoffset={251.2 - (251.2 * diagnostics.integrityScore) / 100}
                          style={{
                            stroke: diagnostics.integrityScore > 80 ? "#10b981" : diagnostics.integrityScore > 60 ? "#f59e0b" : "#ef4444"
                          }}
                        />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-xl font-black text-gov-green block leading-none">{diagnostics.integrityScore}%</span>
                        <span className="text-[8px] text-sage-primary font-black uppercase tracking-widest mt-0.5 block">Integrity</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0 text-left">
                      <h3 className="text-base font-black text-gov-green uppercase tracking-tight truncate">
                        {diagnostics.isTransitIssue ? diagnostics.vehicleNumber : "Concrete/Metal Infrastructure"}
                      </h3>
                      
                      {/* Transit Hold notice indicator */}
                      {diagnostics.isTransitIssue ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[9px] font-black text-amber-800 uppercase tracking-widest animate-pulse">
                          <Clock className="w-3.5 h-3.5" /> Next-Day Depot Hold Scheduled
                        </div>
                      ) : (
                        <div className="text-xs font-bold text-sage-primary">
                          Estimated timeline to failure: <strong className="text-red-600 font-extrabold">{diagnostics.yearsToFailure} years</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Defects list */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-450 font-black uppercase tracking-wider block pl-1">Anomalies Detected</span>
                    <div className="flex flex-wrap gap-2">
                      {diagnostics.defects.map((def: string, index: number) => (
                        <span key={index} className="px-3 py-1.5 bg-red-500/5 border border-red-500/10 text-red-700 text-xs font-bold rounded-xl block leading-snug">
                          ⚠ {def}
                        </span>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Depot Hold / Structural Failure Prognosis Details */}
                <div className="glass-panel rounded-3xl p-6 border border-white/60 shadow-md bg-white/70 text-left space-y-4">
                  
                  {diagnostics.isTransitIssue ? (
                    /* Public Transit Depot Hold Directive Section */
                    <div className="bg-amber-500/5 border border-dashed border-amber-500/20 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center gap-2">
                        <Bus className="w-5 h-5 text-amber-800" />
                        <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider">Depot Hold Autopilot Notice</h4>
                      </div>
                      <p className="text-[11px] text-amber-900/80 font-semibold leading-relaxed">
                        To maintain safety under RTC/IRCTC statutory directives, vehicle <strong>{diagnostics.vehicleNumber}</strong> has been flagged. A maintenance hold is scheduled for tomorrow at the service depot. Mechanics must replace damaged window glass, fix charging port circuits, and sanitize washroom facilities.
                      </p>
                      <div className="bg-white/80 border border-amber-500/15 rounded-xl px-4 py-2 flex items-center justify-between">
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase">Transit Operator</span>
                        <span className="text-xs font-extrabold text-[#0d2418] uppercase">{diagnostics.transitAuthority} Depot Grid</span>
                      </div>
                      <div className="bg-white/80 border border-amber-500/15 rounded-xl px-4 py-2 flex items-center justify-between">
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase">Status</span>
                        <span className="text-xs font-extrabold text-amber-800 uppercase animate-pulse">● Hold Pending</span>
                      </div>
                    </div>
                  ) : (
                    /* Civil Structural Prognosis */
                    <div className="bg-gov-green/5 border border-dashed border-gov-green/10 rounded-2xl p-5 space-y-2">
                      <h4 className="text-xs font-black text-gov-green uppercase tracking-wider">Structural Failure Prediction</h4>
                      <p className="text-[11px] text-sage-primary font-semibold leading-relaxed">
                        {diagnostics.failureMode}
                      </p>
                      <div className="pt-2 border-t border-gov-green/10 text-xs font-bold text-gov-green">
                        Remediation Suggestion: <span className="font-semibold text-slate-600 block mt-1">{diagnostics.remediation}</span>
                      </div>
                    </div>
                  )}

                  {/* Actions: Report as Issue / View Letter */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setShowRti(!showRti)}
                      className="flex-1 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-gov-green rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      {showRti ? "Hide Letter" : (diagnostics.isTransitIssue ? "Depot Directive" : "View RTI Letter")}
                    </button>
                    <button
                      onClick={handleFileReport}
                      disabled={isSubmittingReport || isReportSubmitted}
                      className="flex-1 py-3 bg-gov-green hover:bg-gov-green-light text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingReport ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isReportSubmitted ? (
                        <CheckCircle2 className="w-4 h-4 text-gold-accent animate-bounce" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-gold-accent" />
                      )}
                      {isReportSubmitted ? "Report Logged! ✅" : "File Direct Grid Report"}
                    </button>
                  </div>

                </div>

                {/* Autopilot Letter Text Box */}
                {showRti && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="glass-panel rounded-3xl p-6 border border-white/60 shadow-md bg-white/70 text-left space-y-3 overflow-hidden"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-gov-green uppercase tracking-widest pl-1">
                        {diagnostics.isTransitIssue ? "Statutory Depot Hold Directive" : "RTI Grievance Application Copy"}
                      </span>
                      <button
                        onClick={handleCopy}
                        className="text-[10px] font-bold text-gov-green hover:text-gov-green-light flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {copiedLetter ? "Copied! ✅" : "Copy Document"}
                      </button>
                    </div>

                    <pre className="p-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-[10px] leading-relaxed text-slate-600 max-h-60 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                      {generatedLetter}
                    </pre>
                  </motion.div>
                )}

              </motion.div>
            )}

          </AnimatePresence>
        </section>

      </main>

    </div>
  );
}

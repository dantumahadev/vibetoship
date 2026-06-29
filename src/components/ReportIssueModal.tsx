/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import { useState, useEffect, useRef } from "react";
import { X, MapPin, Sparkles, Loader2, Video, Trash2, Camera, Cloud, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db, storage } from "../lib/firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import { useAuth } from "./FirebaseProvider";
import { UserProfile } from "../types";

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefilledCoords?: { lat: number; lng: number } | null;
}

export default function ReportIssueModal({ isOpen, onClose, onSuccess, prefilledCoords }: ReportIssueModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Roads");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aiData, setAiData] = useState<any>(null);
  const [severity, setSeverity] = useState("Medium");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [govGuidance, setGovGuidance] = useState<any>(null);

  // New transit & structural state variables
  const [isTransitIssue, setIsTransitIssue] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [transitAuthority, setTransitAuthority] = useState<'RTC' | 'IRCTC' | null>(null);
  const [depotHoldDate, setDepotHoldDate] = useState<string | null>(null);
  const [depotHoldStatus, setDepotHoldStatus] = useState<string | null>(null);
  
  const [structuralIntegrity, setStructuralIntegrity] = useState<number | undefined>(undefined);
  const [yearsToFailure, setYearsToFailure] = useState<number | undefined>(undefined);
  const [identifiedDefects, setIdentifiedDefects] = useState<string[]>([]);
  const [remediationAction, setRemediationAction] = useState("");

  useEffect(() => {
    if (prefilledCoords) {
      setCoords(prefilledCoords);
      setAddress("Jubilee Hills Road, Hyderabad");
    } else {
      // Auto-fetch GPS
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setAddress("Jubilee Hills Road, Hyderabad"); // Default placeholder matching screenshots
          },
          (err) => {
            console.error("GPS error", err);
            // Fallback default coordinates matching screenshot
            setCoords({ lat: 17.4150, lng: 78.4550 });
            setAddress("Jubilee Hills Road, Hyderabad");
          },
          { enableHighAccuracy: true }
        );
      } else {
        // Fallback default coordinates matching screenshot
        setCoords({ lat: 17.4150, lng: 78.4550 });
        setAddress("Jubilee Hills Road, Hyderabad");
      }
    }
  }, [prefilledCoords]);

  // Fetch current GPS manually when locate target icon is tapped
  const fetchCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsAnalyzing(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setIsAnalyzing(false);
        },
        (err) => {
          console.error("GPS error", err);
          setIsAnalyzing(false);
        },
        { enableHighAccuracy: true }
      );
    }
  };

  const autoAnalyzeImage = async (imgData: string) => {
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/ai/diagnose-infrastructure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imgData }),
      });
      if (!res.ok) throw new Error("Structural vision analysis failed");
      const data = await res.json();
      
      const primaryDefect = data.defects?.[0] || "Infrastructure Defect";
      const titlePrefill = data.isTransitIssue
        ? `Transit Issue: ${data.vehicleNumber} (${primaryDefect})`
        : `Structural Defect: ${primaryDefect}`;
      const descPrefill = `Deep AI Scan analysis. Defects detected: ${data.defects.join(", ")}. Integrity Score: ${data.integrityScore}%. Recommended Action: ${data.remediation}`;
      
      setTitle(titlePrefill);
      setDescription(descPrefill);
      setCategory(data.isTransitIssue ? "Civic" : "Roads");
      
      setIsTransitIssue(data.isTransitIssue);
      setVehicleNumber(data.vehicleNumber || "");
      setTransitAuthority(data.transitAuthority || null);
      setDepotHoldDate(data.depotHoldDate || null);
      setDepotHoldStatus(data.depotHoldStatus || null);
      
      setStructuralIntegrity(data.integrityScore);
      setYearsToFailure(data.yearsToFailure);
      setIdentifiedDefects(data.defects);
      setRemediationAction(data.remediation);

      const computedSeverity = Math.round((100 - data.integrityScore) / 10);
      if (computedSeverity > 7) setSeverity("High");
      else if (computedSeverity > 4) setSeverity("Medium");
      else setSeverity("Low");

      setAiData({
        severity: computedSeverity,
        dangerLevel: data.failureMode,
        predictedEffects: data.failureMode,
        budget: data.isTransitIssue ? 1200 : 8500,
        suggestions: data.remediation
      });
    } catch (err) {
      console.error("Auto image diagnostics failed", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imgData = reader.result as string;
        setImage(imgData);
        autoAnalyzeImage(imgData);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerDemoPreset = (type: 'image' | 'video' | 'transit') => {
    if (type === 'image') {
      const demoUrl = "https://images.unsplash.com/photo-1545622177-3e117498c253?auto=format&fit=crop&w=600&q=80"; // flyover pillars
      setImage(demoUrl);
      setCoords({ lat: 17.4150, lng: 78.4550 });
      setAddress("Jubilee Hills Metro Infrastructure Section, Hyderabad");
      autoAnalyzeImage(demoUrl);
    } else if (type === 'transit') {
      const demoUrl = "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=600&q=80"; // bus interior
      setImage(demoUrl);
      setCoords({ lat: 17.4180, lng: 78.4520 });
      setAddress("Secunderabad Bus Depot Road, Hyderabad");
      autoAnalyzeImage(demoUrl);
    } else {
      // Prefill water leak demo
      setTitle("Major Water Burst");
      setDescription("Water is gushing out from a cracked pipe on the main street, flooding the pedestrian walk and causing low water pressure in the neighborhood.");
      setCategory("Water");
      setCoords({ lat: 17.4200, lng: 78.4580 });
      setAddress("Banjara Hills Road, Hyderabad");
      setVideo("demo-video-placeholder");
      
      const triggerTextAuto = async () => {
        try {
          const res = await fetch("/api/ai/analyze-new-issue", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: "Major Water Burst",
              description: "Water is gushing out from a cracked pipe on the main street, flooding the pedestrian walk and causing low water pressure in the neighborhood.",
              category: "Water"
            }),
          });
          if (res.ok) {
            const data = await res.json();
            setAiData(data);
            if (data.severity) {
              if (data.severity > 7) setSeverity("High");
              else if (data.severity > 4) setSeverity("Medium");
              else setSeverity("Low");
            }
          }
        } catch (e) {
          console.error(e);
        }
      };
      triggerTextAuto();
    }
  };

  const handleAnalyze = async () => {
    if (!title || !description) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/ai/analyze-new-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      setAiData(data);
      if (data.category) {
        // Map database response to standard category strings
        if (data.category.toLowerCase().includes("road")) setCategory("Roads");
        else if (data.category.toLowerCase().includes("water")) setCategory("Water");
        else if (data.category.toLowerCase().includes("waste")) setCategory("Waste");
        else if (data.category.toLowerCase().includes("light")) setCategory("Lights");
        else setCategory("Civic");
      }
      if (data.severity) {
        if (data.severity > 7) setSeverity("High");
        else if (data.severity > 4) setSeverity("Medium");
        else setSeverity("Low");
      }
    } catch (err) {
      console.error("AI Analysis failed", err);
      // Fallback analysis values for demo demonstration
      setSeverity("Medium");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setGovGuidance(null);
    setIsLoading(true);

    try {
      let currentAiData = aiData;
      if (!currentAiData) {
        try {
          const res = await fetch("/api/ai/analyze-new-issue", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, description, category }),
          });
          currentAiData = await res.json();
        } catch (err) {
          console.error("Auto AI check failed", err);
          currentAiData = { severity: 5, dangerLevel: "Unassessed", predictedEffects: "General civic inconvenience" };
        }
      }

      let videoUrl: string | null = null;
      if (video === "demo-video-placeholder") {
        videoUrl = "https://assets.mixkit.co/videos/preview/mixkit-water-pouring-from-a-faucet-41551-large.mp4";
      } else if (videoFile) {
        try {
          const vRef = storageRef(storage, `issues/videos/${Date.now()}_${videoFile.name}`);
          const snapshot = await uploadBytes(vRef, videoFile);
          videoUrl = await getDownloadURL(snapshot.ref);
        } catch (err) {
          console.warn("Video upload to Firebase Storage failed, attempting local upload...", err);
          try {
            const base64Data = await toBase64(videoFile);
            const res = await fetch("/api/upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                file: base64Data,
                filename: `${Date.now()}_${videoFile.name}`,
              }),
            });
            if (res.ok) {
              const data = await res.json();
              videoUrl = data.url;
              console.log("Successfully uploaded video locally:", videoUrl);
            } else {
              console.error("Local video upload failed with status:", res.status);
            }
          } catch (localErr) {
            console.error("Failed local video upload fallback:", localErr);
          }
        }
      }

      const issuesPath = "issues";
      
      // Proximity workforce auto-assignment routing
      let requiredHeroType: 'plumber' | 'electrician' | 'pole_man' | 'ghmc_corporator' | 'construction_worker' = 'construction_worker';
      let requiresGov = false;

      const catLower = category.toLowerCase();
      const titleLower = title.toLowerCase();
      const descLower = description.toLowerCase();

      if (catLower.includes("light") || titleLower.includes("pole") || descLower.includes("pole")) {
        requiredHeroType = "pole_man";
        requiresGov = true;
      } else if (catLower.includes("waste") || catLower.includes("garbage")) {
        requiredHeroType = "ghmc_corporator";
        requiresGov = true;
      } else if (catLower.includes("water") || catLower.includes("leak") || catLower.includes("pipe")) {
        requiredHeroType = "plumber";
      } else if (catLower.includes("road") || catLower.includes("pothole")) {
        requiredHeroType = "construction_worker";
      }

      // Query active heroes of this specialty
      const usersRef = collection(db, "users");
      const q = query(
        usersRef, 
        where("isHero", "==", true),
        where("heroType", "==", requiredHeroType)
      );

      let assignedHeroId: string | null = null;
      let assignedHeroName: string | null = null;
      let assignedHeroType: string | null = null;
      let assignedHeroPhone: string | null = null;
      let assignedHeroVerified = false;

      try {
        const querySnapshot = await getDocs(q);
        const candidates = querySnapshot.docs.map(doc => doc.data() as UserProfile);

        // Filter government workers by verified status if required
        const eligible = candidates.filter(c => {
          if (requiresGov) {
            return c.isGovWorker && c.govVerificationStatus === "verified";
          }
          return true;
        });

        if (eligible.length > 0) {
          const issueLat = coords?.lat || 17.4150;
          const issueLng = coords?.lng || 78.4550;
          let minDistance = Infinity;
          let nearestHero: UserProfile | null = null;

          const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
            const R = 6371; // km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                      Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
          };

          for (const candidate of eligible) {
            const cLat = candidate.serviceLocation?.lat || 17.4150;
            const cLng = candidate.serviceLocation?.lng || 78.4550;
            const dist = getDistance(issueLat, issueLng, cLat, cLng);
            if (dist < minDistance) {
              minDistance = dist;
              nearestHero = candidate;
            }
          }

          if (nearestHero) {
            assignedHeroId = nearestHero.uid;
            assignedHeroName = nearestHero.displayName;
            assignedHeroType = nearestHero.heroType || null;
            assignedHeroPhone = nearestHero.phoneNumber || null;
            assignedHeroVerified = nearestHero.govVerificationStatus === "verified";
          }
        }
      } catch (err) {
        console.error("Workforce assignment failed:", err);
      }

      // Schedule depot hold if transit issue is active
      let scheduledDate = depotHoldDate;
      let scheduledStatus = depotHoldStatus;

      if (isTransitIssue && vehicleNumber && transitAuthority) {
        try {
          const holdRes = await fetch("/api/transit/schedule-hold", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vehicleNumber, transitAuthority, defects: identifiedDefects })
          });
          if (holdRes.ok) {
            const holdData = await holdRes.json();
            scheduledDate = holdData.holdDate;
            scheduledStatus = holdData.holdStatus;
          }
        } catch (holdErr) {
          console.warn("Depot hold scheduling failed:", holdErr);
        }
      }

      // POST issue to backend — backend handles verification, Vertex AI classification, DB save & dept notification
      const issuePayload = {
        title,
        description,
        category,
        location: {
          lat: coords?.lat || 17.4150,
          lng: coords?.lng || 78.4550,
          address: address || "Jubilee Hills Road, Hyderabad",
        },
        imageUrl: image,
        videoUrl: videoUrl,
        reportedBy: user?.uid || "anonymous_citizen",
        reporterName: user?.displayName || "Anonymous Citizen",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        votesCount: 0,
        impactScore: currentAiData?.severity || (severity === 'High' ? 8 : severity === 'Medium' ? 5 : 3),
        predictedEffects: currentAiData?.predictedEffects || "May cause localized vehicle disruption.",
        dangerLevel: currentAiData?.dangerLevel || "Low to Medium risk to traffic.",
        budget: currentAiData?.budget || 2500,
        suggestions: currentAiData?.suggestions || "Standard repair works required.",
        assignedHeroId,
        assignedHeroName,
        assignedHeroType,
        assignedHeroPhone,
        assignedHeroVerified,
        structuralIntegrity,
        yearsToFailure,
        identifiedDefects,
        remediationAction,
        isTransitIssue,
        vehicleNumber,
        transitAuthority,
        depotHoldDate: scheduledDate,
        depotHoldStatus: scheduledStatus,
      };

      const backendRes = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(issuePayload),
      });

      const backendData = await backendRes.json();

      if (!backendRes.ok) {
        // Complaint was rejected (fake/spam) or an error occurred
        setSubmitError(backendData.details || backendData.error || "Your complaint could not be submitted.");
        return;
      }

      // Show government guidance from Vertex AI agent before closing
      const guidance = backendData.issue?.governmentGuidance;
      if (guidance) {
        setGovGuidance(guidance);
        // Auto-close after 5 seconds to let user read guidance
        setTimeout(() => {
          setGovGuidance(null);
          onSuccess();
        }, 7000);
        return;
      }

      // Also send reporter email in the background
      if (user?.email) {
        fetch("/api/mail/issue-created", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            name: user.displayName || "Anonymous Citizen",
            issueTitle: title,
            category,
            description,
            severity: currentAiData?.severity || severity
          })
        }).catch(err => console.error("Failed to send issue creation email:", err));
      }

      onSuccess();
    } catch (err) {
      console.error("Submission failed", err);
      setSubmitError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const isCoPilotActive = title.length > 0 && description.length > 0;

  return (
    <div className="w-full flex flex-col bg-[#FDFCFB] h-full overflow-hidden">
      {/* Sub Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-4 bg-[#EBF2FC] shrink-0">
        <button type="button" onClick={onClose} className="p-1 hover:bg-white rounded-full transition-colors shrink-0">
          <X className="w-6 h-6 text-slate-800" />
        </button>
        <h2 className="text-base font-extrabold text-slate-800 tracking-tight">Report Community Issue</h2>
      </div>

      {/* Main Form Area */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar pb-32">
        
        {/* Drop Image or Video Container */}
        <div className="bg-[#F8F9FA] border border-dashed border-slate-300 rounded-[2rem] p-6 flex flex-col items-center justify-center text-center">
          <input 
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleImageChange}
          />
          <input 
            type="file"
            ref={videoInputRef}
            className="hidden"
            accept="video/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setVideo(URL.createObjectURL(file));
                setVideoFile(file);
              }
            }}
          />

          {image || video ? (
            <div className="w-full relative h-40 rounded-2xl overflow-hidden group bg-black/5 flex items-center justify-center">
              {image ? (
                <img src={image} className="w-full h-full object-cover" alt="Uploaded media" />
              ) : (
                <video src={video} className="w-full h-full object-cover" controls playsInline />
              )}
              <button 
                type="button"
                onClick={() => {
                  if (video && video.startsWith("blob:")) {
                    URL.revokeObjectURL(video);
                  }
                  setImage(null);
                  setVideo(null);
                  setVideoFile(null);
                }}
                className="absolute top-2 right-2 p-2 bg-black/60 rounded-full text-white hover:bg-black/80 transition-all z-10"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 bg-civic-blue/10 text-civic-blue rounded-full flex items-center justify-center mb-3">
                <Cloud className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-0.5">Drop Image or Video here</h3>
              <p className="text-[11px] text-slate-500 font-semibold mb-4">Or tap to select media from device</p>
              
              <div className="flex gap-3 w-full max-w-xs mb-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm hover:bg-slate-50"
                >
                  <Camera className="w-4 h-4 text-slate-500" />
                  Add Image
                </button>
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="flex-1 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm hover:bg-slate-50"
                >
                  <Video className="w-4 h-4 text-slate-500" />
                  Add Video
                </button>
              </div>

              {/* Simulator Presets */}
              <div className="text-[11px] text-slate-500 font-semibold flex items-center justify-center gap-2">
                <span>Simulator Presets:</span>
                <button 
                  type="button"
                  onClick={() => triggerDemoPreset('image')}
                  className="text-civic-blue underline hover:text-blue-700"
                >
                  Try Demo Image
                </button>
                <button 
                  type="button"
                  onClick={() => triggerDemoPreset('video')}
                  className="text-civic-blue underline hover:text-blue-700"
                >
                  Try Demo Video
                </button>
              </div>
            </>
          )}
        </div>

        {/* Issue Title Input */}
        <div className="relative border border-slate-300 rounded-2xl px-4 py-3 bg-white focus-within:border-civic-blue transition-all">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-sm text-slate-900 outline-none font-semibold bg-transparent placeholder:text-slate-400"
            placeholder="Issue Title"
            required
          />
        </div>

        {/* Details & Description Input */}
        <div className="relative border border-slate-300 rounded-2xl px-4 py-3 bg-white focus-within:border-civic-blue transition-all">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full text-sm text-slate-900 outline-none font-semibold bg-transparent h-24 resize-none placeholder:text-slate-400 custom-scrollbar"
            placeholder="Details & Description"
            required
          />
        </div>

        {/* Neighborhood Location Name Outlined Input */}
        <div className="relative border border-slate-300 rounded-2xl px-4 py-3.5 flex items-center bg-white focus-within:border-civic-blue transition-all">
          <span className="absolute -top-2 left-3 bg-[#FDFCFB] px-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Neighborhood Location Name
          </span>
          <MapPin className="w-5 h-5 text-slate-800 mr-2 shrink-0" />
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full text-sm text-slate-900 outline-none font-bold bg-transparent"
          />
          <button 
            type="button"
            onClick={fetchCurrentLocation}
            className="p-1 hover:bg-slate-50 rounded-lg text-civic-blue shrink-0 ml-2"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
            </svg>
          </button>
        </div>

        {/* Latitude & Longitude Side-by-Side */}
        <div className="grid grid-cols-2 gap-4">
          <div className="relative border border-slate-300 rounded-2xl px-4 py-3.5 bg-white focus-within:border-civic-blue transition-all">
            <span className="absolute -top-2 left-3 bg-[#FDFCFB] px-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Latitude
            </span>
            <input
              type="number"
              step="any"
              value={coords?.lat ? coords.lat.toFixed(4) : ""}
              onChange={(e) => setCoords(prev => ({ lat: parseFloat(e.target.value), lng: prev?.lng || 0 }))}
              className="w-full text-sm text-slate-900 outline-none font-bold bg-transparent"
            />
          </div>
          <div className="relative border border-slate-300 rounded-2xl px-4 py-3.5 bg-white focus-within:border-civic-blue transition-all">
            <span className="absolute -top-2 left-3 bg-[#FDFCFB] px-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Longitude
            </span>
            <input
              type="number"
              step="any"
              value={coords?.lng ? coords.lng.toFixed(4) : ""}
              onChange={(e) => setCoords(prev => ({ lat: prev?.lat || 0, lng: parseFloat(e.target.value) }))}
              className="w-full text-sm text-slate-900 outline-none font-bold bg-transparent"
            />
          </div>
        </div>

        {/* AI Civic Co-Pilot Card */}
        <div className="bg-[#F0F5FD] border border-[#D2E2F9] rounded-2xl p-5 flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-civic-blue" />
              <span className="text-sm font-extrabold text-civic-blue tracking-tight">AI Civic Co-Pilot</span>
            </div>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing || !isCoPilotActive}
              className={`px-4 py-2 text-xs font-bold rounded-xl shadow-sm transition-all ${
                isCoPilotActive 
                ? 'bg-civic-blue text-white hover:bg-blue-700' 
                : 'bg-[#DCDFE7] text-[#8D93A3] cursor-not-allowed'
              }`}
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Analyze & Prefill"
              )}
            </button>
          </div>
          <p className="text-[11px] text-[#003B66] font-semibold leading-relaxed">
            Write a clear Title and Description, then tap 'Analyze' to let Gemini auto-detect category, severity, and generate safety suggestions.
          </p>
        </div>

        {/* Issue Classification Category */}
        <div className="space-y-2">
          <label className="text-sm font-extrabold text-slate-800 px-1">Issue Classification Category</label>
          <div className="relative border border-slate-200 rounded-2xl px-4 py-3.5 bg-white">
            <select
              value={category === 'Roads' ? 'Road Damage' : category === 'Water' ? 'Water Leakage' : category === 'Waste' ? 'Waste Accumulation' : category === 'Lights' ? 'Broken Street Lights' : 'Civic Hazard'}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'Road Damage') setCategory('Roads');
                else if (val === 'Water Leakage') setCategory('Water');
                else if (val === 'Waste Accumulation') setCategory('Waste');
                else if (val === 'Broken Street Lights') setCategory('Lights');
                else setCategory('Civic');
              }}
              className="w-full text-sm text-slate-900 font-semibold outline-none bg-white cursor-pointer"
            >
              <option>Road Damage</option>
              <option>Water Leakage</option>
              <option>Waste Accumulation</option>
              <option>Broken Street Lights</option>
              <option>Civic Hazard</option>
            </select>
          </div>
        </div>

        {/* Public Transit Toggle & Fields */}
        <div className="space-y-4 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-extrabold text-slate-800">Public Transit Defect</label>
              <p className="text-[10px] text-slate-500 font-semibold">Toggles next-day statutory depot hold warnings</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsTransitIssue(!isTransitIssue);
                if (!isTransitIssue) {
                  setCategory("Civic");
                  if (!transitAuthority) setTransitAuthority("RTC");
                }
              }}
              className={`w-12 h-6 rounded-full p-1 transition-all ${isTransitIssue ? 'bg-amber-500' : 'bg-slate-300'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${isTransitIssue ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <AnimatePresence>
            {isTransitIssue && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative border border-slate-350 rounded-2xl px-4 py-3 bg-white focus-within:border-civic-blue transition-all">
                    <span className="absolute -top-2 left-3 bg-[#FDFCFB] px-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      Vehicle / Train ID
                    </span>
                    <input
                      type="text"
                      required={isTransitIssue}
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      placeholder="e.g. TS 09 Z 4812"
                      className="w-full text-xs text-slate-900 outline-none font-bold bg-transparent placeholder:text-slate-300"
                    />
                  </div>

                  <div className="relative border border-slate-350 rounded-2xl px-4 py-2.5 bg-white">
                    <span className="absolute -top-2 left-3 bg-[#FDFCFB] px-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      Operator Division
                    </span>
                    <select
                      value={transitAuthority || "RTC"}
                      onChange={(e) => setTransitAuthority(e.target.value as 'RTC' | 'IRCTC')}
                      className="w-full text-xs text-slate-900 font-bold outline-none bg-white cursor-pointer"
                    >
                      <option value="RTC">RTC (Bus Depot)</option>
                      <option value="IRCTC">IRCTC (Railways)</option>
                    </select>
                  </div>
                </div>

                {depotHoldDate && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-amber-500/10 border-2 border-dashed border-amber-500/30 rounded-2xl flex items-start gap-3"
                  >
                    <AlertTriangle className="w-5 h-5 text-amber-800 shrink-0 mt-0.5 animate-pulse" />
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider block">🚨 Next-Day Depot Hold Action Scheduled</span>
                      <p className="text-[10px] text-amber-900/85 font-semibold leading-relaxed">
                        Vehicle <strong>{vehicleNumber || 'Unspecified'}</strong> will be held at the depot tomorrow (<strong>{depotHoldDate}</strong>) for structural and safety compliance audit.
                      </p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Public Hazard Severity */}
        <div className="space-y-2">
          <label className="text-sm font-extrabold text-slate-800 px-1">Public Hazard Severity</label>
          <div className="relative border border-slate-200 rounded-2xl px-4 py-3.5 bg-[#F9FAFB]">
            <input
              type="text"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full text-sm text-slate-900 font-semibold outline-none bg-transparent"
            />
          </div>
        </div>

        {/* Submit Error Alert */}
        {submitError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-black text-red-700 uppercase tracking-wider block mb-1">Complaint Rejected</span>
              <p className="text-xs text-red-800 font-semibold leading-relaxed">{submitError}</p>
            </div>
          </div>
        )}

        {/* Vertex AI Government Guidance Success Panel */}
        {govGuidance && (
          <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center">
                <Cloud className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block">Complaint Verified & Routed ✅</span>
                <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Vertex AI Government Agent</span>
              </div>
              {govGuidance.govActionRequired && (
                <span className="ml-auto px-2 py-0.5 bg-red-600 text-white text-[9px] font-black uppercase tracking-wider rounded-lg animate-pulse">🔴 Govt Action Active</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-white rounded-xl p-2.5 border border-emerald-100">
                <span className="font-black text-emerald-700 uppercase block mb-0.5">Department</span>
                <p className="text-slate-700 font-semibold leading-tight">{govGuidance.department}</p>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-emerald-100">
                <span className="font-black text-emerald-700 uppercase block mb-0.5">Damage Cause</span>
                <p className={`font-bold leading-tight ${govGuidance.govActionRequired ? 'text-red-700' : 'text-blue-700'}`}>{govGuidance.damageCause}</p>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-emerald-100">
                <span className="font-black text-emerald-700 uppercase block mb-0.5">Law</span>
                <p className="text-slate-700 font-semibold leading-tight">{govGuidance.law}</p>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-emerald-100">
                <span className="font-black text-emerald-700 uppercase block mb-0.5">Officer</span>
                <p className="text-slate-700 font-semibold leading-tight">{govGuidance.officer}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-2.5 border border-emerald-100">
              <span className="text-[10px] font-black text-emerald-700 uppercase block mb-0.5">AI Reasoning</span>
              <p className="text-[10px] text-slate-600 font-semibold leading-relaxed">{govGuidance.damageReasoning}</p>
            </div>

            <p className="text-[9px] text-emerald-600 font-semibold text-center">Closing automatically in a moment...</p>
          </div>
        )}

        {/* Form Action Buttons */}
        {!govGuidance && (
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all text-xs tracking-wider uppercase"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3.5 bg-civic-blue text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md text-xs tracking-wider uppercase disabled:opacity-50"
            >
              {isLoading ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        )}

      </form>
    </div>
  );
}

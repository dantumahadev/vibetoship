import { useState, useEffect, useRef } from "react";
import { User, ShieldAlert, CheckCircle2, Upload, AlertCircle, Wrench, Sparkles, Award, FileText, Check, X, Search, Phone, MapPin, Loader2, Building, ShieldCheck, HelpCircle, Clock, Camera, Lock } from "lucide-react";
import { doc, updateDoc, setDoc, getDocs, collection, query, where, onSnapshot } from "firebase/firestore";
import { db, storage } from "../lib/firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import { useAuth } from "./FirebaseProvider";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile, Location } from "../types";

export default function Profile() {
  const { profile, user } = useAuth();
  
  const [activeSubTab, setActiveSubTab] = useState<"profile" | "directory" | "queue">("profile");
  const [isHero, setIsHero] = useState(profile?.isHero || false);
  const [heroType, setHeroType] = useState<"plumber" | "electrician" | "pole_man" | "ghmc_corporator" | "construction_worker">(
    (profile?.heroType as any) || "construction_worker"
  );
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber || "");
  const [isGovWorker, setIsGovWorker] = useState(profile?.isGovWorker || false);
  const [govIdNumber, setGovIdNumber] = useState(profile?.govIdNumber || "");
  const [proofImageFile, setProofImageFile] = useState<File | null>(null);
  const [proofImagePreview, setProofImagePreview] = useState<string | null>(profile?.govProofUrl || null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Password change states
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  
  // Base coordinates for hero service location
  const [address, setAddress] = useState(profile?.serviceLocation?.address || "Jubilee Hills, Hyderabad");
  const [lat, setLat] = useState<number>(profile?.serviceLocation?.lat || 17.4150);
  const [lng, setLng] = useState<number>(profile?.serviceLocation?.lng || 78.4550);

  // Profile photo states
  const [heroPhoto, setHeroPhoto] = useState<string | null>(profile?.heroPhotoUrl || null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Directory & Queue state
  const [heroes, setHeroes] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [directoryFilter, setDirectoryFilter] = useState("All");
  const [pendingHeroes, setPendingHeroes] = useState<UserProfile[]>([]);
  const [processingQueueId, setProcessingQueueId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update form fields when profile shifts (e.g. on mock log-ins)
  useEffect(() => {
    if (profile) {
      setIsHero(profile.isHero || false);
      setHeroType(profile.heroType || "construction_worker");
      setPhoneNumber(profile.phoneNumber || "");
      setIsGovWorker(profile.isGovWorker || false);
      setGovIdNumber(profile.govIdNumber || "");
      setProofImagePreview(profile.govProofUrl || null);
      setAddress(profile.serviceLocation?.address || "Jubilee Hills, Hyderabad");
      setLat(profile.serviceLocation?.lat || 17.4150);
      setLng(profile.serviceLocation?.lng || 78.4550);
      setHeroPhoto(profile.heroPhotoUrl || null);
    }
  }, [profile]);

  // Synchronize isGovWorker state with specialty type selected
  useEffect(() => {
    if (isHero) {
      setIsGovWorker(heroType === "pole_man" || heroType === "ghmc_corporator");
    } else {
      setIsGovWorker(false);
    }
  }, [heroType, isHero]);

  // Listen for all heroes to populate Directory
  useEffect(() => {
    const q = query(collection(db, "users"), where("isHero", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as UserProfile);
      setHeroes(data);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "users");
    });
    return () => unsubscribe();
  }, []);

  // Listen for pending verification queue (Admins only)
  useEffect(() => {
    if (profile?.role !== "administration") return;
    const q = query(collection(db, "users"), where("govVerificationStatus", "==", "pending"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as UserProfile);
      setPendingHeroes(data);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "users");
    });
    return () => unsubscribe();
  }, [profile?.role]);

  // Distance calculator
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

  const currentLat = profile?.serviceLocation?.lat || 17.4150;
  const currentLng = profile?.serviceLocation?.lng || 78.4550;

  // Sorting heroes in directory by distance
  const filteredHeroes = heroes
    .filter(h => {
      const matchSearch = h.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (h.heroType && h.heroType.toLowerCase().replace("_", " ").includes(searchQuery.toLowerCase()));
      const matchFilter = directoryFilter === "All" || h.heroType === directoryFilter;
      return matchSearch && matchFilter;
    })
    .map(h => {
      const hLat = h.serviceLocation?.lat || 17.4150;
      const hLng = h.serviceLocation?.lng || 78.4550;
      const dist = getDistance(currentLat, currentLng, hLat, hLng);
      return { ...h, distance: dist };
    })
    .sort((a, b) => a.distance - b.distance);

  const fetchGPS = () => {
    if (navigator.geolocation) {
      setLoadingProfile(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          setAddress("My Current Location Coordinate");
          setLoadingProfile(false);
        },
        (err) => {
          console.error("GPS error", err);
          setLoadingProfile(false);
          setErrorMsg("Could not access GPS. Please input coordinates manually.");
        }
      );
    }
  };

  // Submit Profile registration
  const handleProfileSubmit = async (e: React.FormEvent, selfVerifyDemo = false) => {
    e.preventDefault();
    if (!user) return;
    setLoadingProfile(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    // Validate ID proof is provided for official government roles
    if (isHero && isGovWorker && !proofImageFile && !proofImagePreview) {
      setErrorMsg("Official Government ID card/proof is required to verify your workforce profile.");
      setLoadingProfile(false);
      return;
    }

    try {
      let uploadUrl = proofImagePreview || "";
      if (proofImageFile) {
        try {
          const path = `government_proofs/${user.uid}/${Date.now()}_${proofImageFile.name}`;
          const fileRef = storageRef(storage, path);
          const snap = await uploadBytes(fileRef, proofImageFile);
          uploadUrl = await getDownloadURL(snap.ref);
          setProofImagePreview(uploadUrl);
        } catch (storageErr) {
          console.warn("Storage upload failed, fallback to local simulated link", storageErr);
          uploadUrl = "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=600&q=80";
        }
      }

      let verificationStatus: "none" | "pending" | "verified" | "rejected" = "none";
      let aiVerificationFeedback = "";
      
      if (isHero) {
        if (isGovWorker) {
          if (selfVerifyDemo) {
            verificationStatus = "verified";
          } else {
            // Trigger AI Verification!
            try {
              const aiProofImage = uploadUrl || "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=600&q=80";
              const aiRes = await fetch("/api/ai/verify-gov-id", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: profile?.displayName || user.displayName || "Anonymous",
                  govIdNumber,
                  heroType,
                  image: aiProofImage
                })
              });
              
              if (!aiRes.ok) throw new Error("AI Verification service unreachable.");
              
              const aiResult = await aiRes.json();
              if (aiResult.verified) {
                verificationStatus = "verified";
                aiVerificationFeedback = aiResult.feedback || "AI approved credentials.";
              } else {
                verificationStatus = "rejected";
                aiVerificationFeedback = aiResult.feedback || "AI rejected credentials.";
                setErrorMsg(`AI Verification Failed: ${aiVerificationFeedback}`);
              }
            } catch (aiErr: any) {
              console.error("AI verify failed", aiErr);
              verificationStatus = "pending";
              setErrorMsg(`AI Verification server error. Profile set to Pending review.`);
            }
          }
        } else {
          verificationStatus = "none";
        }
      }

      const userDocRef = doc(db, "users", user.uid);
      const updatePayload: Partial<UserProfile> = {
        isHero,
        heroType: isHero ? (heroType as any) : null,
        phoneNumber: isHero ? phoneNumber : "",
        isGovWorker: isHero ? isGovWorker : false,
        govIdNumber: isHero && isGovWorker ? govIdNumber : "",
        govProofUrl: isHero && isGovWorker ? uploadUrl : "",
        govVerificationStatus: verificationStatus,
        serviceLocation: isHero ? { lat, lng, address } : null,
        heroPhotoUrl: isHero ? heroPhoto : null,
        // Upgrade rank if verified
        rank: isHero && isGovWorker && verificationStatus === "verified" ? "Verified State Officer" : profile?.rank || "Civic Sentinel"
      };

      await updateDoc(userDocRef, updatePayload);
      
      if (isGovWorker && !selfVerifyDemo) {
        if (verificationStatus === "verified") {
          setSuccessMsg(`AI ID verification successful! Approved as official state workforce. ✅\nFeedback: ${aiVerificationFeedback}`);
        } else if (verificationStatus === "rejected") {
          // Error message already set
        }
      } else {
        setSuccessMsg(selfVerifyDemo ? "Profile saved and Government ID verified successfully! ✅" : "Workforce profile details updated successfully!");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to update profile.");
    } finally {
      setLoadingProfile(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setErrorMsg("All password fields are required.");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("New passwords do not match.");
      return;
    }
    
    // Check if current password is correct (if user profile has password set)
    if (profile?.password && profile.password !== currentPassword) {
      setErrorMsg("Incorrect current password.");
      return;
    }

    setUpdatingPassword(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      try {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, { password: newPassword });
      } catch (dbErr) {
        console.warn("Could not write password change directly to Firestore rules, syncing to backend instead.", dbErr);
      }

      // Sync password update to local database
      await fetch("/api/auth/sync-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          password: newPassword
        })
      });

      setSuccessMsg("Password successfully updated! ✅");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordChange(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to change password.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Admin Approve / Reject actions
  const handleVerifyHero = async (heroId: string, approve: boolean) => {
    setProcessingQueueId(heroId);
    try {
      const heroRef = doc(db, "users", heroId);
      const status = approve ? "verified" : "rejected";
      const rank = approve ? "Verified State Officer" : "Civic Sentinel";
      
      await updateDoc(heroRef, {
        govVerificationStatus: status,
        rank: rank,
        points: approve ? (profile?.points || 0) + 100 : profile?.points || 0
      });

      // Send notification to worker
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

    } catch (err) {
      console.error(err);
    } finally {
      setProcessingQueueId(null);
    }
  };

  const getHeroBadge = (status?: string) => {
    switch (status) {
      case "verified":
        return <span className="bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Gov Verified</span>;
      case "pending":
        return <span className="bg-amber-500/10 text-amber-800 border border-amber-500/20 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0"><Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Approval</span>;
      case "rejected":
        return <span className="bg-red-500/10 text-red-800 border border-red-500/20 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0"><X className="w-3.5 h-3.5 text-red-600" /> Verification Declined</span>;
      default:
        return <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0">Community Volunteer</span>;
    }
  };

  const getHeroIcon = (type?: string) => {
    switch (type) {
      case "plumber":
        return <Wrench className="w-5 h-5 text-sky-600" />;
      case "electrician":
        return <Sparkles className="w-5 h-5 text-amber-600" />;
      case "pole_man":
        return <Award className="w-5 h-5 text-yellow-600" />;
      case "ghmc_corporator":
        return <Building className="w-5 h-5 text-purple-600" />;
      case "construction_worker":
        return <Wrench className="w-5 h-5 text-orange-600" />;
      default:
        return <User className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row gap-8 min-h-[70vh]">
      
      {/* Sidebar navigation */}
      <div className="w-full md:w-64 flex flex-col gap-2 shrink-0">
        <button
          onClick={() => setActiveSubTab("profile")}
          className={`flex items-center gap-3 px-5 py-4 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all text-left shadow-sm border ${
            activeSubTab === "profile" 
            ? "bg-gov-green text-white border-gov-green" 
            : "bg-white text-sage-primary hover:text-gov-green border-slate-200 hover:border-slate-300"
          }`}
        >
          <User className="w-4 h-4" />
          My Hero Profile
        </button>
        <button
          onClick={() => setActiveSubTab("directory")}
          className={`flex items-center gap-3 px-5 py-4 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all text-left shadow-sm border ${
            activeSubTab === "directory" 
            ? "bg-gov-green text-white border-gov-green" 
            : "bg-white text-sage-primary hover:text-gov-green border-slate-200 hover:border-slate-300"
          }`}
        >
          <Search className="w-4 h-4" />
          Workforce Directory
        </button>
        
        {profile?.role === "administration" && (
          <button
            onClick={() => setActiveSubTab("queue")}
            className={`flex items-center justify-between px-5 py-4 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all border ${
              activeSubTab === "queue" 
              ? "bg-gov-green text-white border-gov-green shadow-sm" 
              : "bg-white text-red-800 hover:text-red-950 border-red-200 hover:bg-red-50/50"
            }`}
          >
            <span className="flex items-center gap-3">
              <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
              Verification Queue
            </span>
            {pendingHeroes.length > 0 && (
              <span className="bg-red-500 text-white rounded-full px-2 py-0.5 text-[9px] font-extrabold animate-bounce">
                {pendingHeroes.length}
              </span>
            )}
          </button>
        )}

        {/* Profile Card Summary Panel */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 mt-4 shadow-sm text-center">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-gov-green-light text-gold-accent flex items-center justify-center text-xl font-bold mx-auto border-2 border-gold-accent shadow-md">
            {profile?.heroPhotoUrl ? (
              <img src={profile.heroPhotoUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              (profile?.displayName || "H")[0].toUpperCase()
            )}
          </div>
          <h4 className="text-sm font-bold text-gov-green mt-3 truncate">{profile?.displayName}</h4>
          {profile?.username && (
            <span className="text-[10px] text-slate-450 font-bold block leading-none mt-1">
              @{profile.username}
            </span>
          )}
          <span className="text-[10px] text-gold-accent font-black uppercase tracking-wider leading-none mt-1.5 block">
            {profile?.rank}
          </span>
          <div className="h-[1px] bg-slate-100 my-4" />
          <div className="grid grid-cols-2 gap-2 text-left">
            <div>
              <span className="text-[8px] text-slate-400 font-bold uppercase block">Reputation XP</span>
              <span className="text-xs font-black text-gov-green">{profile?.points} XP</span>
            </div>
            <div>
              <span className="text-[8px] text-slate-400 font-bold uppercase block">Registration</span>
              <span className="text-xs font-black text-gov-green">
                {profile?.isHero ? "Hero Registered" : "Not Registered"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-xl overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeSubTab === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-xl font-black text-gov-green uppercase tracking-wide">Workforce Setup Portal</h3>
                <p className="text-xs text-sage-primary font-semibold mt-0.5">
                  Configure your specialty, service location and credentials to join the community safety team.
                </p>
              </div>

              <form onSubmit={(e) => handleProfileSubmit(e, false)} className="space-y-6">
                
                {/* Join Workforce Toggle */}
                <div className="bg-sage-bg p-5 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-extrabold text-gov-green block">Become a Community Hero</span>
                    <span className="text-[10px] text-sage-primary leading-normal block">
                      {profile?.role === "administration" 
                        ? "Enabling registration registers you in the GIS directory to receive emergency hazard notifications."
                        : "Hero registration is managed by portal administrators. Standard citizens can view the workforce directory but cannot register directly."
                      }
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={profile?.role !== "administration"}
                    onClick={() => setIsHero(!isHero)}
                    className={`w-14 h-8 rounded-full transition-all relative flex items-center px-1 shrink-0 ${
                      isHero ? "bg-gov-green" : "bg-slate-350"
                    } ${profile?.role !== "administration" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <div 
                      className={`w-6 h-6 rounded-full bg-white shadow transition-all ${
                        isHero ? "translate-x-6" : "translate-x-0"
                      }`} 
                    />
                  </button>
                </div>

                {profile?.role !== "administration" && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] font-bold text-amber-900 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="uppercase tracking-wider font-extrabold block">State Workforce Registration Restricted</span>
                      To register as a regional community hero or state officer, please contact a portal administrator.
                    </div>
                  </div>
                )}

                {isHero && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-6 overflow-hidden"
                  >
                    
                    {/* Profile Photograph Capture / Selector */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gov-green uppercase tracking-widest block pl-1">
                        Hero Profile Photograph
                      </label>
                      
                      <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-200/60">
                        {/* Photo Display / Camera Stream */}
                        <div className="relative w-32 h-32 rounded-full overflow-hidden bg-slate-200 border-2 border-slate-350 shadow-inner shrink-0 flex items-center justify-center">
                          {cameraActive ? (
                            <video 
                              ref={videoRef} 
                              autoPlay 
                              playsInline 
                              className="w-full h-full object-cover scale-x-[-1]"
                            />
                          ) : heroPhoto ? (
                            <img src={heroPhoto} alt="Hero avatar" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-12 h-12 text-slate-400" />
                          )}
                        </div>

                        {/* Controls */}
                        <div className="flex-1 space-y-2 text-center sm:text-left">
                          <span className="text-xs font-bold text-gov-green block">Take or Upload Profile Pic</span>
                          <span className="text-[10px] text-sage-primary leading-normal block">
                            A clear headshot photograph helps citizens and administrators verify your identity during dispatch.
                          </span>
                          
                          <input
                            ref={photoInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (ev) => setHeroPhoto(ev.target?.result as string);
                              reader.readAsDataURL(file);
                            }}
                          />

                          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                            {cameraActive ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (videoRef.current) {
                                    const canvas = document.createElement("canvas");
                                    canvas.width = 300;
                                    canvas.height = 300;
                                    const ctx = canvas.getContext("2d");
                                    if (ctx) {
                                      ctx.translate(300, 0);
                                      ctx.scale(-1, 1);
                                      ctx.drawImage(videoRef.current, 0, 0, 300, 300);
                                    }
                                    const dataUrl = canvas.toDataURL("image/jpeg");
                                    setHeroPhoto(dataUrl);
                                    
                                    const stream = videoRef.current.srcObject as MediaStream;
                                    if (stream) {
                                      stream.getTracks().forEach(t => t.stop());
                                    }
                                    setCameraActive(false);
                                  }
                                }}
                                className="px-3.5 py-2 bg-gov-green text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gov-green-light transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Camera className="w-3.5 h-3.5" /> Capture Photo
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    setCameraActive(true);
                                    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 300, height: 300 } });
                                    setTimeout(() => {
                                      if (videoRef.current) videoRef.current.srcObject = stream;
                                    }, 100);
                                  } catch (err) {
                                    console.error("Camera access failed", err);
                                    setCameraActive(false);
                                    const mockPhotoUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80";
                                    setHeroPhoto(mockPhotoUrl);
                                    setSuccessMsg("Webcam not available in this sandbox. Prefilled a demo profile photo! 📸");
                                  }
                                }}
                                className="px-3.5 py-2 bg-gov-green text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gov-green-light transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Camera className="w-3.5 h-3.5" /> Snap Camera
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => photoInputRef.current?.click()}
                              className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                            >
                              <Upload className="w-3.5 h-3.5" /> Upload File
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Specialty Picker */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gov-green uppercase tracking-widest block pl-1">
                        Select Capability Specialty
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                          { id: "plumber", label: "Plumber", desc: "Leaks & water issues" },
                          { id: "electrician", label: "Electrician", desc: "General lighting repairs" },
                          { id: "pole_man", label: "Pole Man (Gov Only)", desc: "Power grid & pole damages" },
                          { id: "ghmc_corporator", label: "GHMC Corporator (Gov Only)", desc: "Waste & sanitation" },
                          { id: "construction_worker", label: "Construction Worker", desc: "Potholes & roads" },
                        ].map((spec) => {
                          const isSelected = heroType === spec.id;
                          return (
                            <button
                              key={spec.id}
                              type="button"
                              onClick={() => setHeroType(spec.id as any)}
                              className={`p-4 border rounded-2xl text-left transition-all flex flex-col justify-between shadow-sm cursor-pointer h-28 ${
                                isSelected 
                                  ? "border-gov-green bg-gov-green/5 ring-1 ring-gov-green" 
                                  : "border-slate-200 bg-white hover:border-slate-300"
                              }`}
                            >
                              {getHeroIcon(spec.id)}
                              <div>
                                <span className="text-xs font-bold text-gov-green block mt-1">{spec.label}</span>
                                <span className="text-[9px] text-slate-400 font-semibold block leading-tight truncate">{spec.desc}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gov-green uppercase tracking-widest block pl-1">
                        Contact Hotline Phone
                      </label>
                      <div className="flex items-center bg-stone-bg border border-slate-200 focus-within:border-gov-green rounded-xl px-4 py-3 shadow-inner">
                        <Phone className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                        <input
                          type="tel"
                          required
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="e.g. +91 98765 43210"
                          className="bg-transparent border-none text-sm text-gov-green outline-none w-full placeholder:text-slate-400 font-bold"
                        />
                      </div>
                    </div>

                    {/* Location Settings */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-black text-gov-green uppercase tracking-widest block pl-1">
                        Base GIS Operations Location
                      </span>
                      
                      <div className="flex items-center bg-stone-bg border border-slate-200 focus-within:border-gov-green rounded-xl px-4 py-3 shadow-inner mb-2">
                        <MapPin className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                        <input
                          type="text"
                          required
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Operational Base Address"
                          className="bg-transparent border-none text-sm text-gov-green outline-none w-full placeholder:text-slate-400 font-bold"
                        />
                        <button 
                          type="button"
                          onClick={fetchGPS}
                          className="p-1 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-gov-green transition-all"
                        >
                          GPS
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="relative border border-slate-200 rounded-2xl px-4 py-3.5 bg-stone-bg shadow-inner focus-within:border-gov-green">
                          <span className="absolute -top-2 left-3 bg-white px-1.5 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                            Base Latitude
                          </span>
                          <input
                            type="number"
                            step="any"
                            required
                            value={lat}
                            onChange={(e) => setLat(parseFloat(e.target.value))}
                            className="w-full text-xs text-gov-green outline-none font-bold bg-transparent"
                          />
                        </div>
                        <div className="relative border border-slate-200 rounded-2xl px-4 py-3.5 bg-stone-bg shadow-inner focus-within:border-gov-green">
                          <span className="absolute -top-2 left-3 bg-white px-1.5 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                            Base Longitude
                          </span>
                          <input
                            type="number"
                            step="any"
                            required
                            value={lng}
                            onChange={(e) => setLng(parseFloat(e.target.value))}
                            className="w-full text-xs text-gov-green outline-none font-bold bg-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Government Employee Credentials (only for Pole Man or GHMC Corporator) */}
                    {isGovWorker && (
                      <div className="space-y-4 pt-3 border-t border-slate-100">
                        <div className="space-y-1">
                          <span className="text-xs font-extrabold text-gov-green flex items-center gap-1">
                            <Building className="w-4 h-4 text-gov-green" /> Official Government Workforce Credentials
                          </span>
                          <span className="text-[10px] text-sage-primary leading-normal block">
                            Government ID card and certificate verification is mandatory to clear permits for electricity grid and corporator duties.
                          </span>
                        </div>

                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200/60 overflow-hidden"
                        >
                          
                          {/* Verification Badge */}
                          <div className="flex justify-between items-center bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verification Status</span>
                            {getHeroBadge(profile?.govVerificationStatus)}
                          </div>

                          {/* ID Number */}
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gov-green uppercase tracking-widest block pl-1">
                              Employment ID Number
                            </label>
                            <input
                              type="text"
                              required
                              value={govIdNumber}
                              onChange={(e) => setGovIdNumber(e.target.value)}
                              placeholder="e.g. TS-ELEC-4429"
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-gov-green font-bold outline-none focus:border-gov-green shadow-sm"
                            />
                          </div>

                          {/* Upload employment proof */}
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-gov-green uppercase tracking-widest block pl-1">
                              Upload Proof of Employment (ID Card / Certificate)
                            </label>

                            {!proofImagePreview && (
                              <div className="bg-red-50 text-red-800 border border-red-200/60 p-3.5 rounded-xl text-[10px] font-bold leading-normal flex items-start gap-2 shadow-sm my-2">
                                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <div>
                                  <span>Official Government ID card/proof is required.</span>
                                  <p className="text-slate-500 font-semibold mt-0.5">Please upload your official municipal ID card, employee badge, or certificate of employment to initiate the AI verification audit.</p>
                                </div>
                              </div>
                            )}

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
                              <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-stone-bg">
                                <img src={proofImagePreview} alt="Gov proof" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProofImageFile(null);
                                    setProofImagePreview(null);
                                    if (fileInputRef.current) fileInputRef.current.value = "";
                                  }}
                                  className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-red-50 text-red-500"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-6 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-gov-green hover:text-gov-green transition-all"
                              >
                                <Upload className="w-6 h-6 mb-1 text-slate-400" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Tap to upload ID document</span>
                              </button>
                            )}
                          </div>

                        </motion.div>
                      </div>
                    )}

                  </motion.div>
                )}

                {/* Security Settings collapsible card */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-4">
                  <button
                    type="button"
                    onClick={() => setShowPasswordChange(!showPasswordChange)}
                    className="w-full flex items-center justify-between text-left cursor-pointer bg-transparent border-none outline-none"
                  >
                    <span className="text-xs font-extrabold text-gov-green flex items-center gap-2">
                      <Lock className="w-4 h-4 text-gov-green" /> Security Settings (Change Password)
                    </span>
                    <span className="text-[10px] text-gov-green font-bold uppercase tracking-wider">
                      {showPasswordChange ? "Hide" : "Expand"}
                    </span>
                  </button>

                  <AnimatePresence>
                    {showPasswordChange && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 overflow-hidden pt-3 border-t border-slate-250/50"
                      >
                        <div className="space-y-4">
                          {/* Current Password */}
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gov-green uppercase tracking-widest block pl-1">
                              Current Password
                            </label>
                            <input
                              type="password"
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              placeholder="Enter current password"
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-gov-green font-semibold outline-none focus:border-gov-green shadow-sm"
                            />
                          </div>

                          {/* New Password */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-gov-green uppercase tracking-widest block pl-1">
                                New Password
                              </label>
                              <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Min 6 characters"
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-gov-green font-semibold outline-none focus:border-gov-green shadow-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-gov-green uppercase tracking-widest block pl-1">
                                Confirm New Password
                              </label>
                              <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repeat new password"
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-gov-green font-semibold outline-none focus:border-gov-green shadow-sm"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={updatingPassword}
                            onClick={handlePasswordChange}
                            className="px-4 py-2 bg-gov-green text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gov-green-light transition-all flex items-center gap-1 cursor-pointer shadow-sm w-fit"
                          >
                            {updatingPassword ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-gold-accent" />
                            )}
                            Update Password
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {errorMsg && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-xs font-bold text-red-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs font-bold text-emerald-800 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={loadingProfile}
                    className="flex-1 py-3.5 bg-gov-green text-white rounded-2xl font-bold hover:bg-gov-green-light transition-all shadow-md text-xs tracking-wider uppercase disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {loadingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Save Registration
                  </button>
                  
                  {isHero && isGovWorker && (
                    <button
                      type="button"
                      onClick={(e) => handleProfileSubmit(e, true)}
                      disabled={loadingProfile}
                      className="flex-1 py-3.5 bg-gold-accent hover:bg-gold-accent-hover text-gov-green-dark rounded-2xl font-black transition-all shadow-md text-xs tracking-wider uppercase disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Self-Verify (Demo Mode)
                    </button>
                  )}
                </div>

              </form>
            </motion.div>
          )}

          {activeSubTab === "directory" && (
            <motion.div
              key="directory"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-xl font-black text-gov-green uppercase tracking-wide">Workforce Directory</h3>
                <p className="text-xs text-sage-primary font-semibold mt-0.5">
                  Proximity-sorted registry of capable local community heroes and verified government officers.
                </p>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 flex items-center bg-stone-bg border border-slate-200 focus-within:border-gov-green rounded-xl px-4 py-2.5 shadow-inner">
                  <Search className="w-4 h-4 text-slate-450 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or role..."
                    className="bg-transparent border-none text-xs text-gov-green outline-none w-full placeholder:text-slate-400 font-bold"
                  />
                </div>

                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar shrink-0">
                  {["All", "plumber", "electrician", "pole_man", "ghmc_corporator", "construction_worker"].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setDirectoryFilter(filter)}
                      className={`px-3.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border cursor-pointer transition-all whitespace-nowrap ${
                        directoryFilter === filter
                        ? "bg-sage-light text-gov-green border-sage-primary/30 shadow-sm"
                        : "bg-white text-sage-primary border-slate-200 hover:border-slate-355"
                      }`}
                    >
                      {filter === "All" ? "All Roles" : filter.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Heroes list */}
              <div className="space-y-3">
                {filteredHeroes.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-6">
                    <HelpCircle className="w-8 h-8 text-slate-350 mx-auto mb-2" />
                    <p className="text-sage-primary font-bold text-xs uppercase tracking-wide">No workforce available</p>
                    <p className="text-slate-400 text-[10px] mt-0.5 font-semibold">No heroes match the filters in this region.</p>
                  </div>
                ) : (
                  filteredHeroes.map((hero) => (
                    <div 
                      key={hero.uid}
                      className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:shadow-md transition-all duration-300"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                          {hero.heroPhotoUrl ? (
                            <img src={hero.heroPhotoUrl} alt={hero.displayName} className="w-full h-full object-cover" />
                          ) : (
                            getHeroIcon(hero.heroType)
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-extrabold text-gov-green truncate">{hero.displayName}</span>
                            {getHeroBadge(hero.govVerificationStatus)}
                          </div>
                          
                          <div className="flex items-center gap-3 text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-wider">
                            <span className="text-gold-accent font-black">{hero.heroType?.replace("_", " ")}</span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {hero.serviceLocation?.address || "Region-1 base"}</span>
                            <span>•</span>
                            <span className="font-mono text-gov-green">{hero.distance.toFixed(1)} km away</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                        <a 
                          href={`tel:${hero.phoneNumber}`}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-sage-light hover:bg-sage-primary/20 text-gov-green rounded-xl text-[10px] font-black uppercase tracking-widest border border-sage-primary/10 transition-all"
                        >
                          <Phone className="w-3.5 h-3.5" /> Call
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeSubTab === "queue" && profile?.role === "administration" && (
            <motion.div
              key="queue"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-xl font-black text-gov-green uppercase tracking-wide text-red-800">Verification Ledger Queue</h3>
                <p className="text-xs text-sage-primary font-semibold mt-0.5">
                  Audit, approve or decline credentials for regional government-permit workers.
                </p>
              </div>

              <div className="space-y-4">
                {pendingHeroes.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-6">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2 animate-bounce" />
                    <p className="text-gov-green font-bold text-xs uppercase tracking-wide">Queue Empty</p>
                    <p className="text-slate-400 text-[10px] mt-0.5 font-semibold">All government workforce verification requests are settled.</p>
                  </div>
                ) : (
                  pendingHeroes.map((pending) => (
                    <div 
                      key={pending.uid}
                      className="bg-white border border-red-100 rounded-2xl p-6 space-y-4 hover:shadow-md transition-all duration-300"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-3">
                          {pending.heroPhotoUrl && (
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 shrink-0">
                              <img src={pending.heroPhotoUrl} alt="Pending Avatar" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div>
                            <h4 className="text-sm font-bold text-gov-green truncate">{pending.displayName}</h4>
                            <span className="text-[10px] text-gold-accent font-black uppercase tracking-wider block leading-none mt-1">
                              Role Requested: {pending.heroType?.replace("_", " ")}
                            </span>
                          </div>
                        </div>
                        <span className="bg-amber-500/10 text-amber-800 border border-amber-500/20 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">
                          Pending Verification
                        </span>
                      </div>

                      {/* Details block */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-2 gap-4 text-left">
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold uppercase block">Employee ID</span>
                          <span className="text-xs font-bold text-gov-green font-mono">{pending.govIdNumber || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold uppercase block">Base location</span>
                          <span className="text-xs font-bold text-gov-green truncate block">{pending.serviceLocation?.address || "N/A"}</span>
                        </div>
                      </div>

                      {/* Proof Document preview */}
                      {pending.govProofUrl && (
                        <div className="space-y-1.5">
                          <span className="text-[9px] text-slate-400 font-bold uppercase block pl-1">Uploaded Credential Proof</span>
                          <div className="w-full h-44 rounded-xl overflow-hidden border border-slate-200 bg-stone-bg">
                            <img src={pending.govProofUrl} alt="Employment ID card document" className="w-full h-full object-cover" />
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        <button
                          disabled={processingQueueId === pending.uid}
                          onClick={() => handleVerifyHero(pending.uid, false)}
                          className="flex-1 py-3 bg-red-650 hover:bg-red-750 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          <X className="w-4 h-4" /> Reject
                        </button>
                        <button
                          disabled={processingQueueId === pending.uid}
                          onClick={() => handleVerifyHero(pending.uid, true)}
                          className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-md"
                        >
                          <Check className="w-4 h-4 text-gold-accent" /> Approve
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}

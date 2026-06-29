import { useState, useEffect } from 'react';
import { ShieldCheck, LogIn, User, ShieldAlert, Key, Mail, Sparkles, LogOut, ArrowRight, CheckCircle2, Lock, Globe, ChevronLeft, ChevronRight, Landmark, Zap, ArrowLeft, Building, HardHat, Wrench, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './FirebaseProvider';
import { collection, query, where, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// ─── Translations ────────────────────────────────────────────────────────────
const LANGUAGES = [
  { code: 'en', script: 'A',  label: 'English' },
  { code: 'hi', script: 'अ',  label: 'Hindi' },
  { code: 'te', script: 'తె', label: 'Telugu' },
  { code: 'ta', script: 'த',  label: 'Tamil' },
  { code: 'bn', script: 'ব',  label: 'Bengali' },
  { code: 'mr', script: 'म',  label: 'Marathi' },
];

const T: Record<string, Record<string, string>> = {
  hero_title: {
    en: 'Municipal Audit Grid',
    hi: 'नगरपालिका ऑडिट ग्रिड',
    te: 'మునిసిపల్ ఆడిట్ గ్రిడ్',
    ta: 'நகராட்சி தணிக்கை கட்டம்',
    bn: 'পৌর অডিট গ্রিড',
    mr: 'महानगरपालिका ऑडिट ग्रिड',
  },
  hero_sub: {
    en: 'Department of Civic Safety & Infrastructure',
    hi: 'नागरिक सुरक्षा एवं अवसंरचना विभाग',
    te: 'పౌర భద్రత & మౌలిక సదుపాయాల విభాగం',
    ta: 'குடிமை பாதுகாப்பு & உள்கட்டமைப்பு துறை',
    bn: 'নাগরিক নিরাপত্তা ও অবকাঠামো বিভাগ',
    mr: 'नागरी सुरक्षा व पायाभूत सुविधा विभाग',
  },
  hero_desc: {
    en: 'Authorized regional infrastructure response system. File, audit, and resolve structural defects, safety emergencies, and environmental hazards under state monitoring.',
    hi: 'अधिकृत क्षेत्रीय बुनियादी ढांचा प्रतिक्रिया प्रणाली। राज्य निगरानी में संरचनात्मक दोषों, सुरक्षा आपात और पर्यावरणीय खतरों को दर्ज करें, ऑडिट करें और हल करें।',
    te: 'అధీకృత ప్రాంతీయ మౌలిక సదుపాయాల స్పందన వ్యవస్థ. రాష్ట్ర పర్యవేక్షణలో నిర్మాణ లోపాలు, భద్రత అత్యవసర పరిస్థితులను పరిష్కరించండి.',
    ta: 'அங்கீகரிக்கப்பட்ட பிராந்திய உள்கட்டமைப்பு பதில் அமைப்பு. மாநில கண்காணிப்பின் கீழ் கட்டமைப்பு குறைபாடுகளை தாக்கல் செய்யுங்கள்.',
    bn: 'অনুমোদিত আঞ্চলিক অবকাঠামো প্রতিক্রিয়া ব্যবস্থা। রাজ্য পর্যবেক্ষণের অধীনে কাঠামোগত ত্রুটিগুলি ফাইল করুন এবং সমাধান করুন।',
    mr: 'अधिकृत प्रादेशिक पायाभूत सुविधा प्रतिसाद प्रणाली. राज्य देखरेखीखाली संरचनात्मक दोष, सुरक्षा आणीबाणी सोडवा.',
  },
};

const CIVIC_STATS = [
  {
    image: '/assets/civic_stat_pothole.png',
    stat: '19,000+',
    label: { en: 'people die every year due to pothole accidents in India', hi: 'लोग हर साल गड्ढों के कारण मरते हैं', te: 'గుంతల ప్రమాదాల వల్ల ప్రతి సంవత్సరం మరణాలు', ta: 'குழிகள் விபத்தால் ஆண்டுதோறும் உயிரிழப்புகள்', bn: 'গর্তের দুর্ঘটনায় প্রতি বছর মৃত্যু', mr: 'खड्ड्यांमुळे दरवर्षी मृत्यू' },
    color: '#ef4444',
    source: 'NCRB India',
  },
  {
    image: '/assets/civic_stat_water.png',
    stat: '40%',
    label: { en: 'of urban households face daily water supply disruptions', hi: 'शहरी परिवारों को रोज पानी की समस्या', te: 'పట్టణ కుటుంబాలు రోజూ నీటి సమస్యలు', ta: 'நகர குடும்பங்கள் தினசரி நீர் பிரச்சினைகள்', bn: 'শহুরে পরিবার দৈনিক জল সংকটে', mr: 'शहरी कुटुंबांना रोज पाण्याची समस्या' },
    color: '#3b82f6',
    source: 'NITI Aayog',
  },
  {
    image: '/assets/civic_hero_bg.png',
    stat: '₹3.14T',
    label: { en: 'lost annually due to poor road & civic infrastructure', hi: 'खराब सड़कों से सालाना नुकसान', te: 'పేద రోడ్డు మౌలిక సదుపాయాల వల్ల వార్షిక నష్టం', ta: 'மோசமான சாலை உள்கட்டமைப்பால் வருடாந்திர இழப்பு', bn: 'খারাপ রাস্তার কারণে বার্ষিক ক্ষতি', mr: 'खराब रस्त्यांमुळे वार्षिक नुकसान' },
    color: '#f59e0b',
    source: 'World Bank',
  },
  {
    image: '/assets/civic_stat_community.png',
    stat: '72%',
    label: { en: 'of civic issues go unresolved without citizen reporting', hi: 'नागरिक शिकायत के बिना समस्याएं अनसुलझी रहती हैं', te: 'పౌర ఫిర్యాదు లేకుండా సమస్యలు పరిష్కరించబడవు', ta: 'குடிமக்கள் புகாரின்றி சிக்கல்கள் தீரா', bn: 'নাগরিক অভিযোগ ছাড়া সমস্যা অসমাধান', mr: 'नागरिक तक्रारीशिवाय समस्या सुटत नाहीत' },
    color: '#10b981',
    source: 'Urban Studies India',
  },
];

// ─── ADMIN PORTAL ENTRY (Standalone) ─────────────────────────────────────────
// Sub-roles: 1) Community Hero  2) GHMC Corporator
const HERO_CATEGORIES = [
  { id: 'pole_man', label: 'Pole Man', icon: Zap, desc: 'Electrical pole & street light maintenance officer' },
  { id: 'plumber', label: 'Plumber', icon: Wrench, desc: 'Water supply & drainage infrastructure specialist' },
  { id: 'electrician', label: 'Electrician', icon: Zap, desc: 'Electrical wiring & public utility technician' },
  { id: 'construction_worker', label: 'Construction Officer', icon: HardHat, desc: 'Civil works & structural defect response team' },
];

function AdminPortalEntry({ onBack }: { onBack: () => void }) {
  const [adminSubRole, setAdminSubRole] = useState<'choose' | 'hero' | 'corporator'>('choose');
  const [step, setStep] = useState<'category' | 'register' | 'success'>('category');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    govIdNumber: '',
    password: '',
    confirmPassword: '',
    serviceAddress: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const { signUpWithEmail, signInWithGoogle } = useAuth();

  const selectedCat = HERO_CATEGORIES.find(c => c.id === selectedCategory);

  // CORPORATOR: Google OAuth sign-in
  const handleCorporatorGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      sessionStorage.setItem('pendingGoogleRole', 'corporator');
      if (signInWithGoogle) await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  // HERO: Submit registration form
  const handleHeroRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.fullName.trim()) return setError('Full name is required.');
    if (!formData.email.includes('@')) return setError('Valid email is required.');
    if (formData.password.length < 6) return setError('Password must be at least 6 characters.');
    if (formData.password !== formData.confirmPassword) return setError('Passwords do not match.');
    if (!formData.govIdNumber.trim()) return setError('Government Employee ID is required.');

    setLoading(true);
    try {
      if (signUpWithEmail) {
        await signUpWithEmail(formData.email, formData.password, formData.fullName, {
          role: 'administration',
          heroType: selectedCategory as any,
          isHero: true,
          isGovWorker: true,
          govIdNumber: formData.govIdNumber,
          phoneNumber: formData.phone,
          govVerificationStatus: 'pending',
          serviceLocation: { address: formData.serviceAddress, lat: 0, lng: 0 },
        });
      }

      // Best-effort Firestore update
      try {
        const q = query(collection(db, 'users'), where('email', '==', formData.email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const userDocRef = doc(db, 'users', snap.docs[0].id);
          await updateDoc(userDocRef, {
            role: 'administration',
            heroType: selectedCategory,
            isHero: true,
            isGovWorker: true,
            govIdNumber: formData.govIdNumber,
            phoneNumber: formData.phone,
            govVerificationStatus: 'pending',
            serviceLocation: { address: formData.serviceAddress, lat: 0, lng: 0 },
          });
          const notificationRef = collection(db, 'notifications');
          await setDoc(doc(notificationRef), {
            userId: snap.docs[0].id,
            title: 'Verification Pending 🔍',
            message: `Your ${selectedCat?.label} credential application has been submitted. Llama AI will review your Government ID and notify you upon approval.`,
            type: 'general',
            read: false,
            createdAt: new Date().toISOString()
          });
        }
      } catch (fbErr) {
        console.warn('Could not write hero details to Firestore directly:', fbErr);
      }

      setStep('success');
      setSuccessMsg(`Registration submitted! Llama AI will verify your ${selectedCat?.label} credentials. You'll receive a notification once approved.`);
    } catch (err: any) {
      let msg = err.message || 'Registration failed.';
      if (msg.includes('email-already-in-use')) msg = 'This email is already registered.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0d1f14] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_#1a4a28_0%,_transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_#0a2e1a_0%,_transparent_60%)] pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#c9a227] to-transparent opacity-60" />

      <header className="relative z-10 flex items-center justify-between px-8 pt-7 pb-4 border-b border-white/5">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white/70 hover:text-white transition-all cursor-pointer"
        >
          <User className="w-4 h-4" /> Access as a Citizen
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#c9a227]/20 border border-[#c9a227]/40 flex items-center justify-center">
            <Landmark className="w-4 h-4 text-[#c9a227]" />
          </div>
          <span className="text-white font-extrabold text-sm tracking-widest uppercase">Administration Portal</span>
        </div>
        <div className="w-24" />
      </header>

      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">

            {/* ── CHOOSE: Community Hero vs GHMC Corporator ── */}
            {adminSubRole === 'choose' && (
              <motion.div
                key="choose"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#c9a227]/10 border border-[#c9a227]/20 rounded-full mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#c9a227] animate-pulse" />
                    <span className="text-[10px] font-black text-[#c9a227] uppercase tracking-[0.2em]">Administration Enrollment</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-white uppercase tracking-tight">Select Your Role</h2>
                  <p className="text-sm text-white/50 font-semibold">Choose your official government category to proceed.</p>
                </div>

                <div className="space-y-4">
                  {/* Community Hero */}
                  <button
                    onClick={() => setAdminSubRole('hero')}
                    className="w-full flex items-center gap-4 p-5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-[#c9a227]/50 rounded-2xl transition-all cursor-pointer group text-left"
                  >
                    <div className="w-14 h-14 rounded-xl bg-[#c9a227]/10 border border-[#c9a227]/30 flex items-center justify-center group-hover:bg-[#c9a227]/20 transition-all shrink-0">
                      <ShieldCheck className="w-7 h-7 text-[#c9a227]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-base font-extrabold text-white block">Community Hero</span>
                      <span className="text-xs text-white/40 font-semibold leading-snug block mt-0.5">
                        Pole Man, Plumber, Electrician, Construction Officer
                      </span>
                      <span className="text-[10px] text-[#c9a227]/60 font-bold mt-1 block">Upload credentials → Llama AI verification</span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-[#c9a227] transition-all shrink-0" />
                  </button>

                  {/* GHMC Corporator */}
                  <button
                    onClick={() => setAdminSubRole('corporator')}
                    className="w-full flex items-center gap-4 p-5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-emerald-400/50 rounded-2xl transition-all cursor-pointer group text-left"
                  >
                    <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center group-hover:bg-emerald-500/20 transition-all shrink-0">
                      <Landmark className="w-7 h-7 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-base font-extrabold text-white block">GHMC Corporator</span>
                      <span className="text-xs text-white/40 font-semibold leading-snug block mt-0.5">
                        Ward-level elected representative & budget authority
                      </span>
                      <span className="text-[10px] text-emerald-400/60 font-bold mt-1 block">Google OAuth → Instant access → Post tenders</span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-emerald-400 transition-all shrink-0" />
                  </button>
                </div>

                <p className="text-center text-[10px] text-white/25 font-bold uppercase tracking-widest pt-2">
                  GHMC Administration • Hyderabad Municipal Corporation
                </p>
              </motion.div>
            )}

            {/* ── CORPORATOR: Google Sign-In ── */}
            {adminSubRole === 'corporator' && (
              <motion.div
                key="corporator"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 mx-auto flex items-center justify-center">
                    <Landmark className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-white uppercase tracking-tight">GHMC Corporator Portal</h2>
                  <p className="text-sm text-white/50 font-semibold leading-relaxed max-w-sm mx-auto">
                    Sign in with your official Google account to access the Corporator Dashboard and manage tenders for your ward.
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-bold text-red-400 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-4 p-6 bg-white/[0.03] border border-emerald-500/10 rounded-2xl">
                  <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs text-emerald-300 font-semibold">Instant access — no manual verification required</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs text-emerald-300 font-semibold">Post & manage tenders for your ward</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs text-emerald-300 font-semibold">Review contractor bids & award contracts</span>
                  </div>
                </div>

                <button
                  onClick={handleCorporatorGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center py-4 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors text-sm font-bold text-slate-700 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mr-3" />
                  ) : (
                    <GoogleIcon />
                  )}
                  Sign In as Corporator with Google
                </button>

                <p className="text-center text-[10px] text-white/25 font-bold uppercase tracking-widest">
                  Secure Google OAuth • Official GHMC Access
                </p>
              </motion.div>
            )}

            {/* ── HERO: Select Category ── */}
            {adminSubRole === 'hero' && step === 'category' && (
              <motion.div
                key="hero-category"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#c9a227]/10 border border-[#c9a227]/20 rounded-full mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#c9a227] animate-pulse" />
                    <span className="text-[10px] font-black text-[#c9a227] uppercase tracking-[0.2em]">Community Hero Enrollment</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-white uppercase tracking-tight">Select Your Role</h2>
                  <p className="text-sm text-white/50 font-semibold">Choose your official government category to begin credential verification.</p>
                </div>
                <div className="space-y-3">
                  {HERO_CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => { setSelectedCategory(cat.id); setStep('register'); }}
                        className="w-full flex items-center gap-4 p-4 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-[#c9a227]/40 rounded-2xl transition-all cursor-pointer group text-left"
                      >
                        <div className="w-10 h-10 rounded-xl bg-[#c9a227]/10 border border-[#c9a227]/20 flex items-center justify-center group-hover:bg-[#c9a227]/20 transition-all shrink-0">
                          <Icon className="w-5 h-5 text-[#c9a227]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-bold text-white block">{cat.label}</span>
                          <span className="text-[11px] text-white/40 font-semibold leading-snug block">{cat.desc}</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-[#c9a227] transition-all shrink-0" />
                      </button>
                    );
                  })}
                </div>
                <p className="text-center text-[10px] text-white/25 font-bold uppercase tracking-widest pt-2">
                  Verification required • Government ID mandatory • Llama AI review
                </p>
              </motion.div>
            )}

            {/* ── HERO: Register Form ── */}
            {adminSubRole === 'hero' && step === 'register' && (
              <motion.div
                key="hero-register"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-5"
              >
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 rounded-xl bg-[#c9a227]/10 border border-[#c9a227]/30 mx-auto flex items-center justify-center mb-3">
                    {selectedCat && <selectedCat.icon className="w-6 h-6 text-[#c9a227]" />}
                  </div>
                  <h2 className="text-xl font-extrabold text-white uppercase tracking-tight">
                    {selectedCat?.label} Registration
                  </h2>
                  <p className="text-xs text-white/50 font-semibold">Fill in your official credentials for Llama AI verification.</p>
                  <button
                    onClick={() => { setStep('category'); setError(null); }}
                    className="text-[10px] text-[#c9a227]/60 hover:text-[#c9a227] font-bold uppercase tracking-wider transition-all cursor-pointer mt-1"
                  >
                    ← Change Category
                  </button>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-bold text-red-400 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleHeroRegister} className="space-y-3">
                  {[
                    { label: 'Full Name', key: 'fullName', type: 'text', placeholder: 'e.g. Rajesh Kumar', icon: User },
                    { label: 'Official Email', key: 'email', type: 'email', placeholder: 'e.g. rajesh@gov.in', icon: Mail },
                    { label: 'Phone Number', key: 'phone', type: 'tel', placeholder: 'e.g. +91 9876543210', icon: Phone },
                    { label: 'Government Employee ID', key: 'govIdNumber', type: 'text', placeholder: 'e.g. GHMC-2024-0145', icon: Building },
                    { label: 'Service Area / Ward', key: 'serviceAddress', type: 'text', placeholder: 'e.g. Ward 4, GHMC, Hyderabad', icon: Landmark },
                    { label: 'Password', key: 'password', type: 'password', placeholder: 'Min 6 characters', icon: Key },
                    { label: 'Confirm Password', key: 'confirmPassword', type: 'password', placeholder: 'Repeat password', icon: Key },
                  ].map(({ label, key, type, placeholder, icon: Icon }) => (
                    <div key={key} className="space-y-1">
                      <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest block pl-1">{label}</label>
                      <div className="flex items-center bg-white/[0.05] border border-white/10 focus-within:border-[#c9a227]/50 rounded-xl px-4 py-2.5 transition-all">
                        <Icon className="w-4 h-4 text-white/30 mr-2 shrink-0" />
                        <input
                          type={type}
                          required
                          value={formData[key as keyof typeof formData]}
                          onChange={(e) => setFormData(p => ({ ...p, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className="bg-transparent border-none text-sm text-white outline-none w-full placeholder:text-white/20 font-semibold"
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-[#c9a227] hover:bg-[#d4aa35] text-[#0d1f14] rounded-xl font-black shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 text-xs uppercase tracking-wider mt-2 cursor-pointer"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-[#0d1f14]/30 border-t-[#0d1f14] rounded-full animate-spin" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                    Submit for Llama AI Verification
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── HERO: Success ── */}
            {adminSubRole === 'hero' && step === 'success' && (
              <motion.div
                key="hero-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6 py-8"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold text-white uppercase">Application Submitted!</h2>
                  <p className="text-sm text-white/60 font-semibold leading-relaxed max-w-sm mx-auto">{successMsg}</p>
                </div>
                <div className="p-4 bg-[#c9a227]/10 border border-[#c9a227]/20 rounded-2xl text-left space-y-2">
                  <p className="text-xs font-bold text-[#c9a227] uppercase tracking-wider">What happens next?</p>
                  <ul className="text-[11px] text-white/60 font-semibold space-y-1.5">
                    <li>✦ Llama AI reviews your Government ID & credentials</li>
                    <li>✦ Verification typically takes 24–48 hours</li>
                    <li>✦ You'll receive a notification on approval</li>
                    <li>✦ Approved accounts gain full Community Hero access</li>
                  </ul>
                </div>
                <button
                  onClick={onBack}
                  className="px-8 py-3 bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl text-sm font-bold text-white transition-all cursor-pointer"
                >
                  Return to Home
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}



const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
    <path
      fill="#EA4335"
      d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.324 0-6.023-2.699-6.023-6.023 0-3.324 2.699-6.023 6.023-6.023 1.488 0 2.844.542 3.896 1.436l3.076-3.076C19.066 2.012 15.842 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c5.823 0 10.741-4.086 10.741-11.24 0-.585-.052-1.15-.148-1.685H12.24z"
    />
  </svg>
);



// ─── CONTRACTOR PORTAL ENTRY (Standalone) ─────────────────────────────────────
function ContractorPortalEntry({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<'register' | 'success'>('register');
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    phone: '',
    contractorLicense: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const { signUpWithEmail, signInWithGoogle } = useAuth();

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      sessionStorage.setItem("pendingGoogleRole", "contractor");
      if (signInWithGoogle) {
        await signInWithGoogle();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.companyName.trim()) return setError('Company name is required.');
    if (!formData.email.includes('@')) return setError('Valid email is required.');
    if (formData.password.length < 6) return setError('Password must be at least 6 characters.');
    if (formData.password !== formData.confirmPassword) return setError('Passwords do not match.');
    if (!formData.contractorLicense.trim()) return setError('Corporate License Number is required.');

    setLoading(true);
    try {
      if (signUpWithEmail) {
        await signUpWithEmail(formData.email, formData.password, formData.companyName, {
          role: 'contractor',
          contractorCompany: formData.companyName,
          contractorLicense: formData.contractorLicense,
          phoneNumber: formData.phone,
          isBlacklisted: false
        });
      }

      // After signup, update user document with contractor role and specific fields (try-catch backup for firebase)
      try {
        const q = query(collection(db, 'users'), where('email', '==', formData.email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const userDocRef = doc(db, 'users', snap.docs[0].id);
          await updateDoc(userDocRef, {
            role: 'contractor',
            contractorCompany: formData.companyName,
            contractorLicense: formData.contractorLicense,
            phoneNumber: formData.phone,
            isBlacklisted: false
          });

          // Send a notification
          const notificationRef = collection(db, 'notifications');
          await setDoc(doc(notificationRef), {
            userId: snap.docs[0].id,
            title: 'Contractor Profile Active 🏗️',
            message: `Welcome ${formData.companyName}! Your contractor profile is active. You can now bid on open tenders and view active projects.`,
            type: 'general',
            read: false,
            createdAt: new Date().toISOString()
          });
        }
      } catch (fbErr) {
        console.warn("Could not write contractor details to Firestore directly:", fbErr);
      }

      setStep('success');
      setSuccessMsg(`Welcome to the Contractor Portal! Your profile is active and you can now log in to view active projects and bid on tenders.`);
    } catch (err: any) {
      let msg = err.message || 'Registration failed.';
      if (msg.includes('email-already-in-use')) msg = 'This email is already registered.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b132b] relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_#1c2541_0%,_transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_#0b132b_0%,_transparent_60%)] pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#f59e0b] to-transparent opacity-60" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 pt-7 pb-4 border-b border-white/5">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white/70 hover:text-white transition-all cursor-pointer"
        >
          <User className="w-4 h-4" /> Access as a Citizen
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#f59e0b]/20 border border-[#f59e0b]/40 flex items-center justify-center">
            <Building className="w-4 h-4 text-[#f59e0b]" />
          </div>
          <span className="text-white font-extrabold text-sm tracking-widest uppercase">Contractor Portal</span>
        </div>
        <div className="w-24" />
      </header>

      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {step === 'register' && (
              <motion.div
                key="register"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-5"
              >
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/30 mx-auto flex items-center justify-center mb-3">
                    <Building className="w-6 h-6 text-[#f59e0b]" />
                  </div>
                  <h2 className="text-xl font-extrabold text-white uppercase tracking-tight">
                    Contractor Registration
                  </h2>
                  <p className="text-xs text-white/50 font-semibold">Enter your credentials to activate your contractor account.</p>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-bold text-red-400 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-4">
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full flex items-center justify-center py-3 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors text-xs font-bold text-slate-700 shadow-sm cursor-pointer"
                  >
                    <GoogleIcon />
                    Sign In with Google
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-[1px] bg-white/10" />
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">or register via email</span>
                    <div className="flex-1 h-[1px] bg-white/10" />
                  </div>
                </div>

                <form onSubmit={handleRegister} className="space-y-3">
                  {[
                    { label: 'Company / Contractor Name', key: 'companyName', type: 'text', placeholder: 'e.g. M/s Raju Constructions', icon: User },
                    { label: 'Corporate Email', key: 'email', type: 'email', placeholder: 'e.g. contact@rajuconstructions.com', icon: Mail },
                    { label: 'Contact Phone', key: 'phone', type: 'tel', placeholder: 'e.g. +91 9876543210', icon: Phone },
                    { label: 'Corporate License Number', key: 'contractorLicense', type: 'text', placeholder: 'e.g. LIC-AP-5024-11', icon: Building },
                    { label: 'Password', key: 'password', type: 'password', placeholder: 'Min 6 characters', icon: Key },
                    { label: 'Confirm Password', key: 'confirmPassword', type: 'password', placeholder: 'Repeat password', icon: Key },
                  ].map(({ label, key, type, placeholder, icon: Icon }) => (
                    <div key={key} className="space-y-1">
                      <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest block pl-1">{label}</label>
                      <div className="flex items-center bg-white/[0.05] border border-white/10 focus-within:border-[#f59e0b]/50 rounded-xl px-4 py-2.5 transition-all">
                        <Icon className="w-4 h-4 text-white/30 mr-2 shrink-0" />
                        <input
                          type={type}
                          required
                          value={formData[key as keyof typeof formData]}
                          onChange={(e) => setFormData(p => ({ ...p, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className="bg-transparent border-none text-sm text-white outline-none w-full placeholder:text-white/20 font-semibold"
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-[#f59e0b] hover:bg-[#fbbf24] text-[#0b132b] rounded-xl font-black shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 text-xs uppercase tracking-wider mt-2 cursor-pointer"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-[#0b132b]/30 border-t-[#0b132b] rounded-full animate-spin" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                    Activate Contractor Account
                  </button>
                </form>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6 py-8"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold text-white uppercase">Profile Activated!</h2>
                  <p className="text-sm text-white/60 font-semibold leading-relaxed max-w-sm mx-auto">{successMsg}</p>
                </div>
                <div className="p-4 bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-2xl text-left space-y-2">
                  <p className="text-xs font-bold text-[#f59e0b] uppercase tracking-wider">What happens next?</p>
                  <ul className="text-[11px] text-white/60 font-semibold space-y-1.5">
                    <li>✦ Use your corporate credentials to sign in</li>
                    <li>✦ Access open municipal tenders instantly</li>
                    <li>✦ Submit bids and track active contracts</li>
                    <li>✦ View defect liability status in real-time</li>
                  </ul>
                </div>
                <button
                  onClick={onBack}
                  className="px-8 py-3 bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl text-sm font-bold text-white transition-all cursor-pointer"
                >
                  Return to Home
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN LOGIN COMPONENT ─────────────────────────────────────────────────────
export default function Login({ onBack, forceRole }: { onBack?: () => void; forceRole?: 'citizen' | 'contractor' | 'administration' }) {
  // 'select' = role picker, 'user' = user auth, 'admin' = admin portal entry, 'contractor' = contractor portal entry
  const [portalMode, setPortalMode] = useState<'select' | 'user' | 'admin' | 'contractor'>(
    forceRole === 'contractor' ? 'contractor' : forceRole === 'administration' ? 'admin' : 'select'
  );
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [lang, setLang] = useState('en');
  const [statIdx, setStatIdx] = useState(0);

  // Auto-cycle stats every 4s
  useEffect(() => {
    const timer = setInterval(() => setStatIdx(i => (i + 1) % CIVIC_STATS.length), 4000);
    return () => clearInterval(timer);
  }, []);

  const t = (key: string) => (T[key]?.[lang] || T[key]?.['en'] || key);
  const currentStat = CIVIC_STATS[statIdx];
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Forgot Password / OTP states
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'otp' | 'reset'>('request');
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotUid, setForgotUid] = useState('');
  const [forgotProfile, setForgotProfile] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    user,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    saveCredentials,
    signOut,
    isProfileSetupComplete,
    mockSignIn
  } = useAuth();

  const handleOAuthSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      if (signInWithGoogle) {
        await signInWithGoogle();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegisterMode) {
        if (!name.trim()) throw new Error('Full Name is required');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        if (signUpWithEmail) {
          await signUpWithEmail(username, password, name);
        }
      } else {
        if (signInWithEmail) {
          await signInWithEmail(username, password);
        }
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || 'Authentication failed.';
      if (errMsg.includes('auth/user-not-found') || errMsg.includes('auth/invalid-credential')) {
        errMsg = 'Invalid username/email or password.';
      } else if (errMsg.includes('auth/email-already-in-use')) {
        errMsg = 'This username or email is already registered.';
      } else if (errMsg.includes('auth/weak-password')) {
        errMsg = 'Password is too weak. Make it 6+ characters.';
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please choose a username to join the leaderboard.');
      return;
    }
    if (!password.trim() || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      if (saveCredentials) {
        await saveCredentials(username, password);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save profile credentials.');
    } finally {
      setLoading(false);
    }
  };

  const maskEmail = (email: string) => {
    const parts = email.split('@');
    if (parts.length < 2) return email;
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 2) return `${name[0]}***@${domain}`;
    return `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}@${domain}`;
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotUsername.trim()) {
      setError('Username or Email is required.');
      return;
    }
    setError(null);
    setLoading(true);
    setSuccessMessage(null);
    try {
      const resLookup = await fetch('/api/auth/lookup-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail: forgotUsername })
      });

      if (!resLookup.ok) {
        const data = await resLookup.json();
        throw new Error(data.error || 'No account found with this username or email.');
      }

      const dataLookup = await resLookup.json();
      const profileData = dataLookup.profile;
      const email = profileData.email;

      if (!email) throw new Error('This profile does not have a registered email.');

      setForgotEmail(email);
      setForgotUid(profileData.uid);
      setForgotProfile(profileData);

      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username: profileData.username || forgotUsername })
      });

      if (!res.ok) throw new Error('Failed to dispatch OTP. Server error.');

      setForgotStep('otp');
      setSuccessMessage(`A verification OTP has been sent to ${maskEmail(email)}. Check server logs!`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to process request.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp.trim()) { setError('OTP Code is required.'); return; }
    setError(null); setLoading(true); setSuccessMessage(null);
    try {
      const username = forgotProfile?.username || forgotUsername;
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, otp: forgotOtp.trim() })
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Verification failed.'); }
      setForgotStep('reset');
      setSuccessMessage('OTP Code Verified! Configure your new password.');
    } catch (err: any) {
      setError(err.message || 'Failed to verify OTP.');
    } finally { setLoading(false); }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotNewPassword.trim() || !forgotConfirmPassword.trim()) { setError('Both password fields are required.'); return; }
    if (forgotNewPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (forgotNewPassword !== forgotConfirmPassword) { setError('Passwords do not match.'); return; }
    setError(null); setLoading(true); setSuccessMessage(null);
    try {
      const username = forgotProfile?.username || forgotUsername;
      const authRes = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, newPassword: forgotNewPassword, otp: forgotOtp.trim() })
      });
      if (!authRes.ok) { const data = await authRes.json(); throw new Error(data.error || 'Failed to reset password.'); }
      try {
        const userDocRef = doc(db, 'users', forgotUid);
        await updateDoc(userDocRef, { password: forgotNewPassword });
      } catch { /* silent */ }
      setSuccessMessage('Password reset successful! You can now sign in with your new credentials. ✅');
      setForgotMode(false);
      setForgotStep('request');
      setForgotUsername(''); setForgotOtp(''); setForgotNewPassword(''); setForgotConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally { setLoading(false); }
  };

  const isSetupRequired = user !== null && !isProfileSetupComplete;

  // If admin portal mode, render the standalone admin entry
  if (portalMode === 'admin') {
    return <AdminPortalEntry onBack={onBack || (() => setPortalMode('select'))} />;
  }

  // If contractor portal mode, render the ContractorPortalEntry
  if (portalMode === 'contractor') {
    return <ContractorPortalEntry onBack={onBack || (() => setPortalMode('select'))} />;
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 font-sans bg-sage-bg select-none">

      {/* ══ LEFT PANEL: Cinematic Hero + Stats + Language Switcher ══ */}
      <div className="hidden lg:flex lg:col-span-7 relative overflow-hidden flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={statIdx}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.9, ease: 'easeInOut' }}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${currentStat.image})` }}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />

        <div className="relative z-20 flex items-center justify-between px-8 pt-7 pb-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold-accent/20 border border-gold-accent/40 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-gold-accent" />
            </div>
            <span className="text-white font-extrabold text-sm tracking-widest uppercase">Community Hero</span>
          </div>
          <div className="flex items-center gap-1 bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl px-2 py-1.5">
            <Globe className="w-3.5 h-3.5 text-white/50 mx-1 shrink-0" />
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                title={l.label}
                className={`w-8 h-8 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  lang === l.code
                    ? 'bg-gold-accent text-gov-green-dark shadow-md'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {l.script}
              </button>
            ))}
          </div>
        </div>

        <div className="relative z-20 flex-1 flex flex-col justify-center px-10">
          <motion.div
            key={lang}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-4 max-w-lg"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gold-accent/20 border border-gold-accent/30 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-accent animate-pulse" />
              <span className="text-[10px] font-black text-gold-accent uppercase tracking-[0.2em]">Live Civic Network</span>
            </div>
            <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight tracking-tight">
              {t('hero_title')}
            </h1>
            <div className="h-0.5 w-16 bg-gradient-to-r from-gold-accent to-transparent" />
            <p className="text-gold-accent/90 text-sm font-bold tracking-wider uppercase">
              {t('hero_sub')}
            </p>
            <p className="text-white/60 text-sm leading-relaxed max-w-md">
              {t('hero_desc')}
            </p>
          </motion.div>
        </div>

        <div className="relative z-20 px-10 pb-10">
          <div className="flex gap-1.5 mb-5">
            {CIVIC_STATS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStatIdx(i)}
                className={`h-1 rounded-full transition-all cursor-pointer ${
                  i === statIdx ? 'w-8 bg-gold-accent' : 'w-3 bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={statIdx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex items-center gap-5"
            >
              <div className="shrink-0">
                <p className="text-4xl xl:text-5xl font-black leading-none" style={{ color: currentStat.color }}>
                  {currentStat.stat}
                </p>
                <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">
                  Source: {currentStat.source}
                </p>
              </div>
              <div className="h-12 w-px bg-white/10 shrink-0" />
              <p className="text-white/80 text-sm font-semibold leading-relaxed">
                {currentStat.label[lang as keyof typeof currentStat.label] || currentStat.label.en}
              </p>
              <div className="ml-auto flex gap-1 shrink-0">
                <button
                  onClick={() => setStatIdx(i => (i - 1 + CIVIC_STATS.length) % CIVIC_STATS.length)}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setStatIdx(i => (i + 1) % CIVIC_STATS.length)}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>

          <p className="text-white/25 text-[10px] uppercase font-bold tracking-widest mt-5">
            State of Civic Operations • © 2026
          </p>
        </div>
      </div>

      {/* Right side panel */}
      <div className="col-span-1 lg:col-span-5 flex items-center justify-center p-8 bg-[#f3f5f3] relative">
        <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-sage-primary/10 rounded-full filter blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-gold-accent/5 rounded-full filter blur-[100px] pointer-events-none" />

        <div className="w-full max-w-md relative z-10 space-y-8">
          <div className="lg:hidden text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-gov-green flex items-center justify-center border border-gold-accent">
              <ShieldCheck className="w-6 h-6 text-gold-accent" />
            </div>
            <h2 className="text-2xl font-extrabold text-gov-green uppercase">Municipal Audit Grid</h2>
            <p className="text-xs text-sage-primary font-bold tracking-wider uppercase">Civic Safety & Infrastructure</p>
          </div>

          <div className="glass-panel rounded-3xl p-8 shadow-xl border border-white/80">

            <AnimatePresence mode="wait">
              {/* ── ROLE SELECTION (default screen) ── */}
              {portalMode === 'select' && !isSetupRequired && !forgotMode && (
                <motion.div
                  key="select-role"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-gov-green/10 border border-gov-green/20 mx-auto flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6 text-gov-green" />
                    </div>
                    <h3 className="text-xl font-bold text-gov-green uppercase tracking-wide">
                      Choose Your Access Type
                    </h3>
                    <p className="text-xs text-sage-primary font-semibold">
                      Select how you would like to access the portal.
                    </p>
                  </div>

                  <div className="space-y-3">

                    {/* ADMINISTRATOR option */}
                    <button
                      onClick={() => setPortalMode('admin')}
                      className="w-full flex items-center gap-4 p-5 bg-gold-accent/[0.04] hover:bg-gold-accent/[0.08] border border-gold-accent/20 hover:border-gold-accent/50 rounded-2xl transition-all cursor-pointer group text-left"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gov-green text-gold-accent flex items-center justify-center shadow-md shrink-0">
                        <Landmark className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-base font-extrabold text-gov-green block">Administrator</span>
                        <span className="text-[11px] text-sage-primary font-semibold leading-snug block mt-0.5">
                          Government officials — Pole Man, Corporator, and workforce categories
                        </span>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gold-accent/30 group-hover:text-gold-accent transition-all shrink-0" />
                    </button>

                    {/* CONTRACTOR option */}
                    <button
                      onClick={() => setPortalMode('contractor')}
                      className="w-full flex items-center gap-4 p-5 bg-blue-500/[0.04] hover:bg-blue-500/[0.08] border border-blue-500/20 hover:border-blue-500/50 rounded-2xl transition-all cursor-pointer group text-left"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gov-green text-blue-400 flex items-center justify-center shadow-md shrink-0">
                        <Building className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-base font-extrabold text-gov-green block">Contractor / Vendor</span>
                        <span className="text-[11px] text-sage-primary font-semibold leading-snug block mt-0.5">
                          Private entities — Tender bidding, issue resolution, & active contract management
                        </span>
                      </div>
                      <ArrowRight className="w-5 h-5 text-blue-400/30 group-hover:text-blue-400 transition-all shrink-0" />
                    </button>
                  </div>

                  <p className="text-center text-[10px] text-sage-primary/50 font-bold uppercase tracking-widest">
                    State Civic Network • Secured Encryption
                  </p>

                  {/* Sandbox */}
                  {mockSignIn && (
                    <div className="pt-4 border-t border-slate-200/50 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-[1px] bg-slate-200" />
                        <span className="text-[9px] font-black text-sage-primary uppercase tracking-widest">Local Sandbox</span>
                        <div className="flex-1 h-[1px] bg-slate-200" />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => mockSignIn('citizen')}
                          className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-[#112e20] rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                        >
                          <User className="w-3.5 h-3.5 text-sage-primary" />
                          Citizen Sandbox
                        </button>
                        <button
                          type="button"
                          onClick={() => mockSignIn('administration')}
                          className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-[#112e20] rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-gold-accent" />
                          Admin Sandbox
                        </button>
                      </div>
                    </div>
                  )}

                  {onBack && (
                    <button
                      onClick={onBack}
                      className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-extrabold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200/60"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Return to Main Hub
                    </button>
                  )}
                </motion.div>
              )}

              {/* ── FORGOT PASSWORD flow ── */}
              {forgotMode && portalMode === 'user' && (
                <motion.div
                  key="forgot"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-gov-green/10 border border-gov-green/20 mx-auto flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6 text-gov-green" />
                    </div>
                    <h3 className="text-xl font-bold text-gov-green uppercase tracking-wide">
                      Password Recovery Ledger
                    </h3>
                    <p className="text-xs text-sage-primary font-semibold leading-relaxed">
                      {forgotStep === 'request' && 'Enter your registered credentials to receive a One-Time Verification OTP.'}
                      {forgotStep === 'otp' && 'Enter the 6-digit OTP code sent to your registered email.'}
                      {forgotStep === 'reset' && 'Configure a new secure password for your portal signature.'}
                    </p>
                  </div>

                  {successMessage && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-bold text-emerald-800 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{successMessage}</span>
                    </div>
                  )}

                  {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-bold text-red-700 flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {forgotStep === 'request' && (
                    <form onSubmit={handleForgotRequest} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gov-green uppercase tracking-widest block pl-1">Username or Email</label>
                        <div className="flex items-center bg-white border border-slate-200 focus-within:border-sage-primary rounded-xl px-4 py-3 transition-all shadow-inner">
                          <Mail className="w-4 h-4 text-sage-primary mr-2 shrink-0" />
                          <input
                            type="text" required value={forgotUsername}
                            onChange={(e) => setForgotUsername(e.target.value)}
                            placeholder="e.g. alicewriter"
                            className="bg-transparent border-none text-sm text-gov-green outline-none w-full placeholder:text-slate-400 font-semibold"
                          />
                        </div>
                      </div>
                      <button type="submit" disabled={loading} className="w-full py-3.5 bg-gov-green hover:bg-gov-green-light text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 text-xs uppercase tracking-wider mt-4 cursor-pointer">
                        {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Send OTP Code'}
                      </button>
                    </form>
                  )}

                  {forgotStep === 'otp' && (
                    <form onSubmit={handleForgotVerify} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gov-green uppercase tracking-widest block pl-1">6-Digit OTP Code</label>
                        <div className="flex items-center bg-white border border-slate-200 focus-within:border-sage-primary rounded-xl px-4 py-3 transition-all shadow-inner">
                          <Lock className="w-4 h-4 text-sage-primary mr-2 shrink-0" />
                          <input
                            type="text" required maxLength={6} value={forgotOtp}
                            onChange={(e) => setForgotOtp(e.target.value)}
                            placeholder="e.g. 123456"
                            className="bg-transparent border-none text-sm text-gov-green outline-none w-full placeholder:text-slate-400 font-mono font-bold tracking-widest text-center"
                          />
                        </div>
                      </div>
                      <button type="submit" disabled={loading} className="w-full py-3.5 bg-gov-green hover:bg-gov-green-light text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 text-xs uppercase tracking-wider mt-4 cursor-pointer">
                        {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Verify Code'}
                      </button>
                    </form>
                  )}

                  {forgotStep === 'reset' && (
                    <form onSubmit={handleForgotReset} className="space-y-4">
                      {[
                        { label: 'New Password', val: forgotNewPassword, setter: setForgotNewPassword },
                        { label: 'Confirm New Password', val: forgotConfirmPassword, setter: setForgotConfirmPassword },
                      ].map(({ label, val, setter }) => (
                        <div key={label} className="space-y-1">
                          <label className="text-[10px] font-bold text-gov-green uppercase tracking-widest block pl-1">{label}</label>
                          <div className="flex items-center bg-white border border-slate-200 focus-within:border-sage-primary rounded-xl px-4 py-3 transition-all shadow-inner">
                            <Key className="w-4 h-4 text-sage-primary mr-2 shrink-0" />
                            <input
                              type="password" required value={val}
                              onChange={(e) => setter(e.target.value)}
                              placeholder="Min 6 characters"
                              className="bg-transparent border-none text-sm text-gov-green outline-none w-full placeholder:text-slate-400 font-semibold"
                            />
                          </div>
                        </div>
                      ))}
                      <button type="submit" disabled={loading} className="w-full py-3.5 bg-gov-green hover:bg-gov-green-light text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 text-xs uppercase tracking-wider mt-4 cursor-pointer">
                        {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save New Password'}
                      </button>
                    </form>
                  )}

                  <div className="pt-2 text-center border-t border-slate-200/50">
                    <button
                      type="button"
                      onClick={() => { setForgotMode(false); setForgotStep('request'); setError(null); setSuccessMessage(null); }}
                      className="inline-flex items-center gap-1 text-xs text-gov-green hover:text-gov-green-light font-bold transition-all cursor-pointer uppercase tracking-wider"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── CREDENTIALS SETUP (Google users) ── */}
              {isSetupRequired && (
                <motion.div
                  key="setup"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-gold-accent/10 border border-gold-accent mx-auto flex items-center justify-center">
                      <Lock className="w-6 h-6 text-gold-accent" />
                    </div>
                    <h3 className="text-xl font-bold text-gov-green uppercase tracking-wide">Link Username & Password</h3>
                    <p className="text-xs text-sage-primary font-semibold leading-relaxed">
                      To complete registration, configure a username and password to secure your portal account signature.
                    </p>
                  </div>

                  <form onSubmit={handleSetupCredentials} className="space-y-4">
                    {[
                      { label: 'Select Username', val: username, setter: setUsername, type: 'text', placeholder: 'e.g. jsmith', icon: User },
                      { label: 'Select Password', val: password, setter: setPassword, type: 'password', placeholder: 'Min 6 characters', icon: Key },
                    ].map(({ label, val, setter, type, placeholder, icon: Icon }) => (
                      <div key={label} className="space-y-1">
                        <label className="text-[10px] font-bold text-gov-green uppercase tracking-widest block pl-1">{label}</label>
                        <div className="flex items-center bg-white border border-slate-200 focus-within:border-sage-primary rounded-xl px-4 py-3 transition-all shadow-inner">
                          <Icon className="w-4 h-4 text-sage-primary mr-2 shrink-0" />
                          <input
                            type={type} required value={val}
                            onChange={(e) => setter(e.target.value)}
                            placeholder={placeholder}
                            className="bg-transparent border-none text-sm text-gov-green outline-none w-full placeholder:text-slate-400 font-semibold"
                          />
                        </div>
                      </div>
                    ))}

                    {error && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-bold text-red-700 flex items-start gap-2">
                        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{error}</span>
                      </div>
                    )}

                    <button type="submit" disabled={loading} className="w-full py-3.5 bg-gov-green hover:bg-gov-green-light text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 text-xs uppercase tracking-wider mt-4 cursor-pointer">
                      {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                      Complete Secure Binding
                    </button>
                  </form>

                  <div className="pt-2 text-center border-t border-slate-200/50">
                    <button
                      onClick={() => signOut && signOut()}
                      className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-bold transition-all cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Disconnect Current Session
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          <div className="text-center">
            <span className="text-[10px] font-bold text-sage-primary uppercase tracking-widest">
              State Civic Network • Secured Encryption
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

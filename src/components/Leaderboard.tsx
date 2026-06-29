import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "./FirebaseProvider";
import { UserProfile } from "../types";
import { motion } from "motion/react";
import { Trophy, Medal, Star, Flame, TrendingUp, Shield, Award, ChevronUp, Users, Zap, Crown } from "lucide-react";

const RANK_TIERS = [
  { name: "Novice Reporter", minXP: 0, maxXP: 49, color: "#94a3b8", bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200" },
  { name: "Civic Sentinel", minXP: 50, maxXP: 149, color: "#22c55e", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  { name: "Community Sentinel", minXP: 150, maxXP: 349, color: "#3b82f6", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  { name: "Urban Guardian", minXP: 350, maxXP: 699, color: "#8b5cf6", bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  { name: "District Champion", minXP: 700, maxXP: 1199, color: "#f59e0b", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  { name: "State Defender", minXP: 1200, maxXP: 2499, color: "#ef4444", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  { name: "Municipal Legend", minXP: 2500, maxXP: Infinity, color: "#d4af37", bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
];

function getRankTier(points: number) {
  return RANK_TIERS.find(t => points >= t.minXP && points <= t.maxXP) || RANK_TIERS[0];
}

function getPositionDecoration(pos: number) {
  if (pos === 1) return { icon: Crown, color: "text-yellow-500", bg: "bg-yellow-50 border-yellow-200", label: "1st" };
  if (pos === 2) return { icon: Medal, color: "text-slate-400", bg: "bg-slate-50 border-slate-200", label: "2nd" };
  if (pos === 3) return { icon: Award, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", label: "3rd" };
  return { icon: Star, color: "text-sage-primary", bg: "bg-white border-slate-100", label: `${pos}th` };
}

// Animated XP bar
function XPBar({ points, maxPoints }: { points: number; maxPoints: number }) {
  const pct = Math.min(100, maxPoints === 0 ? 100 : (points / maxPoints) * 100);
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-gov-green to-gold-accent"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}

// Top 3 podium card
function PodiumCard({ user, position }: { user: UserProfile; position: number }) {
  const deco = getPositionDecoration(position);
  const tier = getRankTier(user.points);
  const Icon = deco.icon;
  const heights = ["h-44", "h-36", "h-32"];
  const order = [1, 0, 2]; // 2nd, 1st, 3rd visual order
  const isFirst = position === 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: position * 0.12, duration: 0.5 }}
      className="flex flex-col items-center gap-3 min-w-[100px]"
    >
      {/* Avatar ring */}
      <div className={`relative ${isFirst ? "scale-110" : ""}`}>
        {isFirst && (
          <motion.div
            className="absolute -top-5 left-1/2 -translate-x-1/2"
            animate={{ rotate: [0, -10, 10, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          >
            <Crown className="w-6 h-6 text-yellow-500 drop-shadow-md" />
          </motion.div>
        )}
        <div
          className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center shadow-md ${isFirst ? "border-yellow-400 bg-yellow-50" : "border-white bg-sage-bg"}`}
          style={{ boxShadow: isFirst ? "0 0 20px rgba(212,175,55,0.4)" : undefined }}
        >
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover rounded-2xl" />
          ) : (
            <span className="text-2xl font-extrabold text-gov-green">
              {(user.displayName || user.username || "?")[0].toUpperCase()}
            </span>
          )}
        </div>
        <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-lg border flex items-center justify-center text-[10px] font-black ${deco.bg} ${deco.color}`}>
          {position}
        </div>
      </div>

      {/* Name */}
      <div className="text-center">
        <p className="text-xs font-extrabold text-gov-green truncate max-w-[90px]">
          {user.displayName || user.username || "Hero"}
        </p>
        <p className={`text-[9px] font-bold uppercase tracking-wider truncate max-w-[90px] ${tier.text}`}>
          {user.rank || tier.name}
        </p>
      </div>

      {/* Podium block */}
      <div
        className={`w-24 ${heights[position - 1]} rounded-t-2xl flex items-end justify-center pb-3 shadow-inner`}
        style={{
          background: position === 1
            ? "linear-gradient(to bottom, #d4af37, #91771a)"
            : position === 2
            ? "linear-gradient(to bottom, #b0b8c1, #6b7280)"
            : "linear-gradient(to bottom, #d97706, #92400e)"
        }}
      >
        <span className="text-white font-black text-sm drop-shadow">{user.points} XP</span>
      </div>
    </motion.div>
  );
}

export default function Leaderboard() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "heroes" | "citizens">("all");
  const [myRank, setMyRank] = useState<number | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      try {
        // Fetch from Firestore
        const q = query(collection(db, "users"), orderBy("points", "desc"), limit(50));
        const snap = await getDocs(q);
        const fetched = snap.docs.map(d => d.data() as UserProfile);
        setUsers(fetched);
        if (profile) {
          const rank = fetched.findIndex(u => u.uid === profile.uid);
          setMyRank(rank >= 0 ? rank + 1 : null);
        }
      } catch {
        // If Firestore query fails (e.g., offline), generate from local users_db
        try {
          const res = await fetch("/api/auth/leaderboard");
          if (res.ok) {
            const data = await res.json();
            setUsers(data.users);
            if (profile) {
              const rank = data.users.findIndex((u: UserProfile) => u.uid === profile.uid);
              setMyRank(rank >= 0 ? rank + 1 : null);
            }
          }
        } catch { /* silently fail */ }
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, [profile]);

  const filtered = users.filter(u => {
    if (filter === "heroes") return u.isHero;
    if (filter === "citizens") return !u.isHero;
    return true;
  });

  const top3 = filtered.slice(0, 3);
  const rest = filtered.slice(3);
  const maxPoints = filtered[0]?.points || 1;

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
            className="w-10 h-10 border-4 border-gov-green/20 border-t-gov-green rounded-full"
          />
          <p className="text-sm font-bold text-sage-primary uppercase tracking-widest">Loading Rankings...</p>
        </div>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="min-h-[300px] flex flex-col items-center justify-center gap-4 py-16">
        <Trophy className="w-14 h-14 text-sage-primary/30" />
        <p className="text-sage-primary font-bold text-sm uppercase tracking-wider">No heroes ranked yet</p>
        <p className="text-slate-400 text-xs">Report issues and earn XP to appear on the leaderboard!</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">

      {/* Header */}
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-gold-accent/10 border border-gold-accent/20 rounded-full"
        >
          <Flame className="w-3.5 h-3.5 text-gold-accent animate-pulse" />
          <span className="text-[10px] font-black text-gov-green uppercase tracking-widest">Live Rankings</span>
        </motion.div>
        <h2 className="text-2xl font-extrabold text-gov-green uppercase tracking-tight">
          Regional Hero Standings
        </h2>
        <p className="text-xs text-sage-primary font-medium">
          Top citizens ranked by civic contribution XP
        </p>
      </div>

      {/* My Rank Banner */}
      {profile && myRank && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-panel rounded-2xl px-5 py-4 flex items-center justify-between border border-gold-accent/20 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gov-green/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-gold-accent" />
            </div>
            <div>
              <p className="text-xs font-black text-gov-green">Your Current Rank</p>
              <p className="text-[10px] text-sage-primary font-semibold">{profile.displayName} • {profile.points} XP</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold text-gov-green">#{myRank}</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
        </motion.div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(["all", "heroes", "citizens"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer capitalize ${
              filter === f
                ? "bg-gov-green text-gold-accent border-gov-green shadow-sm"
                : "bg-white text-sage-primary border-slate-200 hover:border-gov-green/30"
            }`}
          >
            {f === "all" ? "All Heroes" : f === "heroes" ? "⚙️ Workforce" : "👤 Citizens"}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-sage-primary uppercase tracking-widest">
          <Users className="w-3.5 h-3.5" />
          {filtered.length} ranked
        </div>
      </div>

      {/* Podium - Top 3 */}
      {top3.length >= 2 && (
        <div className="glass-panel rounded-3xl p-8 border border-white/60 shadow-md overflow-hidden relative">
          {/* Glow BG */}
          <div className="absolute inset-0 bg-gradient-to-b from-gov-green/5 to-transparent pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-gold-accent/5 rounded-full blur-3xl pointer-events-none" />

          <p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-sage-primary mb-8">
            🏆 Hall of Champions
          </p>
          
          <div className="flex items-end justify-center gap-4">
            {/* 2nd place left */}
            {top3[1] && (
              <PodiumCard user={top3[1]} position={2} />
            )}
            {/* 1st place center */}
            {top3[0] && (
              <PodiumCard user={top3[0]} position={1} />
            )}
            {/* 3rd place right */}
            {top3[2] && (
              <PodiumCard user={top3[2]} position={3} />
            )}
          </div>
        </div>
      )}

      {/* Full Ranked List */}
      {rest.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-sage-primary px-1">Full Rankings</p>
          {rest.map((u, i) => {
            const tier = getRankTier(u.points);
            const pos = i + 4;
            const isMe = profile?.uid === u.uid;

            return (
              <motion.div
                key={u.uid}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`rounded-2xl px-4 py-3 flex items-center gap-4 transition-all border ${
                  isMe
                    ? "bg-gov-green/5 border-gold-accent/30 shadow-sm"
                    : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm"
                }`}
              >
                {/* Rank number */}
                <span className={`text-xs font-black w-6 text-center shrink-0 ${isMe ? "text-gold-accent" : "text-slate-400"}`}>
                  {pos}
                </span>

                {/* Avatar */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${tier.border} ${tier.bg}`}>
                  {u.photoURL ? (
                    <img src={u.photoURL} alt={u.displayName} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <span className={`text-sm font-extrabold ${tier.text}`}>
                      {(u.displayName || u.username || "?")[0].toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Name & rank tier */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={`text-xs font-extrabold truncate ${isMe ? "text-gov-green" : "text-slate-700"}`}>
                      {u.displayName || u.username || "Anonymous Hero"}
                    </p>
                    {isMe && <span className="text-[9px] font-black text-gold-accent bg-gold-accent/10 px-1.5 py-0.5 rounded-full">YOU</span>}
                    {u.isHero && <Shield className="w-3 h-3 text-gov-green/50 shrink-0" />}
                  </div>
                  <div className="mt-1">
                    <XPBar points={u.points} maxPoints={maxPoints} />
                  </div>
                </div>

                {/* XP */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-extrabold text-gov-green">{u.points}</p>
                  <p className="text-[9px] font-bold text-sage-primary">XP</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* XP Legend */}
      <div className="glass-panel rounded-2xl p-5 border border-white/60">
        <p className="text-[10px] font-black uppercase tracking-widest text-sage-primary mb-4">XP Rank Tiers</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {RANK_TIERS.map(tier => (
            <div key={tier.name} className={`rounded-xl px-3 py-2 border ${tier.bg} ${tier.border}`}>
              <p className={`text-[9px] font-black uppercase tracking-wider ${tier.text}`}>{tier.name}</p>
              <p className="text-[9px] text-slate-500 font-semibold mt-0.5">
                {tier.maxXP === Infinity ? `${tier.minXP}+ XP` : `${tier.minXP}–${tier.maxXP} XP`}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

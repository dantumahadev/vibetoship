import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, EmailAuthProvider, linkWithCredential } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, Unsubscribe, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db, signInWithGoogle } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  mockSignIn?: (role: UserRole) => void;
  setProfile: (profile: UserProfile | null) => void;
  signInWithEmail: (usernameOrEmail: string, pass: string) => Promise<void>;
  signUpWithEmail: (usernameOrEmail: string, pass: string, name: string, additionalFields?: Partial<UserProfile>) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  saveCredentials: (username: string, pass: string) => Promise<void>;
  isProfileSetupComplete: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile is complete if username+password are set (email/password users)
  // OR if the user signed in via Google (has a real Firebase provider, not anonymous)
  const isGoogleUser = !!(user && !user.isAnonymous && user.providerData?.some(p => p.providerId === 'google.com'));
  const isProfileSetupComplete = isGoogleUser || !!(profile?.username && profile?.password);

  useEffect(() => {
    let profileUnsubscribe: Unsubscribe | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }

      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const usersPath = `users/${user.uid}`;

        try {
          // Check if profile exists
          const userDoc = await getDoc(userDocRef);

          const pendingRole = sessionStorage.getItem("pendingGoogleRole");
          const migrationDataStr = sessionStorage.getItem("pendingProfileMigration");

          if (pendingRole === 'contractor') {
            sessionStorage.removeItem("pendingGoogleRole");
            if (userDoc.exists()) {
              const currentProfile = userDoc.data() as UserProfile;
              if (currentProfile.role !== 'contractor') {
                await updateDoc(userDocRef, { 
                  role: 'contractor',
                  contractorCompany: currentProfile.contractorCompany || user.displayName || 'Contractor',
                  isBlacklisted: false
                });
              }
            } else {
              const newProfile: UserProfile = {
                uid: user.uid,
                displayName: user.displayName || 'Anonymous Contractor',
                email: user.email || '',
                photoURL: user.photoURL || '',
                role: 'contractor',
                contractorCompany: user.displayName || 'Contractor',
                isBlacklisted: false,
                points: 0,
                rank: 'Novice Contractor',
                createdAt: new Date().toISOString(),
              };
              await setDoc(userDocRef, newProfile);
            }
          } else if (pendingRole === 'corporator') {
            sessionStorage.removeItem("pendingGoogleRole");
            if (userDoc.exists()) {
              const currentProfile = userDoc.data() as UserProfile;
              if (currentProfile.heroType !== 'ghmc_corporator') {
                await updateDoc(userDocRef, {
                  role: 'administration',
                  heroType: 'ghmc_corporator',
                  isGovWorker: true,
                  govVerificationStatus: 'verified',
                });
              }
            } else {
              const newProfile: UserProfile = {
                uid: user.uid,
                displayName: user.displayName || 'GHMC Corporator',
                email: user.email || '',
                photoURL: user.photoURL || '',
                role: 'administration',
                heroType: 'ghmc_corporator',
                isGovWorker: true,
                govVerificationStatus: 'verified',
                points: 0,
                rank: 'GHMC Corporator',
                createdAt: new Date().toISOString(),
              };
              await setDoc(userDocRef, newProfile);
            }
          } else if (migrationDataStr) {
            try {
              const migrationData = JSON.parse(migrationDataStr);
              sessionStorage.removeItem("pendingProfileMigration");
              
              const migratedProfile = {
                ...migrationData,
                uid: user.uid
              };
              await setDoc(userDocRef, migratedProfile);
            } catch (parseErr) {
              console.error("Migration parsing failed:", parseErr);
            }
          } else if (!userDoc.exists()) {
            // Create default profile for first-time login
            const newProfile: UserProfile = {
              uid: user.uid,
              displayName: user.displayName || 'Anonymous Hero',
              email: user.email || '',
              photoURL: user.photoURL || '',
              role: 'citizen',
              points: 0,
              rank: 'Novice Reporter',
              createdAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, newProfile);
          }

          // Real-time listener for profile changes
          profileUnsubscribe = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
              setProfile(doc.data() as UserProfile);
            }
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, usersPath);
          });

        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, usersPath);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, []);

  const mockSignIn = async (role: UserRole) => {
    try {
      await signInAnonymously(auth);
      const mockProfile: UserProfile = {
        uid: auth.currentUser?.uid || 'mock-user-123',
        displayName: 'Demo Hero',
        email: 'demo@communityhero.org',
        photoURL: '',
        role: role,
        points: 120,
        rank: 'Community Sentinel',
        createdAt: new Date().toISOString(),
        username: 'demo_hero',
        password: 'password123',
      };
      setProfile(mockProfile);
    } catch (err) {
      console.warn("Anonymous auth failed, using purely local state", err);
      const mockUser = {
        uid: 'mock-user-123',
        displayName: 'Demo Hero',
        email: 'demo@communityhero.org',
        photoURL: '',
      } as User;
      setUser(mockUser);
      setProfile({
        uid: 'mock-user-123',
        displayName: 'Demo Hero',
        email: 'demo@communityhero.org',
        photoURL: '',
        role: role,
        points: 120,
        rank: 'Community Sentinel',
        createdAt: new Date().toISOString(),
        username: 'demo_hero',
        password: 'password123',
      });
    }
  };

  const signInWithEmail = async (usernameOrEmail: string, pass: string) => {
    let email = usernameOrEmail;
    let foundProfile: UserProfile | null = null;

    // Step 1: Resolve username → email via local credentials database
    try {
      const res = await fetch("/api/auth/lookup-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernameOrEmail })
      });
      if (res.ok) {
        const data = await res.json();
        foundProfile = data.profile;
        email = foundProfile?.email || usernameOrEmail;
      } else if (!usernameOrEmail.includes('@')) {
        email = `${usernameOrEmail.toLowerCase()}@communityhero.org`;
      }
    } catch (err) {
      console.warn("Backend lookup failed, using input as email", err);
      if (!usernameOrEmail.includes('@')) {
        email = `${usernameOrEmail.toLowerCase()}@communityhero.org`;
      }
    }

    // Step 2: Try real Firebase Auth — gives a proper session so Firestore works fully
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      return; // ✅ Firebase session established — done
    } catch (firebaseError: any) {
      // If Firebase rejected the credentials AND local DB has a matching password,
      // fall back to synthetic login (covers Google-linked accounts where linkWithCredential failed)
      if (foundProfile && foundProfile.password === pass) {
        console.warn("Firebase Auth rejected, using local credentials fallback", firebaseError.code);
        const syntheticUser = {
          uid: foundProfile.uid,
          email: foundProfile.email,
          displayName: foundProfile.displayName,
          photoURL: foundProfile.photoURL || '',
          isAnonymous: false,
        } as User;
        setUser(syntheticUser);
        setProfile(foundProfile);
        return;
      }
      // Neither Firebase nor local credentials matched — throw the Firebase error
      throw firebaseError;
    }
  };

  const signUpWithEmail = async (usernameOrEmail: string, pass: string, name: string, additionalFields?: Partial<UserProfile>) => {
    const email = usernameOrEmail.includes('@') ? usernameOrEmail : `${usernameOrEmail.toLowerCase()}@communityhero.org`;
    const username = usernameOrEmail.includes('@') ? usernameOrEmail.split('@')[0] : usernameOrEmail;
    
    let uid = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let firebaseSuccess = false;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(userCredential.user, { displayName: name });
      uid = userCredential.user.uid;
      firebaseSuccess = true;
    } catch (firebaseError: any) {
      console.warn("Firebase email signup failed, falling back to local user creation", firebaseError);
      // In local mode or when operation-not-allowed, we fallback to local DB creation.
    }

    const newProfile: UserProfile = {
      uid: uid,
      displayName: name,
      email: email,
      photoURL: '',
      role: 'citizen',
      points: 20,
      rank: 'Novice Reporter',
      createdAt: new Date().toISOString(),
      username: username,
      password: pass,
      ...additionalFields
    };

    if (firebaseSuccess) {
      try {
        const userDocRef = doc(db, 'users', uid);
        await setDoc(userDocRef, newProfile);
      } catch (dbErr) {
        console.warn("Failed to write user doc to Firestore, proceeding with local DB sync", dbErr);
      }
    } else {
      // Establish synthetic user session
      const syntheticUser = {
        uid: uid,
        email: email,
        displayName: name,
        photoURL: '',
        isAnonymous: false,
      } as User;
      setUser(syntheticUser);
    }

    setProfile(newProfile);

    // Sync to local database
    try {
      await fetch("/api/auth/sync-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProfile)
      });
    } catch (err) {
      console.error("Failed to sync new profile to server:", err);
    }

    // Trigger welcome mail
    try {
      await fetch("/api/mail/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, username })
      });
      sessionStorage.setItem("justRegistered", "true");
    } catch (err) {
      console.error("Failed to send welcome email:", err);
    }
  };

  const handleSignInWithGoogle = async () => {
    await signInWithGoogle();
  };

  const saveCredentials = async (username: string, pass: string) => {
    if (!user) throw new Error("No user authenticated");
    const userDocRef = doc(db, 'users', user.uid);
    const updatedProfile = {
      uid: user.uid,
      displayName: user.displayName || 'Anonymous Hero',
      email: user.email || '',
      photoURL: user.photoURL || '',
      role: profile?.role || 'citizen',
      points: profile?.points || 0,
      rank: profile?.rank || 'Novice Reporter',
      createdAt: profile?.createdAt || new Date().toISOString(),
      username: username,
      password: pass
    };
    await setDoc(userDocRef, updatedProfile, { merge: true });
    setProfile(updatedProfile as UserProfile);

    // Sync to local database
    fetch("/api/auth/sync-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedProfile)
    }).catch(err => console.error("Failed to sync linked profile to server:", err));

    // Trigger welcome mail
    fetch("/api/mail/welcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email || "",
        name: user.displayName || "Anonymous Hero",
        username: username
      })
    }).catch(err => console.error("Failed to send welcome email:", err));

    if (user.email) {
      try {
        const credential = EmailAuthProvider.credential(user.email, pass);
        await linkWithCredential(user, credential);
      } catch (linkError) {
        console.warn("Could not link email/password auth credential:", linkError);
      }
    }
  };

  const handleSignOut = async () => {
    // For synthetic local-auth users or mock users, just clear state
    if (!user || user.uid === 'mock-user-123' || user.isAnonymous) {
      setUser(null);
      setProfile(null);
      try { await auth.signOut(); } catch (e) { }
      return;
    }
    // Check if it's a synthetic user (not a real Firebase auth session)
    try {
      await auth.signOut();
    } catch {
      // If Firebase signOut fails (synthetic user), just clear state
    }
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      signIn: handleSignInWithGoogle, 
      signOut: handleSignOut, 
      mockSignIn, 
      setProfile, 
      signInWithEmail, 
      signUpWithEmail,
      signInWithGoogle: handleSignInWithGoogle,
      saveCredentials,
      isProfileSetupComplete
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a FirebaseProvider');
  }
  return context;
};

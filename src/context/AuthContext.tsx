import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { User, UserRole } from '../types';
import { 
  getFirebaseAuth, 
  fetchUserProfileFromFirestore, 
  subscribeUserProfileFromFirestore,
  firebaseSignOut 
} from '../services/firebase';
import { 
  loadCurrentUser, 
  saveCurrentUser, 
  saveUserProfile, 
  loadUserProfile 
} from '../services/storage';
import { 
  isMasterAdmin, 
  isSubAdmin, 
  canAccessAdminPanel,
  getUserCorretoraId 
} from '../utils/insuranceUtils';
import { onAuthStateChanged } from 'firebase/auth';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: 'MASTER' | 'SUB_ADMIN' | 'CORRETOR' | null;
  corretora_id: string;
  isMaster: boolean;
  isSubAdmin: boolean;
  hasAdminAccess: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  updateUser: (updatedUser: User) => void;
  refreshProfile: () => Promise<User | null>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => loadCurrentUser());
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to normalize and synchronize a user record from Firestore document
  const synchronizeUserRecord = (
    uid: string, 
    email: string, 
    displayName?: string | null,
    remoteDoc?: Partial<User> | null
  ): User => {
    const localDoc = loadUserProfile(uid);
    const rawCached = loadCurrentUser();
    const cached = rawCached?.id === uid ? rawCached : null;

    // Read role property directly from Firestore users/{uid} document and force Uppercase
    const rawRole = String(
      (remoteDoc as any)?.role || 
      (remoteDoc as any)?.userRole || 
      localDoc?.role || 
      cached?.role || 
      ''
    ).toUpperCase();

    let resolvedRole: UserRole = 'CORRETOR' as any;
    
    if (rawRole === 'SUB_ADMIN' || rawRole === 'SUBADMIN' || rawRole === 'GESTOR') {
      resolvedRole = 'SUB_ADMIN' as any;
    } else if (
      rawRole === 'MASTER' || 
      rawRole === 'ADMIN' || 
      isMasterAdmin({ email, id: uid })
    ) {
      resolvedRole = 'MASTER' as any;
    } else {
      resolvedRole = 'CORRETOR' as any;
    }

    const corretoraId = 
      (remoteDoc as any)?.corretora_id || 
      (remoteDoc as any)?.brokerageId || 
      localDoc?.corretora_id || 
      localDoc?.brokerageId || 
      cached?.corretora_id || 
      cached?.brokerageId || 
      '';

    const brokerageName = 
      (remoteDoc as any)?.brokerageName || 
      localDoc?.brokerageName || 
      cached?.brokerageName || 
      'Corretora de Seguros';

    const fullName = 
      (remoteDoc as any)?.nome || 
      (remoteDoc as any)?.name || 
      localDoc?.name || 
      cached?.name || 
      displayName || 
      email.split('@')[0] || 
      'Corretor';

    const nameParts = fullName.trim().split(/\s+/);
    const firstName = 
      (remoteDoc as any)?.firstName || 
      localDoc?.firstName || 
      cached?.firstName || 
      nameParts[0] || 
      'Corretor';

    const lastName = (remoteDoc as any)?.lastName !== undefined 
      ? (remoteDoc as any).lastName 
      : (localDoc?.lastName !== undefined ? localDoc.lastName : (cached?.lastName !== undefined ? cached.lastName : (nameParts.slice(1).join(' ') || '')));

    const susep = (remoteDoc as any)?.susep !== undefined ? (remoteDoc as any).susep : (localDoc?.susep || cached?.susep || '');
    const status = (remoteDoc as any)?.status === 'inativo' || (remoteDoc as any)?.status === 'inactive' ? 'inactive' : 'active';

    const resolvedUser: User = {
      id: uid,
      name: fullName,
      firstName,
      lastName,
      email: email || localDoc?.email || cached?.email || '',
      brokerageName,
      brokerageId: corretoraId,
      corretora_id: corretoraId,
      susep,
      role: resolvedRole,
      isAdmin: String(resolvedRole) === 'MASTER' || String(resolvedRole) === 'SUB_ADMIN',
      status
    };

    saveUserProfile(resolvedUser);
    saveCurrentUser(resolvedUser);
    return resolvedUser;
  };

  const refreshProfile = async (): Promise<User | null> => {
    const auth = getFirebaseAuth();
    const fbUser = auth?.currentUser;
    if (!fbUser) {
      const cached = loadCurrentUser();
      setUser(cached);
      return cached;
    }

    try {
      const remoteDoc = await fetchUserProfileFromFirestore(fbUser.uid);
      const synchronized = synchronizeUserRecord(fbUser.uid, fbUser.email || '', fbUser.displayName, remoteDoc);
      setUser(synchronized);
      return synchronized;
    } catch (err) {
      console.warn('Error refreshing profile in AuthContext:', err);
      return user;
    }
  };

  useEffect(() => {
    let isMounted = true;
    let profileUnsubscribe: (() => void) | null = null;
    const auth = getFirebaseAuth();

    if (!auth) {
      const cached = loadCurrentUser();
      setUser(cached);
      setLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (fbUser) => {
      if (!isMounted) return;

      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }

      if (fbUser) {
        // Immediate local fallback to prevent black screen / loading delay
        const initialLocalUser = synchronizeUserRecord(fbUser.uid, fbUser.email || '', fbUser.displayName, null);
        setUser(initialLocalUser);

        // Real-time listener (onSnapshot) on Firestore 'users/{uid}'
        profileUnsubscribe = subscribeUserProfileFromFirestore(fbUser.uid, (remoteDoc) => {
          if (!isMounted) return;
          if (remoteDoc) {
            const synchronized = synchronizeUserRecord(fbUser.uid, fbUser.email || '', fbUser.displayName, remoteDoc);
            setUser(synchronized);
            saveCurrentUser(synchronized);
          }
          setLoading(false);
        });

        // Safety timeout fallback to ensure loading screen unblocks within 1.5s
        setTimeout(() => {
          if (isMounted) {
            setLoading(false);
          }
        }, 1500);
      } else {
        setUser(null);
        saveCurrentUser(null);
        if (isMounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
      unsubscribeAuth();
    };
  }, []);

  const login = (newUser: User) => {
    saveUserProfile(newUser);
    saveCurrentUser(newUser);
    setUser(newUser);
    setLoading(false);
  };

  const logout = async () => {
    try {
      await firebaseSignOut();
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    saveCurrentUser(null);
    setUser(null);
    setLoading(false);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    saveCurrentUser(updatedUser);
    saveUserProfile(updatedUser);
  };

  const roleUpper = String(user?.role || '').toUpperCase();
  const isMaster = useMemo(() => isMasterAdmin(user) || roleUpper === 'MASTER' || roleUpper === 'ADMIN', [user, roleUpper]);
  const isSub = useMemo(() => isSubAdmin(user) || roleUpper === 'SUB_ADMIN' || roleUpper === 'SUBADMIN' || roleUpper === 'GESTOR', [user, roleUpper]);
  const hasAdminAccess = useMemo(() => isMaster || isSub || canAccessAdminPanel(user), [isMaster, isSub, user]);
  const corretoraId = useMemo(() => getUserCorretoraId(user) || user?.corretora_id || user?.brokerageId || '', [user]);
  
  const roleDisplay = useMemo(() => {
    if (!user) return null;
    if (isMaster) return 'MASTER';
    if (isSub) return 'SUB_ADMIN';
    return 'CORRETOR';
  }, [user, isMaster, isSub]);

  const value: AuthContextType = {
    user,
    loading,
    role: roleDisplay,
    corretora_id: corretoraId,
    isMaster,
    isSubAdmin: isSub,
    hasAdminAccess,
    login,
    logout,
    updateUser,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um <AuthProvider>');
  }
  return context;
}
import { initializeApp, getApps, getApp, deleteApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  updateProfile,
  updateEmail,
  updatePassword,
  sendPasswordResetEmail,
  Auth,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  Firestore 
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes,
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject,
  FirebaseStorage 
} from 'firebase/storage';
import { User, Client, BrokerAccount, UserRole } from '../types';
import { loadUserProfile, saveUserProfile, loadCurrentUser, saveCurrentUser } from './storage';
import { isUserAdmin, isMasterAdmin, isSubAdmin, getUserCorretoraId } from '../utils/insuranceUtils';

const STORAGE_KEY_CUSTOM_FIREBASE_CONFIG = 'gestao_corretor_firebase_config_v1';

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId?: string;
  appId?: string;
}

export interface FirebaseStorageDiagnosticDetail {
  code: string;
  title: string;
  description: string;
  solution: string;
  bucketUsed: string;
  isAuthenticated: boolean;
}

// Clean and normalize bucket strings (strip gs://, https://, whitespace)
export function normalizeBucketName(rawBucket: string, projectId: string): string {
  if (!rawBucket || !rawBucket.trim()) {
    return `${projectId}.firebasestorage.app`;
  }
  let bucket = rawBucket.trim();
  if (bucket.startsWith('gs://')) {
    bucket = bucket.substring(5);
  }
  if (bucket.startsWith('https://')) {
    bucket = bucket.replace(/^https?:\/\/[^/]+\//, '');
  }
  if (bucket.endsWith('/')) {
    bucket = bucket.slice(0, -1);
  }
  return bucket;
}

// Read from import.meta.env or localStorage fallback, giving priority to user-saved config
export function getFirebaseConfig(): FirebaseClientConfig | null {
  // 1. Check if user saved custom configuration in browser
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_FIREBASE_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.apiKey && parsed.projectId) {
        return {
          ...parsed,
          storageBucket: normalizeBucketName(parsed.storageBucket, parsed.projectId)
        };
      }
    }
  } catch (e) {
    console.warn('Could not read saved Firebase config:', e);
  }

  // 2. Read from env variables
  const envApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  if (envApiKey && envProjectId) {
    const defaultBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${envProjectId}.firebasestorage.app`;
    return {
      apiKey: envApiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${envProjectId}.firebaseapp.com`,
      projectId: envProjectId,
      storageBucket: normalizeBucketName(defaultBucket, envProjectId),
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
    };
  }

  return null;
}

export function saveCustomFirebaseConfig(config: FirebaseClientConfig): void {
  try {
    const normalizedConfig: FirebaseClientConfig = {
      ...config,
      storageBucket: normalizeBucketName(config.storageBucket, config.projectId)
    };
    localStorage.setItem(STORAGE_KEY_CUSTOM_FIREBASE_CONFIG, JSON.stringify(normalizedConfig));
    // Reset cached instances to force re-initialization with new bucket
    appInstance = null;
  } catch (e) {
    console.error('Could not save Firebase config:', e);
  }
}

export function isFirebaseConfigured(): boolean {
  const config = getFirebaseConfig();
  return Boolean(config && config.apiKey && config.projectId);
}

// Lazy App initialization
let appInstance: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (appInstance) return appInstance;

  const config = getFirebaseConfig();
  if (!config) return null;

  try {
    if (getApps().length > 0) {
      appInstance = getApp();
    } else {
      appInstance = initializeApp(config);
    }
    return appInstance;
  } catch (err) {
    console.error('Failed to initialize Firebase App:', err);
    return null;
  }
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    return getAuth(app);
  } catch (err) {
    console.error('Failed to get Firebase Auth:', err);
    return null;
  }
}

export function getFirebaseStorageInstance(customBucket?: string): FirebaseStorage | null {
  const app = getFirebaseApp();
  if (!app) return null;
  const config = getFirebaseConfig();
  try {
    const bucketToUse = customBucket || (config?.storageBucket ? `gs://${config.storageBucket}` : undefined);
    if (bucketToUse) {
      return getStorage(app, bucketToUse);
    }
    return getStorage(app);
  } catch (err) {
    console.error('Failed to get Firebase Storage:', err);
    return null;
  }
}

export function getFirebaseFirestore(): Firestore | null {
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    return getFirestore(app);
  } catch (err) {
    console.warn('Failed to get Firebase Firestore:', err);
    return null;
  }
}

export async function fetchUserProfileFromFirestore(userId: string): Promise<Partial<User> | null> {
  const db = getFirebaseFirestore();
  if (!db || !userId) return null;
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as Partial<User>;
    }
  } catch (err) {
    console.warn('Could not read user profile from Firestore:', err);
  }
  return null;
}

export function subscribeUserProfileFromFirestore(
  userId: string,
  onUpdate: (data: Partial<User> | null) => void
): () => void {
  const db = getFirebaseFirestore();
  if (!db || !userId) {
    return () => {};
  }
  try {
    const userDocRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(
      userDocRef,
      (snap) => {
        if (snap.exists()) {
          onUpdate(snap.data() as Partial<User>);
        } else {
          onUpdate(null);
        }
      },
      (err) => {
        console.warn('Realtime profile snapshot listener warning:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Could not attach profile listener:', err);
    return () => {};
  }
}

export async function saveUserProfileToFirestore(userId: string, data: Partial<User>): Promise<void> {
  const db = getFirebaseFirestore();
  if (!db || !userId) return;
  try {
    const userDocRef = doc(db, 'users', userId);

    // Absolute Security Validation on MASTER role:
    // Only the unique Master Admin principal UID / email is permitted to hold MASTER / admin role.
    const isMasterUid = userId === 'bn5feEaSfUUClzVtFD5Q79Cx5112' || (data.email && data.email.toLowerCase() === 'admin@gestaocorretor.com.br');
    
    let firestoreRole: 'MASTER' | 'SUB_ADMIN' | 'CORRETOR' = 'CORRETOR';
    let appRole: UserRole = 'broker';
    let isAdmin = false;

    if (isMasterUid) {
      firestoreRole = 'MASTER';
      appRole = 'admin';
      isAdmin = true;
    } else if (data.role === 'subadmin' || data.role === 'SUB_ADMIN') {
      firestoreRole = 'SUB_ADMIN';
      appRole = 'subadmin';
      isAdmin = true;
    } else {
      firestoreRole = 'CORRETOR';
      appRole = 'broker';
      isAdmin = false;
    }

    const corretoraId = data.corretora_id || data.brokerageId || '';
    const brokerageName = data.brokerageName || '';
    const fullName = data.name || ([data.firstName, data.lastName].filter(Boolean).join(' ')) || '';

    const payload: Record<string, any> = {
      ...data,
      id: userId,
      uid: userId,
      name: fullName,
      nome: fullName,
      role: firestoreRole,
      userRole: appRole,
      isAdmin,
      corretora_id: corretoraId,
      brokerageId: corretoraId,
      brokerageName,
      status: data.status || 'active',
      updatedAt: new Date().toISOString()
    };

    if (data.susep !== undefined) {
      payload.susep = data.susep;
    }

    await setDoc(userDocRef, payload, { merge: true });
  } catch (err) {
    console.warn('Could not write user profile to Firestore:', err);
  }
}

/**
 * Multi-Tenant Firestore Query: Fetch users filtered strictly by role and brokerage.
 * - Master Admin: Has access to all users across all brokerages.
 * - Sub-Admin: Locked strictly by `where("corretora_id", "==", currentUser.corretora_id)`.
 * - Standard Broker: Allowed only their own document.
 */
export async function fetchFirestoreUsersByBrokerage(currentUser?: User | null): Promise<User[]> {
  const db = getFirebaseFirestore();
  if (!db || !currentUser) return [];

  try {
    const isMaster = isMasterAdmin(currentUser);
    const isSub = isSubAdmin(currentUser);
    const corretoraId = getUserCorretoraId(currentUser);

    const usersCol = collection(db, 'users');
    let q;

    if (isMaster) {
      // Unrestricted Master Global access
      q = query(usersCol);
    } else if (isSub) {
      if (!corretoraId) {
        console.warn('Sub-admin without corretora_id attempted to fetch users');
        return [];
      }
      // Strict multi-tenant filter for Sub-Admin
      q = query(usersCol, where('corretora_id', '==', corretoraId));
    } else {
      // Standard broker can only view themselves
      const myDocRef = doc(db, 'users', currentUser.id);
      const snap = await getDoc(myDocRef);
      if (snap.exists()) {
        const uData = snap.data() as User;
        return [{ ...uData, id: snap.id }];
      }
      return [currentUser];
    }

    const querySnapshot = await getDocs(q);
    const results: User[] = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const rawRole = data.role || data.userRole;
      let normRole: UserRole = 'broker';
      if (rawRole === 'MASTER' || rawRole === 'ADMIN' || rawRole === 'admin') {
        normRole = 'admin';
      } else if (rawRole === 'SUB_ADMIN' || rawRole === 'subadmin') {
        normRole = 'subadmin';
      } else {
        normRole = 'broker';
      }

      results.push({
        id: docSnap.id,
        name: data.nome || data.name || 'Corretor',
        firstName: data.firstName || (data.name ? data.name.split(/\s+/)[0] : 'Corretor'),
        lastName: data.lastName !== undefined ? data.lastName : (data.name ? data.name.split(/\s+/).slice(1).join(' ') : ''),
        email: data.email || '',
        brokerageName: data.brokerageName || 'Corretora de Seguros',
        brokerageId: data.corretora_id || data.brokerageId,
        corretora_id: data.corretora_id || data.brokerageId,
        susep: data.susep || '',
        role: normRole,
        isAdmin: normRole === 'admin' || normRole === 'subadmin',
        status: data.status === 'inativo' || data.status === 'inactive' ? 'inactive' : 'active',
        createdAt: data.createdAt || new Date().toISOString()
      });
    });

    return results;
  } catch (err) {
    console.warn('Error querying users from Firestore:', err);
    return [];
  }
}

/**
 * Multi-Tenant Firestore Query: Fetch insurance clients / policies filtered by brokerage.
 * - Master Admin: Fetches all clients or by target brokerage.
 * - Sub-Admin: Enforces `where("corretora_id", "==", currentUser.corretora_id)`.
 * - Standard Broker: Enforces `where("corretor_id", "==", currentUser.id)` or `where("userId", "==", currentUser.id)`.
 */
export async function fetchFirestoreClientsByBrokerage(currentUser?: User | null): Promise<Client[]> {
  const db = getFirebaseFirestore();
  if (!db || !currentUser) return [];

  try {
    const isMaster = isMasterAdmin(currentUser);
    const isSub = isSubAdmin(currentUser);
    const corretoraId = getUserCorretoraId(currentUser);

    const clientsCol = collection(db, 'clients');
    let q;

    if (isMaster) {
      q = query(clientsCol);
    } else if (isSub) {
      if (!corretoraId) return [];
      q = query(clientsCol, where('corretora_id', '==', corretoraId));
    } else {
      q = query(clientsCol, where('corretor_id', '==', currentUser.id));
    }

    const querySnapshot = await getDocs(q);
    const results: Client[] = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as Client;
      results.push({
        ...data,
        id: docSnap.id
      });
    });

    return results;
  } catch (err) {
    console.warn('Error querying clients from Firestore:', err);
    return [];
  }
}

/**
 * Persist client to Firestore with corretora_id and corretor_id multi-tenant keys
 */
export async function saveClientToFirestore(client: Client, currentUser?: User | null): Promise<void> {
  const db = getFirebaseFirestore();
  if (!db || !client || !client.id) return;

  try {
    const clientRef = doc(db, 'clients', client.id);
    const payload = {
      ...client,
      corretora_id: getUserCorretoraId(currentUser) || currentUser?.brokerageId || '',
      corretor_id: currentUser?.id || '',
      brokerageName: currentUser?.brokerageName || '',
      updatedAt: new Date().toISOString()
    };
    await setDoc(clientRef, payload, { merge: true });
  } catch (err) {
    console.warn('Error saving client to Firestore:', err);
  }
}

/**
 * Delete client from Firestore
 */
export async function deleteClientFromFirestore(clientId: string): Promise<void> {
  const db = getFirebaseFirestore();
  if (!db || !clientId) return;

  try {
    const clientRef = doc(db, 'clients', clientId);
    await deleteDoc(clientRef);
  } catch (err) {
    console.warn('Error deleting client from Firestore:', err);
  }
}

// Diagnostic helper translating Firebase Storage errors to actionable Portuguese guidance
export function parseFirebaseStorageError(err: unknown, currentBucket = ''): FirebaseStorageDiagnosticDetail {
  const auth = getFirebaseAuth();
  const currentUser = auth?.currentUser;
  const isAuthenticated = Boolean(currentUser);
  
  let errorCode = 'storage/unknown';
  let rawMsg = '';

  if (err && typeof err === 'object') {
    const errorObj = err as { code?: string; message?: string };
    errorCode = errorObj.code || 'storage/unknown';
    rawMsg = errorObj.message || String(err);
  } else {
    rawMsg = String(err);
  }

  if (errorCode === 'storage/unauthorized' || rawMsg.includes('permission') || rawMsg.includes('unauthorized')) {
    const userInfoText = currentUser 
      ? `Usuário logado: ${currentUser.email || currentUser.uid} (email_verified: ${currentUser.emailVerified ? 'sim' : 'não'}).` 
      : 'Nenhum usuário logado no Firebase Auth (modo local/demo).';

    return {
      code: 'storage/unauthorized',
      title: 'Permissão Negada nas Regras do Storage (Security Rules)',
      description: isAuthenticated
        ? `O usuário está autenticado no Firebase, mas as Regras de Segurança (Storage Rules) no Firebase Console estão bloqueando gravações na pasta policies/. ${userInfoText}`
        : 'Você está no modo local/demo sem login no Firebase Auth ativo. Suas regras do Storage exigem usuário autenticado (request.auth != null).',
      solution: 'Abra Firebase Console > Storage > aba Rules, substitua as regras atuais pelas Regras Recomendadas (Opção 1) ou Regra Aberta de Testes (Opção 2) e clique em "Publicar".',
      bucketUsed: currentBucket,
      isAuthenticated
    };
  }

  if (errorCode === 'storage/bucket-not-found' || rawMsg.includes('bucket') || rawMsg.includes('not found')) {
    return {
      code: 'storage/bucket-not-found',
      title: 'Bucket do Storage Não Encontrado',
      description: `O bucket "${currentBucket}" não foi encontrado no projeto Firebase. Projetos recentes do Firebase usam o domínio ".firebasestorage.app" em vez de ".appspot.com".`,
      solution: 'Alterne o domínio do bucket entre ".firebasestorage.app" e ".appspot.com" no painel de diagnóstico do Firebase.',
      bucketUsed: currentBucket,
      isAuthenticated
    };
  }

  if (errorCode === 'storage/retry-limit-exceeded' || errorCode === 'storage/network-request-failed' || rawMsg.includes('CORS') || rawMsg.includes('network')) {
    return {
      code: 'storage/retry-limit-exceeded',
      title: 'Bloqueio de CORS ou Limite de Tentativas de Rede',
      description: 'A requisição direta do navegador para o Google Cloud Storage foi bloqueada pela política de CORS do bucket ou falha de rede.',
      solution: 'Configure a política de CORS no seu bucket do Google Cloud Storage com o arquivo cors.json ou continue utilizando o armazenamento local do navegador.',
      bucketUsed: currentBucket,
      isAuthenticated
    };
  }

  if (errorCode === 'storage/quota-exceeded') {
    return {
      code: 'storage/quota-exceeded',
      title: 'Cota de Armazenamento Excedida',
      description: 'O limite do plano gratuito do Firebase Storage para o seu projeto foi atingido.',
      solution: 'Exclua arquivos antigos no Firebase Console ou faça upgrade do plano Spark para Blaze.',
      bucketUsed: currentBucket,
      isAuthenticated
    };
  }

  return {
    code: errorCode,
    title: 'Falha na Comunicação com Firebase Storage',
    description: rawMsg || 'Erro desconhecido ao tentar transferir arquivo.',
    solution: 'Verifique se o Firebase Storage está ativado no Firebase Console (Storage > Get Started).',
    bucketUsed: currentBucket,
    isAuthenticated
  };
}

// Recommended Firebase Storage Security Rules snippet
export const RECOMMENDED_STORAGE_RULES_PROD = `rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Permite leitura e escrita de apólices para qualquer usuário autenticado
    match /policies/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
    // Regra abrangente para uploads gerais com autenticação
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}`;

export const RECOMMENDED_STORAGE_RULES_DEV = `rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Regra aberta para desenvolvimento e testes rápidos
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}`;

// Firebase Auth API

/**
 * Creates a new user in Firebase Authentication directly with email and password
 * without signing out the currently logged-in administrator.
 * Uses an isolated secondary FirebaseApp instance.
 */
export async function firebaseCreateUserByAdmin(params: {
  email: string;
  password: string;
  name: string;
  firstName?: string;
  lastName?: string;
  brokerageName?: string;
  brokerageId?: string;
  role?: UserRole;
  susep?: string;
}): Promise<{ uid: string; user: User }> {
  const config = getFirebaseConfig();
  if (!config) {
    throw new Error('Firebase não está configurado. Configure as chaves de acesso para criar contas no Firebase Authentication.');
  }

  const cleanEmail = params.email.trim();
  const cleanPass = params.password;

  if (!cleanEmail) {
    throw new Error('O e-mail é obrigatório para cadastrar no Firebase Authentication.');
  }
  if (!cleanPass || cleanPass.length < 6) {
    throw new Error('A senha deve conter no mínimo 6 caracteres para o Firebase Authentication.');
  }

  const fullName = params.name.trim() || [params.firstName, params.lastName].filter(Boolean).join(' ') || 'Corretor de Seguros';
  const derivedFirstName = params.firstName?.trim() || fullName.split(/\s+/)[0] || 'Corretor';
  const derivedLastName = params.lastName?.trim() || fullName.split(/\s+/).slice(1).join(' ') || '';

  // Generate a unique temporary app name to ensure total isolation from current admin session
  const secondaryAppName = `SecondaryApp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let secondaryApp: FirebaseApp | null = null;

  try {
    secondaryApp = initializeApp(config, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);

    // 1. Create user in Firebase Authentication on secondary auth instance
    const credential = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, cleanPass);
    const createdFbUser = credential.user;
    const uid = createdFbUser.uid;

    // Update display name on auth profile
    if (fullName) {
      try {
        await updateProfile(createdFbUser, { displayName: fullName });
      } catch (profileErr) {
        console.warn('Could not update displayName on secondary Firebase Auth user:', profileErr);
      }
    }

    // 2. Sign out from secondary auth instance immediately
    try {
      await signOut(secondaryAuth);
    } catch {
      // Ignore sign out error on secondary app
    }

    // Format role according to requirement: "MASTER", "SUB_ADMIN", "CORRETOR"
    const firestoreRole = (params.role === 'admin' || params.role === 'MASTER')
      ? 'MASTER' 
      : ((params.role === 'subadmin' || params.role === 'SUB_ADMIN') ? 'SUB_ADMIN' : 'CORRETOR');
    const effectiveBrokerageId = params.brokerageId || 'corretora-finage';
    const effectiveBrokerageName = params.brokerageName?.trim() || 'Minha Corretora de Seguros';
    const nowIso = new Date().toISOString();

    // 3. Save document in Firestore 'users' collection with doc ID = uid
    const firestoreDoc = {
      uid,
      id: uid,
      nome: fullName,
      name: fullName,
      email: cleanEmail,
      corretora_id: effectiveBrokerageId,
      brokerageId: effectiveBrokerageId,
      brokerageName: effectiveBrokerageName,
      role: firestoreRole,
      userRole: params.role || 'broker',
      status: 'ativo',
      createdAt: nowIso,
      updatedAt: nowIso,
      susep: params.susep?.trim() || '',
      firstName: derivedFirstName,
      lastName: derivedLastName,
      isAdmin: firestoreRole === 'MASTER' || firestoreRole === 'SUB_ADMIN'
    };

    const db = getFirebaseFirestore();
    if (db) {
      const userDocRef = doc(db, 'users', uid);
      await setDoc(userDocRef, firestoreDoc, { merge: true });
    }

    const appUser: User = {
      id: uid,
      name: fullName,
      firstName: derivedFirstName,
      lastName: derivedLastName,
      email: cleanEmail,
      brokerageName: effectiveBrokerageName,
      brokerageId: effectiveBrokerageId,
      corretora_id: effectiveBrokerageId,
      susep: params.susep?.trim() || '',
      role: params.role || 'broker',
      isAdmin: firestoreRole === 'MASTER' || firestoreRole === 'SUB_ADMIN',
      status: 'active'
    };

    // Save profile to local storage cache
    saveUserProfile(appUser);

    return { uid, user: appUser };
  } catch (err: unknown) {
    console.error('Firebase Auth createUser error in secondary app:', err);
    
    // Parse common Firebase Auth errors into friendly Portuguese
    let errorMessage = 'Erro ao criar conta no Firebase Authentication.';
    if (err && typeof err === 'object') {
      const code = (err as { code?: string }).code || '';
      if (code === 'auth/email-already-in-use') {
        errorMessage = `O e-mail "${cleanEmail}" já está cadastrado no Firebase Authentication.`;
      } else if (code === 'auth/invalid-email') {
        errorMessage = `O e-mail "${cleanEmail}" não possui um formato válido.`;
      } else if (code === 'auth/weak-password') {
        errorMessage = 'A senha fornecida é muito fraca. Utilize ao menos 6 caracteres com letras e números.';
      } else if (code === 'auth/operation-not-allowed') {
        errorMessage = 'O provedor Email/Senha não está habilitado no Firebase Console (Authentication > Sign-in method).';
      } else if (code === 'auth/network-request-failed') {
        errorMessage = 'Falha de rede ao conectar com os servidores do Firebase Auth. Verifique sua conexão.';
      } else if ((err as Error).message) {
        errorMessage = (err as Error).message;
      }
    }
    throw new Error(errorMessage);
  } finally {
    // 4. Always clean up the secondary app instance to free memory
    if (secondaryApp) {
      try {
        await deleteApp(secondaryApp);
      } catch (delErr) {
        console.warn('Could not delete secondary Firebase app:', delErr);
      }
    }
  }
}

export async function firebaseSignIn(email: string, password: string): Promise<User> {
  const startTime = performance.now();
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase Auth não está configurado. Verifique as credenciais do Firebase.');
  }

  // 1. Authenticate with Firebase Auth
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  const fbUser = credential.user;
  const authTime = performance.now() - startTime;
  console.info(`[Auth Performance] signInWithEmailAndPassword concluído em ${Math.round(authTime)}ms`);

  // 2. Fetch remote document from Firestore ('users' collection) with priority parallel race (max 1.5s)
  let remoteDoc: any = null;
  try {
    const fetchPromise = fetchUserProfileFromFirestore(fbUser.uid);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
    remoteDoc = await Promise.race([fetchPromise, timeoutPromise]);
  } catch (e) {
    console.warn('Firestore profile fetch warning during sign-in:', e);
  }

  const localDoc = loadUserProfile(fbUser.uid);

  // Normalize role from Firestore (supports "MASTER", "SUB_ADMIN", "CORRETOR", "ADMIN", or lowercase)
  const rawRole = remoteDoc?.role || remoteDoc?.userRole || localDoc?.role;
  let normalizedRole: 'admin' | 'subadmin' | 'broker' = 'broker';
  if (rawRole === 'SUB_ADMIN' || rawRole === 'subadmin') {
    normalizedRole = 'subadmin';
  } else if (rawRole === 'CORRETOR' || rawRole === 'broker') {
    normalizedRole = 'broker';
  } else if (rawRole === 'MASTER' || (rawRole === 'ADMIN' && isMasterAdmin({ email: fbUser.email || email, id: fbUser.uid })) || isMasterAdmin({ email: fbUser.email || email, id: fbUser.uid })) {
    normalizedRole = 'admin';
  } else {
    normalizedRole = 'broker';
  }

  const fullName = remoteDoc?.nome || remoteDoc?.name || localDoc?.name || fbUser.displayName || fbUser.email?.split('@')[0] || 'Corretor';
  const nameParts = fullName.trim().split(/\s+/);
  const firstName = remoteDoc?.firstName || localDoc?.firstName || nameParts[0] || 'Corretor';
  const lastName = remoteDoc?.lastName !== undefined ? remoteDoc.lastName : (localDoc?.lastName !== undefined ? localDoc.lastName : (nameParts.slice(1).join(' ') || ''));
  const brokerageName = remoteDoc?.brokerageName || localDoc?.brokerageName || 'Corretora de Seguros';
  const brokerageId = remoteDoc?.corretora_id || remoteDoc?.brokerageId || localDoc?.corretora_id || localDoc?.brokerageId;
  const susep = remoteDoc?.susep !== undefined ? remoteDoc.susep : (localDoc?.susep || '');

  const adminFlag = normalizedRole === 'admin' || normalizedRole === 'subadmin';

  const appUser: User = {
    id: fbUser.uid,
    name: fullName,
    firstName,
    lastName,
    email: fbUser.email || email,
    brokerageName,
    brokerageId,
    corretora_id: brokerageId,
    susep,
    role: normalizedRole,
    isAdmin: adminFlag,
    status: remoteDoc?.status === 'ativo' || remoteDoc?.status === 'active' ? 'active' : (localDoc?.status || 'active')
  };

  // Persist combined profile immediately in both profile and current session storage
  saveUserProfile(appUser);
  saveCurrentUser(appUser);
  console.info(`[Auth Performance] Sessão do utilizador autorizada em ${Math.round(performance.now() - startTime)}ms`);

  return appUser;
}

export async function firebaseSignOut(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth) {
    await signOut(auth);
  }
}

export async function firebaseUpdateUserProfile(updated: Partial<User>): Promise<User> {
  const startTime = performance.now();
  const auth = getFirebaseAuth();
  const currentUser = auth?.currentUser;
  const userId = updated.id || currentUser?.uid;

  if (!userId) {
    throw new Error('Nenhum ID de usuário fornecido para atualização do perfil.');
  }

  const fullName = updated.name?.trim() || [updated.firstName, updated.lastName].filter(Boolean).join(' ');
  const currentLocal = loadUserProfile(userId);

  const completeUser: User = {
    id: userId,
    name: fullName || currentLocal?.name || currentUser?.displayName || 'Corretor',
    firstName: updated.firstName !== undefined ? updated.firstName : (currentLocal?.firstName || (fullName ? fullName.split(/\s+/)[0] : 'Corretor')),
    lastName: updated.lastName !== undefined ? updated.lastName : (currentLocal?.lastName || (fullName ? fullName.split(/\s+/).slice(1).join(' ') : '')),
    email: updated.email || currentLocal?.email || currentUser?.email || '',
    brokerageName: updated.brokerageName !== undefined ? updated.brokerageName : (currentLocal?.brokerageName || 'Corretora de Seguros'),
    susep: updated.susep !== undefined ? updated.susep : (currentLocal?.susep || ''),
    isAdmin: updated.isAdmin !== undefined ? updated.isAdmin : currentLocal?.isAdmin
  };

  // 1. Immediate Local Storage Persistence
  saveUserProfile(completeUser);

  // 2. Prepare parallel remote tasks (Firebase Auth + Firestore)
  const remoteTasks: Promise<unknown>[] = [];

  if (currentUser) {
    // Update Auth displayName if changed
    if (fullName && fullName !== currentUser.displayName) {
      remoteTasks.push(
        updateProfile(currentUser, { displayName: fullName }).catch((err) => {
          console.warn('Firebase updateProfile displayName warning:', err);
        })
      );
    }

    // Update Auth email if changed
    if (updated.email && updated.email.trim() && updated.email.trim() !== currentUser.email) {
      remoteTasks.push(
        updateEmail(currentUser, updated.email.trim()).catch((err: unknown) => {
          console.warn('Firebase updateEmail warning (may require recent-login):', err);
          throw err;
        })
      );
    }
  }

  // Save to Firestore in parallel
  remoteTasks.push(saveUserProfileToFirestore(userId, completeUser));

  // Execute all remote tasks concurrently
  if (remoteTasks.length > 0) {
    await Promise.all(remoteTasks);
  }

  const duration = Math.round(performance.now() - startTime);
  console.info(`[Profile Performance] Perfil do corretor salvo e sincronizado em ${duration}ms`);

  return completeUser;
}

export async function firebaseUpdateUserPassword(newPassword: string): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) {
    throw new Error('Nenhum usuário logado no Firebase.');
  }

  if (!newPassword || newPassword.length < 6) {
    throw new Error('A nova senha deve ter no mínimo 6 caracteres.');
  }

  try {
    await updatePassword(auth.currentUser, newPassword);
  } catch (err: unknown) {
    console.error('Firebase updatePassword error:', err);
    throw err;
  }
}

export async function firebaseSendPasswordReset(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase Auth não inicializado.');
  }
  if (!email || !email.trim()) {
    throw new Error('Informe o e-mail para envio de redefinição de senha.');
  }
  await sendPasswordResetEmail(auth, email.trim());
}

let activeAuthSubscriberUid: string | null = null;

export function subscribeToAuthChanges(callback: (user: User | null) => void): () => void {
  const auth = getFirebaseAuth();
  if (!auth) {
    return () => {};
  }

  return onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
    if (fbUser) {
      // Fast-path: immediate emit from local cache to prevent UI flash or role loss
      const localDoc = loadUserProfile(fbUser.uid);
      const rawCached = loadCurrentUser();
      const cachedUser = rawCached?.id === fbUser.uid ? rawCached : null;
      
      const rawRole = (localDoc?.role || cachedUser?.role) as string | undefined;
      let initialRole: 'admin' | 'subadmin' | 'broker' = 'broker';
      if (rawRole === 'SUB_ADMIN' || rawRole === 'subadmin') {
        initialRole = 'subadmin';
      } else if (rawRole === 'CORRETOR' || rawRole === 'broker') {
        initialRole = 'broker';
      } else if (rawRole === 'MASTER' || (rawRole === 'ADMIN' && isMasterAdmin({ email: fbUser.email || undefined, id: fbUser.uid })) || isMasterAdmin({ email: fbUser.email || undefined, id: fbUser.uid })) {
        initialRole = 'admin';
      }

      const fullName = localDoc?.name || cachedUser?.name || fbUser.displayName || fbUser.email?.split('@')[0] || 'Corretor';
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = localDoc?.firstName || cachedUser?.firstName || nameParts[0] || 'Corretor';
      const lastName = localDoc?.lastName !== undefined ? localDoc.lastName : (cachedUser?.lastName !== undefined ? cachedUser.lastName : (nameParts.slice(1).join(' ') || ''));
      const corretoraId = localDoc?.corretora_id || localDoc?.brokerageId || cachedUser?.corretora_id || cachedUser?.brokerageId || '';
      const brokerageName = localDoc?.brokerageName || cachedUser?.brokerageName || 'Corretora de Seguros';
      const susep = localDoc?.susep || cachedUser?.susep || '';
      const status = localDoc?.status || cachedUser?.status || 'active';

      const appUser: User = {
        id: fbUser.uid,
        name: fullName,
        firstName,
        lastName,
        email: fbUser.email || localDoc?.email || cachedUser?.email || '',
        brokerageName,
        brokerageId: corretoraId,
        corretora_id: corretoraId,
        susep,
        role: initialRole,
        isAdmin: initialRole === 'admin' || initialRole === 'subadmin',
        status
      };

      saveUserProfile(appUser);
      saveCurrentUser(appUser);
      callback(appUser);

      // Background deferred sync from Firestore users collection
      fetchUserProfileFromFirestore(fbUser.uid)
        .then((remoteDoc) => {
          if (remoteDoc) {
            const rawRemoteRole = (remoteDoc as any).role || (remoteDoc as any).userRole;
            let syncedRole: UserRole = appUser.role || 'broker';
            
            if (rawRemoteRole === 'SUB_ADMIN' || rawRemoteRole === 'subadmin') {
              syncedRole = 'subadmin';
            } else if (rawRemoteRole === 'CORRETOR' || rawRemoteRole === 'broker') {
              syncedRole = 'broker';
            } else if (rawRemoteRole === 'MASTER' || (rawRemoteRole === 'ADMIN' && isMasterAdmin({ email: fbUser.email || undefined, id: fbUser.uid })) || isMasterAdmin({ email: fbUser.email || undefined, id: fbUser.uid })) {
              syncedRole = 'admin';
            }

            const syncedCorretoraId = (remoteDoc as any).corretora_id || (remoteDoc as any).brokerageId || appUser.corretora_id;
            const syncedBrokerageName = remoteDoc.brokerageName || appUser.brokerageName;
            const syncedName = (remoteDoc as any).nome || remoteDoc.name || appUser.name;
            const syncedSusep = remoteDoc.susep !== undefined ? remoteDoc.susep : appUser.susep;
            const syncedStatus = (remoteDoc as any).status === 'inativo' || (remoteDoc as any).status === 'inactive' ? 'inactive' : 'active';

            const updatedUser: User = {
              ...appUser,
              name: syncedName,
              firstName: remoteDoc.firstName || (syncedName ? syncedName.split(/\s+/)[0] : appUser.firstName),
              lastName: remoteDoc.lastName !== undefined ? remoteDoc.lastName : (syncedName ? syncedName.split(/\s+/).slice(1).join(' ') : appUser.lastName),
              email: fbUser.email || appUser.email,
              brokerageName: syncedBrokerageName,
              brokerageId: syncedCorretoraId,
              corretora_id: syncedCorretoraId,
              susep: syncedSusep,
              role: syncedRole,
              isAdmin: syncedRole === 'admin' || syncedRole === 'subadmin',
              status: syncedStatus
            };

            saveUserProfile(updatedUser);
            saveCurrentUser(updatedUser);
            callback(updatedUser);
          }
        })
        .catch((e) => {
          console.warn('Deferred remote user sync warning in subscriber (retaining active session):', e);
        });
    } else {
      activeAuthSubscriberUid = null;
      saveCurrentUser(null);
      callback(null);
    }
  });
}

// Resilient Firebase Storage File Upload with auto-fallback
export async function uploadPolicyToFirebaseStorage(
  file: File | Blob,
  fileName: string,
  clientId: string,
  userId: string,
  onProgress?: (percent: number) => void
): Promise<{ downloadUrl: string; storagePath: string }> {
  const config = getFirebaseConfig();
  if (!config) {
    throw new Error('Firebase não configurado. Por favor, adicione as credenciais do projeto.');
  }

  const currentBucket = config.storageBucket;
  const storage = getFirebaseStorageInstance();
  if (!storage) {
    throw new Error('Firebase Storage não pôde ser inicializado. Verifique a configuração.');
  }

  const auth = getFirebaseAuth();
  // CRITICAL: Guarantee we refresh the authentication token if a user is logged in
  if (auth?.currentUser) {
    try {
      await auth.currentUser.getIdToken(true);
    } catch (refreshErr) {
      console.warn('Não foi possível forçar atualização do token Firebase:', refreshErr);
    }
  }

  // Prioritize actual Firebase Auth UID to prevent request.auth.uid != userId rejection in security rules
  const effectiveUserId = auth?.currentUser?.uid || userId || 'corretor-padrao';

  // Create clean path: policies/{effectiveUserId}/{clientId}/{timestamp}_{sanitizedName}
  const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `policies/${effectiveUserId}/${clientId}/${Date.now()}_${cleanName}`;
  const storageRef = ref(storage, storagePath);

  // Explicit upload metadata to satisfy rule checks on content-type
  const uploadMetadata = {
    contentType: file.type || 'application/pdf',
    customMetadata: {
      uploaderUid: effectiveUserId,
      clientId,
      originalName: cleanName
    }
  };

  // Helper to attempt resumable upload
  const attemptResumable = (): Promise<{ downloadUrl: string; storagePath: string }> => {
    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file, uploadMetadata);
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          reject(error);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({ downloadUrl, storagePath });
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  };

  try {
    return await attemptResumable();
  } catch (primaryErr) {
    console.warn('Primary Firebase Storage resumable upload failed, attempting fallback...', primaryErr);

    const parsedPrimary = parseFirebaseStorageError(primaryErr, currentBucket);

    // Fallback 1: If bucket-not-found, try switching between .firebasestorage.app and .appspot.com
    if (parsedPrimary.code === 'storage/bucket-not-found' && config.projectId) {
      const alternateBucket = currentBucket.includes('.appspot.com')
        ? `${config.projectId}.firebasestorage.app`
        : `${config.projectId}.appspot.com`;

      console.info(`Attempting auto-recovery with alternate bucket: ${alternateBucket}`);
      try {
        const altStorage = getFirebaseStorageInstance(`gs://${alternateBucket}`);
        if (altStorage) {
          const altRef = ref(altStorage, storagePath);
          const altSnapshot = await uploadBytes(altRef, file, uploadMetadata);
          const downloadUrl = await getDownloadURL(altSnapshot.ref);
          
          // Auto-save the working bucket!
          saveCustomFirebaseConfig({
            ...config,
            storageBucket: alternateBucket
          });
          console.info(`Auto-recovery succeeded! Saved active bucket: ${alternateBucket}`);
          return { downloadUrl, storagePath };
        }
      } catch (altErr) {
        console.warn('Alternate bucket attempt also failed:', altErr);
      }
    }

    // Fallback 2: Direct uploadBytes with refreshed auth header
    try {
      if (onProgress) onProgress(50);
      const standardSnapshot = await uploadBytes(storageRef, file, uploadMetadata);
      const downloadUrl = await getDownloadURL(standardSnapshot.ref);
      if (onProgress) onProgress(100);
      return { downloadUrl, storagePath };
    } catch (fallbackErr) {
      console.error('All Firebase Storage upload attempts failed:', fallbackErr);
      const finalDiagnostic = parseFirebaseStorageError(fallbackErr, currentBucket);
      const detailedError = new Error(`${finalDiagnostic.title}: ${finalDiagnostic.description} (${finalDiagnostic.code})`);
      (detailedError as unknown as { diagnostic: FirebaseStorageDiagnosticDetail }).diagnostic = finalDiagnostic;
      throw detailedError;
    }
  }
}

export async function deletePolicyFromFirebaseStorage(storagePath: string): Promise<void> {
  const storage = getFirebaseStorageInstance();
  if (!storage || !storagePath) return;

  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (err) {
    console.warn('Failed to delete file from Firebase Storage:', err);
  }
}

// Interactive Self-Test Diagnostic function
export async function runFirebaseStorageDiagnosticTest(): Promise<{
  success: boolean;
  message: string;
  code?: string;
  latencyMs: number;
  bucket: string;
  isAuthenticated: boolean;
  diagnostic: FirebaseStorageDiagnosticDetail;
}> {
  const startTime = Date.now();
  const config = getFirebaseConfig();

  if (!config) {
    return {
      success: false,
      message: 'Firebase não está configurado no projeto.',
      code: 'storage/not-configured',
      latencyMs: 0,
      bucket: 'Nenhum',
      isAuthenticated: false,
      diagnostic: {
        code: 'storage/not-configured',
        title: 'Configuração do Firebase Ausente',
        description: 'As chaves VITE_FIREBASE_* ou a configuração local do Firebase não foram fornecidas.',
        solution: 'Abra a tela de configuração e informe seu API Key e Project ID.',
        bucketUsed: 'Nenhum',
        isAuthenticated: false
      }
    };
  }

  const currentBucket = config.storageBucket;
  const storage = getFirebaseStorageInstance();
  const auth = getFirebaseAuth();
  const isAuthenticated = Boolean(auth?.currentUser);

  if (!storage) {
    return {
      success: false,
      message: 'Falha ao inicializar a instância do Firebase Storage.',
      code: 'storage/init-failed',
      latencyMs: Date.now() - startTime,
      bucket: currentBucket,
      isAuthenticated,
      diagnostic: {
        code: 'storage/init-failed',
        title: 'Inicialização Falhou',
        description: 'Não foi possível instanciar o Firebase Storage com os parâmetros atuais.',
        solution: 'Verifique se o Project ID está correto.',
        bucketUsed: currentBucket,
        isAuthenticated
      }
    };
  }

  try {
    // Refresh auth token prior to test
    if (auth?.currentUser) {
      try {
        await auth.currentUser.getIdToken(true);
      } catch (e) {
        console.warn('Probe could not refresh token', e);
      }
    }

    const activeUid = auth?.currentUser?.uid || 'corretor-diagnostico';
    // Test direct write to policies/ folder (the exact folder used for client policies)
    const probePath = `policies/${activeUid}/_probe_${Date.now()}.txt`;
    const probeRef = ref(storage, probePath);
    const blob = new Blob(['OK - Probe GestaoCorretor'], { type: 'text/plain' });

    const snapshot = await uploadBytes(probeRef, blob, {
      contentType: 'text/plain',
      customMetadata: { testProbe: 'true', testerUid: activeUid }
    });
    await getDownloadURL(snapshot.ref);

    // Clean up probe file immediately
    try {
      await deleteObject(probeRef);
    } catch {
      // Non-critical if delete fails
    }

    const latencyMs = Date.now() - startTime;
    return {
      success: true,
      message: `Firebase Storage operacional! Teste de escrita e leitura concluído com sucesso em ${latencyMs}ms.`,
      latencyMs,
      bucket: currentBucket,
      isAuthenticated,
      diagnostic: {
        code: 'storage/ok',
        title: 'Conexão Estabelecida com Sucesso',
        description: `O bucket "${currentBucket}" está respondendo normalmente e aceitando uploads de documentos.`,
        solution: 'Tudo pronto! Você já pode anexar apólices aos seus clientes.',
        bucketUsed: currentBucket,
        isAuthenticated
      }
    };
  } catch (testErr) {
    const latencyMs = Date.now() - startTime;
    const diag = parseFirebaseStorageError(testErr, currentBucket);
    return {
      success: false,
      message: `${diag.title}: ${diag.description}`,
      code: diag.code,
      latencyMs,
      bucket: currentBucket,
      isAuthenticated,
      diagnostic: diag
    };
  }
}


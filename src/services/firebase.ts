import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
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
import { User } from '../types';
import { loadUserProfile, saveUserProfile } from './storage';
import { isUserAdmin } from '../utils/insuranceUtils';

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

export async function saveUserProfileToFirestore(userId: string, data: Partial<User>): Promise<void> {
  const db = getFirebaseFirestore();
  if (!db || !userId) return;
  try {
    const userDocRef = doc(db, 'users', userId);
    const payload = {
      ...data,
      id: userId,
      updatedAt: new Date().toISOString()
    };
    await setDoc(userDocRef, payload, { merge: true });
  } catch (err) {
    console.warn('Could not write user profile to Firestore:', err);
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
export async function firebaseSignUp(
  email: string, 
  password: string, 
  name: string, 
  brokerageName: string, 
  susep?: string,
  firstName?: string,
  lastName?: string
): Promise<User> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase Auth não está configurado. Verifique as credenciais do Firebase.');
  }

  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const fullName = name.trim() || [firstName, lastName].filter(Boolean).join(' ') || 'Corretor de Seguros';
  
  if (fullName && credential.user) {
    try {
      await updateProfile(credential.user, {
        displayName: fullName
      });
    } catch (e) {
      console.warn('Could not update Firebase Auth displayName:', e);
    }
  }

  const derivedFirstName = firstName?.trim() || fullName.split(/\s+/)[0] || 'Corretor';
  const derivedLastName = lastName?.trim() || fullName.split(/\s+/).slice(1).join(' ') || '';

  const appUser: User = {
    id: credential.user.uid,
    name: fullName,
    firstName: derivedFirstName,
    lastName: derivedLastName,
    email: credential.user.email || email,
    brokerageName: brokerageName.trim() || 'Minha Corretora de Seguros',
    susep: susep?.trim() || ''
  };

  // 1. Save locally per-user
  saveUserProfile(appUser);

  // 2. Persist to Firestore
  await saveUserProfileToFirestore(appUser.id, appUser);

  return appUser;
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

  // 2. Fast-Path: build essential user profile immediately from local cache and auth metadata
  const localDoc = loadUserProfile(fbUser.uid);
  const fullName = localDoc?.name || fbUser.displayName || fbUser.email?.split('@')[0] || 'Corretor';
  const nameParts = fullName.trim().split(/\s+/);
  const firstName = localDoc?.firstName || nameParts[0] || 'Corretor';
  const lastName = localDoc?.lastName !== undefined ? localDoc.lastName : (nameParts.slice(1).join(' ') || '');
  const brokerageName = localDoc?.brokerageName || 'Corretora de Seguros';
  const susep = localDoc?.susep || '';

  const adminFlag = isUserAdmin({
    id: fbUser.uid,
    isAdmin: localDoc?.isAdmin,
    email: fbUser.email || email
  });

  const appUser: User = {
    id: fbUser.uid,
    name: fullName,
    firstName,
    lastName,
    email: fbUser.email || email,
    brokerageName,
    susep,
    isAdmin: adminFlag
  };

  // Persist combined profile immediately
  saveUserProfile(appUser);
  console.info(`[Auth Performance] Sessão do utilizador autorizada em ${Math.round(performance.now() - startTime)}ms (Fast-Path)`);

  // 3. Deferred / Background Sync: Fetch remote Firestore profile without blocking login transition
  fetchUserProfileFromFirestore(fbUser.uid)
    .then((remoteDoc) => {
      if (remoteDoc) {
        const updatedUser: User = {
          ...appUser,
          name: remoteDoc.name || appUser.name,
          firstName: remoteDoc.firstName || appUser.firstName,
          lastName: remoteDoc.lastName !== undefined ? remoteDoc.lastName : appUser.lastName,
          brokerageName: remoteDoc.brokerageName || appUser.brokerageName,
          susep: remoteDoc.susep !== undefined ? remoteDoc.susep : appUser.susep,
          isAdmin: isUserAdmin({
            id: fbUser.uid,
            isAdmin: remoteDoc.isAdmin !== undefined ? remoteDoc.isAdmin : appUser.isAdmin,
            email: fbUser.email || email
          })
        };
        saveUserProfile(updatedUser);
      }
    })
    .catch((e) => {
      console.warn('Background Firestore profile sync warning:', e);
    });

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
      // Avoid duplicate trigger if UID hasn't changed
      if (activeAuthSubscriberUid === fbUser.uid) {
        return;
      }
      activeAuthSubscriberUid = fbUser.uid;

      // Fast-path: immediate emit from local cache
      const localDoc = loadUserProfile(fbUser.uid);
      const fullName = localDoc?.name || fbUser.displayName || fbUser.email?.split('@')[0] || 'Corretor';
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = localDoc?.firstName || nameParts[0] || 'Corretor';
      const lastName = localDoc?.lastName !== undefined ? localDoc.lastName : (nameParts.slice(1).join(' ') || '');
      const brokerageName = localDoc?.brokerageName || 'Corretora de Seguros';
      const susep = localDoc?.susep || '';

      const adminFlag = isUserAdmin({
        id: fbUser.uid,
        isAdmin: localDoc?.isAdmin,
        email: fbUser.email || localDoc?.email || ''
      });

      const appUser: User = {
        id: fbUser.uid,
        name: fullName,
        firstName,
        lastName,
        email: fbUser.email || localDoc?.email || '',
        brokerageName,
        susep,
        isAdmin: adminFlag
      };

      saveUserProfile(appUser);
      callback(appUser);

      // Background deferred sync
      fetchUserProfileFromFirestore(fbUser.uid)
        .then((remoteDoc) => {
          if (remoteDoc) {
            const updatedUser: User = {
              ...appUser,
              name: remoteDoc.name || appUser.name,
              firstName: remoteDoc.firstName || appUser.firstName,
              lastName: remoteDoc.lastName !== undefined ? remoteDoc.lastName : appUser.lastName,
              brokerageName: remoteDoc.brokerageName || appUser.brokerageName,
              susep: remoteDoc.susep !== undefined ? remoteDoc.susep : appUser.susep,
              isAdmin: isUserAdmin({
                id: fbUser.uid,
                isAdmin: remoteDoc.isAdmin !== undefined ? remoteDoc.isAdmin : appUser.isAdmin,
                email: fbUser.email || localDoc?.email || ''
              })
            };
            saveUserProfile(updatedUser);
            callback(updatedUser);
          }
        })
        .catch((e) => {
          console.warn('Deferred remote user sync error in subscriber:', e);
        });
    } else {
      activeAuthSubscriberUid = null;
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


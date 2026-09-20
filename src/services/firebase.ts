import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  updateProfile,
  Auth,
  User as FirebaseUser
} from 'firebase/auth';
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
  susep?: string
): Promise<User> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase Auth não está configurado. Verifique as credenciais do Firebase.');
  }

  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  
  if (name && credential.user) {
    await updateProfile(credential.user, {
      displayName: name.trim()
    });
  }

  const appUser: User = {
    id: credential.user.uid,
    name: name.trim() || credential.user.email || 'Corretor',
    email: credential.user.email || email,
    brokerageName: brokerageName.trim() || 'Minha Corretora de Seguros',
    susep: susep?.trim() || ''
  };

  return appUser;
}

export async function firebaseSignIn(email: string, password: string): Promise<User> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase Auth não está configurado. Verifique as credenciais do Firebase.');
  }

  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  const fbUser = credential.user;

  const appUser: User = {
    id: fbUser.uid,
    name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Corretor',
    email: fbUser.email || email,
    brokerageName: 'Corretora de Seguros',
    susep: ''
  };

  return appUser;
}

export async function firebaseSignOut(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth) {
    await signOut(auth);
  }
}

export function subscribeToAuthChanges(callback: (user: User | null) => void): () => void {
  const auth = getFirebaseAuth();
  if (!auth) {
    return () => {};
  }

  return onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
    if (fbUser) {
      callback({
        id: fbUser.uid,
        name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Corretor',
        email: fbUser.email || '',
        brokerageName: 'Corretora de Seguros',
        susep: ''
      });
    } else {
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


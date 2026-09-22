import { Client, User, PolicyDocument } from '../types';

const DB_NAME = 'GestaoCorretorDB';
const DB_VERSION = 1;
const STORE_DOCUMENTS = 'policy_documents';
const STORAGE_KEY_DEMO_CLIENTS = 'gestao_corretor_clients_demo';
const STORAGE_KEY_USER = 'gestao_corretor_user_v1';
const STORAGE_KEY_THEME = 'gestao_corretor_theme_v1';
const STORAGE_KEY_REGISTERED_INSURERS_PREFIX = 'gestao_corretor_insurers_';

// List of legacy mock client IDs to filter out and purge
const MOCK_CLIENT_IDS = new Set(['cli-001', 'cli-002', 'cli-003', 'cli-004', 'cli-005', 'cli-006', 'cli-007']);

// IndexedDB Helper for handling large binary files (PDFs/Images)
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_DOCUMENTS)) {
        db.createObjectStore(STORE_DOCUMENTS, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDocumentFile(doc: PolicyDocument): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DOCUMENTS, 'readwrite');
      const store = tx.objectStore(STORE_DOCUMENTS);
      const req = store.put(doc);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Error saving document to IndexedDB:', err);
  }
}

export async function getDocumentFile(id: string): Promise<PolicyDocument | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DOCUMENTS, 'readonly');
      const store = tx.objectStore(STORE_DOCUMENTS);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Error getting document from IndexedDB:', err);
    return null;
  }
}

export async function deleteDocumentFile(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DOCUMENTS, 'readwrite');
      const store = tx.objectStore(STORE_DOCUMENTS);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Error deleting document from IndexedDB:', err);
  }
}

// Return empty array - No mock/seed clients inserted automatically
export function getInitialSampleClients(): Client[] {
  return [];
}

// User / Auth Storage API
export const DEMO_USER_ID = 'usr-01';

export const DEFAULT_USER: User = {
  id: DEMO_USER_ID,
  name: 'Administrador Master',
  firstName: 'Administrador',
  lastName: 'Master',
  email: 'admin@gestaocorretor.com.br',
  susep: '00.000001/2024',
  brokerageName: 'GestãoCorretor',
  isAdmin: true
};

export function getClientsStorageKey(userId?: string | null): string {
  if (!userId || userId === DEMO_USER_ID || userId === 'demo') {
    return STORAGE_KEY_DEMO_CLIENTS;
  }
  return `gestao_corretor_clients_${userId}`;
}

/**
 * Filter out any mock/demo client relics from previous seedings
 */
export function sanitizeClientsList(list: Client[]): Client[] {
  if (!Array.isArray(list)) return [];
  return list.filter(c => {
    if (!c || !c.id) return false;
    // Filter out known initial mock IDs
    if (MOCK_CLIENT_IDS.has(c.id)) return false;
    // Filter out specific mock sample names if associated with mock dates
    if (c.id.startsWith('cli-00') && (
      c.name === 'Roberto Andrade Filho' ||
      c.name === 'Mariana Costa Siqueira' ||
      c.name === 'Carlos Henrique Viana' ||
      c.name === 'Fernanda Lima Oliveira' ||
      c.name === 'Lucas Martins Albuquerque' ||
      c.name === 'Beatriz Vasconcelos' ||
      c.name === 'Guilherme Rocha Mendes'
    )) {
      return false;
    }
    return true;
  });
}

// Client Storage API with strict per-user isolation and clean start
export function loadClients(userId?: string | null): Client[] {
  try {
    // If no user is logged in, return empty list
    if (!userId) {
      return [];
    }

    const storageKey = getClientsStorageKey(userId);
    const raw = localStorage.getItem(storageKey);

    if (!raw) {
      return [];
    }

    const parsed: Client[] = JSON.parse(raw);
    const sanitized = sanitizeClientsList(parsed);

    // If mock clients were found and cleaned up, update storage
    if (sanitized.length !== parsed.length) {
      localStorage.setItem(storageKey, JSON.stringify(sanitized));
    }

    return sanitized;
  } catch (e) {
    console.error('Failed to load clients:', e);
    return [];
  }
}

export function saveClients(clients: Client[], userId?: string | null): void {
  try {
    const storageKey = getClientsStorageKey(userId);
    const sanitized = sanitizeClientsList(clients);
    localStorage.setItem(storageKey, JSON.stringify(sanitized));
  } catch (e) {
    console.error('Failed to save clients:', e);
  }
}

export function seedSampleClientsForUser(userId: string): Client[] {
  return [];
}

export function clearUserClients(userId?: string | null): void {
  try {
    const storageKey = getClientsStorageKey(userId);
    localStorage.removeItem(storageKey);
  } catch (e) {
    console.error('Failed to clear user clients:', e);
  }
}

// ---------------------------------------------------------------------------
// Seguradoras (Insurers) Management API
// ---------------------------------------------------------------------------

export const DEFAULT_MAJOR_INSURERS: string[] = [
  'Allianz Seguros',
  'Azul Seguros',
  'Bradesco Seguros',
  'HDI Seguros',
  'Icatu Seguros',
  'Liberty Seguros',
  'MAPFRE Seguros',
  'Mitsui Sumitomo Seguros',
  'Porto Seguro',
  'Sompo Seguros',
  'Suhai Seguradora',
  'SulAmérica',
  'Tokio Marine Seguradora',
  'Yelum Seguradora',
  'Zurich Seguros'
];

export function getInsurersStorageKey(userId?: string | null): string {
  // Insurers list is system-wide global so all brokers benefit from Admin Master configuration
  return `${STORAGE_KEY_REGISTERED_INSURERS_PREFIX}global`;
}

export function loadRegisteredInsurers(userId?: string | null): string[] {
  try {
    const key = getInsurersStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      // Auto-initialize with default major insurers
      saveRegisteredInsurers(DEFAULT_MAJOR_INSURERS, userId);
      return DEFAULT_MAJOR_INSURERS;
    }
    const list = JSON.parse(raw);
    if (Array.isArray(list) && list.length > 0) {
      const cleaned = list.filter(item => typeof item === 'string' && item.trim().length > 0);
      if (cleaned.length > 0) {
        return cleaned.sort((a, b) => a.localeCompare(b, 'pt-BR'));
      }
    }
    return DEFAULT_MAJOR_INSURERS;
  } catch {
    return DEFAULT_MAJOR_INSURERS;
  }
}

export function saveRegisteredInsurers(insurers: string[], userId?: string | null): void {
  try {
    const key = getInsurersStorageKey(userId);
    const unique = Array.from(new Set(insurers.map(s => s.trim()).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    localStorage.setItem(key, JSON.stringify(unique));
  } catch (e) {
    console.error('Failed to save registered insurers:', e);
  }
}

export function addRegisteredInsurer(name: string, userId?: string | null): string[] {
  const trimmed = (name || '').trim();
  if (!trimmed) return loadRegisteredInsurers(userId);
  const current = loadRegisteredInsurers(userId);
  if (!current.some(item => item.toLowerCase() === trimmed.toLowerCase())) {
    current.push(trimmed);
    const sorted = current.sort((a, b) => a.localeCompare(b, 'pt-BR'));
    saveRegisteredInsurers(sorted, userId);
    return sorted;
  }
  return current;
}

export function deleteRegisteredInsurer(name: string, userId?: string | null): string[] {
  const trimmed = (name || '').trim().toLowerCase();
  const current = loadRegisteredInsurers(userId);
  const filtered = current.filter(item => item.toLowerCase() !== trimmed);
  saveRegisteredInsurers(filtered, userId);
  return filtered;
}

export function resetRegisteredInsurers(userId?: string | null): string[] {
  saveRegisteredInsurers(DEFAULT_MAJOR_INSURERS, userId);
  return DEFAULT_MAJOR_INSURERS;
}

/**
 * Returns only the seguradoras that the user actually registered or has in their active clients list.
 */
export function getAvailableInsurers(clients: Client[] = [], userId?: string | null): string[] {
  const registered = loadRegisteredInsurers(userId);
  const fromClients = clients
    .map(c => c.insuranceCompany ? c.insuranceCompany.trim() : '')
    .filter(Boolean);

  const merged = new Map<string, string>();

  // Add user explicitly registered insurers
  registered.forEach(ins => {
    if (ins) merged.set(ins.toLowerCase(), ins);
  });

  // Add insurers from clients
  fromClients.forEach(ins => {
    if (ins && !merged.has(ins.toLowerCase())) {
      merged.set(ins.toLowerCase(), ins);
    }
  });

  return Array.from(merged.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function getUserProfileKey(userId: string): string {
  return `gestao_corretor_user_profile_${userId}`;
}

export function loadUserProfile(userId?: string | null): User | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(getUserProfileKey(userId));
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load user profile from storage:', e);
  }
  return null;
}

export function saveUserProfile(user: User): void {
  if (!user || !user.id) return;
  try {
    const key = getUserProfileKey(user.id);
    localStorage.setItem(key, JSON.stringify(user));

    // Also update broker list if stored
    try {
      const brokersRaw = localStorage.getItem('gestao_corretor_registered_brokers_v1');
      if (brokersRaw) {
        const brokers = JSON.parse(brokersRaw);
        const index = brokers.findIndex((b: { id: string }) => b.id === user.id);
        if (index !== -1) {
          brokers[index] = {
            ...brokers[index],
            name: user.name,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            brokerageName: user.brokerageName,
            brokerageId: user.corretora_id || user.brokerageId || brokers[index].brokerageId,
            corretora_id: user.corretora_id || user.brokerageId || brokers[index].brokerageId,
            role: user.role || brokers[index].role,
            isAdmin: user.isAdmin !== undefined ? user.isAdmin : brokers[index].isAdmin,
            susep: user.susep,
            status: user.status || brokers[index].status
          };
          localStorage.setItem('gestao_corretor_registered_brokers_v1', JSON.stringify(brokers));
        }
      }
    } catch {
      // Ignore broker update errors
    }
  } catch (e) {
    console.error('Failed to save user profile to storage:', e);
  }
}

export function loadCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (!raw) return null;
    const user: User = JSON.parse(raw);
    // Merge with persisted profile if available to ensure latest saved data
    const persisted = loadUserProfile(user.id);
    if (persisted) {
      return { ...user, ...persisted };
    }
    return user;
  } catch {
    return null;
  }
}

export function saveCurrentUser(user: User | null): void {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      saveUserProfile(user);
    } else {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  } catch (e) {
    console.error('Failed to save user:', e);
  }
}

// Theme storage
export function loadTheme(): 'light' | 'dark' {
  try {
    const t = localStorage.getItem(STORAGE_KEY_THEME);
    return t === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function saveTheme(theme: 'light' | 'dark'): void {
  try {
    localStorage.setItem(STORAGE_KEY_THEME, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {
    console.error('Failed to save theme:', e);
  }
}

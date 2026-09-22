import { Client, User, PolicyDocument } from '../types';

const DB_NAME = 'GestaoCorretorDB';
const DB_VERSION = 1;
const STORE_DOCUMENTS = 'policy_documents';
const STORAGE_KEY_DEMO_CLIENTS = 'gestao_corretor_clients_demo';
const STORAGE_KEY_USER = 'gestao_corretor_user_v1';
const STORAGE_KEY_THEME = 'gestao_corretor_theme_v1';

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

// Sample initial data generation to simulate a realistic insurance broker portfolio
function getInitialSampleClients(): Client[] {
  const today = new Date();
  
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const addDays = (base: Date, days: number): Date => {
    const res = new Date(base);
    res.setDate(res.getDate() + days);
    return res;
  };

  return [
    {
      id: 'cli-001',
      name: 'Roberto Andrade Filho',
      birthDate: '1984-09-24', // Aniversário em breve
      insuranceCompany: 'Porto Seguro',
      startDate: formatDate(addDays(today, -360)),
      endDate: formatDate(addDays(today, 5)), // Alerta Vermelho (5 dias)
      phone: '(11) 98765-4321',
      vehicleModel: 'Toyota Corolla Altis 2.0 2022',
      licensePlate: 'BRA2E19',
      totalInsuredValue: 4350.00,
      commissionRate: 18.0,
      commissionAmount: 4350 * 0.18, // 783.00
      clientType: 'Renovação',
      notes: 'Cliente premium há 4 anos. Já manifestou interesse em renovar com franquia reduzida.',
      document: {
        id: 'doc-001',
        name: 'Apolice_PortoSeguro_RobertoAndrade.pdf',
        size: 245000,
        type: 'application/pdf',
        uploadedAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'cli-002',
      name: 'Mariana Costa Siqueira',
      birthDate: '1992-09-21', // Aniversário amanhã!
      insuranceCompany: 'Allianz Seguros',
      startDate: formatDate(addDays(today, -355)),
      endDate: formatDate(addDays(today, 9)), // Alerta Vermelho (9 dias)
      phone: '(11) 99123-8877',
      vehicleModel: 'Jeep Compass Longitude 2023',
      licensePlate: 'FGH4J55',
      totalInsuredValue: 5600.00,
      commissionRate: 20.0,
      commissionAmount: 5600 * 0.20, // 1120.00
      clientType: 'Novo',
      notes: 'Primeira renovação. Enviar comparativo com Azul e Porto.',
      document: {
        id: 'doc-002',
        name: 'Apolice_Allianz_MarianaCosta.pdf',
        size: 189000,
        type: 'application/pdf',
        uploadedAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'cli-003',
      name: 'Carlos Henrique Viana',
      birthDate: '1978-10-05',
      insuranceCompany: 'Bradesco Seguros',
      startDate: formatDate(addDays(today, -350)),
      endDate: formatDate(addDays(today, 14)), // Alerta Laranja (14 dias)
      phone: '(19) 98111-2233',
      vehicleModel: 'Honda Civic Touring 1.5 2021',
      licensePlate: 'KLP9A88',
      totalInsuredValue: 3980.00,
      commissionRate: 15.0,
      commissionAmount: 3980 * 0.15, // 597.00
      clientType: 'Renovação',
      notes: 'Carro com rastreador instalado. Tem desconto de pontualidade.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'cli-004',
      name: 'Fernanda Lima Oliveira',
      birthDate: '1989-11-12',
      insuranceCompany: 'Tokio Marine',
      startDate: formatDate(addDays(today, -345)),
      endDate: formatDate(addDays(today, 22)), // Alerta Amarelo (22 dias)
      phone: '(21) 97654-3210',
      vehicleModel: 'Hyundai Creta Ultimate 2.0 2024',
      licensePlate: 'RIO3B44',
      totalInsuredValue: 4800.00,
      commissionRate: 17.5,
      commissionAmount: 4800 * 0.175, // 840.00
      clientType: 'Renovação',
      notes: 'Pediu para verificar inclusão de vidros e faróis completos.',
      document: {
        id: 'doc-004',
        name: 'Apolice_Tokio_FernandaLima.pdf',
        size: 312000,
        type: 'application/pdf',
        uploadedAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'cli-005',
      name: 'Lucas Martins Albuquerque',
      birthDate: '1995-09-29',
      insuranceCompany: 'Azul Seguros',
      startDate: formatDate(addDays(today, -340)),
      endDate: formatDate(addDays(today, 28)), // Alerta Amarelo (28 dias)
      phone: '(31) 98444-5566',
      vehicleModel: 'Chevrolet Tracker Premier 2023',
      licensePlate: 'MGX8C12',
      totalInsuredValue: 3400.00,
      commissionRate: 16.0,
      commissionAmount: 3400 * 0.16, // 544.00
      clientType: 'Novo',
      notes: 'Seguro jovem com condutor adicional (esposa).',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'cli-006',
      name: 'Beatriz Vasconcelos',
      birthDate: '1986-10-18',
      insuranceCompany: 'HDI Seguros',
      startDate: formatDate(addDays(today, -180)),
      endDate: formatDate(addDays(today, 185)), // Vigente
      phone: '(41) 99888-7766',
      vehicleModel: 'Volkswagen T-Cross Highline 2023',
      licensePlate: 'PRT5D33',
      totalInsuredValue: 4100.00,
      commissionRate: 18.0,
      commissionAmount: 4100 * 0.18, // 738.00
      clientType: 'Renovação',
      notes: 'Apólice sem sinistro.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'cli-007',
      name: 'Guilherme Rocha Mendes',
      birthDate: '1972-09-20', // Hoje é aniversário!
      insuranceCompany: 'Mapfre Seguros',
      startDate: formatDate(addDays(today, -90)),
      endDate: formatDate(addDays(today, 275)), // Vigente
      phone: '(11) 97111-9988',
      vehicleModel: 'BMW 320i M Sport 2022',
      licensePlate: 'SPK1A99',
      totalInsuredValue: 8900.00,
      commissionRate: 22.0,
      commissionAmount: 8900 * 0.22, // 1958.00
      clientType: 'Renovação',
      notes: 'Cliente corporativo com frota familiar.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
}

// User / Auth Storage API
export const DEMO_USER_ID = 'usr-01';

export const DEFAULT_USER: User = {
  id: DEMO_USER_ID,
  name: 'Carlos Eduardo Silva',
  firstName: 'Carlos',
  lastName: 'Eduardo Silva',
  email: 'corretor@gestaocorretor.com.br',
  susep: '10.203948/2024',
  brokerageName: 'Silva Corretora de Seguros',
  isAdmin: false
};

export function getClientsStorageKey(userId?: string | null): string {
  if (!userId || userId === DEMO_USER_ID || userId === 'demo') {
    return STORAGE_KEY_DEMO_CLIENTS;
  }
  return `gestao_corretor_clients_${userId}`;
}

// Client Storage API with strict per-user isolation
export function loadClients(userId?: string | null): Client[] {
  try {
    // If no user is logged in, return empty list
    if (!userId) {
      return [];
    }

    const storageKey = getClientsStorageKey(userId);
    const raw = localStorage.getItem(storageKey);

    // DEMO mode: seed realistic initial data if demo storage is empty
    if (userId === DEMO_USER_ID || userId === 'demo') {
      if (!raw) {
        const initial = getInitialSampleClients();
        localStorage.setItem(storageKey, JSON.stringify(initial));
        return initial;
      }
      return JSON.parse(raw);
    }

    // REAL user (Firebase Auth or new user): start completely CLEAN if no clients saved yet
    if (!raw) {
      return [];
    }

    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load clients:', e);
    return [];
  }
}

export function saveClients(clients: Client[], userId?: string | null): void {
  try {
    const storageKey = getClientsStorageKey(userId);
    localStorage.setItem(storageKey, JSON.stringify(clients));
  } catch (e) {
    console.error('Failed to save clients:', e);
  }
}

// Optional helper if a real user specifically chooses to seed demo data into their account
export function seedSampleClientsForUser(userId: string): Client[] {
  const initial = getInitialSampleClients();
  saveClients(initial, userId);
  return initial;
}

export function clearUserClients(userId?: string | null): void {
  try {
    const storageKey = getClientsStorageKey(userId);
    localStorage.removeItem(storageKey);
  } catch (e) {
    console.error('Failed to clear user clients:', e);
  }
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

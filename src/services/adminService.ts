import { User, BrokerAccount, Brokerage, Client, UserRole } from '../types';
import { ADMIN_USER_ID, isSubAdmin } from '../utils/insuranceUtils';
import { loadClients } from './storage';
import { 
  firebaseCreateUserByAdmin, 
  isFirebaseConfigured, 
  saveUserProfileToFirestore 
} from './firebase';

const STORAGE_KEY_REGISTERED_BROKERS = 'gestao_corretor_registered_brokers_v2';
const STORAGE_KEY_BROKERAGES = 'gestao_corretor_brokerages_v2';

// Initial seed list of brokerages
export const INITIAL_BROKERAGES: Brokerage[] = [
  {
    id: 'corretora-finage',
    name: 'Finage Corretora de Seguros',
    subAdminId: 'usr-alberto',
    subAdminName: 'Alberto Carvalho',
    subAdminEmail: 'alberto@finage.com.br',
    createdAt: '2024-01-15T09:00:00.000Z'
  },
  {
    id: 'corretora-silva',
    name: 'Silva Corretora de Seguros',
    subAdminId: 'usr-01',
    subAdminName: 'Carlos Eduardo Silva',
    subAdminEmail: 'corretor@gestaocorretor.com.br',
    createdAt: '2024-02-15T10:30:00.000Z'
  },
  {
    id: 'corretora-sampaio',
    name: 'Sampaio Prime Seguros',
    subAdminId: 'usr-04',
    subAdminName: 'Patrícia Mendes Sampaio',
    subAdminEmail: 'patricia.mendes@sampaioseguros.com.br',
    createdAt: '2024-05-20T16:45:00.000Z'
  },
  {
    id: 'corretora-guimaraes',
    name: 'Guimarães Proteção & Vida',
    subAdminId: undefined,
    subAdminName: undefined,
    subAdminEmail: undefined,
    createdAt: '2024-04-12T09:15:00.000Z'
  }
];

// Initial seed list of brokers for simulation / admin preview
export const INITIAL_BROKERS: BrokerAccount[] = [
  {
    id: ADMIN_USER_ID,
    name: 'Administrador Master',
    firstName: 'Administrador',
    lastName: 'Master',
    email: 'admin@gestaocorretor.com.br',
    susep: '00.000001/2024',
    brokerageName: 'GestãoCorretor Central',
    brokerageId: 'corretora-central',
    role: 'admin',
    isAdmin: true,
    status: 'active',
    clientCount: 14,
    totalPremiums: 62400.00,
    createdAt: '2024-01-10T08:00:00.000Z'
  },
  {
    id: 'usr-alberto',
    name: 'Alberto Carvalho',
    firstName: 'Alberto',
    lastName: 'Carvalho',
    email: 'alberto@finage.com.br',
    susep: '20.554102/2023',
    brokerageName: 'Finage Corretora de Seguros',
    brokerageId: 'corretora-finage',
    role: 'subadmin',
    isAdmin: true,
    status: 'active',
    clientCount: 9,
    totalPremiums: 48500.00,
    createdAt: '2024-01-15T10:00:00.000Z'
  },
  {
    id: 'usr-lucas-finage',
    name: 'Lucas Ribeiro',
    firstName: 'Lucas',
    lastName: 'Ribeiro',
    email: 'lucas@finage.com.br',
    susep: '21.884192/2024',
    brokerageName: 'Finage Corretora de Seguros',
    brokerageId: 'corretora-finage',
    role: 'broker',
    isAdmin: false,
    status: 'active',
    clientCount: 5,
    totalPremiums: 24200.00,
    createdAt: '2024-03-10T11:15:00.000Z'
  },
  {
    id: 'usr-01',
    name: 'Carlos Eduardo Silva',
    firstName: 'Carlos',
    lastName: 'Eduardo Silva',
    email: 'corretor@gestaocorretor.com.br',
    susep: '10.203948/2024',
    brokerageName: 'Silva Corretora de Seguros',
    brokerageId: 'corretora-silva',
    role: 'subadmin',
    isAdmin: true,
    status: 'active',
    clientCount: 4,
    totalPremiums: 16400.00,
    createdAt: '2024-02-15T10:30:00.000Z'
  },
  {
    id: 'usr-02',
    name: 'Mariana Costa Alcantara',
    firstName: 'Mariana',
    lastName: 'Costa Alcantara',
    email: 'mariana.costa@silvaseguros.com.br',
    susep: '12.984712/2023',
    brokerageName: 'Silva Corretora de Seguros',
    brokerageId: 'corretora-silva',
    role: 'broker',
    isAdmin: false,
    status: 'active',
    clientCount: 6,
    totalPremiums: 27850.00,
    createdAt: '2024-03-01T14:20:00.000Z'
  },
  {
    id: 'usr-04',
    name: 'Patrícia Mendes Sampaio',
    firstName: 'Patrícia',
    lastName: 'Mendes Sampaio',
    email: 'patricia.mendes@sampaioseguros.com.br',
    susep: '18.309182/2024',
    brokerageName: 'Sampaio Prime Seguros',
    brokerageId: 'corretora-sampaio',
    role: 'subadmin',
    isAdmin: true,
    status: 'active',
    clientCount: 8,
    totalPremiums: 41200.00,
    createdAt: '2024-05-20T16:45:00.000Z'
  },
  {
    id: 'usr-03',
    name: 'Fernando Guimarães Borges',
    firstName: 'Fernando',
    lastName: 'Guimarães Borges',
    email: 'fernando@guimaraesprotecao.com.br',
    susep: '15.441092/2022',
    brokerageName: 'Guimarães Proteção & Vida',
    brokerageId: 'corretora-guimaraes',
    role: 'broker',
    isAdmin: false,
    status: 'inactive',
    clientCount: 2,
    totalPremiums: 8900.00,
    createdAt: '2024-04-12T09:15:00.000Z'
  }
];

export function getBrokerageIdFromName(name?: string): string {
  if (!name) return 'corretora-padrao';
  const clean = name.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  return `corretora-${clean}`;
}

/**
 * Load all registered brokerages
 */
export function loadAllBrokerages(): Brokerage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BROKERAGES);
    let brokerages: Brokerage[] = [];

    if (!raw) {
      brokerages = [...INITIAL_BROKERAGES];
      localStorage.setItem(STORAGE_KEY_BROKERAGES, JSON.stringify(brokerages));
    } else {
      brokerages = JSON.parse(raw);
    }

    // Ensure initial brokerages exist
    INITIAL_BROKERAGES.forEach(init => {
      if (!brokerages.some(b => b.id === init.id || b.name.toLowerCase() === init.name.toLowerCase())) {
        brokerages.push(init);
      }
    });

    return brokerages;
  } catch (err) {
    console.error('Error loading brokerages:', err);
    return INITIAL_BROKERAGES;
  }
}

/**
 * Save all registered brokerages
 */
export function saveAllBrokerages(brokerages: Brokerage[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_BROKERAGES, JSON.stringify(brokerages));
  } catch (err) {
    console.error('Error saving brokerages:', err);
  }
}

/**
 * Register a new brokerage
 */
export function createBrokerage(
  name: string, 
  subAdminId?: string, 
  subAdminName?: string, 
  subAdminEmail?: string
): Brokerage {
  const brokerages = loadAllBrokerages();
  const cleanName = name.trim();
  const existing = brokerages.find(b => b.name.toLowerCase() === cleanName.toLowerCase());
  if (existing) return existing;

  const id = getBrokerageIdFromName(cleanName) + '-' + Date.now().toString(36).substring(4);
  const created: Brokerage = {
    id,
    name: cleanName,
    subAdminId,
    subAdminName,
    subAdminEmail,
    createdAt: new Date().toISOString()
  };

  const updated = [...brokerages, created];
  saveAllBrokerages(updated);
  return created;
}

/**
 * Load all registered brokers from localStorage / repository
 */
export function loadAllBrokers(): BrokerAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REGISTERED_BROKERS);
    let brokers: BrokerAccount[] = [];

    if (!raw) {
      brokers = [...INITIAL_BROKERS];
      localStorage.setItem(STORAGE_KEY_REGISTERED_BROKERS, JSON.stringify(brokers));
    } else {
      brokers = JSON.parse(raw);
    }

    // Ensure initial key users (Admin Master, Alberto, etc.) are always present
    INITIAL_BROKERS.forEach(initBroker => {
      if (!brokers.some(b => b.id === initBroker.id || b.email.toLowerCase() === initBroker.email.toLowerCase())) {
        brokers.push(initBroker);
      }
    });

    // Refresh real client counts and ensure role / brokerageId fields exist
    return brokers.map(b => {
      const userClients: Client[] = loadClients(b.id);
      const actualCount = userClients.length > 0 ? userClients.length : (b.clientCount || 0);
      const actualPremiums = userClients.length > 0 
        ? userClients.reduce((acc, curr) => acc + (curr.totalInsuredValue || 0), 0)
        : (b.totalPremiums || 0);

      let role: UserRole = b.role || 'broker';
      if (b.id === ADMIN_USER_ID || b.email.toLowerCase() === 'admin@gestaocorretor.com.br') {
        role = 'admin';
      } else if (b.email.toLowerCase() === 'alberto@finage.com.br' || b.email.toLowerCase() === 'corretor@gestaocorretor.com.br' || b.email.toLowerCase() === 'patricia.mendes@sampaioseguros.com.br') {
        role = 'subadmin';
      }

      let brokerageId = b.brokerageId;
      if (!brokerageId) {
        if (role === 'admin') brokerageId = 'corretora-central';
        else if (b.brokerageName?.toLowerCase().includes('finage')) brokerageId = 'corretora-finage';
        else if (b.brokerageName?.toLowerCase().includes('silva')) brokerageId = 'corretora-silva';
        else if (b.brokerageName?.toLowerCase().includes('sampaio')) brokerageId = 'corretora-sampaio';
        else brokerageId = getBrokerageIdFromName(b.brokerageName);
      }

      return {
        ...b,
        role,
        brokerageId,
        isAdmin: role === 'admin' || role === 'subadmin',
        clientCount: actualCount,
        totalPremiums: actualPremiums
      };
    });
  } catch (err) {
    console.error('Error loading brokers:', err);
    return INITIAL_BROKERS;
  }
}

/**
 * Save all registered brokers
 */
export function saveAllBrokers(brokers: BrokerAccount[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_REGISTERED_BROKERS, JSON.stringify(brokers));
  } catch (err) {
    console.error('Error saving brokers:', err);
  }
}

/**
 * Register a new broker account by administrator or sub-admin.
 * When Firebase is configured, registers directly into Firebase Authentication
 * without disconnecting the administrator and persists profile to Firestore.
 */
export async function createBrokerAccount(params: {
  firstName: string;
  lastName: string;
  email: string;
  brokerageName?: string;
  brokerageId?: string;
  role?: UserRole;
  susep?: string;
  initialPassword?: string;
  creatorUser?: User | null;
}): Promise<BrokerAccount> {
  const brokers = loadAllBrokers();
  const brokerages = loadAllBrokerages();

  const isCreatorSub = isSubAdmin(params.creatorUser);

  // Security enforcement:
  // Sub-Admins can ONLY create standard brokers ('broker') for their OWN brokerage
  let effectiveRole: UserRole = 'broker';
  if (isCreatorSub) {
    effectiveRole = 'broker';
  } else if (params.role) {
    effectiveRole = params.role;
  }

  let effectiveBrokerageName = '';
  let effectiveBrokerageId = '';

  if (isCreatorSub && params.creatorUser) {
    // Strictly lock to Sub-Admin's company
    effectiveBrokerageName = params.creatorUser.brokerageName || 'Minha Corretora';
    effectiveBrokerageId = params.creatorUser.brokerageId || getBrokerageIdFromName(effectiveBrokerageName);
  } else {
    // Admin Master can assign to any existing brokerage or create a new one
    if (params.brokerageId) {
      const found = brokerages.find(b => b.id === params.brokerageId);
      if (found) {
        effectiveBrokerageId = found.id;
        effectiveBrokerageName = found.name;
      }
    }
    
    if (!effectiveBrokerageId && params.brokerageName) {
      const cleanName = params.brokerageName.trim();
      const found = brokerages.find(b => b.name.toLowerCase() === cleanName.toLowerCase());
      if (found) {
        effectiveBrokerageId = found.id;
        effectiveBrokerageName = found.name;
      } else {
        const newBr = createBrokerage(cleanName);
        effectiveBrokerageId = newBr.id;
        effectiveBrokerageName = newBr.name;
      }
    }
  }

  if (!effectiveBrokerageName) {
    effectiveBrokerageName = 'Finage Corretora de Seguros';
    effectiveBrokerageId = 'corretora-finage';
  }

  const fullName = [params.firstName.trim(), params.lastName.trim()].filter(Boolean).join(' ');
  let newId = `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

  // If Firebase is active and password provided, create account in Firebase Authentication
  if (isFirebaseConfigured() && params.initialPassword) {
    const fbResult = await firebaseCreateUserByAdmin({
      email: params.email.trim(),
      password: params.initialPassword,
      name: fullName,
      firstName: params.firstName.trim(),
      lastName: params.lastName.trim(),
      brokerageName: effectiveBrokerageName,
      brokerageId: effectiveBrokerageId,
      role: effectiveRole,
      susep: params.susep?.trim()
    });
    newId = fbResult.uid;
  }

  const created: BrokerAccount = {
    id: newId,
    name: fullName,
    firstName: params.firstName.trim(),
    lastName: params.lastName.trim(),
    email: params.email.trim(),
    brokerageName: effectiveBrokerageName,
    brokerageId: effectiveBrokerageId,
    role: effectiveRole,
    isAdmin: effectiveRole === 'admin' || effectiveRole === 'subadmin',
    susep: params.susep?.trim() || '',
    status: 'active',
    clientCount: 0,
    totalPremiums: 0,
    createdAt: new Date().toISOString()
  };

  // If new user is a Sub-Admin, link them as responsible for the brokerage
  if (effectiveRole === 'subadmin') {
    const updatedBrokerages = loadAllBrokerages().map(br => {
      if (br.id === effectiveBrokerageId || br.name.toLowerCase() === effectiveBrokerageName.toLowerCase()) {
        return {
          ...br,
          subAdminId: created.id,
          subAdminName: created.name,
          subAdminEmail: created.email
        };
      }
      return br;
    });
    saveAllBrokerages(updatedBrokerages);
  }

  // Add created broker to the beginning of the list, replacing any duplicate email/id
  const updatedList = [
    created, 
    ...brokers.filter(b => b.id !== created.id && b.email.toLowerCase() !== created.email.toLowerCase())
  ];
  saveAllBrokers(updatedList);
  return created;
}

/**
 * Update an existing broker's details
 */
export function updateBrokerAccount(
  brokerId: string, 
  data: Partial<Pick<BrokerAccount, 'name' | 'firstName' | 'lastName' | 'email' | 'brokerageName' | 'brokerageId' | 'role' | 'susep' | 'status'>>,
  editorUser?: User | null
): BrokerAccount[] {
  const brokers = loadAllBrokers();
  const isEditorSub = isSubAdmin(editorUser);

  const updatedList = brokers.map(b => {
    if (b.id === brokerId) {
      // If editor is sub-admin, forbid changing role or brokerage
      const safeData = { ...data };
      if (isEditorSub) {
        delete safeData.role;
        delete safeData.brokerageId;
        delete safeData.brokerageName;
      }

      const updated: BrokerAccount = { 
        ...b, 
        ...safeData,
        role: safeData.role || b.role,
        brokerageId: safeData.brokerageId || b.brokerageId,
        isAdmin: (safeData.role || b.role) === 'admin' || (safeData.role || b.role) === 'subadmin'
      };

      if (safeData.firstName || safeData.lastName) {
        updated.name = [safeData.firstName || b.firstName, safeData.lastName || b.lastName].filter(Boolean).join(' ');
      }

      // If user was promoted to Sub-Admin, update the brokerage
      if (safeData.role === 'subadmin' && updated.brokerageId) {
        const brokerages = loadAllBrokerages().map(br => {
          if (br.id === updated.brokerageId) {
            return {
              ...br,
              subAdminId: updated.id,
              subAdminName: updated.name,
              subAdminEmail: updated.email
            };
          }
          return br;
        });
        saveAllBrokerages(brokerages);
      }

      if (isFirebaseConfigured()) {
        saveUserProfileToFirestore(brokerId, updated).catch(err => 
          console.warn('Could not sync updated broker to Firestore:', err)
        );
      }

      return updated;
    }
    return b;
  });

  saveAllBrokers(updatedList);
  return updatedList;
}

/**
 * Toggle broker account active/blocked status
 */
export function toggleBrokerStatus(brokerId: string, editorUser?: User | null): BrokerAccount[] {
  const brokers = loadAllBrokers();
  const updatedList = brokers.map(b => {
    if (b.id === brokerId) {
      // Admin master cannot be deactivated
      if (b.id === ADMIN_USER_ID) return b;
      // Sub-admin cannot deactivate themselves
      if (editorUser && b.id === editorUser.id) return b;

      return {
        ...b,
        status: b.status === 'active' ? ('inactive' as const) : ('active' as const)
      };
    }
    return b;
  });

  saveAllBrokers(updatedList);
  return updatedList;
}

/**
 * Calculate metrics across brokers (supports global or filtered team)
 */
export function getAdminMetrics(brokers: BrokerAccount[]) {
  const totalBrokers = brokers.length;
  const activeBrokers = brokers.filter(b => b.status === 'active').length;
  const totalContracts = brokers.reduce((acc, curr) => acc + (curr.clientCount || 0), 0);
  const totalVolumePremiums = brokers.reduce((acc, curr) => acc + (curr.totalPremiums || 0), 0);

  return {
    totalBrokers,
    activeBrokers,
    totalContracts,
    totalVolumePremiums
  };
}

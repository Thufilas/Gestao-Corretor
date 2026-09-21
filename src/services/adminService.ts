import { User, BrokerAccount, Client } from '../types';
import { ADMIN_USER_ID } from '../utils/insuranceUtils';
import { loadClients } from './storage';

const STORAGE_KEY_REGISTERED_BROKERS = 'gestao_corretor_registered_brokers_v1';

// Initial seed list of brokers for simulation / admin preview
const INITIAL_BROKERS: BrokerAccount[] = [
  {
    id: ADMIN_USER_ID,
    name: 'Administrador Master',
    firstName: 'Administrador',
    lastName: 'Master',
    email: 'admin@gestaocorretor.com.br',
    susep: '00.000001/2024',
    brokerageName: 'GestãoCorretor Central',
    isAdmin: true,
    status: 'active',
    clientCount: 14,
    totalPremiums: 62400.00,
    createdAt: '2024-01-10T08:00:00.000Z'
  },
  {
    id: 'usr-01',
    name: 'Carlos Eduardo Silva',
    firstName: 'Carlos',
    lastName: 'Eduardo Silva',
    email: 'corretor@gestaocorretor.com.br',
    susep: '10.203948/2024',
    brokerageName: 'Silva Corretora de Seguros',
    isAdmin: false,
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
    email: 'mariana.costa@alcantaraseguros.com.br',
    susep: '12.984712/2023',
    brokerageName: 'Alcantara & Costa Consultoria',
    isAdmin: false,
    status: 'active',
    clientCount: 6,
    totalPremiums: 27850.00,
    createdAt: '2024-03-01T14:20:00.000Z'
  },
  {
    id: 'usr-03',
    name: 'Fernando Guimarães Borges',
    firstName: 'Fernando',
    lastName: 'Guimarães Borges',
    email: 'fernando@guimaraesprotecao.com.br',
    susep: '15.441092/2022',
    brokerageName: 'Guimarães Proteção Veicular & Vida',
    isAdmin: false,
    status: 'inactive',
    clientCount: 2,
    totalPremiums: 8900.00,
    createdAt: '2024-04-12T09:15:00.000Z'
  },
  {
    id: 'usr-04',
    name: 'Patrícia Mendes Sampaio',
    firstName: 'Patrícia',
    lastName: 'Mendes Sampaio',
    email: 'patricia.mendes@sampaioseguros.com.br',
    susep: '18.309182/2024',
    brokerageName: 'Sampaio Prime Seguros',
    isAdmin: false,
    status: 'active',
    clientCount: 8,
    totalPremiums: 41200.00,
    createdAt: '2024-05-20T16:45:00.000Z'
  }
];

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

    // Refresh real client counts and total premiums calculated from isolated per-user storages
    return brokers.map(b => {
      const userClients: Client[] = loadClients(b.id);
      const actualCount = userClients.length > 0 ? userClients.length : (b.clientCount || 0);
      const actualPremiums = userClients.length > 0 
        ? userClients.reduce((acc, curr) => acc + (curr.totalInsuredValue || 0), 0)
        : (b.totalPremiums || 0);

      return {
        ...b,
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
 * Register a new broker account by administrator
 */
export function createBrokerAccount(newBroker: {
  firstName: string;
  lastName: string;
  email: string;
  brokerageName: string;
  susep?: string;
  initialPassword?: string;
}): BrokerAccount {
  const brokers = loadAllBrokers();
  const fullName = [newBroker.firstName.trim(), newBroker.lastName.trim()].filter(Boolean).join(' ');
  const newId = `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

  const created: BrokerAccount = {
    id: newId,
    name: fullName,
    firstName: newBroker.firstName.trim(),
    lastName: newBroker.lastName.trim(),
    email: newBroker.email.trim(),
    brokerageName: newBroker.brokerageName.trim() || 'Corretora de Seguros',
    susep: newBroker.susep?.trim() || '',
    isAdmin: false,
    status: 'active',
    clientCount: 0,
    totalPremiums: 0,
    createdAt: new Date().toISOString()
  };

  const updatedList = [created, ...brokers];
  saveAllBrokers(updatedList);
  return created;
}

/**
 * Update an existing broker's details
 */
export function updateBrokerAccount(
  brokerId: string, 
  data: Partial<Pick<BrokerAccount, 'name' | 'firstName' | 'lastName' | 'email' | 'brokerageName' | 'susep' | 'status'>>
): BrokerAccount[] {
  const brokers = loadAllBrokers();
  const updatedList = brokers.map(b => {
    if (b.id === brokerId) {
      const updated = { ...b, ...data };
      if (data.firstName || data.lastName) {
        updated.name = [data.firstName || b.firstName, data.lastName || b.lastName].filter(Boolean).join(' ');
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
export function toggleBrokerStatus(brokerId: string): BrokerAccount[] {
  const brokers = loadAllBrokers();
  const updatedList = brokers.map(b => {
    if (b.id === brokerId) {
      // Admin master cannot be deactivated
      if (b.id === ADMIN_USER_ID) return b;
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
 * Calculate metrics across all brokers
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

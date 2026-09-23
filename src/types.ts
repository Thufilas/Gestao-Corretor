export type ClientType = 'Novo' | 'Renovação';

export type AlertLevel = 'red' | 'orange' | 'yellow' | 'normal' | 'expired';

export interface PolicyDocument {
  id: string;
  name: string;
  size: number;
  type: string; // 'application/pdf' | 'image/png' | etc.
  uploadedAt: string;
  dataUrl?: string; // Base64 data stored in IndexedDB (local fallback)
  storageUrl?: string; // Firebase Storage public/signed download URL
  storagePath?: string; // Firebase Storage path in bucket (for deletions)
}

export interface Client {
  id: string;
  name: string;
  birthDate: string; // YYYY-MM-DD
  insuranceCompany: string; // Seguradora
  startDate: string; // Início Vigência (YYYY-MM-DD)
  endDate: string; // Fim Vigência (YYYY-MM-DD)
  phone: string; // Telefone formatado
  vehicleModel?: string; // Modelo do Carro / Placa (opcional útil)
  licensePlate?: string; // Placa
  totalInsuredValue: number; // Valor Total do Seguro (R$)
  commissionRate: number; // % da Comissão (Ex: 15 para 15%)
  commissionAmount: number; // Calculado: totalInsuredValue * (commissionRate / 100)
  clientType: ClientType; // 'Novo' | 'Renovação'
  notes?: string; // Comentários / Observações
  document?: PolicyDocument;
  apoliceUrl?: string; // URL da apólice no Firebase Storage (bucket: gestaocorretor-eafd3.firebasestorage.app)
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'admin' | 'subadmin' | 'broker' | 'MASTER' | 'SUB_ADMIN' | 'CORRETOR';

export interface Brokerage {
  id: string;
  name: string;
  subAdminId?: string;
  subAdminName?: string;
  subAdminEmail?: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  susep?: string; // Registro SUSEP do Corretor
  brokerageName: string;
  brokerageId?: string; // ID da corretora vinculada
  corretora_id?: string; // ID da corretora vinculada (Firestore key)
  role?: UserRole; // 'admin' / 'MASTER' (Master Global) | 'subadmin' / 'SUB_ADMIN' (Gestor) | 'broker' / 'CORRETOR'
  isAdmin?: boolean;
  status?: 'active' | 'inactive' | 'ativo' | 'inativo';
  createdAt?: string;
  clientCount?: number;
  totalPremiums?: number;
}

export interface BrokerAccount extends User {
  role: UserRole;
  brokerageId: string;
  status: 'active' | 'inactive';
  clientCount: number;
  totalPremiums: number;
  createdAt: string;
}

export interface DashboardStats {
  totalActiveClients: number;
  monthlyCommissionExpected: number;
  totalPremiumsMonth: number;
  expiringIn30Days: number;
  expiringIn15Days: number;
  expiringIn10Days: number;
  renewalRate: number;
}

export interface ExpiryAlertItem {
  client: Client;
  daysRemaining: number;
  alertLevel: AlertLevel;
  formattedEndDate: string;
}

export interface BirthdayItem {
  client: Client;
  daysUntilBirthday: number;
  birthdayFormatted: string;
  ageUpcoming: number;
  isToday: boolean;
  birthMonth?: number;
  birthDay?: number;
}

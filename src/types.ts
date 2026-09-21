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
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  susep?: string; // Registro SUSEP do Corretor
  brokerageName: string;
  isAdmin?: boolean;
  status?: 'active' | 'inactive';
  createdAt?: string;
  clientCount?: number;
  totalPremiums?: number;
}

export interface BrokerAccount extends User {
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

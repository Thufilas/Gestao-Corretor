import { Client, AlertLevel, ExpiryAlertItem, BirthdayItem } from '../types';

export const ADMIN_USER_ID = 'bn5feEaSfUUClzVtFD5Q79Cx5112';

export const POPULAR_INSURERS: string[] = [];

export const BIRTH_DATE_ERROR_MESSAGE = 'Data de nascimento inválida ou menor de 18 anos.';

/**
 * Get the effective Corretora ID for multi-tenant isolation
 */
export function getUserCorretoraId(user?: { brokerageId?: string; corretora_id?: string; brokerageName?: string } | null): string {
  if (!user) return '';
  return user.corretora_id || user.brokerageId || '';
}

/**
 * Check if the user is the Super Admin Master (Global access to all brokerages)
 * Assigned EXCLUSIVELY to the principal Master Admin.
 */
export function isMasterAdmin(user?: any): boolean {
  if (!user) return false;
  
  const roleUpper = String(user.role || '').toUpperCase();
  if (roleUpper === 'CORRETOR' || roleUpper === 'BROKER') {
    return false;
  }

  if (user.id === ADMIN_USER_ID) return true;
  if (user.email && user.email.toLowerCase() === 'admin@gestaocorretor.com.br') return true;
  if (roleUpper === 'MASTER' || roleUpper === 'ADMIN_MASTER') return true;
  if (user.isAdmin === true && (roleUpper === 'ADMIN' || user.id === ADMIN_USER_ID || user.email?.toLowerCase() === 'admin@gestaocorretor.com.br')) return true;
  
  return false;
}

/**
 * Check if the user is a Sub-Admin / Gestor de Corretora
 */
export function isSubAdmin(user?: any): boolean {
  if (!user) return false;

  // Master Admin has global access, not restricted sub-admin privileges
  if (isMasterAdmin(user)) return false;

  if (user.isSubAdmin === true) return true;

  const r = String(user.role || '').toUpperCase();

  return (
    r === 'SUB_ADMIN' || 
    r === 'SUBADMIN' || 
    r === 'GESTOR' || 
    r === 'SUB_ADMINISTRADOR'
  );
}

/**
 * Check if the user has permission to access the Admin Panel (Master Admin OR Sub-Admin)
 */
export function canAccessAdminPanel(user?: any): boolean {
  if (!user) return false;
  return isMasterAdmin(user) || isSubAdmin(user) || user.isAdmin === true;
}

/**
 * Check if the user is a standard broker (No access to Admin Panel)
 */
export function isStandardBroker(user?: any): boolean {
  return !canAccessAdminPanel(user);
}

/**
 * Check if the user is an admin or sub-admin (backwards compatibility)
 */
export function isUserAdmin(user?: any): boolean {
  if (!user) return false;
  return canAccessAdminPanel(user);
}

/**
 * Returns the first name of a user from firstName attribute or name string
 */
export function getUserFirstName(user?: { name?: string; firstName?: string; email?: string } | null): string {
  if (!user) return 'Corretor';
  if (user.firstName && user.firstName.trim()) {
    return user.firstName.trim();
  }
  if (user.name && user.name.trim()) {
    const parts = user.name.trim().split(/\s+/);
    return parts[0] || 'Corretor';
  }
  if (user.email) {
    const prefix = user.email.split('@')[0];
    return prefix || 'Corretor';
  }
  return 'Corretor';
}

/**
 * Format currency to Brazilian Real (R$)
 */
export function formatCurrency(value: number): string {
  if (isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

/**
 * Format date string (YYYY-MM-DD) to DD/MM/AAAA
 */
export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '--/--/----';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Parse DD/MM/AAAA to YYYY-MM-DD
 */
export function parseDateBRtoISO(dateStr: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      let year = parts[2];
      if (year.length === 2) year = '20' + year;
      return `${year}-${month}-${day}`;
    }
  }
  return trimmed;
}

/**
 * Calculate days difference between today and a target date
 */
export function getDaysRemaining(endDateStr: string): number {
  if (!endDateStr) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, month, day] = endDateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Classify expiry alert level based on business rules:
 * - Crítico / Vermelho: <= 3 dias (inclui vencidas)
 * - Atenção / Laranja: 4 a 15 dias
 * - Monitoramento / Amarelo: 16 a 30 dias
 * - Normal: > 30 dias
 */
export function getExpiryAlertLevel(daysRemaining: number): AlertLevel {
  if (daysRemaining < 0) return 'expired';
  if (daysRemaining <= 3) return 'red';
  if (daysRemaining <= 15) return 'orange';
  if (daysRemaining <= 30) return 'yellow';
  return 'normal';
}

/**
 * Get all clients with expiry alerts sorted by urgency
 */
export function getExpiryAlerts(clients: Client[]): ExpiryAlertItem[] {
  const alerts: ExpiryAlertItem[] = [];

  for (const client of clients) {
    const days = getDaysRemaining(client.endDate);
    const alertLevel = getExpiryAlertLevel(days);

    if (days <= 30) {
      alerts.push({
        client,
        daysRemaining: days,
        alertLevel,
        formattedEndDate: formatDateBR(client.endDate)
      });
    }
  }

  return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Calculate all birthdays across the portfolio with full date and month metadata
 */
export function getAllClientBirthdays(clients: Client[]): BirthdayItem[] {
  const today = new Date();
  const currentYear = today.getFullYear();
  today.setHours(0, 0, 0, 0);

  const items: BirthdayItem[] = [];

  for (const client of clients) {
    if (!client.birthDate) continue;

    const parts = client.birthDate.split('-');
    if (parts.length < 3) continue;

    const birthYear = parseInt(parts[0], 10);
    const birthMonth = parseInt(parts[1], 10);
    const birthDay = parseInt(parts[2], 10);

    if (isNaN(birthMonth) || isNaN(birthDay)) continue;

    let nextBday = new Date(currentYear, birthMonth - 1, birthDay);
    nextBday.setHours(0, 0, 0, 0);

    if (nextBday < today) {
      nextBday = new Date(currentYear + 1, birthMonth - 1, birthDay);
    }

    const diffDays = Math.ceil((nextBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const ageUpcoming = isNaN(birthYear) ? 0 : nextBday.getFullYear() - birthYear;

    items.push({
      client,
      daysUntilBirthday: diffDays,
      birthdayFormatted: `${String(birthDay).padStart(2, '0')}/${String(birthMonth).padStart(2, '0')}`,
      ageUpcoming,
      isToday: diffDays === 0,
      birthMonth,
      birthDay
    });
  }

  return items.sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);
}

/**
 * Calculate upcoming birthdays within maxDays (defaults to 45 days)
 */
export function getUpcomingBirthdays(clients: Client[], maxDays = 45): BirthdayItem[] {
  return getAllClientBirthdays(clients).filter(b => b.daysUntilBirthday <= maxDays);
}

/**
 * Sanitize and format phone number for WhatsApp Link
 */
export function getCleanPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10 && !digits.startsWith('55')) {
    return `55${digits}`;
  }
  return digits;
}

/**
 * Generate direct WhatsApp link with pre-composed messages
 */
export function getWhatsAppLink(phone: string, text: string): string {
  const cleanPhone = getCleanPhoneNumber(phone);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Pre-composed WhatsApp text for policy renewal
 */
export function getRenewalWhatsAppMessage(
  client: Client,
  brokerName?: string,
  brokerageName?: string
): string {
  const clientName = client.name?.trim() || 'Cliente';
  const finalBrokerName = brokerName?.trim() || 'seu corretor';
  const finalBrokerageName = brokerageName?.trim() || 'nossa corretora';
  const vehicle = client.vehicleModel?.trim() || 'veículo';
  const insurer = client.insuranceCompany?.trim() || 'seguradora';
  const expiryDate = formatDateBR(client.endDate);
  const days = getDaysRemaining(client.endDate);

  let daysRemainingText = `em ${days} dias`;
  if (days === 1) {
    daysRemainingText = 'em 1 dia';
  } else if (days === 0) {
    daysRemainingText = 'hoje';
  } else if (days < 0) {
    daysRemainingText = `vencida há ${Math.abs(days)} dias`;
  }

  return `Olá, ${clientName}, tudo bem? Aqui é o ${finalBrokerName}, da ${finalBrokerageName}.

Passando para lembrar que a apólice do seu ${vehicle} na ${insurer} vence no dia ${expiryDate} (${daysRemainingText}).

Já estou preparando as melhores condições e opções de renovação com foco no seu custo-benefício.

Podemos conversar para alinharmos os detalhes da proposta?`;
}

/**
 * Pre-composed WhatsApp text for birthday greetings
 */
export function getBirthdayWhatsAppMessage(
  client: Client,
  brokerName?: string,
  brokerageName?: string
): string {
  const clientName = client.name?.trim() || 'Cliente';
  const finalBrokerName = brokerName?.trim() || 'seu corretor';
  const finalBrokerageName = brokerageName?.trim() || 'nossa corretora';

  return `Olá, ${clientName}! Aqui é o ${finalBrokerName}, da ${finalBrokerageName}.

Passando para te desejar um Feliz Aniversário!

Que o seu novo ano traga muita saúde, paz, conquistas e momentos felizes. É um prazer enorme ter você conosco.

Aproveite muito o seu dia! Parabéns!`;
}

/**
 * Phone mask formatter
 */
export function maskPhone(value: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';

  if (digits.length <= 2) {
    return `(${digits}`;
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function validateBirthDate(dateStr: string): { isValid: boolean; age?: number; error?: string } {
  if (!dateStr) return { isValid: false, error: 'Data de nascimento obrigatória.' };
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return { isValid: false, error: 'Data inválida.' };
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return { isValid: false, error: 'Data inválida.' };
  }
  const today = new Date();
  let age = today.getFullYear() - year;
  const m = today.getMonth() + 1 - month;
  if (m < 0 || (m === 0 && today.getDate() < day)) {
    age--;
  }
  if (age < 18) {
    return { isValid: false, age, error: 'O cliente deve ter pelo menos 18 anos.' };
  }
  if (age > 120) {
    return { isValid: false, age, error: 'Idade inválida (> 120 anos).' };
  }
  return { isValid: true, age };
}

export function getMaxBirthDateString(yearsAgo = 18): string {
  const today = new Date();
  const year = today.getFullYear() - yearsAgo;
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMinBirthDateString(yearsAgo = 120): string {
  const today = new Date();
  const year = today.getFullYear() - yearsAgo;
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateExactAge(birthDateStr: string): number {
  if (!birthDateStr) return 0;
  const [year, month, day] = birthDateStr.split('-').map(Number);
  if (!year || !month || !day) return 0;
  const today = new Date();
  let age = today.getFullYear() - year;
  const m = today.getMonth() + 1 - month;
  if (m < 0 || (m === 0 && today.getDate() < day)) {
    age--;
  }
  return age >= 0 ? age : 0;
}

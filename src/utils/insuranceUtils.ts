import { Client, AlertLevel, ExpiryAlertItem, BirthdayItem } from '../types';

export const POPULAR_INSURERS = [
  'Porto Seguro',
  'Allianz Seguros',
  'Bradesco Seguros',
  'Tokio Marine',
  'Azul Seguros',
  'HDI Seguros',
  'Mapfre',
  'Zurich Seguros',
  'Liberty Seguros',
  'Sompo Seguros',
  'Suhai Seguradora',
  'Youse Seguros',
  'Alfa Seguradora',
  'Outra Seguradora'
];

/**
 * Super Admin Master User ID
 */
export const ADMIN_USER_ID = 'bn5feEaSfUUClzVtFD5Q79Cx5112';

/**
 * Check if the user is the system administrator
 */
export function isUserAdmin(user?: { id?: string; isAdmin?: boolean; email?: string } | null): boolean {
  if (!user) return false;
  if (user.id === ADMIN_USER_ID) return true;
  if (user.isAdmin === true) return true;
  // Fallback for case-insensitive admin email or specific admin id
  if (user.email && user.email.toLowerCase() === 'admin@gestaocorretor.com.br') return true;
  return false;
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
 * - Vermelho: <= 10 dias (inclui vencidas)
 * - Laranja: 11 a 15 dias
 * - Amarelo: 16 a 30 dias
 * - Normal: > 30 dias
 */
export function getExpiryAlertLevel(daysRemaining: number): AlertLevel {
  if (daysRemaining < 0) return 'expired';
  if (daysRemaining <= 10) return 'red';
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

    // Consider all that are <= 30 days or already expired
    if (days <= 30) {
      alerts.push({
        client,
        daysRemaining: days,
        alertLevel,
        formattedEndDate: formatDateBR(client.endDate)
      });
    }
  }

  // Sort: lowest days first (expired & critical first)
  return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Calculate upcoming birthdays in current and upcoming months
 */
export function getUpcomingBirthdays(clients: Client[]): BirthdayItem[] {
  const today = new Date();
  const currentYear = today.getFullYear();
  today.setHours(0, 0, 0, 0);

  const items: BirthdayItem[] = [];

  for (const client of clients) {
    if (!client.birthDate) continue;

    const [, monthStr, dayStr] = client.birthDate.split('-');
    const birthMonth = parseInt(monthStr, 10);
    const birthDay = parseInt(dayStr, 10);

    if (isNaN(birthMonth) || isNaN(birthDay)) continue;

    // Birthday in current year
    let nextBday = new Date(currentYear, birthMonth - 1, birthDay);
    nextBday.setHours(0, 0, 0, 0);

    // If already passed this year, look at next year
    if (nextBday < today) {
      nextBday = new Date(currentYear + 1, birthMonth - 1, birthDay);
    }

    const diffDays = Math.ceil((nextBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Only return birthdays within the next 45 days
    if (diffDays <= 45) {
      const birthYear = parseInt(client.birthDate.split('-')[0], 10);
      const ageUpcoming = isNaN(birthYear) ? 0 : nextBday.getFullYear() - birthYear;

      items.push({
        client,
        daysUntilBirthday: diffDays,
        birthdayFormatted: `${String(birthDay).padStart(2, '0')}/${String(birthMonth).padStart(2, '0')}`,
        ageUpcoming,
        isToday: diffDays === 0
      });
    }
  }

  // Sort: closest birthdays first
  return items.sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);
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
export function getRenewalWhatsAppMessage(client: Client, brokerName: string): string {
  const days = getDaysRemaining(client.endDate);
  const formattedDate = formatDateBR(client.endDate);
  let urgency = `vence no dia ${formattedDate} (em ${days} dias)`;
  if (days === 0) urgency = 'vence HOJE!';
  if (days < 0) urgency = `venceu no dia ${formattedDate}`;

  return `Olá ${client.name}, tudo bem? Aqui é o ${brokerName}, seu corretor de seguros. 

Gostaria de lembrar que a apólice do seu veículo (${client.vehicleModel || 'seguro auto'}) junto à ${client.insuranceCompany} ${urgency}.

Já estou preparando as melhores condições e opções de renovação com descontos exclusivos para você. Podemos conversar para alinharmos os detalhes?`;
}

/**
 * Pre-composed WhatsApp text for birthday greetings
 */
export function getBirthdayWhatsAppMessage(client: Client, brokerName: string): string {
  return `Olá ${client.name}! 🎂🎉

Aqui é o ${brokerName}. Gostaria de lhe desejar um Feliz Aniversário! Muita saúde, paz, proteção e realizações na sua jornada.

Conte sempre conosco para cuidar da sua segurança e tranquilidade. Um grande abraço!`;
}

/**
 * Message standard for birth date validation errors
 */
export const BIRTH_DATE_ERROR_MESSAGE = 'A data de nascimento deve corresponder a uma idade entre 16 e 130 anos e não pode ser uma data futura.';

/**
 * Returns today's date formatted as YYYY-MM-DD in local time
 */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the maximum allowed birth date (exact 16 years ago from today)
 */
export function getMaxBirthDateString(minAge = 16): string {
  const d = new Date();
  const year = d.getFullYear() - minAge;
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the minimum allowed birth date (exact 130 years ago from today)
 */
export function getMinBirthDateString(maxAge = 130): string {
  const d = new Date();
  const year = d.getFullYear() - maxAge;
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates exact age in years considering day, month, and year of birth relative to current/reference date
 */
export function calculateExactAge(birthDateStr: string, referenceDate: Date = new Date()): number | null {
  if (!birthDateStr || !birthDateStr.trim()) return null;

  let year: number;
  let month: number;
  let day: number;

  const trimmed = birthDateStr.trim();
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-').map(Number);
    if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return null;
    year = parts[0];
    month = parts[1];
    day = parts[2];
  } else if (trimmed.includes('/')) {
    const parts = trimmed.split('/').map(Number);
    if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return null;
    day = parts[0];
    month = parts[1];
    year = parts[2];
    if (year < 100) year += 2000;
  } else {
    return null;
  }

  // Calendar validity check
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const parsedDate = new Date(year, month - 1, day);
  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return null;
  }

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth() + 1;
  const refDay = referenceDate.getDate();

  let age = refYear - year;
  if (refMonth < month || (refMonth === month && refDay < day)) {
    age--;
  }

  return age;
}

/**
 * Strict validation of client birth date with exact age calculation
 * Rules:
 * 1. Future date: cannot be greater than today
 * 2. Minimum age: at least 16 full years completed today
 * 3. Maximum age: cannot be older than 130 years
 */
export function validateBirthDate(
  dateStr: string,
  referenceDate: Date = new Date()
): { isValid: boolean; error?: string; age?: number } {
  if (!dateStr || !dateStr.trim()) {
    return { 
      isValid: false, 
      error: 'A data de aniversário é obrigatória.' 
    };
  }

  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);

  let year: number, month: number, day: number;
  const trimmed = dateStr.trim();
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-').map(Number);
    if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
      return { isValid: false, error: BIRTH_DATE_ERROR_MESSAGE };
    }
    year = parts[0];
    month = parts[1];
    day = parts[2];
  } else if (trimmed.includes('/')) {
    const parts = trimmed.split('/').map(Number);
    if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
      return { isValid: false, error: BIRTH_DATE_ERROR_MESSAGE };
    }
    day = parts[0];
    month = parts[1];
    year = parts[2];
    if (year < 100) year += 2000;
  } else {
    return { isValid: false, error: BIRTH_DATE_ERROR_MESSAGE };
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { isValid: false, error: BIRTH_DATE_ERROR_MESSAGE };
  }

  const birthDate = new Date(year, month - 1, day);
  birthDate.setHours(0, 0, 0, 0);

  if (
    birthDate.getFullYear() !== year ||
    birthDate.getMonth() !== month - 1 ||
    birthDate.getDate() !== day
  ) {
    return { isValid: false, error: BIRTH_DATE_ERROR_MESSAGE };
  }

  // 1. Data Futura: cannot be after today
  if (birthDate.getTime() > ref.getTime()) {
    return {
      isValid: false,
      error: BIRTH_DATE_ERROR_MESSAGE
    };
  }

  // 2. Precise Age Calculation
  const age = calculateExactAge(dateStr, ref);
  if (age === null) {
    return {
      isValid: false,
      error: BIRTH_DATE_ERROR_MESSAGE
    };
  }

  // 3. Minimum Age (16) & Maximum Age (130)
  if (age < 16 || age > 130) {
    return {
      isValid: false,
      error: BIRTH_DATE_ERROR_MESSAGE,
      age
    };
  }

  return { 
    isValid: true, 
    age 
  };
}

/**
 * Phone mask formatter supporting both 8-digit and 9-digit formats with DDD:
 * - 8 digits: (34) 9982-4765 (10 digits total)
 * - 9 digits: (34) 99982-4765 (11 digits total)
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
    // 8 digits: (XX) XXXX-XXXX (e.g. (34) 9982-4765)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  // 11 digits: (XX) XXXXX-XXXX (e.g. (34) 99982-4765)
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Detects whether a phone is currently formatted as 8 digits, 9 digits, or incomplete
 */
export function detectPhoneDigitMode(phone: string): '8digits' | '9digits' | 'incomplete' {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) return '9digits';
  if (digits.length === 10) return '8digits';
  return 'incomplete';
}

/**
 * Converts a phone between 8-digit and 9-digit format
 * Examples:
 * - (34) 9982-4765 -> (34) 99982-4765 (when targetDigits === 9)
 * - (34) 99982-4765 -> (34) 9982-4765 (when targetDigits === 8)
 */
export function convertPhoneDigitMode(phone: string, targetDigits: 8 | 9): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 2) return phone;

  const ddd = digits.slice(0, 2);
  const numberPart = digits.slice(2);

  if (targetDigits === 9) {
    if (numberPart.length === 8) {
      // Prepend '9' to the 8-digit number
      return maskPhone(`${ddd}9${numberPart}`);
    }
    return maskPhone(digits);
  }

  if (targetDigits === 8) {
    if (numberPart.length === 9) {
      // If it starts with 9, remove that leading 9
      if (numberPart.startsWith('9')) {
        return maskPhone(`${ddd}${numberPart.slice(1)}`);
      }
      // Otherwise remove the first digit of the number part
      return maskPhone(`${ddd}${numberPart.slice(1)}`);
    }
    return maskPhone(digits);
  }

  return maskPhone(phone);
}

/**
 * Validates a Brazilian phone number (requires DDD + 8 or 9 digits)
 */
export function validatePhone(phone: string): { 
  isValid: boolean; 
  error?: string; 
  digitCount: number;
  mode: '8digits' | '9digits' | 'incomplete';
} {
  const digits = phone.replace(/\D/g, '');
  if (!digits) {
    return { 
      isValid: false, 
      error: 'O telefone é obrigatório.', 
      digitCount: 0, 
      mode: 'incomplete' 
    };
  }

  if (digits.length < 10) {
    return {
      isValid: false,
      error: 'Número incompleto. Digite o DDD + 8 ou 9 dígitos (Ex: (34) 9982-4765 ou (34) 99982-4765).',
      digitCount: digits.length,
      mode: 'incomplete'
    };
  }

  if (digits.length === 10) {
    return {
      isValid: true,
      digitCount: 10,
      mode: '8digits'
    };
  }

  if (digits.length === 11) {
    return {
      isValid: true,
      digitCount: 11,
      mode: '9digits'
    };
  }

  return {
    isValid: false,
    error: 'Número excede 11 dígitos. Digite no máximo (XX) XXXXX-XXXX.',
    digitCount: digits.length,
    mode: 'incomplete'
  };
}

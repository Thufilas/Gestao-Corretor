import * as XLSX from 'xlsx';
import { Client, ClientType, ExpiryAlertItem, BirthdayItem } from '../types';
import { formatDateBR, parseDateBRtoISO } from '../utils/insuranceUtils';

export interface ImportResult {
  clients: Client[];
  errors: string[];
  totalParsed: number;
}

/**
 * Export client portfolio to .xlsx spreadsheet with totals and column formatting
 */
export function exportClientsToExcel(clients: Client[], filenamePrefix: string = 'GestaoCorretor_Clientes'): boolean {
  if (!clients || clients.length === 0) {
    return false;
  }

  const rows: Record<string, any>[] = clients.map((c) => ({
    'Nome do Cliente': c.name,
    'Data de Aniversário': formatDateBR(c.birthDate),
    'Nome da Seguradora': c.insuranceCompany,
    'Início da Vigência': formatDateBR(c.startDate),
    'Fim da Vigência': formatDateBR(c.endDate),
    'Telefone / WhatsApp': c.phone,
    'Veículo / Modelo': c.vehicleModel || '',
    'Placa': c.licensePlate || '',
    'Valor Total do Seguro (R$)': Number(c.totalInsuredValue || 0),
    '% Comissão': Number(c.commissionRate || 0),
    'Comissão Ganha (R$)': Number(c.commissionAmount || 0),
    'Tipo de Cliente': c.clientType,
    'Possui Anexo': c.document ? 'Sim' : 'Não',
    'Observações / Comentários': c.notes || ''
  }));

  // Append a summary / totals row
  const totalInsured = clients.reduce((acc, c) => acc + (c.totalInsuredValue || 0), 0);
  const totalCommission = clients.reduce((acc, c) => acc + (c.commissionAmount || 0), 0);
  const avgCommissionRate = clients.length > 0 
    ? Number((clients.reduce((acc, c) => acc + (c.commissionRate || 0), 0) / clients.length).toFixed(2))
    : 0;

  rows.push({
    'Nome do Cliente': `TOTAL GERAL (${clients.length} Clientes)`,
    'Data de Aniversário': '',
    'Nome da Seguradora': '',
    'Início da Vigência': '',
    'Fim da Vigência': '',
    'Telefone / WhatsApp': '',
    'Veículo / Modelo': '',
    'Placa': '',
    'Valor Total do Seguro (R$)': totalInsured,
    '% Comissão': avgCommissionRate,
    'Comissão Ganha (R$)': totalCommission,
    'Tipo de Cliente': '',
    'Possui Anexo': '',
    'Observações / Comentários': 'Relatório gerado pelo GestãoCorretor'
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths for nice appearance
  worksheet['!cols'] = [
    { wch: 30 }, // Nome
    { wch: 18 }, // Aniversário
    { wch: 22 }, // Seguradora
    { wch: 18 }, // Início
    { wch: 18 }, // Fim
    { wch: 20 }, // Telefone
    { wch: 28 }, // Veículo
    { wch: 14 }, // Placa
    { wch: 24 }, // Valor Total
    { wch: 14 }, // % Comissao
    { wch: 22 }, // Comissao Ganha
    { wch: 16 }, // Tipo
    { wch: 14 }, // Anexo
    { wch: 38 }  // Obs
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Carteira de Clientes');

  const todayStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filenamePrefix}_${todayStr}.xlsx`);
  return true;
}

/**
 * Export client portfolio to CSV spreadsheet format
 */
export function exportClientsToCsv(clients: Client[], filenamePrefix: string = 'GestaoCorretor_Clientes'): boolean {
  if (!clients || clients.length === 0) {
    return false;
  }

  const rows = clients.map((c) => ({
    'Nome do Cliente': c.name,
    'Data de Aniversário': formatDateBR(c.birthDate),
    'Nome da Seguradora': c.insuranceCompany,
    'Início da Vigência': formatDateBR(c.startDate),
    'Fim da Vigência': formatDateBR(c.endDate),
    'Telefone / WhatsApp': c.phone,
    'Veículo / Modelo': c.vehicleModel || '',
    'Placa': c.licensePlate || '',
    'Valor Total do Seguro (R$)': Number(c.totalInsuredValue || 0),
    '% Comissão': Number(c.commissionRate || 0),
    'Comissão Ganha (R$)': Number(c.commissionAmount || 0),
    'Tipo de Cliente': c.clientType,
    'Observações': c.notes || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');

  const todayStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filenamePrefix}_${todayStr}.csv`, { bookType: 'csv' });
  return true;
}

/**
 * Export renewal alerts to .xlsx spreadsheet
 */
export function exportAlertsToExcel(alerts: ExpiryAlertItem[], filenamePrefix: string = 'GestaoCorretor_Alertas_Renovacao'): boolean {
  if (!alerts || alerts.length === 0) return false;

  const rows = alerts.map(a => {
    let status = 'Normal';
    if (a.alertLevel === 'red' || a.alertLevel === 'expired') status = 'Crítico (<=10 dias ou Vencida)';
    else if (a.alertLevel === 'orange') status = 'Atenção (11 a 15 dias)';
    else if (a.alertLevel === 'yellow') status = 'Alerta Prévio (16 a 30 dias)';

    return {
      'Status': status,
      'Dias Restantes': a.daysRemaining < 0 ? `Vencida há ${Math.abs(a.daysRemaining)} dias` : `${a.daysRemaining} dias`,
      'Nome do Cliente': a.client.name,
      'Telefone / WhatsApp': a.client.phone,
      'Nome da Seguradora': a.client.insuranceCompany,
      'Fim da Vigência': formatDateBR(a.client.endDate),
      'Tipo de Cliente': a.client.clientType,
      'Veículo / Modelo': a.client.vehicleModel || '',
      'Placa': a.client.licensePlate || '',
      'Valor do Seguro (R$)': Number(a.client.totalInsuredValue || 0),
      'Comissão Estimada (R$)': Number(a.client.commissionAmount || 0)
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 28 }, // Status
    { wch: 18 }, // Dias
    { wch: 30 }, // Nome
    { wch: 20 }, // Telefone
    { wch: 22 }, // Seguradora
    { wch: 18 }, // Fim
    { wch: 16 }, // Tipo
    { wch: 26 }, // Veículo
    { wch: 14 }, // Placa
    { wch: 22 }, // Valor
    { wch: 22 }  // Comissão
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Alertas de Renovacao');

  const todayStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filenamePrefix}_${todayStr}.xlsx`);
  return true;
}

/**
 * Export birthday list to .xlsx spreadsheet
 */
export function exportBirthdaysToExcel(birthdays: BirthdayItem[], filenamePrefix: string = 'GestaoCorretor_Aniversariantes'): boolean {
  if (!birthdays || birthdays.length === 0) return false;

  const rows = birthdays.map(b => ({
    'Data de Aniversário': b.birthdayFormatted,
    'Situação': b.isToday ? 'Aniversariante de Hoje!' : `Em ${b.daysUntilBirthday} dias`,
    'Idade a Completar': b.ageUpcoming ? `${b.ageUpcoming} anos` : 'Não informada',
    'Nome do Cliente': b.client.name,
    'Telefone / WhatsApp': b.client.phone,
    'Seguradora': b.client.insuranceCompany,
    'Veículo / Modelo': b.client.vehicleModel || '',
    'Placa': b.client.licensePlate || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 20 },
    { wch: 24 },
    { wch: 18 },
    { wch: 30 },
    { wch: 22 },
    { wch: 22 },
    { wch: 26 },
    { wch: 14 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Aniversariantes');

  const todayStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filenamePrefix}_${todayStr}.xlsx`);
  return true;
}

/**
 * Generate and download an empty or template spreadsheet for the broker to fill in
 */
export function downloadTemplateSpreadsheet(): void {
  const templateRows = [
    {
      'Nome do Cliente': 'Exemplo: Carlos Alberto Pereira',
      'Data de Aniversário': '15/05/1985',
      'Nome da Seguradora': 'Porto Seguro',
      'Início da Vigência': '10/10/2023',
      'Fim da Vigência': '10/10/2024',
      'Telefone / WhatsApp': '(11) 98765-4321',
      'Veículo / Modelo': 'Chevrolet Onix Plus 1.0 2022',
      'Placa': 'ABC1D23',
      'Valor Total do Seguro (R$)': 3200.00,
      '% Comissão': 18.0,
      'Tipo de Cliente (Novo ou Renovação)': 'Renovação',
      'Observações': 'Cliente prefere contato após às 14h'
    },
    {
      'Nome do Cliente': 'Exemplo: Juliana Maria Souza',
      'Data de Aniversário': '22/08/1991',
      'Nome da Seguradora': 'Allianz Seguros',
      'Início da Vigência': '05/11/2023',
      'Fim da Vigência': '05/11/2024',
      'Telefone / WhatsApp': '(21) 99887-6655',
      'Veículo / Modelo': 'Jeep Renegade Longitude 2021',
      'Placa': 'KJH4E56',
      'Valor Total do Seguro (R$)': 4150.00,
      '% Comissão': 20.0,
      'Tipo de Cliente (Novo ou Renovação)': 'Novo',
      'Observações': 'Primeiro seguro do veículo zero km'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateRows);
  worksheet['!cols'] = [
    { wch: 32 },
    { wch: 18 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 30 },
    { wch: 12 },
    { wch: 25 },
    { wch: 15 },
    { wch: 32 },
    { wch: 35 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Modelo Importacao');
  XLSX.writeFile(workbook, 'Modelo_Importacao_GestaoCorretor.xlsx');
}

/**
 * Parse uploaded Excel or CSV file
 */
export async function parseExcelOrCsvFile(file: File): Promise<ImportResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Nenhuma planilha encontrada no arquivo.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  // Parse rows as array of objects
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const clients: Client[] = [];
  const errors: string[] = [];

  // Helper to find field value across multiple possible column aliases
  const findValue = (row: Record<string, any>, aliases: string[]): any => {
    const keys = Object.keys(row);
    for (const alias of aliases) {
      const matchedKey = keys.find(k => k.trim().toLowerCase() === alias.trim().toLowerCase());
      if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== '') {
        return row[matchedKey];
      }
    }
    // Also try partial match
    for (const alias of aliases) {
      const matchedKey = keys.find(k => k.toLowerCase().includes(alias.toLowerCase()));
      if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== '') {
        return row[matchedKey];
      }
    }
    return '';
  };

  const normalizeDate = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'number') {
      // Excel serial date number
      const date = XLSX.SSF.parse_date_code(val);
      if (date) {
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      }
    }
    const str = String(val).trim();
    if (str.includes('/')) {
      return parseDateBRtoISO(str);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }
    return '';
  };

  rawRows.forEach((row, index) => {
    const rowNum = index + 2; // considering header is row 1

    const name = String(findValue(row, ['Nome do Cliente', 'Nome', 'Cliente', 'Segurado', 'Nome Segurado'])).trim();
    if (!name || name.toLowerCase().includes('exemplo:')) {
      // Skip empty or instructions/example rows
      return;
    }

    const birthDate = normalizeDate(findValue(row, ['Data de Aniversário', 'Aniversário', 'Nascimento', 'Data Nascimento', 'Dt Nasc']));
    const insuranceCompany = String(findValue(row, ['Nome da Seguradora', 'Seguradora', 'Cia', 'Companhia']) || 'Porto Seguro').trim();
    
    const startDate = normalizeDate(findValue(row, ['Início da Vigência', 'Início Vigência', 'Inicio', 'Data Inicio', 'Vigencia Inicio']));
    const endDate = normalizeDate(findValue(row, ['Fim da Vigência', 'Fim Vigência', 'Fim', 'Data Fim', 'Vigencia Fim', 'Vencimento']));

    const phone = String(findValue(row, ['Telefone / WhatsApp', 'Telefone', 'WhatsApp', 'Celular', 'Contato']) || '').trim();
    const vehicleModel = String(findValue(row, ['Veículo / Modelo', 'Veículo', 'Modelo', 'Carro', 'Automóvel']) || '').trim();
    const licensePlate = String(findValue(row, ['Placa', 'Placa do Veículo']) || '').trim();

    // Parse values
    const rawValTotal = findValue(row, ['Valor Total do Seguro', 'Valor Total', 'Prêmio', 'Premio Total', 'Valor', 'Premio']);
    let totalInsuredValue = 0;
    if (typeof rawValTotal === 'number') {
      totalInsuredValue = rawValTotal;
    } else {
      const cleanVal = String(rawValTotal).replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
      totalInsuredValue = parseFloat(cleanVal) || 0;
    }

    const rawCommRate = findValue(row, ['% Comissão', 'Comissão %', 'Comissao', '% Comissao', 'Percentual']);
    let commissionRate = 15; // default 15%
    if (typeof rawCommRate === 'number') {
      commissionRate = rawCommRate > 1 ? rawCommRate : rawCommRate * 100;
    } else if (rawCommRate) {
      const cleanRate = String(rawCommRate).replace('%', '').replace(',', '.').trim();
      const parsed = parseFloat(cleanRate);
      if (!isNaN(parsed)) {
        commissionRate = parsed > 1 ? parsed : parsed * 100;
      }
    }

    const commissionAmount = totalInsuredValue * (commissionRate / 100);

    const rawType = String(findValue(row, ['Tipo de Cliente', 'Tipo', 'Novo ou Renovação'])).toLowerCase();
    const clientType: ClientType = rawType.includes('novo') ? 'Novo' : 'Renovação';

    const notes = String(findValue(row, ['Observações', 'Observação', 'Obs', 'Comentários', 'Comentário']) || '').trim();

    const client: Client = {
      id: `cli-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name,
      birthDate: birthDate || '1990-01-01',
      insuranceCompany: insuranceCompany || 'Porto Seguro',
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      phone: phone || '(11) 99999-9999',
      vehicleModel,
      licensePlate,
      totalInsuredValue,
      commissionRate,
      commissionAmount,
      clientType,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    clients.push(client);
  });

  return {
    clients,
    errors,
    totalParsed: clients.length
  };
}

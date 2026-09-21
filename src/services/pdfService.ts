import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Client, User, ExpiryAlertItem, BirthdayItem } from '../types';
import { formatCurrency, formatDateBR, getDaysRemaining } from '../utils/insuranceUtils';

export function exportClientsToPdf(
  clients: Client[],
  user: User | null,
  filterTitle = 'Relatório Geral da Carteira de Clientes'
): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor: [number, number, number] = [30, 41, 59]; // Slate 800
  const accentColor: [number, number, number] = [14, 116, 144]; // Cyan 700

  // Header banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 297, 24, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('GESTAOCORRETOR - SISTEMA DE GESTAO DE SEGUROS', 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const brokerName = user?.brokerageName || 'Corretora de Seguros';
  const susep = user?.susep ? ` | SUSEP: ${user.susep}` : '';
  doc.text(`${brokerName}${susep}`, 14, 18);

  const todayStr = new Date().toLocaleDateString('pt-BR');
  doc.text(`Data de Emissão: ${todayStr}`, 240, 15);

  // Subtitle / Filter title
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(filterTitle, 14, 34);

  // Summary statistics calculation
  const totalValue = clients.reduce((acc, c) => acc + (c.totalInsuredValue || 0), 0);
  const totalCommission = clients.reduce((acc, c) => acc + (c.commissionAmount || 0), 0);
  const totalRenovacao = clients.filter(c => c.clientType === 'Renovação').length;
  const totalNovos = clients.filter(c => c.clientType === 'Novo').length;

  // Mini summary boxes
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(14, 38, 62, 16, 2, 2, 'F');
  doc.roundedRect(82, 38, 62, 16, 2, 2, 'F');
  doc.roundedRect(150, 38, 64, 16, 2, 2, 'F');
  doc.roundedRect(220, 38, 63, 16, 2, 2, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL DE CLIENTES', 18, 43);
  doc.text('PREMIO TOTAL EMITIDO', 86, 43);
  doc.text('COMISSAO TOTAL GANHA', 154, 43);
  doc.text('COMPOSICAO DA CARTEIRA', 224, 43);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${clients.length} segurados`, 18, 50);
  doc.text(formatCurrency(totalValue), 86, 50);
  doc.text(formatCurrency(totalCommission), 154, 50);
  doc.text(`${totalRenovacao} Renovações | ${totalNovos} Novos`, 224, 50);

  // Table rows
  const tableData = clients.map((c, idx) => {
    const days = getDaysRemaining(c.endDate);
    let status = `${days} dias`;
    if (days < 0) status = `Vencido (${Math.abs(days)}d)`;
    else if (days === 0) status = 'Vence Hoje!';

    return [
      String(idx + 1),
      c.name,
      c.phone,
      c.insuranceCompany,
      formatDateBR(c.startDate),
      formatDateBR(c.endDate),
      status,
      c.clientType,
      formatCurrency(c.totalInsuredValue),
      `${c.commissionRate}%`,
      formatCurrency(c.commissionAmount)
    ];
  });

  autoTable(doc, {
    startY: 58,
    head: [[
      '#',
      'Cliente',
      'Telefone',
      'Seguradora',
      'Início',
      'Fim Vigência',
      'Prazo',
      'Tipo',
      'Prêmio Total',
      'Comissão %',
      'Comissão R$'
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      font: 'helvetica'
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { fontStyle: 'bold', cellWidth: 42 },
      2: { cellWidth: 26 },
      3: { cellWidth: 26 },
      4: { halign: 'center', cellWidth: 20 },
      5: { halign: 'center', cellWidth: 20 },
      6: { halign: 'center', cellWidth: 22 },
      7: { halign: 'center', cellWidth: 20 },
      8: { halign: 'right', cellWidth: 26 },
      9: { halign: 'center', cellWidth: 18 },
      10: { halign: 'right', fontStyle: 'bold', cellWidth: 26 }
    },
    didDrawPage: (data) => {
      // Footer page numbering
      const str = `Página ${doc.getNumberOfPages()} - GestãoCorretor CRM`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(str, 14, 202);
    }
  });

  const fileDate = new Date().toISOString().split('T')[0];
  doc.save(`GestaoCorretor_Relatorio_${fileDate}.pdf`);
}

export function exportAlertsToPdf(
  alerts: ExpiryAlertItem[],
  user: User | null,
  filterTitle = 'Relatório de Alertas & Renovações de Seguro'
): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor: [number, number, number] = [30, 41, 59]; // Slate 800

  // Header banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 297, 24, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('GESTAOCORRETOR - SISTEMA DE GESTAO DE SEGUROS', 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const brokerName = user?.brokerageName || 'Corretora de Seguros';
  const susep = user?.susep ? ` | SUSEP: ${user.susep}` : '';
  doc.text(`${brokerName}${susep}`, 14, 18);

  const todayStr = new Date().toLocaleDateString('pt-BR');
  doc.text(`Data de Emissão: ${todayStr}`, 240, 15);

  // Subtitle / Filter title
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(filterTitle, 14, 34);

  // Summary statistics calculation
  const totalCount = alerts.length;
  const criticalCount = alerts.filter(a => a.daysRemaining <= 3).length;
  const attentionCount = alerts.filter(a => a.daysRemaining >= 4 && a.daysRemaining <= 15).length;
  const monitoringCount = alerts.filter(a => a.daysRemaining >= 16 && a.daysRemaining <= 30).length;

  // Mini summary boxes
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(14, 38, 62, 16, 2, 2, 'F');
  doc.roundedRect(82, 38, 62, 16, 2, 2, 'F');
  doc.roundedRect(150, 38, 64, 16, 2, 2, 'F');
  doc.roundedRect(220, 38, 63, 16, 2, 2, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL DE ALERTAS', 18, 44);
  doc.text('CRÍTICO / URGENTE (≤3d)', 86, 44);
  doc.text('ATENÇÃO (4 a 15d)', 154, 44);
  doc.text('MONITORAMENTO (16-30d)', 224, 44);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`${totalCount} apólices`, 18, 50);

  doc.setTextColor(225, 29, 72); // rose-600
  doc.text(`${criticalCount} apólices`, 86, 50);

  doc.setTextColor(217, 119, 6); // amber-600
  doc.text(`${attentionCount} apólices`, 154, 50);

  doc.setTextColor(202, 138, 4); // yellow-600
  doc.text(`${monitoringCount} apólices`, 224, 50);

  // Table Data
  const tableData = alerts.map((a, idx) => {
    let status = 'Normal';
    if (a.daysRemaining <= 3) status = 'Crítico / Urgente';
    else if (a.daysRemaining <= 15) status = 'Atenção';
    else if (a.daysRemaining <= 30) status = 'Monitoramento';

    const daysText = a.daysRemaining < 0 ? `Vencida (-${Math.abs(a.daysRemaining)}d)` : `${a.daysRemaining} dias`;
    const vehicleText = [a.client.vehicleModel, a.client.licensePlate ? `(${a.client.licensePlate})` : ''].filter(Boolean).join(' ');

    return [
      idx + 1,
      status,
      daysText,
      a.client.name,
      a.client.phone || '--',
      a.client.insuranceCompany,
      formatDateBR(a.client.endDate),
      vehicleText || '--',
      formatCurrency(a.client.totalInsuredValue || 0),
      formatCurrency(a.client.commissionAmount || 0)
    ];
  });

  autoTable(doc, {
    startY: 58,
    head: [[
      '#',
      'Prioridade',
      'Prazo',
      'Nome do Segurado',
      'WhatsApp / Tel',
      'Seguradora',
      'Vencimento',
      'Veículo / Placa',
      'Valor Seguro',
      'Comissão'
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      font: 'helvetica'
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { fontStyle: 'bold', cellWidth: 32 },
      2: { halign: 'center', cellWidth: 22 },
      3: { fontStyle: 'bold', cellWidth: 44 },
      4: { cellWidth: 28 },
      5: { cellWidth: 28 },
      6: { halign: 'center', cellWidth: 22 },
      7: { cellWidth: 40 },
      8: { halign: 'right', cellWidth: 26 },
      9: { halign: 'right', fontStyle: 'bold', cellWidth: 26 }
    },
    didDrawPage: () => {
      const str = `Página ${doc.getNumberOfPages()} - GestãoCorretor Alertas`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(str, 14, 202);
    }
  });

  const fileDate = new Date().toISOString().split('T')[0];
  doc.save(`GestaoCorretor_Alertas_${fileDate}.pdf`);
}

export function exportBirthdaysToPdf(
  birthdays: BirthdayItem[],
  user: User | null,
  filterTitle = 'Relatório de Aniversariantes da Carteira'
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor: [number, number, number] = [30, 41, 59]; // Slate 800

  // Header banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 24, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('GESTAOCORRETOR - ANIVERSARIANTES DA CARTEIRA', 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const brokerName = user?.brokerageName || 'Corretora de Seguros';
  const susep = user?.susep ? ` | SUSEP: ${user.susep}` : '';
  doc.text(`${brokerName}${susep}`, 14, 18);

  const todayStr = new Date().toLocaleDateString('pt-BR');
  doc.text(`Emissão: ${todayStr}`, 155, 15);

  // Subtitle / Filter title
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(filterTitle, 14, 33);

  // Mini summary box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 37, 182, 12, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Total de Aniversariantes no Relatório: ${birthdays.length} cliente(s)`, 18, 44.5);

  // Table Data
  const tableData = birthdays.map((b, idx) => {
    const status = b.isToday ? 'Hoje! 🎂' : `Em ${b.daysUntilBirthday}d`;
    const age = b.ageUpcoming > 0 ? `${b.ageUpcoming} anos` : '--';
    const vehicle = [b.client.vehicleModel, b.client.licensePlate ? `(${b.client.licensePlate})` : ''].filter(Boolean).join(' ');

    return [
      idx + 1,
      b.birthdayFormatted,
      status,
      b.client.name,
      age,
      b.client.phone || '--',
      b.client.insuranceCompany,
      vehicle || '--'
    ];
  });

  autoTable(doc, {
    startY: 52,
    head: [[
      '#',
      'Data',
      'Prazo',
      'Nome do Cliente',
      'Idade',
      'WhatsApp / Tel',
      'Seguradora',
      'Veículo / Placa'
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      font: 'helvetica'
    },
    headStyles: {
      fillColor: [124, 58, 237], // Purple 600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', fontStyle: 'bold', cellWidth: 16 },
      2: { halign: 'center', cellWidth: 18 },
      3: { fontStyle: 'bold', cellWidth: 42 },
      4: { halign: 'center', cellWidth: 16 },
      5: { cellWidth: 28 },
      6: { cellWidth: 26 },
      7: { cellWidth: 28 }
    },
    didDrawPage: () => {
      const str = `Página ${doc.getNumberOfPages()} - GestãoCorretor Aniversariantes`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(str, 14, 288);
    }
  });

  const fileDate = new Date().toISOString().split('T')[0];
  doc.save(`GestaoCorretor_Aniversariantes_${fileDate}.pdf`);
}



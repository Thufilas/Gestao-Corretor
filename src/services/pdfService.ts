import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Client, User } from '../types';
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

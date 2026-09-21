import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  MessageSquare, 
  FileText, 
  Eye, 
  CheckCircle2, 
  ShieldAlert,
  FileSpreadsheet,
  Download,
  ChevronDown,
  Filter,
  X,
  Calendar,
  Sparkles
} from 'lucide-react';
import { Client, User, ExpiryAlertItem } from '../types';
import { 
  formatCurrency, 
  formatDateBR, 
  getExpiryAlerts, 
  getWhatsAppLink, 
  getRenewalWhatsAppMessage 
} from '../utils/insuranceUtils';
import { exportAlertsToExcel, exportAlertsToCsv } from '../services/excelService';
import { exportAlertsToPdf } from '../services/pdfService';

interface AlertsViewProps {
  clients: Client[];
  onViewClientDetails: (client: Client) => void;
  onEditClient: (client: Client) => void;
  onViewDocument: (client: Client) => void;
  currentUser: User | null;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  clients,
  onViewClientDetails,
  onEditClient: _onEditClient,
  onViewDocument,
  currentUser
}) => {
  const [selectedUrgency, setSelectedUrgency] = useState<'all' | 'red' | 'orange' | 'yellow'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const brokerName = currentUser?.name || 'Corretor';

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev);
    }, 4000);
  };

  // Extract all alerts (all policies <= 30 days or expired)
  const allAlerts = useMemo(() => getExpiryAlerts(clients), [clients]);

  // Strict priority classification:
  // 1. Crítico / Urgente: <= 3 dias ou já vencidas
  const criticalAlerts = useMemo(() => {
    return allAlerts.filter(a => a.daysRemaining <= 3);
  }, [allAlerts]);

  // 2. Atenção: entre 4 e 15 dias
  const attentionAlerts = useMemo(() => {
    return allAlerts.filter(a => a.daysRemaining >= 4 && a.daysRemaining <= 15);
  }, [allAlerts]);

  // 3. Monitoramento: entre 16 e 30 dias
  const monitoringAlerts = useMemo(() => {
    return allAlerts.filter(a => a.daysRemaining >= 16 && a.daysRemaining <= 30);
  }, [allAlerts]);

  // Filtered list based on interactive summary card selection
  const filteredAlerts = useMemo(() => {
    if (selectedUrgency === 'red') return criticalAlerts;
    if (selectedUrgency === 'orange') return attentionAlerts;
    if (selectedUrgency === 'yellow') return monitoringAlerts;
    return allAlerts;
  }, [selectedUrgency, criticalAlerts, attentionAlerts, monitoringAlerts, allAlerts]);

  // Export handlers
  const handleExportExcel = () => {
    setShowExportMenu(false);
    if (filteredAlerts.length === 0) {
      showToast('Nenhum alerta disponível para exportar no filtro selecionado.');
      return;
    }
    const success = exportAlertsToExcel(filteredAlerts, `GestaoCorretor_Alertas_${selectedUrgency}`);
    if (success) {
      showToast(`Planilha Excel exportada com sucesso! (${filteredAlerts.length} alertas)`);
    }
  };

  const handleExportCsv = () => {
    setShowExportMenu(false);
    if (filteredAlerts.length === 0) {
      showToast('Nenhum alerta disponível para exportar no filtro selecionado.');
      return;
    }
    const success = exportAlertsToCsv(filteredAlerts, `GestaoCorretor_Alertas_${selectedUrgency}`);
    if (success) {
      showToast(`Arquivo CSV exportado com sucesso! (${filteredAlerts.length} alertas)`);
    }
  };

  const handleExportPdf = () => {
    setShowExportMenu(false);
    if (filteredAlerts.length === 0) {
      showToast('Nenhum alerta disponível para exportar no filtro selecionado.');
      return;
    }
    const label = selectedUrgency === 'red'
      ? 'Alertas Críticos / Urgentes (≤ 3 dias)'
      : selectedUrgency === 'orange'
      ? 'Alertas de Atenção (4 a 15 dias)'
      : selectedUrgency === 'yellow'
      ? 'Alertas de Monitoramento (16 a 30 dias)'
      : 'Relatório Completo de Alertas & Renovações';

    exportAlertsToPdf(filteredAlerts, currentUser, label);
    showToast(`Relatório PDF gerado com sucesso! (${filteredAlerts.length} alertas)`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-600 text-white text-xs font-semibold flex items-center justify-between shadow-lg shadow-emerald-600/20 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-200 hover:text-white p-1 rounded-lg text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header with Title and Unified Export Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-500" />
            <span>Central de Alertas & Renovações de Seguro</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestão proativa de renovações categorizadas por nível de prioridade para blindar sua carteira.
          </p>
        </div>

        {/* Unified Export Dropdown Button */}
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
            title="Exportar alertas de renovação"
          >
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Exportar Alertas</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showExportMenu && (
            <div className="absolute right-0 mt-1.5 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-30 p-1.5 text-xs animate-in fade-in zoom-in-95">
              <button
                onClick={handleExportPdf}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium flex items-center gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-rose-500" />
                <span>Exportar como PDF</span>
              </button>
              <button
                onClick={handleExportExcel}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium flex items-center gap-2 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Exportar como Excel (.xlsx)</span>
              </button>
              <button
                onClick={handleExportCsv}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium flex items-center gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-blue-500" />
                <span>Exportar como CSV</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3 Interactive Summary Cards (Interactive Filters) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Crítico / Urgente (<= 3 dias ou vencidas) */}
        <div
          onClick={() => setSelectedUrgency(selectedUrgency === 'red' ? 'all' : 'red')}
          className={`group p-5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden select-none ${
            selectedUrgency === 'red'
              ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-500 shadow-md ring-2 ring-rose-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-800 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase bg-rose-600 text-white shadow-xs">
              <AlertTriangle className="w-3 h-3" />
              Crítico / Urgente
            </span>
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {criticalAlerts.length}
            </span>
          </div>
          
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
            <span>≤ 3 dias ou Vencidas</span>
            {selectedUrgency === 'red' && (
              <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 px-2 py-0.5 rounded-full">
                Filtro Ativo
              </span>
            )}
          </h3>

          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
            Ação imediata! Segurados com apólice expirada ou sem cobertura iminente.
          </p>

          <div className="mt-3 pt-2.5 border-t border-rose-100 dark:border-rose-950 flex items-center justify-between text-[11px] font-medium text-rose-700 dark:text-rose-300">
            <span>{selectedUrgency === 'red' ? '✕ Clique para remover filtro' : '→ Clique para filtrar'}</span>
            <span className="text-[10px] opacity-75">{criticalAlerts.length} apólice(s)</span>
          </div>
        </div>

        {/* Card 2: Atenção (4 a 15 dias) */}
        <div
          onClick={() => setSelectedUrgency(selectedUrgency === 'orange' ? 'all' : 'orange')}
          className={`group p-5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden select-none ${
            selectedUrgency === 'orange'
              ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-500 shadow-md ring-2 ring-amber-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-800 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase bg-amber-500 text-white shadow-xs">
              <Clock className="w-3 h-3" />
              Atenção
            </span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {attentionAlerts.length}
            </span>
          </div>

          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
            <span>4 a 15 dias</span>
            {selectedUrgency === 'orange' && (
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-full">
                Filtro Ativo
              </span>
            )}
          </h3>

          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
            Momento estratégico para apresentar propostas comparativas e fechar a renovação.
          </p>

          <div className="mt-3 pt-2.5 border-t border-amber-100 dark:border-amber-950 flex items-center justify-between text-[11px] font-medium text-amber-700 dark:text-amber-300">
            <span>{selectedUrgency === 'orange' ? '✕ Clique para remover filtro' : '→ Clique para filtrar'}</span>
            <span className="text-[10px] opacity-75">{attentionAlerts.length} apólice(s)</span>
          </div>
        </div>

        {/* Card 3: Monitoramento (16 a 30 dias) */}
        <div
          onClick={() => setSelectedUrgency(selectedUrgency === 'yellow' ? 'all' : 'yellow')}
          className={`group p-5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden select-none ${
            selectedUrgency === 'yellow'
              ? 'bg-yellow-50/90 dark:bg-yellow-950/40 border-yellow-500 shadow-md ring-2 ring-yellow-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-yellow-400 dark:hover:border-yellow-800 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase bg-yellow-500 text-slate-950 shadow-xs">
              <Sparkles className="w-3 h-3" />
              Monitoramento
            </span>
            <span className="text-2xl font-black text-yellow-600 dark:text-yellow-400">
              {monitoringAlerts.length}
            </span>
          </div>

          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
            <span>16 a 30 dias</span>
            {selectedUrgency === 'yellow' && (
              <span className="text-[10px] font-bold text-yellow-800 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-900/60 px-2 py-0.5 rounded-full">
                Filtro Ativo
              </span>
            )}
          </h3>

          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
            Monitoramento preventivo e primeiro contato de sondagem com o cliente.
          </p>

          <div className="mt-3 pt-2.5 border-t border-yellow-100 dark:border-yellow-950 flex items-center justify-between text-[11px] font-medium text-yellow-800 dark:text-yellow-300">
            <span>{selectedUrgency === 'yellow' ? '✕ Clique para remover filtro' : '→ Clique para filtrar'}</span>
            <span className="text-[10px] opacity-75">{monitoringAlerts.length} apólice(s)</span>
          </div>
        </div>

      </div>

      {/* Alerts List Container */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
        
        {/* List Header & Active Filter Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
              Lista de Contatos Prioritários
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold">
              {filteredAlerts.length}
            </span>
          </div>

          {selectedUrgency !== 'all' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Filtrando por:{' '}
                <strong className={
                  selectedUrgency === 'red' ? 'text-rose-600 dark:text-rose-400' :
                  selectedUrgency === 'orange' ? 'text-amber-600 dark:text-amber-400' :
                  'text-yellow-600 dark:text-yellow-400'
                }>
                  {selectedUrgency === 'red' ? 'Crítico / Urgente (≤ 3 dias)' :
                   selectedUrgency === 'orange' ? 'Atenção (4 a 15 dias)' :
                   'Monitoramento (16 a 30 dias)'}
                </strong>
              </span>
              <button
                onClick={() => setSelectedUrgency('all')}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                title="Limpar filtro e ver todos"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            </div>
          ) : (
            <span className="text-xs text-slate-400">
              Exibindo todos os alertas em aberto
            </span>
          )}
        </div>

        {/* Empty State */}
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-14 px-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Nenhuma apólice nesta categoria de alerta!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Sua carteira está em dia para esta faixa de vencimento. Continue monitorando as próximas datas.
            </p>
            {selectedUrgency !== 'all' && (
              <button
                onClick={() => setSelectedUrgency('all')}
                className="mt-4 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
              >
                Ver todos os alertas ({allAlerts.length})
              </button>
            )}
          </div>
        ) : (
          /* Cards Grid */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredAlerts.map(({ client, daysRemaining, formattedEndDate }) => {
              // Priority classification:
              // <= 3 days: Red
              // 4 to 15 days: Orange
              // 16 to 30 days: Yellow
              const isCritical = daysRemaining <= 3;
              const isAttention = daysRemaining >= 4 && daysRemaining <= 15;

              const whatsappUrl = getWhatsAppLink(
                client.phone,
                getRenewalWhatsAppMessage(client, brokerName)
              );

              return (
                <div
                  key={client.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between hover:shadow-xs ${
                    isCritical
                      ? 'bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-900/60 border-l-4 border-l-rose-500'
                      : isAttention
                      ? 'bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900/60 border-l-4 border-l-amber-500'
                      : 'bg-white dark:bg-slate-900 border-yellow-200 dark:border-yellow-900/60 border-l-4 border-l-yellow-500'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Row: Client Type Badge & Urgency Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        client.clientType === 'Renovação'
                          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : 'bg-blue-50 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                      }`}>
                        {client.clientType === 'Renovação' ? '↺ Renovação' : '★ Novo Cliente'}
                      </span>

                      {/* Correct Urgency Badge */}
                      {isCritical ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300/80 dark:border-rose-800">
                          <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                          <span>{daysRemaining <= 0 ? 'Vencida' : `Crítico: ${daysRemaining}d`}</span>
                        </span>
                      ) : isAttention ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800">
                          <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>Atenção: {daysRemaining} dias</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300 border border-yellow-300/80 dark:border-yellow-800">
                          <Clock className="w-3 h-3 text-yellow-600 dark:text-yellow-400 shrink-0" />
                          <span>Monitoramento: {daysRemaining} dias</span>
                        </span>
                      )}
                    </div>

                    {/* Client Name & Insurance Details */}
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white tracking-tight leading-snug">
                        {client.name}
                      </h3>
                      
                      <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {client.insuranceCompany}
                        </span>
                        {client.vehicleModel && (
                          <>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span>{client.vehicleModel}</span>
                          </>
                        )}
                        {client.licensePlate && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {client.licensePlate}
                          </span>
                        )}
                      </div>

                      {/* Expiration date line */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Término de Vigência: </span>
                        <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                          {formattedEndDate || formatDateBR(client.endDate)}
                        </strong>
                      </div>
                    </div>

                    {/* Financial Summary Box (Structured & High-Contrast) */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 block">
                          Valor do Seguro
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                          {formatCurrency(client.totalInsuredValue)}
                        </span>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 block">
                          Comissão ({client.commissionRate || 0}%)
                        </span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">
                          {formatCurrency(client.commissionAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {client.document && (
                        <button
                          onClick={() => onViewDocument(client)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
                          title={`Visualizar apólice: ${client.document.name}`}
                        >
                          <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>Apólice</span>
                        </button>
                      )}

                      <button
                        onClick={() => onViewClientDetails(client)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                        title="Ver ficha completa do cliente"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Ficha</span>
                      </button>
                    </div>

                    {/* WhatsApp Action Button */}
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                      title="Enviar mensagem personalizada de renovação via WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
};

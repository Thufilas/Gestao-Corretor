import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  MessageSquare, 
  FileText, 
  Eye, 
  Edit3, 
  CheckCircle2, 
  ShieldAlert,
  Car,
  Phone,
  FileSpreadsheet
} from 'lucide-react';
import { Client, User, ExpiryAlertItem } from '../types';
import { 
  formatCurrency, 
  formatDateBR, 
  getExpiryAlerts, 
  getWhatsAppLink, 
  getRenewalWhatsAppMessage 
} from '../utils/insuranceUtils';
import { exportAlertsToExcel } from '../services/excelService';

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
  onEditClient,
  onViewDocument,
  currentUser
}) => {
  const [selectedUrgency, setSelectedUrgency] = useState<'all' | 'red' | 'orange' | 'yellow'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev);
    }, 4000);
  };

  const handleExportAlerts = () => {
    if (filtered.length === 0) {
      showToast('Nenhum alerta para exportar no filtro atual.');
      return;
    }
    const success = exportAlertsToExcel(filtered, `GestaoCorretor_Alertas_${selectedUrgency}`);
    if (success) {
      showToast(`Planilha Excel de alertas gerada com sucesso! (${filtered.length} alertas)`);
    }
  };

  const brokerName = currentUser?.name || 'Corretor';

  const allAlerts = getExpiryAlerts(clients);

  const redAlerts = allAlerts.filter(a => a.alertLevel === 'red' || a.alertLevel === 'expired');
  const orangeAlerts = allAlerts.filter(a => a.alertLevel === 'orange');
  const yellowAlerts = allAlerts.filter(a => a.alertLevel === 'yellow');

  const filtered = allAlerts.filter(a => {
    if (selectedUrgency === 'red') return a.alertLevel === 'red' || a.alertLevel === 'expired';
    if (selectedUrgency === 'orange') return a.alertLevel === 'orange';
    if (selectedUrgency === 'yellow') return a.alertLevel === 'yellow';
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-600 text-white text-xs font-semibold flex items-center justify-between shadow-lg shadow-emerald-600/20">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-200 hover:text-white p-1 rounded-lg text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-500" />
            <span>Central de Alertas & Renovações de Seguro</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Acompanhamento rigoroso de apólices a vencer nos prazos de 10, 15 e 30 dias para garantir retenção da carteira.
          </p>
        </div>

        <button
          onClick={handleExportAlerts}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer self-start sm:self-auto shrink-0 active:scale-95"
          title="Exportar alertas de renovação para planilha Excel (.xlsx)"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
          <span>Exportar Alertas (.xlsx)</span>
        </button>
      </div>

      {/* 3 Urgency Cards / Filter Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Vermelho */}
        <div
          onClick={() => setSelectedUrgency(selectedUrgency === 'red' ? 'all' : 'red')}
          className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
            selectedUrgency === 'red'
              ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-500 shadow-md ring-2 ring-rose-500/20'
              : 'bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-900/40 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-600 text-white tracking-wider">
              Alerta Vermelho
            </span>
            <span className="text-xl font-black text-rose-600 dark:text-rose-400">
              {redAlerts.length}
            </span>
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            ≤ 10 dias ou Vencidas
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Urgência máxima! Clientes sem cobertura iminente.
          </p>
        </div>

        {/* Laranja */}
        <div
          onClick={() => setSelectedUrgency(selectedUrgency === 'orange' ? 'all' : 'orange')}
          className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
            selectedUrgency === 'orange'
              ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-500 shadow-md ring-2 ring-amber-500/20'
              : 'bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900/40 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-500 text-white tracking-wider">
              Alerta Laranja
            </span>
            <span className="text-xl font-black text-amber-600 dark:text-amber-400">
              {orangeAlerts.length}
            </span>
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Entre 11 e 15 dias
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Prazo ideal para apresentar comparativo de cotações.
          </p>
        </div>

        {/* Amarelo */}
        <div
          onClick={() => setSelectedUrgency(selectedUrgency === 'yellow' ? 'all' : 'yellow')}
          className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
            selectedUrgency === 'yellow'
              ? 'bg-yellow-50/80 dark:bg-yellow-950/40 border-yellow-500 shadow-md ring-2 ring-yellow-500/20'
              : 'bg-white dark:bg-slate-900 border-yellow-200 dark:border-yellow-900/40 hover:border-yellow-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-yellow-500 text-slate-900 tracking-wider">
              Alerta Amarelo
            </span>
            <span className="text-xl font-black text-yellow-600 dark:text-yellow-400">
              {yellowAlerts.length}
            </span>
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Entre 16 e 30 dias
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Monitoramento preventivo e primeiro contato de sondagem.
          </p>
        </div>

      </div>

      {/* Alerts List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Lista de Contatos Prioritários ({filtered.length} clientes)
          </h2>
          {selectedUrgency !== 'all' && (
            <button
              onClick={() => setSelectedUrgency('all')}
              className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 cursor-pointer"
            >
              Mostrar todos os alertas
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
              Nenhuma apólice nesta categoria de alerta!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(({ client, daysRemaining, alertLevel, formattedEndDate }) => {
              const isRed = alertLevel === 'red' || alertLevel === 'expired';
              const isOrange = alertLevel === 'orange';

              const whatsappUrl = getWhatsAppLink(
                client.phone,
                getRenewalWhatsAppMessage(client, brokerName)
              );

              return (
                <div
                  key={client.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    isRed
                      ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                      : isOrange
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
                      : 'bg-yellow-50/30 dark:bg-yellow-950/15 border-yellow-200 dark:border-yellow-900/60'
                  }`}
                >
                  <div>
                    {/* Top Row: Badges */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        client.clientType === 'Renovação'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                      }`}>
                        {client.clientType === 'Renovação' ? '↺ Cliente de Renovação' : '★ Cliente Novo (1ª Renovação)'}
                      </span>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        isRed ? 'bg-rose-600 text-white' : isOrange ? 'bg-amber-500 text-white' : 'bg-yellow-500 text-slate-900'
                      }`}>
                        {daysRemaining <= 0 ? 'Vencida' : `${daysRemaining} dias`}
                      </span>
                    </div>

                    {/* Name & Vehicle */}
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {client.name}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      <strong>{client.insuranceCompany}</strong>
                      {client.vehicleModel && ` • ${client.vehicleModel}`}
                      {client.licensePlate && ` (${client.licensePlate})`}
                    </p>

                    {/* Financial summary */}
                    <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex justify-between text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Valor Seguro:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {formatCurrency(client.totalInsuredValue)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block text-[10px]">Comissão ({client.commissionRate}%):</span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(client.commissionAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {client.document && (
                        <button
                          onClick={() => onViewDocument(client)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                          title="Visualizar Apólice"
                        >
                          <FileText className="w-3.5 h-3.5 text-rose-500" />
                          <span>Apólice</span>
                        </button>
                      )}

                      <button
                        onClick={() => onViewClientDetails(client)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        title="Ver ficha"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>

                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
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

import React, { useState } from 'react';
import { 
  Users, 
  DollarSign, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  ShieldAlert, 
  Cake, 
  MessageSquare, 
  FileText, 
  ChevronRight, 
  Car, 
  Building2, 
  Phone, 
  Eye, 
  Calendar,
  Sparkles,
  ArrowUpRight,
  Filter,
  Plus,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';
import { Client, User, AlertLevel, ExpiryAlertItem } from '../types';
import { 
  formatCurrency, 
  formatDateBR, 
  getDaysRemaining, 
  getExpiryAlerts, 
  getUpcomingBirthdays, 
  getWhatsAppLink, 
  getRenewalWhatsAppMessage, 
  getBirthdayWhatsAppMessage,
  getUserFirstName
} from '../utils/insuranceUtils';
import { 
  exportClientsToExcel, 
  exportAlertsToExcel, 
  exportBirthdaysToExcel 
} from '../services/excelService';

interface DashboardProps {
  clients: Client[];
  onOpenNewClient: () => void;
  onViewClientDetails: (client: Client) => void;
  onEditClient: (client: Client) => void;
  onViewDocument: (client: Client) => void;
  onNavigateToClients: () => void;
  currentUser: User | null;
  onOpenProfile?: () => void;
  onOpenImportExport?: () => void;
  onSeedDemoData?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  clients,
  onOpenNewClient,
  onViewClientDetails,
  onEditClient,
  onViewDocument,
  onNavigateToClients,
  currentUser,
  onOpenProfile,
  onOpenImportExport,
  onSeedDemoData
}) => {
  const [alertFilter, setAlertFilter] = useState<'all' | 'red' | 'orange' | 'yellow'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const handleExportExcel = () => {
    if (clients.length === 0) {
      showToast('Sua carteira está vazia. Cadastre clientes antes de exportar.');
      return;
    }
    const success = exportClientsToExcel(clients, 'GestaoCorretor_Carteira');
    if (success) {
      showToast(`Planilha Excel exportada com sucesso! (${clients.length} clientes)`);
    }
  };

  const handleExportAlertsExcel = () => {
    if (filteredAlerts.length === 0) {
      showToast('Nenhum alerta de vencimento para exportar no momento.');
      return;
    }
    const success = exportAlertsToExcel(filteredAlerts, 'GestaoCorretor_Alertas_Renovacao');
    if (success) {
      showToast(`Planilha de alertas de vencimento exportada com sucesso! (${filteredAlerts.length} alertas)`);
    }
  };

  const handleExportBirthdaysExcel = () => {
    if (upcomingBirthdays.length === 0) {
      showToast('Nenhum aniversariante para exportar no momento.');
      return;
    }
    const success = exportBirthdaysToExcel(upcomingBirthdays, 'GestaoCorretor_Aniversariantes');
    if (success) {
      showToast(`Planilha de aniversariantes exportada com sucesso! (${upcomingBirthdays.length} aniversários)`);
    }
  };

  const brokerName = currentUser?.name || 'Corretor';
  const allAlerts = getExpiryAlerts(clients);
  const upcomingBirthdays = getUpcomingBirthdays(clients);

  // Filter alerts according to selection
  const filteredAlerts = allAlerts.filter(item => {
    if (alertFilter === 'all') return true;
    if (alertFilter === 'red') return item.alertLevel === 'red' || item.alertLevel === 'expired';
    if (alertFilter === 'orange') return item.alertLevel === 'orange';
    if (alertFilter === 'yellow') return item.alertLevel === 'yellow';
    return true;
  });

  // Calculate statistics
  const totalActiveClients = clients.length;
  
  // Commission expected for current month (based on end date or created date in this month)
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyCommissionExpected = clients.reduce((acc, c) => {
    if (!c.endDate) return acc;
    const [y, m] = c.endDate.split('-').map(Number);
    if (y === currentYear && m === currentMonth + 1) {
      return acc + (c.commissionAmount || 0);
    }
    // Also include upcoming alerts if month matches
    return acc;
  }, 0);

  const fallbackMonthlyCommission = monthlyCommissionExpected > 0 
    ? monthlyCommissionExpected 
    : clients.reduce((acc, c) => acc + (c.commissionAmount || 0), 0) * 0.25;

  const totalPremiums = clients.reduce((acc, c) => acc + (c.totalInsuredValue || 0), 0);
  const totalCommissionsEarned = clients.reduce((acc, c) => acc + (c.commissionAmount || 0), 0);

  const redAlertsCount = allAlerts.filter(a => a.alertLevel === 'red' || a.alertLevel === 'expired').length;
  const orangeAlertsCount = allAlerts.filter(a => a.alertLevel === 'orange').length;
  const yellowAlertsCount = allAlerts.filter(a => a.alertLevel === 'yellow').length;

  const renewalClientsCount = clients.filter(c => c.clientType === 'Renovação').length;
  const newClientsCount = clients.filter(c => c.clientType === 'Novo').length;
  const renewalRatePercentage = clients.length > 0 ? Math.round((renewalClientsCount / clients.length) * 100) : 0;

  // Seguradoras breakdown
  const insurerMap: Record<string, number> = {};
  clients.forEach(c => {
    insurerMap[c.insuranceCompany] = (insurerMap[c.insuranceCompany] || 0) + 1;
  });
  const topInsurers = Object.entries(insurerMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-600 text-white text-xs font-semibold flex items-center justify-between shadow-lg shadow-emerald-600/20 animate-in fade-in slide-in-from-top-2 duration-200">
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

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute -right-8 -bottom-8 w-64 h-64 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Painel do Corretor de Seguros
              </span>
              <span className="text-xs text-slate-400">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Olá, {getUserFirstName(currentUser)}!
              </h1>
              {onOpenProfile && (
                <button
                  type="button"
                  id="btn-dashboard-edit-profile"
                  onClick={onOpenProfile}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/10 hover:bg-white/20 text-cyan-200 border border-white/10 transition-colors cursor-pointer"
                  title="Editar Perfil do Corretor"
                >
                  Editar Perfil
                </button>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              {clients.length === 0
                ? 'Sua carteira no GestãoCorretor está pronta para receber seus cadastros. Cadastre apólices manualmente ou importe sua planilha do Excel.'
                : `Você possui ${allAlerts.length} apólices com vencimento nos próximos 30 dias (${redAlertsCount} em prazo crítico). Mantenha sua carteira aquecida com renovações ativas.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={onOpenNewClient}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 transition-all cursor-pointer active:scale-95"
            >
              <span>+ Cadastrar Cliente</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-bold border border-emerald-500/40 shadow-md shadow-emerald-950/30 transition-all cursor-pointer active:scale-95"
              title="Exportar planilha Excel (.xlsx) da carteira"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span>Exportar Excel</span>
            </button>

            <button
              onClick={onNavigateToClients}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
            >
              <span>Ver Carteira</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Onboarding card when client list is empty */}
      {clients.length === 0 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs text-center">
          <div className="w-14 h-14 rounded-2xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto mb-3">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1.5">
            Sua conta exclusiva está pronta!
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-6 leading-relaxed">
            Você está conectado com seu acesso individual. Sua carteira inicia totalmente limpa, sem misturar clientes de outros usuários ou do modo de demonstração.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onOpenNewClient}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Primeiro Cliente</span>
            </button>
            {onOpenImportExport && (
              <button
                onClick={onOpenImportExport}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Importar Planilha do Excel</span>
              </button>
            )}
            {onSeedDemoData && (
              <button
                onClick={onSeedDemoData}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-xs font-medium transition-all cursor-pointer"
                title="Carregar 10 clientes de exemplo para testar gráficos e filtros nesta conta"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Carregar Exemplos de Teste</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Clientes Ativos */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Clientes Ativos
            </span>
            <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {totalActiveClients}
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {renewalRatePercentage}% renovações
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {renewalClientsCount} de renovação • {newClientsCount} clientes novos
          </p>
        </div>

        {/* Card 2: Previsão de Comissão Mês Atual */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Previsão Comissão Mês
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(fallbackMonthlyCommission)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Total comissões carteira: {formatCurrency(totalCommissionsEarned)}
          </p>
        </div>

        {/* Card 3: Volume Total de Prêmios */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Volume em Prêmios
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {formatCurrency(totalPremiums)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Seguro médio: {formatCurrency(clients.length > 0 ? totalPremiums / clients.length : 0)}
          </p>
        </div>

        {/* Card 4: Apólices a Vencer (Alertas) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              A Vencer em 30 Dias
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
              {allAlerts.length}
            </span>
            <span className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded">
              {redAlertsCount} críticos
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {orangeAlertsCount} em 15d • {yellowAlertsCount} em 30d
          </p>
        </div>

      </div>

      {/* Main Grid: Alertas de Vencimento (Left 2 cols) & Aniversariantes + Estatísticas (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Section: Alertas de Vencimento de Seguro */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs">
            
            {/* Header with Alert filter badges */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-500" />
                  <span>Alertas de Vencimento de Seguro (Renovações)</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Priorize os contatos para garantir a retenção e renovação das apólices.
                </p>
              </div>

              {/* Alert Level Filter Buttons & Export */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => setAlertFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      alertFilter === 'all'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Todos ({allAlerts.length})
                  </button>

                  <button
                    onClick={() => setAlertFilter('red')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      alertFilter === 'red'
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                    }`}
                  >
                    ≤ 10d ({redAlertsCount})
                  </button>

                  <button
                    onClick={() => setAlertFilter('orange')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      alertFilter === 'orange'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                    }`}
                  >
                    ≤ 15d ({orangeAlertsCount})
                  </button>

                  <button
                    onClick={() => setAlertFilter('yellow')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      alertFilter === 'yellow'
                        ? 'bg-yellow-500 text-white shadow-xs'
                        : 'text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-950/40'
                    }`}
                  >
                    ≤ 30d ({yellowAlertsCount})
                  </button>
                </div>

                <button
                  onClick={handleExportAlertsExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-xs"
                  title="Exportar alertas de renovação para Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Exportar Alertas</span>
                </button>
              </div>
            </div>

            {/* List of Alert Cards */}
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-10 px-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <ShieldAlert className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nenhuma apólice encontrada para o filtro selecionado.
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Sua carteira de seguros está com todos os vencimentos em dia!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAlerts.map((item) => {
                  const { client, daysRemaining, alertLevel, formattedEndDate } = item;
                  const isRed = alertLevel === 'red' || alertLevel === 'expired';
                  const isOrange = alertLevel === 'orange';
                  const isYellow = alertLevel === 'yellow';

                  const whatsappRenewalUrl = getWhatsAppLink(
                    client.phone,
                    getRenewalWhatsAppMessage(client, brokerName)
                  );

                  return (
                    <div
                      key={client.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isRed
                          ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 hover:border-rose-300'
                          : isOrange
                          ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60 hover:border-amber-300'
                          : 'bg-yellow-50/30 dark:bg-yellow-950/15 border-yellow-200 dark:border-yellow-900/60 hover:border-yellow-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        
                        {/* Left: Client info & Badges */}
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Visual Alert Badge */}
                            {isRed && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-rose-600 text-white tracking-wider animate-pulse">
                                {daysRemaining < 0 ? `Vencida (${Math.abs(daysRemaining)}d)` : daysRemaining === 0 ? 'Vence Hoje!' : `Vence em ${daysRemaining} dias`}
                              </span>
                            )}
                            {isOrange && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-amber-500 text-white tracking-wider">
                                Vence em {daysRemaining} dias
                              </span>
                            )}
                            {isYellow && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-yellow-500 text-slate-900 tracking-wider">
                                Vence em {daysRemaining} dias
                              </span>
                            )}

                            {/* Requirement 3: Visual Identification of "Renovação" vs "Cliente Novo" */}
                            {client.clientType === 'Renovação' ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                ↺ Cliente de Renovação
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                                ★ Cliente Novo (1ª Renovação)
                              </span>
                            )}

                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              Vigência até: <strong className="text-slate-800 dark:text-slate-200">{formattedEndDate}</strong>
                            </span>
                          </div>

                          {/* Client Name & Vehicle */}
                          <div>
                            <button
                              onClick={() => onViewClientDetails(client)}
                              className="text-sm font-bold text-slate-900 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 text-left transition-colors cursor-pointer"
                            >
                              {client.name}
                            </button>
                            <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                              <span className="font-semibold text-cyan-700 dark:text-cyan-400">{client.insuranceCompany}</span>
                              {client.vehicleModel && (
                                <>
                                  <span>•</span>
                                  <span>{client.vehicleModel}</span>
                                </>
                              )}
                              {client.licensePlate && (
                                <span className="px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-mono font-bold">
                                  {client.licensePlate}
                                </span>
                              )}
                            </p>
                          </div>

                          {/* Financials in alert */}
                          <div className="flex items-center gap-3 text-xs pt-1">
                            <span className="text-slate-500">
                              Seguro: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(client.totalInsuredValue)}</strong>
                            </span>
                            <span className="text-slate-500">
                              Comissão ({client.commissionRate}%): <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(client.commissionAmount)}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Right: Quick Action Buttons */}
                        <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-800">
                          
                          {/* Direct WhatsApp Renewal Message */}
                          <a
                            href={whatsappRenewalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                            title="Enviar proposta de renovação pronta via WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp Renovação</span>
                          </a>

                          <div className="flex items-center gap-1.5">
                            {/* Requirement 3: Shortcut to View/Download Policy Document */}
                            {client.document ? (
                              <button
                                onClick={() => onViewDocument(client)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                                title="Visualizar ou baixar PDF da apólice anexada"
                              >
                                <FileText className="w-3.5 h-3.5 text-rose-500" />
                                <span>Ver Apólice</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => onEditClient(client)}
                                className="px-2 py-1 rounded-lg text-[11px] text-slate-400 hover:text-cyan-600 cursor-pointer"
                                title="Anexar PDF da apólice"
                              >
                                + Anexar PDF
                              </button>
                            )}

                            <button
                              onClick={() => onViewClientDetails(client)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                              title="Ver ficha completa"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>

                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>

        {/* Right Section: Próximos Aniversariantes & Distribuição */}
        <div className="space-y-6">
          
          {/* Card: Próximos Aniversariantes */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                  <Cake className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Próximos Aniversariantes
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Fidelize clientes parabenizando-os
                  </p>
                </div>
              </div>

              {upcomingBirthdays.length > 0 && (
                <button
                  onClick={handleExportBirthdaysExcel}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 text-xs font-semibold border border-purple-200 dark:border-purple-800 transition-colors cursor-pointer"
                  title="Exportar aniversariantes para Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Excel</span>
                </button>
              )}
            </div>

            {upcomingBirthdays.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">
                Nenhum aniversário nos próximos 45 dias.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {upcomingBirthdays.slice(0, 5).map((item) => {
                  const whatsappBdayUrl = getWhatsAppLink(
                    item.client.phone,
                    getBirthdayWhatsAppMessage(item.client, brokerName)
                  );

                  return (
                    <div key={item.client.id} className="py-3 flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                            {item.client.name}
                          </span>
                          {item.isToday && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-purple-600 text-white animate-bounce">
                              Hoje! 🎂
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {item.birthdayFormatted} • {item.isToday ? 'Completando aniversário hoje' : `Faltam ${item.daysUntilBirthday} dias`}
                        </p>
                      </div>

                      <a
                        href={whatsappBdayUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 text-xs font-semibold border border-purple-200 dark:border-purple-800 transition-colors cursor-pointer shrink-0"
                        title="Enviar mensagem de felicitações no WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Parabenizar</span>
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Card: Seguradoras Mais Utilizadas */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-600" />
              <span>Seguradoras na sua Carteira</span>
            </h3>

            <div className="space-y-3">
              {topInsurers.map(([name, count]) => {
                const pct = Math.round((count / (clients.length || 1)) * 100);
                return (
                  <div key={name}>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-800 dark:text-slate-200">{name}</span>
                      <span className="text-slate-500">{count} apólices ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-cyan-600 h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

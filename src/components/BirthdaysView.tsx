import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Cake, 
  MessageSquare, 
  Phone, 
  Calendar, 
  Eye, 
  Search, 
  FileSpreadsheet, 
  FileText,
  Download,
  ChevronDown,
  CheckCircle2, 
  Sparkles,
  PartyPopper,
  Filter,
  X,
  User
} from 'lucide-react';
import { Client, User as UserType, BirthdayItem } from '../types';
import { 
  getAllClientBirthdays, 
  getWhatsAppLink, 
  getBirthdayWhatsAppMessage,
  formatDateBR 
} from '../utils/insuranceUtils';
import { exportBirthdaysToExcel, exportBirthdaysToCsv } from '../services/excelService';
import { exportBirthdaysToPdf } from '../services/pdfService';

interface BirthdaysViewProps {
  clients: Client[];
  onViewClientDetails: (client: Client) => void;
  currentUser: UserType | null;
}

type PeriodFilterType = 'today' | 'week' | 'month' | 'next30' | 'byMonth' | 'all';

const MONTH_NAMES = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' }
];

export const BirthdaysView: React.FC<BirthdaysViewProps> = ({
  clients,
  onViewClientDetails,
  currentUser
}) => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1 to 12

  const [periodFilter, setPeriodFilter] = useState<PeriodFilterType>('month');
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const brokerName = currentUser?.name || 'Corretor';
  const brokerageName = currentUser?.brokerageName || 'Corretora';

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

  // Get all calculated birthdays
  const allBirthdays = useMemo(() => {
    return getAllClientBirthdays(clients);
  }, [clients]);

  // Handle month selector change
  const handleMonthSelect = (monthVal: string) => {
    if (monthVal === 'all') {
      setSelectedMonth('all');
      setPeriodFilter('month');
    } else {
      const m = parseInt(monthVal, 10);
      setSelectedMonth(m);
      setPeriodFilter('byMonth');
    }
  };

  // Quick period tab selection
  const handlePeriodTabClick = (type: PeriodFilterType) => {
    setPeriodFilter(type);
    if (type === 'month') {
      setSelectedMonth(currentMonth);
    } else {
      setSelectedMonth('all');
    }
  };

  // Filtered birthdays
  const filteredBirthdays = useMemo(() => {
    return allBirthdays.filter(item => {
      // 1. Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = item.client.name.toLowerCase().includes(q);
        const matchesPhone = item.client.phone.includes(q);
        const matchesInsurance = item.client.insuranceCompany?.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesInsurance) return false;
      }

      // 2. Period / Month Filter
      if (periodFilter === 'today') {
        return item.isToday || item.daysUntilBirthday === 0;
      }
      if (periodFilter === 'week') {
        return item.daysUntilBirthday >= 0 && item.daysUntilBirthday <= 7;
      }
      if (periodFilter === 'month') {
        return item.birthMonth === currentMonth;
      }
      if (periodFilter === 'next30') {
        return item.daysUntilBirthday >= 0 && item.daysUntilBirthday <= 30;
      }
      if (periodFilter === 'byMonth') {
        if (selectedMonth === 'all') return true;
        return item.birthMonth === selectedMonth;
      }
      if (periodFilter === 'all') {
        return true;
      }

      return true;
    });
  }, [allBirthdays, periodFilter, selectedMonth, currentMonth, searchTerm]);

  // Counts for quick tabs
  const countToday = useMemo(() => allBirthdays.filter(b => b.isToday || b.daysUntilBirthday === 0).length, [allBirthdays]);
  const countWeek = useMemo(() => allBirthdays.filter(b => b.daysUntilBirthday >= 0 && b.daysUntilBirthday <= 7).length, [allBirthdays]);
  const countMonth = useMemo(() => allBirthdays.filter(b => b.birthMonth === currentMonth).length, [allBirthdays, currentMonth]);
  const countNext30 = useMemo(() => allBirthdays.filter(b => b.daysUntilBirthday >= 0 && b.daysUntilBirthday <= 30).length, [allBirthdays]);

  // Export handlers
  const getFilterLabel = () => {
    if (periodFilter === 'today') return 'Aniversariantes de Hoje';
    if (periodFilter === 'week') return 'Aniversariantes Desta Semana';
    if (periodFilter === 'month') return `Aniversariantes de ${MONTH_NAMES.find(m => m.value === currentMonth)?.label || 'Este Mês'}`;
    if (periodFilter === 'next30') return 'Aniversariantes dos Próximos 30 Dias';
    if (periodFilter === 'byMonth' && typeof selectedMonth === 'number') {
      const mName = MONTH_NAMES.find(m => m.value === selectedMonth)?.label || 'Mês';
      return `Aniversariantes de ${mName}`;
    }
    return 'Relatório de Aniversariantes';
  };

  const handleExportExcel = () => {
    setShowExportMenu(false);
    if (filteredBirthdays.length === 0) {
      showToast('Nenhum aniversariante no filtro selecionado para exportar.');
      return;
    }
    const success = exportBirthdaysToExcel(filteredBirthdays, `GestaoCorretor_Aniversariantes_${periodFilter}`);
    if (success) {
      showToast(`Planilha Excel de aniversariantes gerada com sucesso! (${filteredBirthdays.length} aniversários)`);
    }
  };

  const handleExportCsv = () => {
    setShowExportMenu(false);
    if (filteredBirthdays.length === 0) {
      showToast('Nenhum aniversariante no filtro selecionado para exportar.');
      return;
    }
    const success = exportBirthdaysToCsv(filteredBirthdays, `GestaoCorretor_Aniversariantes_${periodFilter}`);
    if (success) {
      showToast(`Arquivo CSV de aniversariantes gerado com sucesso! (${filteredBirthdays.length} aniversários)`);
    }
  };

  const handleExportPdf = () => {
    setShowExportMenu(false);
    if (filteredBirthdays.length === 0) {
      showToast('Nenhum aniversariante no filtro selecionado para exportar.');
      return;
    }
    exportBirthdaysToPdf(filteredBirthdays, currentUser, getFilterLabel());
    showToast(`Relatório PDF de aniversariantes gerado com sucesso! (${filteredBirthdays.length} aniversários)`);
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
            <Cake className="w-6 h-6 text-purple-500" />
            <span>Próximos Aniversariantes da Carteira</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Fortaleça o vínculo com seus segurados enviando felicitações personalizadas via WhatsApp.
          </p>
        </div>

        {/* Unified Export Dropdown Button */}
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
            title="Exportar aniversariantes da carteira"
          >
            <Download className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Exportar</span>
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

      {/* Control Bar: Quick Period Shortcuts + Month Selector + Search */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
        
        {/* Top line of controls: Period Tabs + Month Selector + Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* 1. Quick Period Shortcut Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl">
            <button
              onClick={() => handlePeriodTabClick('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                periodFilter === 'today'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <span>Hoje</span>
              {countToday > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  periodFilter === 'today' ? 'bg-purple-700 text-white' : 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                }`}>
                  {countToday}
                </span>
              )}
            </button>

            <button
              onClick={() => handlePeriodTabClick('week')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                periodFilter === 'week'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <span>Esta Semana</span>
              {countWeek > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  periodFilter === 'week' ? 'bg-purple-700 text-white' : 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                }`}>
                  {countWeek}
                </span>
              )}
            </button>

            <button
              onClick={() => handlePeriodTabClick('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                periodFilter === 'month'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <span>Este Mês</span>
              {countMonth > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  periodFilter === 'month' ? 'bg-purple-700 text-white' : 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                }`}>
                  {countMonth}
                </span>
              )}
            </button>

            <button
              onClick={() => handlePeriodTabClick('next30')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                periodFilter === 'next30'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <span>Próximos 30 dias</span>
              {countNext30 > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  periodFilter === 'next30' ? 'bg-purple-700 text-white' : 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                }`}>
                  {countNext30}
                </span>
              )}
            </button>

            <button
              onClick={() => handlePeriodTabClick('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                periodFilter === 'all'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              Todos ({allBirthdays.length})
            </button>
          </div>

          {/* Right Group: Month Dropdown + Search input */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            
            {/* Month Selector Filter (Janeiro a Dezembro) */}
            <div className="relative">
              <select
                value={periodFilter === 'byMonth' ? (selectedMonth ?? 'all') : (periodFilter === 'month' ? currentMonth : 'all')}
                onChange={(e) => handleMonthSelect(e.target.value)}
                className="w-full sm:w-44 px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer shadow-xs"
                title="Filtrar por mês de nascimento"
              >
                <option value="all">Filtrar por Mês...</option>
                {MONTH_NAMES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label} {m.value === currentMonth ? '(Atual)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por nome, telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white shadow-xs"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

          </div>

        </div>

        {/* Active Filter Indicator Tag */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400">Exibindo:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-purple-500" />
              <span>{getFilterLabel()}</span>
            </span>
          </div>

          <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">
            {filteredBirthdays.length} aniversariante(s)
          </span>
        </div>

      </div>

      {/* Birthday Cards Grid or Empty State */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs">
        {filteredBirthdays.length === 0 ? (
          /* Redesigned Empty State */
          <div className="text-center py-14 px-4">
            <div className="w-16 h-16 rounded-3xl bg-purple-50 dark:bg-purple-950/50 text-purple-500 dark:text-purple-400 flex items-center justify-center mx-auto mb-3 shadow-xs border border-purple-100 dark:border-purple-900/60">
              <PartyPopper className="w-8 h-8" />
            </div>
            
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Nenhum aniversariante encontrado neste período.
            </h3>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
              Não há clientes comemorando aniversário no período ou mês selecionado. Você pode navegar pelos outros meses ou visualizar todos os aniversariantes do mês atual.
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <button
                onClick={() => {
                  setPeriodFilter('month');
                  setSelectedMonth(currentMonth);
                  setSearchTerm('');
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Ver Aniversariantes do Mês</span>
              </button>

              <button
                onClick={() => {
                  setPeriodFilter('all');
                  setSelectedMonth('all');
                  setSearchTerm('');
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
              >
                Ver Todos da Carteira ({allBirthdays.length})
              </button>
            </div>
          </div>
        ) : (
          /* Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBirthdays.map((item) => {
              const { client, daysUntilBirthday, birthdayFormatted, ageUpcoming, isToday } = item;
              
              const whatsappUrl = getWhatsAppLink(
                client.phone,
                getBirthdayWhatsAppMessage(client, brokerName, brokerageName)
              );

              return (
                <div
                  key={client.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between hover:shadow-xs ${
                    isToday
                      ? 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-500 shadow-md ring-2 ring-purple-500/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-800'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Row: Date Badge & Urgency Indicator */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-100/70 dark:bg-purple-950/80 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800">
                        <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span>Dia {birthdayFormatted}</span>
                      </span>

                      {isToday ? (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-black uppercase bg-purple-600 text-white shadow-xs animate-bounce flex items-center gap-1">
                          <span>É HOJE! 🎂</span>
                        </span>
                      ) : daysUntilBirthday === 1 ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          Amanhã! 🎈
                        </span>
                      ) : daysUntilBirthday > 0 && daysUntilBirthday <= 30 ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          Em {daysUntilBirthday} dias
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                          {MONTH_NAMES.find(m => m.value === item.birthMonth)?.label}
                        </span>
                      )}
                    </div>

                    {/* Client Name */}
                    <div>
                      <button
                        onClick={() => onViewClientDetails(client)}
                        className="font-bold text-base text-slate-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 text-left transition-colors cursor-pointer block tracking-tight leading-snug"
                        title="Ver ficha cadastral completa"
                      >
                        {client.name}
                      </button>

                      {/* Phone & Contact */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 mt-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium">{client.phone}</span>
                      </div>

                      {/* Insurance & Vehicle Context */}
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <strong className="text-slate-700 dark:text-slate-300">{client.insuranceCompany}</strong>
                        {client.vehicleModel && ` • ${client.vehicleModel}`}
                      </p>
                    </div>

                    {/* Age Highlight Box */}
                    {ageUpcoming > 0 && (
                      <div className="bg-purple-50/50 dark:bg-purple-950/30 rounded-xl px-3 py-2 border border-purple-100 dark:border-purple-900/50 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">
                          Idade a completar:
                        </span>
                        <span className="font-extrabold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                          <PartyPopper className="w-3.5 h-3.5 text-purple-500" />
                          <span>{ageUpcoming} anos</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onViewClientDetails(client)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                      title="Ver ficha completa do segurado"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      <span>Ficha</span>
                    </button>

                    {/* WhatsApp Action Button with Pre-formatted Friendly Greeting */}
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                      title={`Enviar mensagem de feliz aniversário para ${client.name} no WhatsApp`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Enviar Parabéns via WhatsApp</span>
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

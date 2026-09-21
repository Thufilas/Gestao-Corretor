import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Building2, 
  Mail, 
  Search, 
  Edit3, 
  KeyRound, 
  Lock, 
  Unlock, 
  DollarSign, 
  FileText, 
  RefreshCw,
  Crown,
  Copy,
  Check,
  Briefcase,
  Plus,
  Layers,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { BrokerAccount, Brokerage, User, UserRole } from '../types';
import { 
  loadAllBrokers, 
  loadAllBrokerages, 
  toggleBrokerStatus, 
  updateBrokerAccount, 
  getAdminMetrics,
  getBrokerageIdFromName 
} from '../services/adminService';
import { formatCurrency, ADMIN_USER_ID, isMasterAdmin, isSubAdmin } from '../utils/insuranceUtils';
import { CreateBrokerModal } from './CreateBrokerModal';
import { EditBrokerModal } from './EditBrokerModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { CreateBrokerageModal } from './CreateBrokerageModal';

interface AdminViewProps {
  currentUser: User | null;
  onOpenNewBrokerModal?: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ currentUser }) => {
  const isMaster = isMasterAdmin(currentUser);
  const isSub = isSubAdmin(currentUser);

  // Raw data from repository
  const [brokers, setBrokers] = useState<BrokerAccount[]>(() => loadAllBrokers());
  const [brokerages, setBrokerages] = useState<Brokerage[]>(() => loadAllBrokerages());

  // Master Admin tab state: 'all' or a specific brokerage id
  const [selectedBrokerageTab, setSelectedBrokerageTab] = useState<string>('all');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [copiedId, setCopiedId] = useState(false);

  // Modals
  const [isCreateBrokerOpen, setIsCreateBrokerOpen] = useState(false);
  const [isCreateBrokerageOpen, setIsCreateBrokerageOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [brokerToEdit, setBrokerToEdit] = useState<BrokerAccount | null>(null);
  const [isResetPassOpen, setIsResetPassOpen] = useState(false);
  const [brokerForReset, setBrokerForReset] = useState<BrokerAccount | null>(null);

  // Reload data
  const refreshData = () => {
    setBrokers(loadAllBrokers());
    setBrokerages(loadAllBrokerages());
  };

  // Identify the Sub-Admin's brokerage
  const subAdminBrokerageId = useMemo(() => {
    if (!isSub || !currentUser) return '';
    return currentUser.brokerageId || getBrokerageIdFromName(currentUser.brokerageName);
  }, [isSub, currentUser]);

  // Determine the list of brokers to display based on permissions and active tab
  const activeBrokersPool = useMemo(() => {
    if (isSub) {
      // Sub-Admin: strictly filtered to their own brokerage
      return brokers.filter(b => {
        if (currentUser?.brokerageId && b.brokerageId === currentUser.brokerageId) return true;
        if (currentUser?.brokerageName && b.brokerageName?.toLowerCase() === currentUser.brokerageName.toLowerCase()) return true;
        return false;
      });
    }

    // Master Admin:
    if (selectedBrokerageTab === 'all') {
      return brokers;
    }
    // Specific brokerage tab selected
    return brokers.filter(b => b.brokerageId === selectedBrokerageTab);
  }, [brokers, isSub, currentUser, selectedBrokerageTab]);

  // Consolidated metrics for the currently viewed pool
  const metrics = useMemo(() => {
    return getAdminMetrics(activeBrokersPool);
  }, [activeBrokersPool]);

  // Global metrics across all brokerages (for Master Admin summary)
  const globalMetrics = useMemo(() => {
    return getAdminMetrics(brokers);
  }, [brokers]);

  // Filtered brokers by search and status
  const filteredBrokers = useMemo(() => {
    return activeBrokersPool.filter(b => {
      const matchSearch = 
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.brokerageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.susep && b.susep.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = 
        statusFilter === 'all' ? true : b.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [activeBrokersPool, searchTerm, statusFilter]);

  // Find the selected brokerage object if a specific tab is active
  const selectedBrokerage = useMemo(() => {
    if (isSub) {
      return brokerages.find(br => 
        br.id === subAdminBrokerageId || 
        br.name.toLowerCase() === currentUser?.brokerageName?.toLowerCase()
      ) || {
        id: subAdminBrokerageId,
        name: currentUser?.brokerageName || 'Sua Corretora',
        subAdminId: currentUser?.id,
        subAdminName: currentUser?.name,
        subAdminEmail: currentUser?.email,
        createdAt: new Date().toISOString()
      };
    }
    if (selectedBrokerageTab === 'all') return null;
    return brokerages.find(br => br.id === selectedBrokerageTab) || null;
  }, [isSub, subAdminBrokerageId, currentUser, selectedBrokerageTab, brokerages]);

  // Find the subadmin for the selected brokerage
  const currentBrokerageSubAdmin = useMemo(() => {
    if (!selectedBrokerage) return null;
    return brokers.find(b => 
      b.role === 'subadmin' && 
      (b.brokerageId === selectedBrokerage.id || b.brokerageName.toLowerCase() === selectedBrokerage.name.toLowerCase())
    );
  }, [selectedBrokerage, brokers]);

  const handleCopyAdminId = (id: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(id).then(() => {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
      }).catch(() => {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
      });
    } else {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleToggleStatus = (broker: BrokerAccount) => {
    if (broker.id === ADMIN_USER_ID) {
      alert('A conta do Administrador Master não pode ser inativada.');
      return;
    }
    if (isSub && broker.id === currentUser?.id) {
      alert('Você não pode inativar sua própria conta de gestor.');
      return;
    }
    const updated = toggleBrokerStatus(broker.id, currentUser);
    setBrokers(updated);
  };

  const handleOpenEdit = (broker: BrokerAccount) => {
    setBrokerToEdit(broker);
    setIsEditOpen(true);
  };

  const handleSaveEdit = (brokerId: string, updatedData: Partial<BrokerAccount>) => {
    const updated = updateBrokerAccount(brokerId, updatedData, currentUser);
    setBrokers(updated);
    setBrokerages(loadAllBrokerages());
  };

  const handleOpenReset = (broker: BrokerAccount) => {
    setBrokerForReset(broker);
    setIsResetPassOpen(true);
  };

  const handleBrokerCreated = (newBroker: BrokerAccount) => {
    setBrokers(loadAllBrokers());
    setBrokerages(loadAllBrokerages());
  };

  const handleBrokerageCreated = (newBrokerage: Brokerage) => {
    setBrokerages(loadAllBrokerages());
    setSelectedBrokerageTab(newBrokerage.id);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Top Banner */}
      <div className={`relative overflow-hidden rounded-2xl border p-6 sm:p-8 text-white shadow-xl ${
        isMaster 
          ? 'bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border-amber-800/40' 
          : 'bg-gradient-to-r from-slate-900 via-cyan-950/50 to-slate-900 border-cyan-800/40'
      }`}>
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {isMaster ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  Acesso Master Global
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  Gestor de Corretora & Equipe
                </span>
              )}

              {isSub && currentUser?.brokerageName && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800/80 text-slate-300 border border-slate-700 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-cyan-400" />
                  {currentUser.brokerageName}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              {isMaster ? (
                <span>Painel de Gestão Multi-Corretoras</span>
              ) : (
                <span>Gestão da Equipe — {currentUser?.brokerageName || 'Minha Corretora'}</span>
              )}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {isMaster 
                ? 'Controle global de corretoras, gestores responsáveis (Sub-Admins) e corretores credenciados em todo o ecossistema.' 
                : 'Gerencie os corretores credenciados na sua equipe, cadastre novos profissionais e acompanhe os contratos consolidados da sua empresa.'
              }
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              id="btn-admin-refresh"
              onClick={refreshData}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer active:scale-95 shadow-xs"
              title="Atualizar dados"
            >
              <RefreshCw className="w-4 h-4 text-cyan-400" />
              <span>Atualizar</span>
            </button>

            {/* Master Admin can create new brokerages */}
            {isMaster && (
              <button
                id="btn-admin-new-brokerage"
                onClick={() => setIsCreateBrokerageOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-amber-500/40 hover:border-amber-400 transition-all cursor-pointer active:scale-95 shadow-xs"
              >
                <Building2 className="w-4 h-4 text-amber-400" />
                <span>+ Nova Corretora</span>
              </button>
            )}

            {/* Create Broker / Member Button */}
            <button
              id="btn-admin-new-broker"
              onClick={() => setIsCreateBrokerOpen(true)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-md ${
                isMaster 
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25' 
                  : 'bg-cyan-600 hover:bg-cyan-700 shadow-cyan-600/25'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSub ? 'Cadastrar Corretor na Equipe' : 'Cadastrar Utilizador'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* MASTER ADMIN: Corretoras Tabs Navigation */}
      {isMaster && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Agrupamento por Corretoras
              </span>
            </div>
            <span className="text-xs text-slate-500">
              {brokerages.length} corretoras cadastradas
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {/* Tab: All Brokerages */}
            <button
              onClick={() => setSelectedBrokerageTab('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedBrokerageTab === 'all'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                  : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Todas as Corretoras</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                selectedBrokerageTab === 'all' ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {brokers.length}
              </span>
            </button>

            {/* Individual Brokerage Tabs */}
            {brokerages.map(br => {
              const count = brokers.filter(b => b.brokerageId === br.id).length;
              const isSelected = selectedBrokerageTab === br.id;
              return (
                <button
                  key={br.id}
                  onClick={() => setSelectedBrokerageTab(br.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
                      : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Building2 className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400 dark:text-amber-600' : 'text-slate-400'}`} />
                  <span>{br.name}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isSelected 
                      ? 'bg-slate-800 dark:bg-slate-200 text-slate-200 dark:text-slate-800' 
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}

            <button
              onClick={() => setIsCreateBrokerageOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-dashed border-amber-300 dark:border-amber-700 transition-all whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Corretora</span>
            </button>
          </div>
        </div>
      )}

      {/* SUB-ADMIN or SPECIFIC CORRETORA HIGHLIGHT CARD */}
      {selectedBrokerage && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center shadow-md shadow-cyan-600/20 shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {selectedBrokerage.name}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                  {activeBrokersPool.length} corretores
                </span>
              </div>
              
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                <span>Sub-Admin Gestor:</span>
                {currentBrokerageSubAdmin ? (
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                    {currentBrokerageSubAdmin.name} ({currentBrokerageSubAdmin.email})
                  </span>
                ) : selectedBrokerage.subAdminName ? (
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {selectedBrokerage.subAdminName}
                  </span>
                ) : (
                  <span className="italic text-amber-600 dark:text-amber-400">
                    Nenhum gestor Sub-Admin designado
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsCreateBrokerOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-50 dark:bg-cyan-950/60 hover:bg-cyan-100 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Adicionar nesta Corretora</span>
            </button>
          </div>
        </div>
      )}

      {/* 4 Consolidated Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Corretores na Equipe / Carteira */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {isSub ? 'Corretores na Equipe' : 'Total de Corretores'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {metrics.totalBrokers}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isSub ? 'Profissionais credenciados na sua corretora' : 'Contas cadastradas no sistema'}
            </div>
          </div>
        </div>

        {/* Card 2: Corretores Ativos */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Corretores Ativos
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {metrics.activeBrokers} de {metrics.totalBrokers}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {metrics.totalBrokers > 0 
                ? `${Math.round((metrics.activeBrokers / metrics.totalBrokers) * 100)}% de disponibilidade ativa`
                : 'Nenhum corretor cadastrado'
              }
            </div>
          </div>
        </div>

        {/* Card 3: Total de Clientes / Contratos Geridos */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {isSub ? 'Contratos da Equipe' : 'Contratos Globais'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {metrics.totalContracts}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isSub ? 'Clientes geridos por corretores da sua equipe' : 'Clientes ativos em todas as carteiras'}
            </div>
          </div>
        </div>

        {/* Card 4: Volume em Prêmios da Carteira */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {isSub ? 'Volume em Prêmios (Equipe)' : 'Volume Total em Prêmios'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight truncate">
              {formatCurrency(metrics.totalVolumePremiums)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isSub ? 'Prêmios totais geridos pela sua corretora' : 'Prêmios sob gestão na plataforma'}
            </div>
          </div>
        </div>

      </div>

      {/* Brokers Management Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        
        {/* Table Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="admin-search-brokers"
              type="text"
              placeholder={isSub ? "Buscar profissional na sua equipe..." : "Buscar por nome, e-mail, SUSEP ou corretora..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'all' 
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Todos ({activeBrokersPool.length})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'active' 
                    ? 'bg-emerald-500 text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Ativos ({metrics.activeBrokers})
              </button>
              <button
                onClick={() => setStatusFilter('inactive')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'inactive' 
                    ? 'bg-rose-500 text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Inativos ({activeBrokersPool.length - metrics.activeBrokers})
              </button>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4 sm:px-6">Profissional / Identificação</th>
                <th className="py-3 px-4">Perfil & Permissão</th>
                <th className="py-3 px-4">Corretora & SUSEP</th>
                <th className="py-3 px-4 text-center">Contratos / Carteira</th>
                <th className="py-3 px-4 text-right">Vol. em Prêmios</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 sm:px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredBrokers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Nenhum profissional encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredBrokers.map((broker) => {
                  const isBrokerMaster = broker.id === ADMIN_USER_ID || broker.role === 'admin';
                  const isBrokerSubAdmin = broker.role === 'subadmin';
                  const isActive = broker.status === 'active';
                  const isSelf = currentUser?.id === broker.id;

                  return (
                    <tr 
                      key={broker.id}
                      className={`transition-colors ${
                        isBrokerMaster 
                          ? 'bg-amber-50/40 dark:bg-amber-950/20 border-l-4 border-l-amber-500 hover:bg-amber-50/70 dark:hover:bg-amber-950/30' 
                          : isBrokerSubAdmin
                            ? 'bg-purple-50/30 dark:bg-purple-950/20 border-l-4 border-l-purple-500 hover:bg-purple-50/60 dark:hover:bg-purple-950/30'
                            : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Corretor & Email */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isBrokerMaster 
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700' 
                              : isBrokerSubAdmin
                                ? 'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                                : 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800'
                          }`}>
                            {isBrokerMaster ? (
                              <Crown className="w-4 h-4" />
                            ) : isBrokerSubAdmin ? (
                              <ShieldCheck className="w-4 h-4" />
                            ) : (
                              (broker.firstName?.[0] || broker.name[0] || 'C')
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{broker.name}</span>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                                  Você
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{broker.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Perfil & Permissão */}
                      <td className="py-3.5 px-4">
                        {isBrokerMaster ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            <Crown className="w-3 h-3 text-amber-500" />
                            Admin Master
                          </span>
                        ) : isBrokerSubAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                            <ShieldCheck className="w-3 h-3 text-purple-500" />
                            Sub-Admin (Gestor)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            <Briefcase className="w-3 h-3 text-slate-400" />
                            Corretor Padrão
                          </span>
                        )}
                      </td>

                      {/* Corretora & SUSEP */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[180px]">{broker.brokerageName || 'Corretora Autônoma'}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {broker.susep ? `SUSEP ${broker.susep}` : 'Sem SUSEP'}
                        </div>
                      </td>

                      {/* Contratos Geridos */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {broker.clientCount} clientes
                        </span>
                      </td>

                      {/* Volume em Prêmios */}
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-800 dark:text-slate-200">
                        {formatCurrency(broker.totalPremiums)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          isActive 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                            : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          <span>{isActive ? 'Ativa' : 'Bloqueada'}</span>
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Editar */}
                          <button
                            onClick={() => handleOpenEdit(broker)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/60 transition-colors cursor-pointer"
                            title="Editar dados"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Reset Senha */}
                          <button
                            onClick={() => handleOpenReset(broker)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/60 transition-colors cursor-pointer"
                            title="Redefinir senha de acesso"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Bloquear / Ativar */}
                          {isBrokerMaster ? (
                            <span 
                              className="p-1.5 text-slate-300 dark:text-slate-600 cursor-not-allowed"
                              title="Conta Master protegida contra bloqueio"
                            >
                              <Lock className="w-4 h-4 opacity-40" />
                            </span>
                          ) : isSub && isSelf ? (
                            <span 
                              className="p-1.5 text-slate-300 dark:text-slate-600 cursor-not-allowed"
                              title="Você não pode bloquear a sua própria conta de gestor"
                            >
                              <Lock className="w-4 h-4 opacity-40" />
                            </span>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(broker)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isActive 
                                  ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60' 
                                  : 'text-rose-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60'
                              }`}
                              title={isActive ? 'Bloquear acesso do corretor' : 'Reativar conta do corretor'}
                            >
                              {isActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Exibindo <strong>{filteredBrokers.length}</strong> de <strong>{activeBrokersPool.length}</strong> contas {isSub ? 'na sua corretora' : 'no filtro selecionado'}
          </div>

          {/* Master Admin Identification Footnote */}
          {isMaster && (
            <div className="flex items-center gap-2">
              <span className="text-[11px]">ID Master:</span>
              <button
                type="button"
                onClick={() => handleCopyAdminId(ADMIN_USER_ID)}
                className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copiar ID Master"
              >
                <span className="text-cyan-700 dark:text-cyan-400 font-semibold">{ADMIN_USER_ID}</span>
                {copiedId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Modals */}
      <CreateBrokerModal
        isOpen={isCreateBrokerOpen}
        onClose={() => setIsCreateBrokerOpen(false)}
        onBrokerCreated={handleBrokerCreated}
        currentUser={currentUser}
        defaultBrokerageId={selectedBrokerageTab !== 'all' ? selectedBrokerageTab : undefined}
      />

      <CreateBrokerageModal
        isOpen={isCreateBrokerageOpen}
        onClose={() => setIsCreateBrokerageOpen(false)}
        onBrokerageCreated={handleBrokerageCreated}
      />

      <EditBrokerModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        broker={brokerToEdit}
        onSave={handleSaveEdit}
        currentUser={currentUser}
      />

      <ResetPasswordModal
        isOpen={isResetPassOpen}
        onClose={() => setIsResetPassOpen(false)}
        broker={brokerForReset}
      />

    </div>
  );
};

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
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { BrokerAccount, Brokerage, User, UserRole } from '../types';
import { 
  loadAllBrokers, 
  loadAllBrokerages, 
  toggleBrokerStatus, 
  updateBrokerAccount, 
  getAdminMetrics,
  getBrokerageIdFromName,
  saveAllBrokers
} from '../services/adminService';
import { 
  fetchFirestoreUsersByBrokerage, 
  isFirebaseConfigured 
} from '../services/firebase';
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

  // Master Admin view mode toggle: 'brokerages' (HUB de Corretoras) or 'users' (Visão Geral de Usuários)
  const [masterViewMode, setMasterViewMode] = useState<'brokerages' | 'users'>('brokerages');

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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Reload data
  const refreshData = async () => {
    const localBrokers = loadAllBrokers();
    setBrokers(localBrokers);
    setBrokerages(loadAllBrokerages());

    if (isFirebaseConfigured()) {
      try {
        const firestoreUsers = await fetchFirestoreUsersByBrokerage(currentUser);
        if (firestoreUsers && firestoreUsers.length > 0) {
          const merged = [...localBrokers];
          firestoreUsers.forEach(fUser => {
            const index = merged.findIndex(b => b.id === fUser.id || b.email.toLowerCase() === fUser.email.toLowerCase());
            const converted: BrokerAccount = {
              id: fUser.id,
              name: fUser.name,
              firstName: fUser.firstName,
              lastName: fUser.lastName,
              email: fUser.email,
              brokerageName: fUser.brokerageName,
              brokerageId: fUser.brokerageId || fUser.corretora_id || 'corretora-padrao',
              susep: fUser.susep || '',
              role: fUser.role || 'broker',
              isAdmin: fUser.role === 'admin' || fUser.role === 'subadmin',
              status: fUser.status === 'inactive' ? 'inactive' : 'active',
              clientCount: fUser.clientCount || 0,
              totalPremiums: fUser.totalPremiums || 0,
              createdAt: fUser.createdAt || new Date().toISOString()
            };
            if (index >= 0) {
              merged[index] = { ...merged[index], ...converted };
            } else {
              merged.push(converted);
            }
          });
          setBrokers(merged);
          saveAllBrokers(merged);
        }
      } catch (err) {
        console.warn('Could not sync brokers from Firestore:', err);
      }
    }
  };

  useEffect(() => {
    refreshData();
  }, [currentUser]);

  // Identify the Sub-Admin's brokerage
  const subAdminBrokerageId = useMemo(() => {
    if (!isSub || !currentUser) return '';
    return currentUser.corretora_id || currentUser.brokerageId || getBrokerageIdFromName(currentUser.brokerageName);
  }, [isSub, currentUser]);

  // Determine the list of brokers to display based on permissions and active tab
  const activeBrokersPool = useMemo(() => {
    if (isSub) {
      const userCorretora = currentUser?.corretora_id || currentUser?.brokerageId;
      return brokers.filter(b => {
        if (userCorretora && (b.brokerageId === userCorretora || (b as any).corretora_id === userCorretora)) return true;
        if (currentUser?.brokerageName && b.brokerageName?.toLowerCase() === currentUser.brokerageName.toLowerCase()) return true;
        return false;
      });
    }

    if (selectedBrokerageTab === 'all') {
      return brokers;
    }
    return brokers.filter(b => b.brokerageId === selectedBrokerageTab);
  }, [brokers, isSub, currentUser, selectedBrokerageTab]);

  // Consolidated metrics for the currently viewed pool
  const metrics = useMemo(() => {
    return getAdminMetrics(activeBrokersPool);
  }, [activeBrokersPool]);

  // Global metrics across all brokerages
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

  // Sub-admin user associated with the selected brokerage
  const currentBrokerageSubAdmin = useMemo(() => {
    if (!selectedBrokerage) return null;
    return brokers.find(b => 
      b.role === 'subadmin' && 
      (b.brokerageId === selectedBrokerage.id || b.brokerageName?.toLowerCase() === selectedBrokerage.name.toLowerCase())
    ) || null;
  }, [selectedBrokerage, brokers]);

  // Handlers
  const handleToggleStatus = (broker: BrokerAccount) => {
    try {
      const nextStatus = broker.status === 'active' ? 'inactive' : 'active';
      const updated = toggleBrokerStatus(broker.id, currentUser);
      if (updated) {
        setBrokers(loadAllBrokers());
        showToast(`Conta de ${broker.name} ${nextStatus === 'active' ? 'ativada' : 'bloqueada'} com sucesso.`);
      }
    } catch (err) {
      console.error('Error toggling broker status:', err);
      showToast('Erro ao atualizar status da conta.');
    }
  };

  const handleOpenEdit = (broker: BrokerAccount) => {
    setBrokerToEdit(broker);
    setIsEditOpen(true);
  };

  const handleSaveEdit = (brokerId: string, updatedData: Partial<BrokerAccount>) => {
    try {
      updateBrokerAccount(brokerId, updatedData, currentUser);
      setBrokers(loadAllBrokers());
      setIsEditOpen(false);
      setBrokerToEdit(null);
      showToast(`Dados atualizados com sucesso.`);
    } catch (err) {
      console.error('Error saving broker edit:', err);
      showToast('Erro ao salvar alterações do usuário.');
    }
  };

  const handleOpenReset = (broker: BrokerAccount) => {
    setBrokerForReset(broker);
    setIsResetPassOpen(true);
  };

  const handleBrokerCreated = (newBroker: BrokerAccount) => {
    setBrokers(loadAllBrokers());
    showToast(`Profissional ${newBroker.name} cadastrado com sucesso!`);
  };

  const handleBrokerageCreated = (newBr: Brokerage) => {
    setBrokerages(loadAllBrokerages());
    showToast(`Corretora "${newBr.name}" cadastrada com sucesso!`);
    setSelectedBrokerageTab(newBr.id);
    setMasterViewMode('users');
  };

  const handleCopyAdminId = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-900/90 p-6 sm:p-8 text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/5 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-slate-600/5 dark:bg-slate-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white dark:bg-indigo-950/80 dark:text-indigo-200 border border-slate-700 dark:border-indigo-800/60 text-xs font-semibold">
              {isMaster ? (
                <>
                  <Crown className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Administração Master do Sistema</span>
                </>
              ) : (
                <>
                  <Building2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Painel de Gestão da Corretora</span>
                </>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              {isMaster ? (
                <span>Painel de Gestão Multi-Corretoras</span>
              ) : (
                <span>Gestão da Equipe — {currentUser?.brokerageName || 'Minha Corretora'}</span>
              )}
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
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
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-95 shadow-sm"
              title="Atualizar dados"
            >
              <RefreshCw className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Atualizar</span>
            </button>

            {isMaster && (
              <button
                id="btn-admin-new-brokerage"
                onClick={() => setIsCreateBrokerageOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-indigo-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-95 shadow-sm"
              >
                <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>+ Nova Corretora</span>
              </button>
            )}

            <button
              id="btn-admin-new-broker"
              onClick={() => setIsCreateBrokerOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-all cursor-pointer active:scale-95 shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSub ? 'Cadastrar Corretor na Equipe' : 'Cadastrar Utilizador'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* MASTER ADMIN: View Mode Switcher (Tabs / Toggle) */}
      {isMaster && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-1.5 w-full sm:w-auto bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
            <button
              onClick={() => setMasterViewMode('brokerages')}
              className={`flex-1 sm:flex-initial flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                masterViewMode === 'brokerages'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Visão por Corretoras</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                masterViewMode === 'brokerages' ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {brokerages.length}
              </span>
            </button>

            <button
              onClick={() => setMasterViewMode('users')}
              className={`flex-1 sm:flex-initial flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                masterViewMode === 'users'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Visão Geral de Usuários</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                masterViewMode === 'users' ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {brokers.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
              Modo ativo: <strong className="text-slate-800 dark:text-slate-200">{masterViewMode === 'brokerages' ? 'HUB de Corretoras' : 'Tabela Consolidada'}</strong>
            </span>
          </div>
        </div>
      )}

      {/* REFINED TOP KPI CARDS (Glassmorphism & Clean Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Total de Corretores */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {isSub ? 'Corretores na Equipe' : 'Total de Corretores'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-100 dark:border-cyan-900">
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

        {/* KPI 2: Corretores Ativos */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Corretores Ativos
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900">
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

        {/* KPI 3: Contratos Globais */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {isSub ? 'Contratos da Equipe' : 'Contratos Globais'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900">
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

        {/* KPI 4: Volume em Prêmios */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {isSub ? 'Volume em Prêmios (Equipe)' : 'Volume Total em Prêmios'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-900">
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

      {/* MASTER ADMIN: HUB DE CORRETORAS CADASTRADAS (GRID DE CARDS) */}
      {isMaster && masterViewMode === 'brokerages' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                HUB de Corretoras Cadastradas
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {brokerages.length} empresas integradas no ecossistema
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {brokerages.map(br => {
              const brBrokers = brokers.filter(b => b.brokerageId === br.id || b.brokerageName?.toLowerCase() === br.name.toLowerCase());
              const brMetrics = getAdminMetrics(brBrokers);
              const subAdmin = brokers.find(b => b.role === 'subadmin' && (b.brokerageId === br.id || b.brokerageName?.toLowerCase() === br.name.toLowerCase())) || {
                name: br.subAdminName || 'Não atribuído',
                email: br.subAdminEmail || 'N/A'
              };

              return (
                <div 
                  key={br.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5"
                >
                  {/* Card Top */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/50 shadow-xs">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Ativa
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug">
                        {br.name}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                        SUSEP / ID: {br.id}
                      </p>
                    </div>

                    {/* Sub-Admin Manager Indicator */}
                    <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                        Gestor Responsável (Sub-Admin)
                      </span>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 truncate">
                        <Crown className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">{subAdmin.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {subAdmin.email || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Quick Metrics Footer */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 dark:border-slate-800 text-center">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Corretores</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white">{brBrokers.length}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contratos</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white">{brMetrics.totalContracts}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prêmios</span>
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 truncate block mt-0.5" title={formatCurrency(brMetrics.totalVolumePremiums)}>
                        {formatCurrency(brMetrics.totalVolumePremiums)}
                      </span>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        setSelectedBrokerageTab(br.id);
                        setMasterViewMode('users');
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-sm transition-all cursor-pointer"
                    >
                      <span>Ver Detalhes & Membros</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* USERS MANAGEMENT SECTION (Shown when masterViewMode === 'users' or for Sub-Admins) */}
      {(!isMaster || masterViewMode === 'users') && (
        <div className="space-y-4">
          
          {/* Brokerage Tab selector for Master Admin in Users View */}
          {isMaster && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
              <button
                onClick={() => setSelectedBrokerageTab('all')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedBrokerageTab === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Todas as Corretoras</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  selectedBrokerageTab === 'all' ? 'bg-indigo-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}>
                  {brokers.length}
                </span>
              </button>

              {brokerages.map(br => {
                const count = brokers.filter(b => b.brokerageId === br.id).length;
                const isSelected = selectedBrokerageTab === br.id;
                return (
                  <button
                    key={br.id}
                    onClick={() => setSelectedBrokerageTab(br.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Building2 className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`} />
                    <span>{br.name}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isSelected 
                        ? 'bg-indigo-700 text-white' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Brokers Management Table Card */}
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
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* Nome e Email */}
                          <td className="py-3.5 px-4 sm:px-6">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                isBrokerMaster 
                                  ? 'bg-amber-500 text-white shadow-sm' 
                                  : isBrokerSubAdmin 
                                    ? 'bg-blue-600 text-white shadow-sm' 
                                    : 'bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300'
                              }`}>
                                {broker.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span>{broker.name}</span>
                                  {isSelf && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300">
                                      Você
                                    </span>
                                  )}
                                </div>
                                <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                                  {broker.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Perfil */}
                          <td className="py-3.5 px-4">
                            {isBrokerMaster ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                <Crown className="w-3 h-3 text-amber-500" />
                                <span>Master Admin</span>
                              </span>
                            ) : isBrokerSubAdmin ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                <Building2 className="w-3 h-3 text-blue-500" />
                                <span>Sub-Admin Gestor</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                <Users className="w-3 h-3 text-slate-400" />
                                <span>Corretor</span>
                              </span>
                            )}
                          </td>

                          {/* Corretora e SUSEP */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {broker.brokerageName || 'Corretora Padrão'}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                              SUSEP: {broker.susep || 'Não informada'}
                            </div>
                          </td>

                          {/* Contratos */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-bold text-slate-900 dark:text-white px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                              {broker.clientCount || 0}
                            </span>
                          </td>

                          {/* Volume em Prêmios */}
                          <td className="py-3.5 px-4 text-right">
                            <span className="font-bold text-cyan-600 dark:text-cyan-400">
                              {formatCurrency(broker.totalPremiums || 0)}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isActive 
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            }`}>
                              {isActive ? 'Ativo' : 'Bloqueado'}
                            </span>
                          </td>

                          {/* Ações */}
                          <td className="py-3.5 px-4 sm:px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEdit(broker)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/60 transition-colors cursor-pointer"
                                title="Editar dados"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleOpenReset(broker)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/60 transition-colors cursor-pointer"
                                title="Redefinir senha de acesso"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>

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
        </div>
      )}

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

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 dark:bg-slate-800 text-white shadow-xl border border-slate-700/80 animate-in slide-in-from-bottom-4 duration-200 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
};

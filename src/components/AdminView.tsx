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
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { BrokerAccount, Brokerage, User, UserRole } from '../types';
import { 
  loadAllBrokers, 
  loadAllBrokerages, 
  toggleBrokerStatus, 
  updateBrokerAccount, 
  getAdminMetrics,
  getBrokerageIdFromName,
  saveAllBrokers,
  saveAllBrokerages,
  deleteBrokerAccount,
  deleteBrokerage
} from '../services/adminService';
import { 
  fetchFirestoreUsersByBrokerage, 
  fetchFirestoreBrokerages,
  subscribeToFirestoreUsers,
  isFirebaseConfigured,
  saveUserProfileToFirestore,
  deleteUserFromFirestore,
  deleteCorretoraFromFirestore,
  deleteBrokerageFromFirestore,
  fetchFirestoreInsurers,
  saveInsurersToFirestore
} from '../services/firebase';
import { 
  loadRegisteredInsurers, 
  addRegisteredInsurer, 
  deleteRegisteredInsurer, 
  resetRegisteredInsurers, 
  saveRegisteredInsurers, 
  DEFAULT_MAJOR_INSURERS 
} from '../services/storage';
import { formatCurrency, ADMIN_USER_ID, isMasterAdmin } from '../utils/insuranceUtils';
import { CreateBrokerModal } from './CreateBrokerModal';
import { EditBrokerModal } from './EditBrokerModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { CreateBrokerageModal } from './CreateBrokerageModal';
import { ConfirmationModal } from './ConfirmationModal';

interface AdminViewProps {
  currentUser: User | null;
  onOpenNewBrokerModal?: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ currentUser }) => {
  const isMaster = isMasterAdmin(currentUser);

  // Raw data from repository
  const [brokers, setBrokers] = useState<BrokerAccount[]>(() => loadAllBrokers());
  const [brokerages, setBrokerages] = useState<Brokerage[]>(() => loadAllBrokerages());

  // Master Admin view mode toggle: 'brokerages' (HUB de Corretoras), 'users' (Visão Geral de Usuários), or 'insurers' (Gerenciamento de Seguradoras)
  const [masterViewMode, setMasterViewMode] = useState<'brokerages' | 'users' | 'insurers'>('brokerages');

  // Master Admin tab state: 'all' or a specific brokerage id
  const [selectedBrokerageTab, setSelectedBrokerageTab] = useState<string>('all');

  // Insurers Management State
  const [insurers, setInsurers] = useState<string[]>(() => loadRegisteredInsurers());
  const [newInsurerName, setNewInsurerName] = useState('');
  const [insurerSearch, setInsurerSearch] = useState('');
  const [insurerToDelete, setInsurerToDelete] = useState<string | null>(null);
  const [isAddingInsurer, setIsAddingInsurer] = useState(false);

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
  const [userToDelete, setUserToDelete] = useState<BrokerAccount | null>(null);
  const [corretoraToDelete, setCorretoraToDelete] = useState<Brokerage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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
    const localBrokerages = loadAllBrokerages();
    const localInsurers = loadRegisteredInsurers();
    setBrokers(localBrokers);
    setBrokerages(localBrokerages);
    setInsurers(localInsurers);

    if (isFirebaseConfigured()) {
      try {
        console.log('[AdminView] Sincronizando dados com o Firestore...');
        const [firestoreUsers, firestoreBrokerages, firestoreInsurers] = await Promise.all([
          fetchFirestoreUsersByBrokerage(currentUser),
          fetchFirestoreBrokerages(),
          fetchFirestoreInsurers()
        ]);

        if (firestoreInsurers && firestoreInsurers.length > 0) {
          setInsurers(firestoreInsurers);
          saveRegisteredInsurers(firestoreInsurers);
        }

        if (firestoreBrokerages && firestoreBrokerages.length > 0) {
          const mergedBr = [...localBrokerages];
          firestoreBrokerages.forEach(fBr => {
            const idx = mergedBr.findIndex(b => b.id === fBr.id || b.name.toLowerCase() === fBr.name.toLowerCase());
            if (idx >= 0) {
              mergedBr[idx] = { ...mergedBr[idx], ...fBr };
            } else {
              mergedBr.push(fBr);
            }
          });
          setBrokerages(mergedBr);
          saveAllBrokerages(mergedBr);
        }

        if (firestoreUsers && firestoreUsers.length > 0) {
          const merged = [...localBrokers];
          firestoreUsers.forEach(fUser => {
            const index = merged.findIndex(b => b.id === fUser.id || (b as any).uid === fUser.id || b.email.toLowerCase() === fUser.email.toLowerCase());
            const converted: BrokerAccount = {
              id: fUser.id,
              name: fUser.name,
              firstName: fUser.firstName,
              lastName: fUser.lastName,
              email: fUser.email,
              brokerageName: fUser.brokerageName,
              brokerageId: fUser.brokerageId || fUser.corretora_id || 'corretora-padrao',
              corretora_id: fUser.corretora_id || fUser.brokerageId || 'corretora-padrao',
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
        console.warn('[AdminView] Aviso ao sincronizar com Firestore:', err);
      }
    }
  };

  useEffect(() => {
    refreshData();

    if (isFirebaseConfigured() && currentUser) {
      const unsubscribe = subscribeToFirestoreUsers(currentUser, (firestoreUsers) => {
        console.log('[AdminView] Atualização em tempo real recebida do Firestore:', firestoreUsers.length, 'usuários');
        const currentLocal = loadAllBrokers();
        
        const converted: BrokerAccount[] = firestoreUsers.map(fUser => ({
          id: fUser.id,
          name: fUser.name,
          firstName: fUser.firstName,
          lastName: fUser.lastName,
          email: fUser.email,
          brokerageName: fUser.brokerageName,
          brokerageId: fUser.brokerageId || fUser.corretora_id || 'corretora-padrao',
          corretora_id: fUser.corretora_id || fUser.brokerageId || 'corretora-padrao',
          susep: fUser.susep || '',
          role: fUser.role || 'broker',
          isAdmin: fUser.role === 'admin' || fUser.role === 'subadmin',
          status: fUser.status === 'inactive' ? 'inactive' : 'active',
          clientCount: fUser.clientCount || 0,
          totalPremiums: fUser.totalPremiums || 0,
          createdAt: fUser.createdAt || new Date().toISOString()
        }));

        // Combine with local brokers that might not be in Firestore yet (e.g. Master Admin default)
        const combined = [...converted];
        currentLocal.forEach(lb => {
          if (!combined.some(c => c.id === lb.id || c.email.toLowerCase() === lb.email.toLowerCase())) {
            combined.push(lb);
          }
        });

        setBrokers(combined);
        saveAllBrokers(combined);
      });

      return () => {
        unsubscribe();
      };
    }
  }, [currentUser]);

  // Determine the list of brokers to display based on selected brokerage tab
  const activeBrokersPool = useMemo(() => {
    if (selectedBrokerageTab === 'all') {
      return brokers;
    }
    return brokers.filter(b => b.brokerageId === selectedBrokerageTab || b.corretora_id === selectedBrokerageTab);
  }, [brokers, selectedBrokerageTab]);

  // Consolidated metrics for the currently viewed pool
  const metrics = useMemo(() => {
    return getAdminMetrics(activeBrokersPool);
  }, [activeBrokersPool]);

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

  // Filtered insurers for Seguradoras Management
  const filteredInsurers = useMemo(() => {
    if (!insurerSearch.trim()) return insurers;
    return insurers.filter(i => i.toLowerCase().includes(insurerSearch.trim().toLowerCase()));
  }, [insurers, insurerSearch]);

  // Seguradoras Handlers
  const handleAddInsurer = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newInsurerName.trim();
    if (!trimmed) return;

    if (insurers.some(i => i.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`A seguradora "${trimmed}" já está cadastrada na lista.`);
      return;
    }

    try {
      setIsAddingInsurer(true);
      const updated = addRegisteredInsurer(trimmed);
      setInsurers(updated);
      setNewInsurerName('');
      if (isFirebaseConfigured()) {
        await saveInsurersToFirestore(updated);
      }
      showToast(`Seguradora "${trimmed}" adicionada com sucesso!`);
    } catch (err) {
      console.error('Error adding insurer:', err);
      showToast('Erro ao cadastrar seguradora.');
    } finally {
      setIsAddingInsurer(false);
    }
  };

  const handleRequestDeleteInsurer = (e: React.MouseEvent, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    setInsurerToDelete(name);
  };

  const handleConfirmDeleteInsurer = async () => {
    if (!insurerToDelete) return;
    const target = insurerToDelete;

    try {
      setIsDeleting(true);
      const updated = deleteRegisteredInsurer(target);
      setInsurers(updated);
      if (isFirebaseConfigured()) {
        await saveInsurersToFirestore(updated);
      }
      showToast(`Seguradora "${target}" removida da lista.`);
    } catch (err) {
      console.error('Error deleting insurer:', err);
      showToast('Erro ao remover seguradora.');
    } finally {
      setIsDeleting(false);
      setInsurerToDelete(null);
    }
  };

  const handleResetDefaultInsurers = async () => {
    try {
      setIsDeleting(true);
      const defaults = resetRegisteredInsurers();
      setInsurers(defaults);
      if (isFirebaseConfigured()) {
        await saveInsurersToFirestore(defaults);
      }
      showToast('Lista padrão de seguradoras restaurada com sucesso.');
    } catch (err) {
      console.error('Error resetting insurers:', err);
      showToast('Erro ao restaurar lista de seguradoras.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handlers
  const handleToggleStatus = (e: React.MouseEvent, broker: BrokerAccount) => {
    e.preventDefault();
    e.stopPropagation();
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

  const handleRequestDeleteUser = (e: React.MouseEvent, broker: BrokerAccount) => {
    e.preventDefault();
    e.stopPropagation();

    if (!broker?.id) {
      showToast('Erro: ID do usuário inválido ou não informado.');
      return;
    }

    if (isMasterAdmin(broker) || broker.id === ADMIN_USER_ID) {
      showToast('Atenção: Não é permitido excluir a conta Admin Master principal.');
      return;
    }

    if (currentUser?.id === broker.id || (currentUser as any)?.uid === broker.id) {
      showToast('Atenção: Não é permitido excluir a sua própria conta ativa em uso.');
      return;
    }

    setUserToDelete(broker);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    const { id: userId, name: userName } = userToDelete;

    try {
      setIsDeleting(true);
      console.log(`[AdminView] [Exclusão] Iniciando exclusão do usuário: ID=${userId}, Nome=${userName}`);

      // 1. Atualização reativa imediata no React para remoção instantânea na tela
      setBrokers(prev => prev.filter(b => b.id !== userId && (b as any).uid !== userId));

      // 2. Remoção do LocalStorage
      deleteBrokerAccount(userId);

      // 3. Remoção do Firestore na coleção 'users'
      if (isFirebaseConfigured()) {
        console.log(`[AdminView] [Exclusão] Removendo documento do usuário ${userId} no Firestore (users)...`);
        await deleteUserFromFirestore(userId);
        if ((userToDelete as any).uid && (userToDelete as any).uid !== userId) {
          await deleteUserFromFirestore((userToDelete as any).uid);
        }
        if (userToDelete.email) {
          await deleteUserFromFirestore(userToDelete.email);
        }
        console.log(`[AdminView] [Exclusão] Usuário ${userId} removido com sucesso do Firestore.`);
      }

      showToast(`Usuário "${userName}" excluído com sucesso.`);
    } catch (err: any) {
      console.error('[AdminView] [Exclusão] Falha detalhada ao excluir usuário:', err);
      showToast(`Erro ao excluir o usuário "${userName}": ${err?.message || 'Falha de conexão.'}`);
      // Em caso de erro, recarrega os dados locais
      setBrokers(loadAllBrokers());
    } finally {
      setIsDeleting(false);
      setUserToDelete(null);
    }
  };

  const handleRequestDeleteCorretora = (e: React.MouseEvent, br: Brokerage) => {
    e.preventDefault();
    e.stopPropagation();

    if (!br?.id) {
      showToast('Erro: ID da corretora inválido ou não informado.');
      return;
    }

    setCorretoraToDelete(br);
  };

  const handleConfirmDeleteCorretora = async () => {
    if (!corretoraToDelete) return;
    const { id: corretoraId, name } = corretoraToDelete;

    try {
      setIsDeleting(true);
      console.log(`[AdminView] [Exclusão] Iniciando exclusão da corretora: ID=${corretoraId}, Nome=${name}`);

      // 1. Encontrar corretores associados para exclusão no Firestore também
      const allBrokers = loadAllBrokers();
      const brokersToDelete = allBrokers.filter(b => {
        if (b.id === ADMIN_USER_ID) return false;
        const matchesId = b.brokerageId === corretoraId || (b as any).corretora_id === corretoraId;
        const matchesName = name && b.brokerageName && b.brokerageName.toLowerCase() === name.toLowerCase();
        return matchesId || matchesName;
      });

      // 2. Atualização reativa imediata no React para remoção instantânea na tela
      setBrokerages(prev => prev.filter(b => b.id !== corretoraId));
      if (selectedBrokerageTab === corretoraId) {
        setSelectedBrokerageTab('all');
      }

      // 3. Remoção do LocalStorage (Corretora e Corretores vinculados)
      deleteBrokerage(corretoraId, name);
      setBrokers(loadAllBrokers());

      // 4. Remoção do Firestore (coleções 'corretoras', 'brokerages' e usuários/corretores) com timeout de segurança
      if (isFirebaseConfigured()) {
        console.log(`[AdminView] [Exclusão] Removendo documento da corretora ${corretoraId} e ${brokersToDelete.length} corretor(es) associados no Firestore...`);
        
        const promises: Promise<any>[] = [
          deleteCorretoraFromFirestore(corretoraId)
        ];

        for (const broker of brokersToDelete) {
          if (broker.id) {
            promises.push(deleteUserFromFirestore(broker.id));
          }
          if ((broker as any).uid && (broker as any).uid !== broker.id) {
            promises.push(deleteUserFromFirestore((broker as any).uid));
          }
        }

        const deletionPromise = Promise.allSettled(promises);
        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 4000));
        await Promise.race([deletionPromise, timeoutPromise]);
        console.log(`[AdminView] [Exclusão] Corretora e corretores associados processados no Firestore.`);
      }

      showToast(`Corretora "${name}" e ${brokersToDelete.length} corretor(es) vinculados excluídos com sucesso.`);
    } catch (err: any) {
      console.error('[AdminView] [Exclusão] Falha detalhada ao excluir corretora:', err);
      showToast(`Erro ao excluir a corretora "${name}": ${err?.message || 'Falha de conexão.'}`);
      setBrokerages(loadAllBrokerages());
      setBrokers(loadAllBrokers());
    } finally {
      setIsDeleting(false);
      setCorretoraToDelete(null);
    }
  };

  const handleOpenEdit = (e: React.MouseEvent, broker: BrokerAccount) => {
    e.preventDefault();
    e.stopPropagation();
    setBrokerToEdit(broker);
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (brokerId: string, updatedData: Partial<BrokerAccount>) => {
    try {
      updateBrokerAccount(brokerId, updatedData, currentUser);

      if (isFirebaseConfigured() && brokerId) {
        try {
          await saveUserProfileToFirestore(brokerId, updatedData as any);
        } catch (fbErr: any) {
          console.error('AdminView Firebase save error:', fbErr);
        }
      }

      setBrokers(loadAllBrokers());
      setIsEditOpen(false);
      setBrokerToEdit(null);
      showToast('Dados e permissões atualizados com sucesso!');
    } catch (err: any) {
      console.error('AdminView error saving broker edit:', err);
      showToast(`Erro ao salvar alterações: ${err?.message || 'Erro desconhecido'}`);
    }
  };

  const handleOpenReset = (e: React.MouseEvent, broker: BrokerAccount) => {
    e.preventDefault();
    e.stopPropagation();
    setBrokerForReset(broker);
    setIsResetPassOpen(true);
  };

  const handleBrokerCreated = (newBroker: BrokerAccount) => {
    setBrokers(loadAllBrokers());
    showToast(`Usuário ${newBroker.name} cadastrado com sucesso!`);
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
              <Crown className="w-3.5 h-3.5 text-indigo-400" />
              <span>Administração Master do Sistema</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <span>Painel de Gestão Multi-Corretoras</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Controle global de corretoras, gerenciamento completo de usuários, senhas, exclusão e adição de corretores em todo o ecossistema.
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

            <button
              id="btn-admin-new-brokerage"
              onClick={() => setIsCreateBrokerageOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-indigo-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-95 shadow-sm"
            >
              <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>+ Nova Corretora</span>
            </button>

            <button
              id="btn-admin-new-broker"
              onClick={() => setIsCreateBrokerOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
              title="Cadastrar novo corretor no sistema"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Cadastrar Novo Corretor</span>
            </button>
          </div>
        </div>
      </div>

      {/* MASTER ADMIN: View Mode Switcher (HUB / Users Table) */}
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

          <button
            onClick={() => setMasterViewMode('insurers')}
            className={`flex-1 sm:flex-initial flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              masterViewMode === 'insurers'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Lista de Seguradoras</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              masterViewMode === 'insurers' ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {insurers.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
            Modo ativo: <strong className="text-slate-800 dark:text-slate-200">{masterViewMode === 'brokerages' ? 'HUB de Corretoras' : masterViewMode === 'users' ? 'Tabela Consolidada' : 'Gestão de Seguradoras'}</strong>
          </span>
        </div>
      </div>

      {/* REFINED TOP KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total de Utilizadores</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-100 dark:border-cyan-900">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {metrics.totalBrokers}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Contas cadastradas no sistema
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider">Contas Ativas</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {metrics.activeBrokers} de {metrics.totalBrokers}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {metrics.totalBrokers > 0 ? `${Math.round((metrics.activeBrokers / metrics.totalBrokers) * 100)}% ativos` : '0%'}
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider">Contratos Globais</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {metrics.totalContracts}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Clientes ativos em todas as carteiras
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider">Volume em Prêmios</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-900">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight truncate">
              {formatCurrency(metrics.totalVolumePremiums)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Prêmios sob gestão na plataforma
            </div>
          </div>
        </div>

      </div>

      {/* HUB DE CORRETORAS CADASTRADAS (GRID DE CARDS) */}
      {masterViewMode === 'brokerages' && (
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
              const brBrokers = brokers.filter(b => b.brokerageId === br.id || b.corretora_id === br.id || b.brokerageName?.toLowerCase() === br.name.toLowerCase());
              const brMetrics = getAdminMetrics(brBrokers);

              return (
                <div 
                  key={br.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5"
                >
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
                        ID: {br.id}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 dark:border-slate-800 text-center">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Membros</span>
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

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedBrokerageTab(br.id);
                        setMasterViewMode('users');
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-sm transition-all cursor-pointer"
                    >
                      <span>Ver Membros & Corretores</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedBrokerageTab(br.id);
                        setIsCreateBrokerOpen(true);
                      }}
                      className="px-3 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                      title={`Cadastrar corretor para ${br.name}`}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">+ Corretor</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleRequestDeleteCorretora(e, br)}
                      className="p-2.5 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-900 transition-colors cursor-pointer active:scale-95 flex items-center justify-center"
                      title={`Excluir Corretora ${br.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* USERS MANAGEMENT SECTION */}
      {masterViewMode === 'users' && (
        <div className="space-y-4">
          
          {/* Brokerage Tab selector */}
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
              const count = brokers.filter(b => b.brokerageId === br.id || b.corretora_id === br.id).length;
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

          {/* Active Filtered Corretora Banner with Delete Action */}
          {selectedBrokerageTab !== 'all' && (() => {
            const currentSelectedBr = brokerages.find(b => b.id === selectedBrokerageTab);
            if (!currentSelectedBr) return null;
            const brMembers = brokers.filter(b => b.brokerageId === currentSelectedBr.id || b.corretora_id === currentSelectedBr.id);

            return (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 px-4 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 rounded-xl text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{currentSelectedBr.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300">
                        ID: {currentSelectedBr.id}
                      </span>
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                      {brMembers.length} profissional(is) vinculados a esta corretora
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBrokerageTab(currentSelectedBr.id);
                      setIsCreateBrokerOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
                    title={`Adicionar corretor nesta corretora`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Adicionar Corretor</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleRequestDeleteCorretora(e, currentSelectedBr)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-semibold transition-colors cursor-pointer"
                    title={`Excluir corretora ${currentSelectedBr.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Corretora</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Brokers Table Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="admin-search-brokers"
                  type="text"
                  placeholder="Buscar por nome, e-mail, SUSEP ou corretora..."
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

                <button
                  id="btn-table-new-broker"
                  onClick={() => setIsCreateBrokerOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Novo Corretor</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4 sm:px-6">Profissional / Identificação</th>
                    <th className="py-3 px-4">Perfil & Permissão</th>
                    <th className="py-3 px-4">Corretora & SUSEP</th>
                    <th className="py-3 px-4 text-center">Contratos</th>
                    <th className="py-3 px-4 text-right">Vol. em Prêmios</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 sm:px-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredBrokers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Nenhum utilizador encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredBrokers.map((broker) => {
                      const isBrokerMaster = isMasterAdmin(broker);
                      const isActive = broker.status === 'active';
                      const isSelf = currentUser?.id === broker.id;

                      return (
                        <tr 
                          key={broker.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-4 sm:px-6">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                isBrokerMaster 
                                  ? 'bg-amber-500 text-white shadow-sm' 
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

                          <td className="py-3.5 px-4">
                            {isBrokerMaster ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                <Crown className="w-3 h-3 text-amber-500" />
                                <span>Admin Master</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                <Users className="w-3 h-3 text-slate-400" />
                                <span>Corretor / Padrão</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {broker.brokerageName || 'Corretora Padrão'}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                              SUSEP: {broker.susep || 'Não informada'}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="font-bold text-slate-900 dark:text-white px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                              {broker.clientCount || 0}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <span className="font-bold text-cyan-600 dark:text-cyan-400">
                              {formatCurrency(broker.totalPremiums || 0)}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isActive 
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            }`}>
                              {isActive ? 'Ativo' : 'Bloqueado'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 sm:px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => handleOpenEdit(e, broker)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/60 transition-colors cursor-pointer"
                                title="Editar dados"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleOpenReset(e, broker)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/60 transition-colors cursor-pointer"
                                title="Redefinir senha de acesso"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>

                              {!isBrokerMaster && !isSelf && (
                                <button
                                  type="button"
                                  onClick={(e) => handleRequestDeleteUser(e, broker)}
                                  className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                                  title={`Excluir usuário ${broker.name}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}

                              {isBrokerMaster ? (
                                <span 
                                  className="p-1.5 text-slate-300 dark:text-slate-600 cursor-not-allowed"
                                  title="Conta Master protegida"
                                >
                                  <Lock className="w-4 h-4 opacity-40" />
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleStatus(e, broker)}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    isActive 
                                      ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60' 
                                      : 'text-rose-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60'
                                  }`}
                                  title={isActive ? 'Bloquear acesso' : 'Reativar conta'}
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

            <div className="p-4 bg-slate-50/50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
              <div>
                Exibindo <strong>{filteredBrokers.length}</strong> de <strong>{activeBrokersPool.length}</strong> contas
              </div>

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
            </div>

          </div>
        </div>
      )}

      {/* GESTÃO DE SEGURADORAS CADASTRADAS */}
      {masterViewMode === 'insurers' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Header & Add Insurer Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Gerenciamento de Seguradoras
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Adicione, consulte e remova seguradoras que aparecem no campo de seleção da criação e edição de clientes em toda a plataforma.
                </p>
              </div>

              <button
                type="button"
                onClick={handleResetDefaultInsurers}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer self-start md:self-auto shrink-0 border border-slate-200/60 dark:border-slate-700/60 active:scale-95"
                title="Restaurar a lista original com as principais seguradoras do mercado brasileiro"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Restaurar Seguradoras Principais</span>
              </button>
            </div>

            {/* Form to Add New Insurer */}
            <form onSubmit={handleAddInsurer} className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <input
                  id="input-new-insurer-name"
                  type="text"
                  required
                  placeholder="Ex: Porto Seguro, Allianz, Zurich, Liberty, Sompo..."
                  value={newInsurerName}
                  onChange={(e) => setNewInsurerName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={!newInsurerName.trim() || isAddingInsurer}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Seguradora</span>
              </button>
            </form>
          </div>

          {/* Search & Statistics Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar seguradoras cadastradas..."
                value={insurerSearch}
                onChange={(e) => setInsurerSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>Total cadastradas: <strong className="text-slate-800 dark:text-slate-200">{insurers.length}</strong></span>
              {insurerSearch && (
                <span>• Exibindo: <strong className="text-indigo-600 dark:text-indigo-400">{filteredInsurers.length}</strong></span>
              )}
            </div>
          </div>

          {/* Insurers Cards Grid */}
          {filteredInsurers.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Nenhuma seguradora encontrada
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                {insurerSearch 
                  ? `Não encontramos nenhuma seguradora com o termo "${insurerSearch}".`
                  : 'Nenhuma seguradora cadastrada no momento. Clique no botão "Restaurar Seguradoras Principais" ou adicione novas acima.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {filteredInsurers.map((insurerName, index) => (
                <div
                  key={insurerName}
                  className="group relative flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/60">
                      {insurerName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate" title={insurerName}>
                        {insurerName}
                      </h4>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        Seguradora #{index + 1}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleRequestDeleteInsurer(e, insurerName)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer shrink-0 opacity-70 group-hover:opacity-100"
                    title={`Excluir seguradora "${insurerName}"`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

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

      {/* Confirmation Modal for User Deletion */}
      <ConfirmationModal
        isOpen={Boolean(userToDelete)}
        onClose={() => {
          setUserToDelete(null);
          setIsDeleting(false);
        }}
        onConfirm={handleConfirmDeleteUser}
        isLoading={isDeleting}
        title="Excluir Usuário"
        description={
          <div>
            <span>Tem certeza que deseja excluir permanentemente o acesso de <strong>{userToDelete?.name}</strong> ({userToDelete?.email})?</span>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Esta ação removerá o usuário localmente e sincronizará a exclusão com a base de dados do Firebase.
            </div>
          </div>
        }
        confirmButtonText="Excluir Usuário"
      />

      {/* Confirmation Modal for Brokerage Deletion */}
      <ConfirmationModal
        isOpen={Boolean(corretoraToDelete)}
        onClose={() => {
          setCorretoraToDelete(null);
          setIsDeleting(false);
        }}
        onConfirm={handleConfirmDeleteCorretora}
        isLoading={isDeleting}
        title="Excluir Corretora"
        description={
          <div>
            <span>Tem certeza que deseja excluir a corretora <strong>{corretoraToDelete?.name}</strong>?</span>
            {brokers.filter(b => b.brokerageId === corretoraToDelete?.id || b.corretora_id === corretoraToDelete?.id).length > 0 && (
              <div className="mt-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 text-xs">
                Atenção: Existem <strong>{brokers.filter(b => b.brokerageId === corretoraToDelete?.id || b.corretora_id === corretoraToDelete?.id).length}</strong> corretores vinculados a esta corretora. Eles perderão o vínculo corporativo.
              </div>
            )}
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Esta ação removerá o registro da corretora e sincronizará com o Firestore.
            </div>
          </div>
        }
        confirmButtonText="Excluir Corretora"
      />

      {/* Confirmation Modal for Insurer Deletion */}
      <ConfirmationModal
        isOpen={Boolean(insurerToDelete)}
        onClose={() => {
          setInsurerToDelete(null);
          setIsDeleting(false);
        }}
        onConfirm={handleConfirmDeleteInsurer}
        isLoading={isDeleting}
        title="Excluir Seguradora"
        description={
          <div>
            <span>Tem certeza que deseja remover a seguradora <strong>{insurerToDelete}</strong> da lista?</span>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Esta seguradora deixará de aparecer como opção pré-definida no menu de seleção de clientes. (Clientes já existentes cadastrados com ela manterão seus dados).
            </div>
          </div>
        }
        confirmButtonText="Excluir Seguradora"
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

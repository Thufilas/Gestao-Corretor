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
  CheckCircle2,
  Briefcase
} from 'lucide-react';
import { BrokerAccount, User } from '../types';
import { 
  loadAllBrokers, 
  toggleBrokerStatus, 
  updateBrokerAccount 
} from '../services/adminService';
import { fetchFirestoreUsersByBrokerage, isFirebaseConfigured } from '../services/firebase';
import { formatCurrency, isSubAdmin } from '../utils/insuranceUtils';
import { CreateBrokerModal } from './CreateBrokerModal';
import { EditBrokerModal } from './EditBrokerModal';
import { ResetPasswordModal } from './ResetPasswordModal';

interface SubAdminBrokerageViewProps {
  currentUser: User | null;
}

export const SubAdminBrokerageView: React.FC<SubAdminBrokerageViewProps> = ({ currentUser }) => {
  const [brokers, setBrokers] = useState<BrokerAccount[]>(() => loadAllBrokers());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals
  const [isCreateBrokerOpen, setIsCreateBrokerOpen] = useState(false);
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

  const refreshData = async () => {
    const localBrokers = loadAllBrokers();
    setBrokers(localBrokers);

    if (isFirebaseConfigured() && currentUser) {
      try {
        const firestoreUsers = await fetchFirestoreUsersByBrokerage(currentUser);
        if (firestoreUsers && firestoreUsers.length > 0) {
          const merged = [...localBrokers];
          firestoreUsers.forEach(fUser => {
            const index = merged.findIndex(b => b.id === fUser.id || b.email.toLowerCase() === fUser.email.toLowerCase());
            const converted: BrokerAccount = {
              id: fUser.id,
              name: fUser.name || `${fUser.firstName || ''} ${fUser.lastName || ''}`.trim() || fUser.email,
              firstName: fUser.firstName,
              lastName: fUser.lastName,
              email: fUser.email,
              susep: fUser.susep || '',
              brokerageName: fUser.brokerageName || currentUser.brokerageName,
              brokerageId: fUser.brokerageId || currentUser.brokerageId || 'corretora-padrao',
              role: (fUser.role as any) || 'broker',
              isAdmin: fUser.isAdmin || false,
              status: (fUser.status as any) || 'active',
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
        }
      } catch (err) {
        console.warn('Error fetching Firestore team members:', err);
      }
    }
  };

  useEffect(() => {
    refreshData();
  }, [currentUser?.id, currentUser?.brokerageId, currentUser?.corretora_id]);

  // STRICT MULTI-TENANT ISOLATION: Filter brokers belonging to current user's brokerage
  const brokerageBrokers = useMemo(() => {
    if (!currentUser) return [];
    const bId = currentUser.brokerageId || currentUser.corretora_id;
    const bName = currentUser.brokerageName?.toLowerCase().trim();

    return brokers.filter(b => {
      // Allow self (the sub-admin) and any team member matching brokerageId, corretora_id, or brokerageName
      const matchId = bId && (b.brokerageId === bId || b.corretora_id === bId);
      const matchName = bName && b.brokerageName && b.brokerageName.toLowerCase().trim() === bName;
      const isSelf = b.id === currentUser.id;
      return matchId || matchName || isSelf;
    });
  }, [brokers, currentUser]);

  // Metrics for Sub-Admin's team
  const metrics = useMemo(() => {
    const totalTeam = brokerageBrokers.length;
    const activeBrokers = brokerageBrokers.filter(b => b.status === 'active').length;
    const totalClients = brokerageBrokers.reduce((acc, b) => acc + (b.clientCount || 0), 0);
    const totalPremiums = brokerageBrokers.reduce((acc, b) => acc + (b.totalPremiums || 0), 0);

    return { totalTeam, activeBrokers, totalClients, totalPremiums };
  }, [brokerageBrokers]);

  // Filtered list by search and status
  const filteredBrokers = useMemo(() => {
    return brokerageBrokers.filter(b => {
      const matchesStatus = 
        statusFilter === 'all' ? true :
        statusFilter === 'active' ? b.status === 'active' : b.status === 'inactive';

      const query = searchTerm.toLowerCase().trim();
      const matchesSearch = !query || 
        b.name.toLowerCase().includes(query) ||
        b.email.toLowerCase().includes(query) ||
        (b.susep && b.susep.toLowerCase().includes(query));

      return matchesStatus && matchesSearch;
    });
  }, [brokerageBrokers, statusFilter, searchTerm]);

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
      showToast('Erro ao alterar status da conta.');
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
      showToast('Dados do profissional atualizados com sucesso.');
    } catch (err) {
      console.error('Error saving broker edit:', err);
      showToast('Erro ao salvar alterações.');
    }
  };

  const handleOpenReset = (broker: BrokerAccount) => {
    setBrokerForReset(broker);
    setIsResetPassOpen(true);
  };

  const handleBrokerCreated = (newBroker: BrokerAccount) => {
    setBrokers(loadAllBrokers());
    setIsCreateBrokerOpen(false);
    showToast(`Corretor ${newBroker.name} cadastrado na equipe com sucesso!`);
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
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Painel de Gestão da Corretora</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <span>{currentUser?.brokerageName || 'Minha Corretora'}</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Gerencie os corretores credenciados na sua equipe, cadastre novos profissionais e acompanhe o desempenho e a carteira consolidada de contratos da sua corretora.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              onClick={refreshData}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-95 shadow-sm"
              title="Atualizar dados da equipe"
            >
              <RefreshCw className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Atualizar</span>
            </button>

            <button
              id="btn-subadmin-new-broker"
              onClick={() => setIsCreateBrokerOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-all cursor-pointer active:scale-95 shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Cadastrar Corretor na Equipe</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1 */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Corretores da Equipe</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {metrics.totalTeam}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Profissionais vinculados
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Corretores Ativos</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {metrics.activeBrokers}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Com acesso regular ao sistema
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Contratos na Equipe</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {metrics.totalClients}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Apólices e segurados gerenciados
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/50">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Volume em Prêmios</span>
            <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 truncate max-w-[180px]" title={formatCurrency(metrics.totalPremiums)}>
              {formatCurrency(metrics.totalPremiums)}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Prêmio total da corretora
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Team Members Management Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        
        {/* Table Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar corretor por nome, e-mail ou SUSEP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
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
                Todos ({brokerageBrokers.length})
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
                Inativos ({brokerageBrokers.length - metrics.activeBrokers})
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
                <th className="py-3 px-4">Perfil & Função</th>
                <th className="py-3 px-4">Registro SUSEP</th>
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
                    Nenhum corretor encontrado na sua equipe com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredBrokers.map((broker) => {
                  const isSelf = currentUser?.id === broker.id;
                  const isSubAdminAccount = broker.role === 'subadmin';
                  const isActive = broker.status === 'active';

                  return (
                    <tr 
                      key={broker.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Nome e Email */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSubAdminAccount 
                              ? 'bg-indigo-600 text-white shadow-sm' 
                              : 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300'
                          }`}>
                            {broker.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{broker.name}</span>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                                  Você (Gestor)
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
                        {isSubAdminAccount ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            <Crown className="w-3 h-3 text-indigo-500" />
                            <span>Gestor (Sub-Admin)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            <Users className="w-3 h-3 text-slate-400" />
                            <span>Corretor da Equipe</span>
                          </span>
                        )}
                      </td>

                      {/* SUSEP */}
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {broker.susep || 'Não informada'}
                      </td>

                      {/* Contratos */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-slate-900 dark:text-white px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                          {broker.clientCount || 0}
                        </span>
                      </td>

                      {/* Volume em Prêmios */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
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
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors cursor-pointer"
                            title="Editar dados"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenReset(broker)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors cursor-pointer"
                            title="Redefinir senha de acesso"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {isSelf ? (
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
        <div className="p-4 bg-slate-50/50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div>
            Exibindo <strong>{filteredBrokers.length}</strong> de <strong>{brokerageBrokers.length}</strong> profissionais da sua equipe.
          </div>
        </div>

      </div>

      {/* Modals */}
      <CreateBrokerModal
        isOpen={isCreateBrokerOpen}
        onClose={() => setIsCreateBrokerOpen(false)}
        onBrokerCreated={handleBrokerCreated}
        currentUser={currentUser}
        defaultBrokerageId={currentUser?.brokerageId || currentUser?.corretora_id}
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

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 dark:bg-slate-800 text-white shadow-xl border border-slate-700/80 animate-in slide-in-from-bottom-4 duration-200 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
};

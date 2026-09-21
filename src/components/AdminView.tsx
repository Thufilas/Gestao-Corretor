import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Building2, 
  Mail, 
  Search, 
  CheckCircle, 
  XCircle, 
  Edit3, 
  KeyRound, 
  Lock, 
  Unlock, 
  DollarSign, 
  FileText, 
  TrendingUp, 
  Flame, 
  ArrowUpDown,
  Filter,
  RefreshCw,
  Crown
} from 'lucide-react';
import { BrokerAccount, User } from '../types';
import { 
  loadAllBrokers, 
  toggleBrokerStatus, 
  updateBrokerAccount, 
  getAdminMetrics 
} from '../services/adminService';
import { formatCurrency, ADMIN_USER_ID, formatDateBR } from '../utils/insuranceUtils';
import { isFirebaseConfigured } from '../services/firebase';
import { CreateBrokerModal } from './CreateBrokerModal';
import { EditBrokerModal } from './EditBrokerModal';
import { ResetPasswordModal } from './ResetPasswordModal';

interface AdminViewProps {
  currentUser: User | null;
  onOpenNewBrokerModal?: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ currentUser }) => {
  const [brokers, setBrokers] = useState<BrokerAccount[]>(() => loadAllBrokers());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [brokerToEdit, setBrokerToEdit] = useState<BrokerAccount | null>(null);
  const [isResetPassOpen, setIsResetPassOpen] = useState(false);
  const [brokerForReset, setBrokerForReset] = useState<BrokerAccount | null>(null);

  const isFirebase = isFirebaseConfigured();

  // Reload brokers list
  const refreshBrokers = () => {
    setBrokers(loadAllBrokers());
  };

  const metrics = useMemo(() => {
    return getAdminMetrics(brokers);
  }, [brokers]);

  const filteredBrokers = useMemo(() => {
    return brokers.filter(b => {
      const matchSearch = 
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.brokerageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.susep && b.susep.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = 
        statusFilter === 'all' ? true : b.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [brokers, searchTerm, statusFilter]);

  const handleToggleStatus = (broker: BrokerAccount) => {
    if (broker.id === ADMIN_USER_ID) {
      alert('A conta do Administrador Master não pode ser inativada.');
      return;
    }
    const updated = toggleBrokerStatus(broker.id);
    setBrokers(updated);
  };

  const handleOpenEdit = (broker: BrokerAccount) => {
    setBrokerToEdit(broker);
    setIsEditOpen(true);
  };

  const handleSaveEdit = (brokerId: string, updatedData: Partial<BrokerAccount>) => {
    const updated = updateBrokerAccount(brokerId, updatedData);
    setBrokers(updated);
  };

  const handleOpenReset = (broker: BrokerAccount) => {
    setBrokerForReset(broker);
    setIsResetPassOpen(true);
  };

  const handleBrokerCreated = (newBroker: BrokerAccount) => {
    setBrokers(prev => [newBroker, ...prev]);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Top Banner / Welcome Master */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 border border-cyan-800/40 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Crown className="w-3 h-3 text-amber-400" />
                Acesso Master de Administrador
              </span>
              {isFirebase && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Flame className="w-3 h-3 fill-emerald-500/30" />
                  Firebase Multi-Tenant Ativo
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Painel de Gestão Administrativa</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Gerencie todos os corretores credenciados, libere novos acessos, acompanhe o volume de contratos por carteira e controle o status das contas da plataforma.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              id="btn-admin-refresh"
              onClick={refreshBrokers}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer active:scale-95"
              title="Atualizar lista de corretores"
            >
              <RefreshCw className="w-4 h-4 text-cyan-400" />
              <span>Atualizar</span>
            </button>

            <button
              id="btn-admin-new-broker"
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 transition-all cursor-pointer active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Novo Corretor</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards (Visão Geral) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Brokers */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total de Corretores
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {metrics.totalBrokers}
          </div>
          <div className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>{metrics.activeBrokers} ativos no sistema</span>
          </div>
        </div>

        {/* Active Ratio */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Status Operacional
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {metrics.totalBrokers > 0 ? Math.round((metrics.activeBrokers / metrics.totalBrokers) * 100) : 100}%
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Taxa de disponibilidade de contas
          </div>
        </div>

        {/* Managed Contracts */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Contratos Geridos
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {metrics.totalContracts}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Total de apólices e clientes em carteira
          </div>
        </div>

        {/* Total Insured Premiums Volume */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Volume em Prêmios
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">
            {formatCurrency(metrics.totalVolumePremiums)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Volume total segurado na plataforma
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
                Todos ({brokers.length})
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
                Inativos ({brokers.length - metrics.activeBrokers})
              </button>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4 sm:px-6">Corretor / Identificação</th>
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
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Nenhum corretor encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredBrokers.map((broker) => {
                  const isMaster = broker.id === ADMIN_USER_ID;
                  const isActive = broker.status === 'active';

                  return (
                    <tr 
                      key={broker.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Corretor & Email */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isMaster 
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700' 
                              : 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800'
                          }`}>
                            {isMaster ? <Crown className="w-4 h-4" /> : (broker.firstName?.[0] || broker.name[0] || 'C')}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{broker.name}</span>
                              {isMaster && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-semibold border border-amber-300 dark:border-amber-800">
                                  Admin
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

                      {/* Corretora & SUSEP */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {broker.brokerageName || 'Corretora Autônoma'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {broker.susep ? `SUSEP ${broker.susep}` : 'Sem SUSEP informada'}
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
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          isActive 
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {isActive ? 'Ativa' : 'Inativa / Bloqueada'}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Editar Perfil */}
                          <button
                            id={`btn-edit-broker-${broker.id}`}
                            onClick={() => handleOpenEdit(broker)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 transition-colors cursor-pointer"
                            title="Editar Perfil do Corretor"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Redefinir Senha */}
                          <button
                            id={`btn-reset-pass-${broker.id}`}
                            onClick={() => handleOpenReset(broker)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors cursor-pointer"
                            title="Redefinir Senha de Acesso"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Ativar / Bloquear */}
                          {!isMaster && (
                            <button
                              id={`btn-toggle-status-${broker.id}`}
                              onClick={() => handleToggleStatus(broker)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isActive 
                                  ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50' 
                                  : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                              }`}
                              title={isActive ? 'Bloquear/Inativar Conta' : 'Reativar Conta'}
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

        {/* Footer note */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Mostrando {filteredBrokers.length} de {brokers.length} corretores cadastrados</span>
          <span>ID de Administrador Master: <code className="text-cyan-600 dark:text-cyan-400">{ADMIN_USER_ID}</code></span>
        </div>

      </div>

      {/* Sub-modals */}
      <CreateBrokerModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onBrokerCreated={handleBrokerCreated}
      />

      <EditBrokerModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        broker={brokerToEdit}
        onSave={handleSaveEdit}
      />

      <ResetPasswordModal
        isOpen={isResetPassOpen}
        onClose={() => setIsResetPassOpen(false)}
        broker={brokerForReset}
      />

    </div>
  );
};

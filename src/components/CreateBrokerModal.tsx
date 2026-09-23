import React, { useState, useEffect } from 'react';
import { 
  X, 
  UserPlus, 
  User as UserIcon, 
  Building2, 
  Mail, 
  Lock, 
  ShieldCheck, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff,
  Flame,
  Crown,
  Users,
  Briefcase
} from 'lucide-react';
import { BrokerAccount, User, UserRole, Brokerage } from '../types';
import { createBrokerAccount, loadAllBrokerages, createBrokerage } from '../services/adminService';
import { isFirebaseConfigured } from '../services/firebase';
import { isMasterAdmin, isSubAdmin } from '../utils/insuranceUtils';

interface CreateBrokerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBrokerCreated: (newBroker: BrokerAccount) => void;
  currentUser?: User | null;
  defaultBrokerageId?: string;
}

export const CreateBrokerModal: React.FC<CreateBrokerModalProps> = ({
  isOpen,
  onClose,
  onBrokerCreated,
  currentUser,
  defaultBrokerageId
}) => {
  const isMaster = isMasterAdmin(currentUser);
  const isSub = isSubAdmin(currentUser);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [tempPassword, setTempPassword] = useState('Corretor@2025');
  const [susep, setSusep] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Profile & Brokerage states
  const [role, setRole] = useState<UserRole>('broker');
  const [brokerages, setBrokerages] = useState<Brokerage[]>([]);
  const [selectedBrokerageId, setSelectedBrokerageId] = useState<string>('');
  const [isCreatingNewBrokerage, setIsCreatingNewBrokerage] = useState(false);
  const [newBrokerageName, setNewBrokerageName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isFirebase = isFirebaseConfigured();

  // Reset & prepare initial state on open
  useEffect(() => {
    if (isOpen) {
      const allBr = loadAllBrokerages();
      setBrokerages(allBr);

      // Default role to broker
      setRole('broker');

      // Preselect defaultBrokerageId if passed, or user's brokerage, or first available
      if (defaultBrokerageId && defaultBrokerageId !== 'all') {
        setSelectedBrokerageId(defaultBrokerageId);
      } else if (currentUser?.corretora_id || currentUser?.brokerageId) {
        const userBrId = currentUser.corretora_id || currentUser.brokerageId || '';
        const exists = allBr.some(b => b.id === userBrId);
        setSelectedBrokerageId(exists ? userBrId : (allBr[0]?.id || ''));
      } else if (allBr.length > 0) {
        const defaultBr = allBr.find(b => b.id === 'corretora-finage') || allBr[0];
        setSelectedBrokerageId(defaultBr.id);
      }

      setIsCreatingNewBrokerage(false);
      setNewBrokerageName('');
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, currentUser, defaultBrokerageId]);

  if (!isOpen) return null;

  const handleCreateBrokerageInline = () => {
    if (!newBrokerageName.trim()) {
      setError('Por favor, informe o nome da nova corretora.');
      return;
    }
    const created = createBrokerage(newBrokerageName.trim());
    const updated = loadAllBrokerages();
    setBrokerages(updated);
    setSelectedBrokerageId(created.id);
    setIsCreatingNewBrokerage(false);
    setNewBrokerageName('');
    setError(null);
    setSuccess(`Corretora "${created.name}" criada e selecionada!`);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!firstName.trim()) {
      setError('Por favor, informe o Nome do profissional.');
      return;
    }

    if (!email.trim()) {
      setError('Por favor, informe o E-mail de acesso.');
      return;
    }

    if (tempPassword.length < 6) {
      setError('A senha temporária deve ter no mínimo 6 caracteres.');
      return;
    }

    let finalBrokerageId = selectedBrokerageId;
    let finalBrokerageName = '';

    if (isCreatingNewBrokerage) {
      if (!newBrokerageName.trim()) {
        setError('Por favor, digite o Nome da Nova Corretora ou escolha uma existente.');
        return;
      }
      const createdBr = createBrokerage(newBrokerageName.trim());
      finalBrokerageId = createdBr.id;
      finalBrokerageName = createdBr.name;
    } else {
      const found = brokerages.find(b => b.id === selectedBrokerageId);
      if (found) {
        finalBrokerageName = found.name;
      } else if (selectedBrokerageId) {
        finalBrokerageId = selectedBrokerageId;
        finalBrokerageName = selectedBrokerageId;
      } else {
        setError('Por favor, selecione ou crie a Corretora a ser vinculada.');
        return;
      }
    }

    setLoading(true);

    try {
      const created = await createBrokerAccount({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        brokerageName: finalBrokerageName,
        brokerageId: finalBrokerageId,
        role: role,
        susep: susep.trim(),
        initialPassword: tempPassword,
        creatorUser: currentUser
      });

      const roleLabel = created.role === 'subadmin' ? 'Sub-Admin / Gestor(a)' : 'Corretor(a) Padrão';
      if (isFirebase) {
        setSuccess(`${roleLabel} ${created.name} criado(a) com sucesso no Firebase Authentication! O login imediato com a senha informada já está ativo.`);
      } else {
        setSuccess(`${roleLabel} ${created.name} cadastrado(a) com sucesso!`);
      }
      
      setLoading(false);

      try {
        onBrokerCreated(created);
      } catch (cbErr) {
        console.error('Error in onBrokerCreated callback:', cbErr);
      }
      // Reset fields
      setFirstName('');
      setLastName('');
      setEmail('');
      setSusep('');
      setTempPassword('Corretor@2025');
      setIsCreatingNewBrokerage(false);
      setNewBrokerageName('');
      setSuccess(null);
      onClose();
    } catch (err: unknown) {
      console.error('Error creating broker:', err);
      setError((err as Error)?.message || 'Erro ao cadastrar novo usuário.');
      setLoading(false);
    }
  };

  const subAdminBrokerageName = currentUser?.brokerageName || 'Sua Corretora';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md ${
              isMaster 
                ? 'bg-gradient-to-tr from-amber-500 to-amber-600 shadow-amber-500/20'
                : 'bg-gradient-to-tr from-cyan-600 to-blue-600 shadow-cyan-600/20'
            }`}>
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {isSub ? 'Cadastrar Corretor na Equipe' : 'Cadastrar Utilizador / Corretor'}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                {isSub ? (
                  <span>Adicione um novo profissional para a sua corretora</span>
                ) : (
                  <span>Cadastre sub-admins gestores ou corretores para qualquer corretora</span>
                )}
                {isFirebase && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800/60">
                    <Flame className="w-3 h-3 fill-amber-500/30" />
                    Firebase
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            id="btn-close-create-broker"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          {/* Role & Brokerage Selection Section */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 space-y-3.5">
            
            {/* 1. Profile / Role Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Perfil de Acesso do Profissional *
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('broker')}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    role === 'broker'
                      ? 'bg-white dark:bg-slate-800 border-cyan-500 ring-2 ring-cyan-500/20 shadow-xs'
                      : 'bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    role === 'broker'
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                  }`}>
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">
                      Corretor Padrão
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      Opera sua carteira de clientes e apólices
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('subadmin')}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    role === 'subadmin'
                      ? 'bg-white dark:bg-slate-800 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                      : 'bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    role === 'subadmin'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                  }`}>
                    <Crown className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">
                      Sub-Admin / Gestor
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      Gerencia a equipe da corretora
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Brokerage (Corretora) Selection or Creation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Corretora de Seguros Atribuída *
                </label>
                <div className="flex items-center gap-2">
                  {!isCreatingNewBrokerage ? (
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewBrokerage(true)}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>+ Criar Nova Corretora</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewBrokerage(false)}
                      className="text-[11px] font-semibold text-slate-500 hover:underline cursor-pointer"
                    >
                      <span>← Escolher Corretora Existente</span>
                    </button>
                  )}
                </div>
              </div>

              {!isCreatingNewBrokerage ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <select
                        id="select-brokerage"
                        value={selectedBrokerageId}
                        onChange={(e) => {
                          if (e.target.value === '__new__') {
                            setIsCreatingNewBrokerage(true);
                          } else {
                            setSelectedBrokerageId(e.target.value);
                          }
                        }}
                        className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-medium shadow-xs"
                      >
                        {brokerages.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.name} {b.subAdminName ? `(Gestor: ${b.subAdminName})` : ''}
                          </option>
                        ))}
                        <option value="__new__">+ Cadastrar Nova Corretora...</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      id="btn-trigger-create-brokerage"
                      onClick={() => setIsCreatingNewBrokerage(true)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 whitespace-nowrap cursor-pointer transition-colors shadow-xs"
                      title="Cadastrar uma nova corretora"
                    >
                      + Nova Corretora
                    </button>
                  </div>

                  {/* Optional quick shortcut if current user has a specific brokerage */}
                  {currentUser?.brokerageName && selectedBrokerageId !== (currentUser.corretora_id || currentUser.brokerageId) && (
                    <button
                      type="button"
                      onClick={() => {
                        const brId = currentUser.corretora_id || currentUser.brokerageId;
                        if (brId) setSelectedBrokerageId(brId);
                      }}
                      className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                    >
                      <Building2 className="w-3 h-3" />
                      <span>Atribuir à minha corretora: <strong>{currentUser.brokerageName}</strong></span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-950 dark:text-indigo-200">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Cadastrar Nova Corretora de Seguros
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewBrokerage(false)}
                      className="text-[11px] font-normal text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        id="input-new-brokerage-name"
                        type="text"
                        placeholder="Ex: Finage Corretora de Seguros"
                        value={newBrokerageName}
                        onChange={(e) => setNewBrokerageName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCreateBrokerageInline();
                          }
                        }}
                        className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                      />
                    </div>

                    <button
                      type="button"
                      id="btn-confirm-inline-brokerage"
                      onClick={handleCreateBrokerageInline}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white whitespace-nowrap cursor-pointer transition-colors shadow-xs"
                    >
                      Criar e Atribuir
                    </button>
                  </div>
                  <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80">
                    A corretora será criada no sistema e o novo corretor será imediatamente vinculado a ela.
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* Personal & Credential Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nome do Profissional *
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="create-broker-firstname"
                  type="text"
                  required
                  placeholder="Ex: Alberto"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Sobrenome
              </label>
              <input
                id="create-broker-lastname"
                type="text"
                placeholder="Ex: Carvalho"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                E-mail Profissional de Acesso *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="create-broker-email"
                  type="email"
                  required
                  placeholder="alberto@finage.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Registro SUSEP
              </label>
              <input
                id="create-broker-susep"
                type="text"
                placeholder="Ex: 20.554102/2023"
                value={susep}
                onChange={(e) => setSusep(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Senha Inicial de Acesso *
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="create-broker-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {isFirebase 
                  ? 'A conta e esta senha serão cadastradas diretamente no Firebase Authentication para login imediato.' 
                  : 'Senha temporária que o corretor utilizará no primeiro acesso.'}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-submit-create-broker"
              disabled={loading}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-60 ${
                isMaster
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                  : 'bg-cyan-600 hover:bg-cyan-700 shadow-cyan-600/25'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Cadastrando...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>
                    {isSub ? 'Adicionar Corretor à Equipe' : 'Cadastrar Utilizador'}
                  </span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

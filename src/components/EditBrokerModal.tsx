import React, { useState, useEffect } from 'react';
import { 
  X, 
  User as UserIcon, 
  Building2, 
  Mail, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Briefcase,
  Crown,
  ShieldCheck,
  Info
} from 'lucide-react';
import { BrokerAccount, User, UserRole, Brokerage } from '../types';
import { isMasterAdmin, isSubAdmin, ADMIN_USER_ID } from '../utils/insuranceUtils';
import { loadAllBrokerages } from '../services/adminService';

interface EditBrokerModalProps {
  isOpen: boolean;
  onClose: () => void;
  broker: BrokerAccount | null;
  onSave: (brokerId: string, updatedData: Partial<BrokerAccount>) => void;
  currentUser?: User | null;
}

export const EditBrokerModal: React.FC<EditBrokerModalProps> = ({
  isOpen,
  onClose,
  broker,
  onSave,
  currentUser
}) => {
  const isMaster = isMasterAdmin(currentUser);
  const isSub = isSubAdmin(currentUser);
  const isTargetMaster = broker?.id === ADMIN_USER_ID;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [brokerageName, setBrokerageName] = useState('');
  const [brokerageId, setBrokerageId] = useState('');
  // Padronizado para aceitar 'SUB_ADMIN' ou 'CORRETOR'
  const [role, setRole] = useState<'SUB_ADMIN' | 'CORRETOR'>('CORRETOR');
  const [susep, setSusep] = useState('');
  const [brokerages, setBrokerages] = useState<Brokerage[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && broker) {
      setFirstName(broker.firstName || (broker.name ? broker.name.split(/\s+/)[0] : ''));
      setLastName(broker.lastName !== undefined ? broker.lastName : (broker.name ? broker.name.split(/\s+/).slice(1).join(' ') : ''));
      setEmail(broker.email || '');
      setBrokerageName(broker.brokerageName || '');
      setBrokerageId(broker.brokerageId || broker.corretora_id || '');
      
      const rUpper = String(broker.role || '').toUpperCase();
      // Normalização correta da role recebida
      setRole(rUpper === 'SUB_ADMIN' || rUpper === 'SUBADMIN' || rUpper === 'GESTOR' ? 'SUB_ADMIN' : 'CORRETOR');
      setSusep(broker.susep || '');
      
      const allBr = loadAllBrokerages();
      setBrokerages(allBr);
      if (!broker.brokerageId && !broker.corretora_id && allBr.length > 0) {
        setBrokerageId(allBr[0].id);
        setBrokerageName(allBr[0].name);
      }
      
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, broker]);

  if (!isOpen || !broker) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim()) {
      setError('Por favor, informe o Nome do profissional.');
      return;
    }

    if (!email.trim()) {
      setError('Por favor, informe o E-mail de acesso.');
      return;
    }

    // Validação obrigatória da corretora ao elevar para SUB_ADMIN
    if (isMaster && !isTargetMaster && role === 'SUB_ADMIN' && !brokerageId) {
      setError('Ao definir o usuário como Sub-Admin (Gestor), é obrigatório selecionar uma corretora vinculada.');
      return;
    }

    setLoading(true);

    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');

    const updatedData: Partial<BrokerAccount> = {
      name: fullName,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      susep: susep.trim()
    };

    // Apensa permissões alteradas pelo Admin Master
    if (isMaster) {
      if (isTargetMaster) {
        updatedData.role = 'MASTER' as any;
      } else {
        // Envia 'SUB_ADMIN' ou 'CORRETOR' em caixa alta para manter consistência no Firestore e Navbar
        updatedData.role = (role === 'SUB_ADMIN' ? 'SUB_ADMIN' : 'CORRETOR') as any;
        
        const foundBr = brokerages.find(b => b.id === brokerageId);
        if (foundBr) {
          updatedData.brokerageId = foundBr.id;
          updatedData.corretora_id = foundBr.id;
          updatedData.brokerageName = foundBr.name;
        } else if (brokerageId) {
          updatedData.brokerageId = brokerageId;
          updatedData.corretora_id = brokerageId;
          updatedData.brokerageName = brokerageName;
        }
      }
    }

    onSave(broker.id, updatedData);

    setSuccess('Perfil e permissões atualizados com sucesso!');
    setTimeout(() => {
      setLoading(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md ${
              isTargetMaster 
                ? 'bg-amber-500 shadow-amber-500/20' 
                : role === 'SUB_ADMIN' 
                  ? 'bg-indigo-600 shadow-indigo-600/20' 
                  : 'bg-cyan-600 shadow-cyan-600/20'
            }`}>
              {isTargetMaster ? <Crown className="w-5 h-5" /> : role === 'SUB_ADMIN' ? <ShieldCheck className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Editar Dados do Usuário
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isTargetMaster
                  ? 'Administrador Master Global do Sistema'
                  : isSub 
                    ? `Gerenciar membro da equipe (${broker.brokerageName})` 
                    : 'Gerencie o cargo, vínculo de corretora e dados cadastrais'
                }
              </p>
            </div>
          </div>
          <button
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

          {/* Role & Brokerage Permission Info */}
          {isTargetMaster ? (
            <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3 text-xs">
              <Crown className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-900 dark:text-amber-200 block">
                  Perfil de Administrador Master Global
                </span>
                <span className="text-amber-700 dark:text-amber-300/80 text-[11px] leading-relaxed block mt-0.5">
                  Este perfil possui controle total e irrestrito da plataforma. O cargo não pode ser rebaixado nem transferido.
                </span>
              </div>
            </div>
          ) : isMaster ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3.5">
              
              {/* Role Switcher (Corretor Padrão vs Sub-Admin) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Cargo / Nível de Acesso *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('CORRETOR')}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      role === 'CORRETOR'
                        ? 'bg-white dark:bg-slate-800 border-cyan-500 ring-2 ring-cyan-500/20 shadow-xs'
                        : 'bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      role === 'CORRETOR'
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
                        Opera seus clientes e apólices
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('SUB_ADMIN')}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      role === 'SUB_ADMIN'
                        ? 'bg-white dark:bg-slate-800 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      role === 'SUB_ADMIN'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                    }`}>
                      <ShieldCheck className="w-4 h-4" />
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

              {/* Corretora Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Corretora de Seguros Vinculada {role === 'SUB_ADMIN' && <span className="text-indigo-600 dark:text-indigo-400">* (Obrigatória)</span>}
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <select
                    value={brokerageId}
                    onChange={(e) => {
                      setBrokerageId(e.target.value);
                      const found = brokerages.find(b => b.id === e.target.value);
                      if (found) setBrokerageName(found.name);
                    }}
                    required={role === 'SUB_ADMIN'}
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  >
                    {brokerages.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Contextual Feedback regarding elevation or downgrade */}
              {role === 'SUB_ADMIN' ? (
                <div className="p-2.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/40 text-[11px] text-indigo-800 dark:text-indigo-300 flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                  <span>
                    <strong>Elevação de Cargo:</strong> Este usuário terá acesso ao menu <strong>Corretora</strong> com visualização restrita a corretores e contratos da corretora selecionada.
                  </span>
                </div>
              ) : String(broker.role).toUpperCase() === 'SUB_ADMIN' ? (
                <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 text-slate-500 mt-0.5" />
                  <span>
                    <strong>Rebaixamento de Cargo:</strong> O usuário perderá o acesso ao menu Corretora e passará a ter perfil padrão de corretor.
                  </span>
                </div>
              ) : null}

            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-600" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {broker.brokerageName}
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {String(broker.role).toUpperCase() === 'SUB_ADMIN' ? 'Sub-Admin (Gestor)' : 'Corretor da Equipe'}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nome *
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Sobrenome
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                E-mail de Acesso *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Registro SUSEP
              </label>
              <input
                type="text"
                value={susep}
                onChange={(e) => setSusep(e.target.value)}
                placeholder="Ex: 10.024589/22"
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
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
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-60 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
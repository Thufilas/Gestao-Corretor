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
  Crown
} from 'lucide-react';
import { BrokerAccount, User, UserRole, Brokerage } from '../types';
import { isMasterAdmin, isSubAdmin } from '../utils/insuranceUtils';
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

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [brokerageName, setBrokerageName] = useState('');
  const [brokerageId, setBrokerageId] = useState('');
  const [role, setRole] = useState<UserRole>('broker');
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
      setBrokerageId(broker.brokerageId || '');
      setRole(broker.role || 'broker');
      setSusep(broker.susep || '');
      setBrokerages(loadAllBrokerages());
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

    setLoading(true);

    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');

    const updatedData: Partial<BrokerAccount> = {
      name: fullName,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      susep: susep.trim()
    };

    // Only Master Admin can modify role and brokerage assignment
    if (isMaster) {
      updatedData.role = role;
      const foundBr = brokerages.find(b => b.id === brokerageId);
      if (foundBr) {
        updatedData.brokerageId = foundBr.id;
        updatedData.brokerageName = foundBr.name;
      }
    }

    onSave(broker.id, updatedData);

    setSuccess('Perfil atualizado com sucesso!');
    setTimeout(() => {
      setLoading(false);
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600 flex items-center justify-center text-white shadow-md shadow-cyan-600/20">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Editar Dados do Usuário
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isSub 
                  ? `Gerenciar membro da equipe (${broker.brokerageName})` 
                  : 'Gerencie as informações cadastrais e permissões do corretor'
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
          {isMaster ? (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Perfil de Acesso
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                  >
                    <option value="broker">Corretor Padrão</option>
                    <option value="subadmin">Sub-Admin (Gestor)</option>
                    <option value="admin">Admin Master</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Corretora Vinculada
                  </label>
                  <select
                    value={brokerageId}
                    onChange={(e) => setBrokerageId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                  >
                    {brokerages.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-600" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {broker.brokerageName}
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {broker.role === 'subadmin' ? 'Sub-Admin (Gestor)' : 'Corretor da Equipe'}
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
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white"
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
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white"
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
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white"
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
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white"
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
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 active:scale-95 disabled:opacity-60 text-white text-xs font-bold shadow-md shadow-cyan-600/25 transition-all cursor-pointer"
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

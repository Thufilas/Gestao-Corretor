import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  User as UserIcon, 
  Mail, 
  Plus, 
  Loader2, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { Brokerage } from '../types';
import { createBrokerage } from '../services/adminService';
import { isFirebaseConfigured, saveCorretoraToFirestore } from '../services/firebase';

interface CreateBrokerageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBrokerageCreated: (newBrokerage: Brokerage) => void;
}

export const CreateBrokerageModal: React.FC<CreateBrokerageModalProps> = ({
  isOpen,
  onClose,
  onBrokerageCreated
}) => {
  const [name, setName] = useState('');
  const [subAdminName, setSubAdminName] = useState('');
  const [subAdminEmail, setSubAdminEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Por favor, informe o Nome da Corretora.');
      return;
    }

    setLoading(true);

    try {
      const created = createBrokerage(
        name.trim(),
        undefined,
        subAdminName.trim() || undefined,
        subAdminEmail.trim() || undefined
      );

      if (isFirebaseConfigured()) {
        try {
          await saveCorretoraToFirestore(created);
        } catch (fbErr) {
          console.warn('Could not sync new brokerage to Firestore immediately:', fbErr);
        }
      }

      setSuccess(`Corretora "${created.name}" cadastrada com sucesso!`);

      setTimeout(() => {
        onBrokerageCreated(created);
        setName('');
        setSubAdminName('');
        setSubAdminEmail('');
        setSuccess(null);
        setLoading(false);
        onClose();
      }, 700);
    } catch (err: unknown) {
      console.error('Error creating brokerage:', err);
      setError((err as Error)?.message || 'Erro ao cadastrar corretora.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Cadastrar Nova Corretora
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Adicione uma nova empresa ao ecossistema
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nome da Corretora *
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                placeholder="Ex: Finage Corretora de Seguros"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
              Gestor Responsável / Sub-Admin (Opcional)
            </span>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Nome do Gestor (ex: Alberto Carvalho)"
                value={subAdminName}
                onChange={(e) => setSubAdminName(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
              />
            </div>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                placeholder="E-mail do Gestor (ex: alberto@finage.com.br)"
                value={subAdminEmail}
                onChange={(e) => setSubAdminEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
              />
            </div>
            <span className="text-[10px] text-slate-400 block">
              Você também pode designar ou cadastrar o Sub-Admin posteriormente.
            </span>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 disabled:opacity-60 text-white text-xs font-bold shadow-md shadow-amber-600/25 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Cadastrando...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Criar Corretora</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

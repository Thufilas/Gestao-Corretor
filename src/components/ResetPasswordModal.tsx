import React, { useState } from 'react';
import { 
  X, 
  KeyRound, 
  Lock, 
  Send, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Flame
} from 'lucide-react';
import { BrokerAccount } from '../types';
import { 
  firebaseSendPasswordReset, 
  isFirebaseConfigured 
} from '../services/firebase';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  broker: BrokerAccount | null;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  onClose,
  broker
}) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [mode, setMode] = useState<'email' | 'manual'>('email');

  const isFirebase = isFirebaseConfigured();

  if (!isOpen || !broker) return null;

  const handleSendResetEmail = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isFirebase) {
        await firebaseSendPasswordReset(broker.email);
        setSuccess(`E-mail oficial de redefinição de senha enviado com sucesso para ${broker.email}!`);
      } else {
        setSuccess(`Link simulado de redefinição gerado e enviado para ${broker.email}.`);
      }
    } catch (err: unknown) {
      console.error('Error sending reset email:', err);
      setError((err as Error)?.message || 'Erro ao enviar e-mail de redefinição.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateManualTempPass = () => {
    const randomPass = `GCorretor@${Math.floor(1000 + Math.random() * 9000)}`;
    setTempPassword(randomPass);
    setSuccess(`Senha temporária gerada: ${randomPass} (Forneça ao corretor para o próximo acesso).`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-600/20">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Redefinir Senha
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Corretor: <span className="font-semibold text-slate-700 dark:text-slate-300">{broker.name}</span>
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

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <div className="break-all">{success}</div>
            </div>
          )}

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
            <div><strong className="text-slate-900 dark:text-white">E-mail de destino:</strong> {broker.email}</div>
            <div><strong className="text-slate-900 dark:text-white">Corretora:</strong> {broker.brokerageName}</div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              id="btn-send-reset-firebase"
              onClick={handleSendResetEmail}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-98 disabled:opacity-60 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando link...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Enviar E-mail de Redefinição (Firebase)</span>
                </>
              )}
            </button>

            <button
              type="button"
              id="btn-generate-temp-pass"
              onClick={handleGenerateManualTempPass}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
            >
              <Lock className="w-4 h-4 text-slate-400" />
              <span>Gerar Senha Temporária Manual</span>
            </button>
          </div>

          <div className="pt-2 text-[11px] text-slate-400 text-center">
            {isFirebase ? 'Conexão ativa com Firebase Auth.' : 'Modo local/demonstração ativo.'}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};

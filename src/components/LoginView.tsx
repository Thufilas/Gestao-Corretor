import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  Sun, 
  Moon, 
  Loader2, 
  AlertCircle, 
  BadgeCheck,
  Eye,
  EyeOff,
  BellRing,
  Calculator,
  Cloud,
  LockKeyhole
} from 'lucide-react';
import { User as UserType } from '../types';
import { saveCurrentUser, saveUserProfile } from '../services/storage';
import { ADMIN_USER_ID, isUserAdmin } from '../utils/insuranceUtils';
import { loadAllBrokers } from '../services/adminService';
import { 
  firebaseSignIn, 
  firebaseSendPasswordReset,
  isFirebaseConfigured
} from '../services/firebase';

interface LoginViewProps {
  onLoginSuccess: (user: UserType) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ 
  onLoginSuccess, 
  theme = 'light', 
  onToggleTheme 
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const firebaseReady = isFirebaseConfigured();

  const handleFirebaseError = (err: unknown): string => {
    if (!err || typeof err !== 'object') return 'E-mail ou senha inválidos.';
    
    const message = (err as { code?: string; message?: string }).code || (err as Error).message || '';
    
    if (
      message.includes('auth/invalid-credential') || 
      message.includes('auth/wrong-password') || 
      message.includes('auth/user-not-found') ||
      message.includes('auth/invalid-email')
    ) {
      return 'E-mail ou senha inválidos.';
    }
    if (message.includes('auth/network-request-failed')) {
      return 'Falha de conexão com os servidores de autenticação. Verifique sua conexão com a internet.';
    }
    if (message.includes('auth/too-many-requests')) {
      return 'Muitas tentativas sem sucesso. Por segurança, tente novamente em instantes ou redefina sua senha.';
    }

    return 'E-mail ou senha inválidos.';
  };

  const handleSendResetPassword = async () => {
    if (!email.trim()) {
      setError('Por favor, informe seu e-mail no campo acima para receber o link de redefinição.');
      return;
    }
    setError(null);
    try {
      await firebaseSendPasswordReset(email.trim());
      setSuccessMsg(`Link de redefinição de senha enviado para ${email.trim()}. Verifique sua caixa de entrada e spam.`);
    } catch (err: unknown) {
      console.error('Reset password error:', err);
      setError(handleFirebaseError(err));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setError('Por favor, informe seu e-mail e sua senha de acesso.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);

    if (firebaseReady) {
      try {
        const loggedUser = await firebaseSignIn(email.trim(), password);
        saveUserProfile(loggedUser);
        saveCurrentUser(loggedUser);
        onLoginSuccess(loggedUser);
      } catch (err) {
        console.warn('Firebase Auth sign-in rejected:', (err as Error)?.message || err);
        setError(handleFirebaseError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Fallback if running offline / demo mode without Firebase
    const registeredBrokers = loadAllBrokers();
    const existingBroker = registeredBrokers.find(b => b.email.toLowerCase() === email.trim().toLowerCase());

    if (existingBroker) {
      const userToLogin: UserType = {
        id: existingBroker.id,
        name: existingBroker.name,
        firstName: existingBroker.firstName || existingBroker.name.split(' ')[0],
        lastName: existingBroker.lastName || existingBroker.name.split(' ').slice(1).join(' '),
        email: existingBroker.email,
        susep: existingBroker.susep || '',
        brokerageName: existingBroker.brokerageName || 'Corretora de Seguros',
        brokerageId: existingBroker.brokerageId,
        role: existingBroker.role || (existingBroker.id === ADMIN_USER_ID ? 'admin' : 'broker'),
        isAdmin: existingBroker.role === 'admin' || existingBroker.id === ADMIN_USER_ID || isUserAdmin({ email: existingBroker.email }),
        status: existingBroker.status || 'active'
      };
      saveUserProfile(userToLogin);
      saveCurrentUser(userToLogin);
      onLoginSuccess(userToLogin);
    } else {
      setError('E-mail ou senha inválidos.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors">
      
      {/* Absolute Top Theme Toggle */}
      <div className="absolute top-6 right-6 z-30">
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex items-center justify-center p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 shadow-sm transition-all cursor-pointer backdrop-blur-md"
            title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>
        )}
      </div>

      {/* Split Screen Container */}
      <div className="w-full min-h-screen grid grid-cols-1 lg:grid-cols-12">
        
        {/* Left Column: Branding & Presentation (5 cols on lg) */}
        <div className="hidden lg:flex lg:col-span-5 relative bg-slate-950 text-white p-10 xl:p-14 flex-col justify-between overflow-hidden border-r border-slate-800/80">
          {/* Ambient lighting / Glows */}
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 opacity-90" />

          {/* Top Brand */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-600/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="text-lg font-black tracking-tight text-white">
              GestãoCorretor
            </span>
          </div>

          {/* Center Value Proposition */}
          <div className="relative z-10 my-auto py-8 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold tracking-wide">
              <BadgeCheck className="w-3.5 h-3.5" />
              <span>Enterprise CRM & Insurance Hub</span>
            </div>

            <h2 className="text-3xl xl:text-4xl font-black tracking-tight leading-tight text-white">
              A plataforma inteligente para gestão de clientes, renovações e controle de comissões.
            </h2>

            <p className="text-slate-400 text-sm leading-relaxed max-w-md">
              Centralize suas apólices, antecipe vencimentos de seguros auto e maximize a produtividade da sua equipe com automação de ponta a ponta.
            </p>

            {/* Glassmorphism Pillars */}
            <div className="space-y-3.5 pt-4">
              <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-inner">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5 border border-cyan-500/20">
                  <BellRing className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Alertas Inteligentes</h3>
                  <p className="text-[11px] text-slate-400 leading-normal mt-0.5">Notificações automáticas de 10, 15 e 30 dias para renovações de apólices.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-inner">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0 mt-0.5 border border-blue-500/20">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Gestão de Comissões</h3>
                  <p className="text-[11px] text-slate-400 leading-normal mt-0.5">Cálculo e divisão automática por apólice e corretor credenciado.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-inner">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5 border border-indigo-500/20">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Storage na Nuvem</h3>
                  <p className="text-[11px] text-slate-400 leading-normal mt-0.5">Armazenamento seguro de apólices, termos e comprovantes em tempo real.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="relative z-10 text-xs text-slate-500 flex items-center justify-between pt-6 border-t border-slate-800/60">
            <span>© {new Date().getFullYear()} GestãoCorretor</span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <LockKeyhole className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ambiente Seguro</span>
            </span>
          </div>
        </div>

        {/* Right Column: Login Form (7 cols on lg, full on mobile) */}
        <div className="col-span-1 lg:col-span-7 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16 bg-white dark:bg-slate-900/40 relative">
          
          <div className="w-full max-w-md space-y-6">
            
            {/* Mobile Header Branding */}
            <div className="lg:hidden text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/30 mb-2">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white">GestãoCorretor</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">CRM automotivo & controle de comissões</p>
            </div>

            {/* Form Title & Subtitle */}
            <div className="space-y-1.5 text-center lg:text-left">
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Acessar Plataforma
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Entre com suas credenciais autorizadas
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <div className="flex-1 leading-relaxed">
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
                <BadgeCheck className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Email Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  E-mail Cadastrado *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    id="input-login-email"
                    type="email"
                    required
                    placeholder="seu-email@gestaocorretor.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 dark:text-white transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Senha de Acesso *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    id="input-login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 dark:text-white transition-all shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me & Forgot password row */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 dark:bg-slate-800 dark:border-slate-700 cursor-pointer"
                  />
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Lembrar deste dispositivo</span>
                </label>

                <button
                  type="button"
                  onClick={handleSendResetPassword}
                  className="font-semibold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                >
                  Esqueceu a senha?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="btn-login-submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-98 disabled:opacity-60 text-white text-xs sm:text-sm font-bold shadow-lg shadow-cyan-600/25 transition-all cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar no Sistema</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

            </form>

            {/* Secure connection subtext */}
            <div className="pt-4 text-center">
              <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1.5 font-medium">
                <span>🔒 Conexão segura e criptografada (SSL/TLS)</span>
              </p>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

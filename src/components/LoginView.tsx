import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  Sparkles, 
  Sun, 
  Moon, 
  Loader2, 
  AlertCircle, 
  Flame, 
  BadgeCheck,
  Eye,
  EyeOff,
  KeyRound,
  Info,
  Database
} from 'lucide-react';
import { User as UserType } from '../types';
import { DEFAULT_USER, saveCurrentUser, saveUserProfile } from '../services/storage';
import { isUserAdmin } from '../utils/insuranceUtils';
import { 
  firebaseSignIn, 
  firebaseSendPasswordReset,
  isFirebaseConfigured, 
  getFirebaseConfig, 
  saveCustomFirebaseConfig, 
  FirebaseClientConfig 
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isInvalidCredential, setIsInvalidCredential] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Firebase manual config modal / drawer
  const [showConfigModal, setShowConfigModal] = useState(false);
  const currentConfig = getFirebaseConfig();
  const [apiKeyInput, setApiKeyInput] = useState(currentConfig?.apiKey || '');
  const [projectIdInput, setProjectIdInput] = useState(currentConfig?.projectId || '');
  const [storageBucketInput, setStorageBucketInput] = useState(currentConfig?.storageBucket || '');
  const [authDomainInput, setAuthDomainInput] = useState(currentConfig?.authDomain || '');
  const [configSavedNotice, setConfigSavedNotice] = useState(false);

  const firebaseReady = isFirebaseConfigured();

  const handleFirebaseError = (err: unknown): string => {
    if (!err || typeof err !== 'object') return 'Ocorreu um erro inesperado ao autenticar.';
    
    const message = (err as { code?: string; message?: string }).code || (err as Error).message || '';
    
    if (message.includes('auth/invalid-credential') || message.includes('auth/wrong-password') || message.includes('auth/user-not-found')) {
      setIsInvalidCredential(true);
      return 'E-mail ou senha incorretos. Caso ainda não possua acesso liberado, solicite ao Administrador.';
    }
    if (message.includes('auth/invalid-email')) {
      return 'O formato do e-mail digitado é inválido.';
    }
    if (message.includes('auth/network-request-failed')) {
      return 'Falha de conexão com os servidores de autenticação. Verifique sua conexão com a internet.';
    }
    if (message.includes('auth/too-many-requests')) {
      return 'Muitas tentativas sem sucesso. Por segurança, tente novamente em instantes ou redefina sua senha.';
    }
    if (message.includes('auth/operation-not-allowed')) {
      return 'Autenticação por Email/Senha não está habilitada no console do Firebase.';
    }

    return (err as Error).message || 'Erro ao comunicar com o servidor de autenticação.';
  };

  const handleSendResetPassword = async () => {
    if (!email.trim()) {
      setError('Por favor, informe seu e-mail no campo acima para receber o link de redefinição.');
      return;
    }
    setResetLoading(true);
    setError(null);
    try {
      await firebaseSendPasswordReset(email.trim());
      setSuccessMsg(`Link de redefinição de senha enviado para ${email.trim()}. Verifique sua caixa de entrada e spam.`);
    } catch (err: unknown) {
      console.error('Reset password error:', err);
      setError(handleFirebaseError(err));
    } finally {
      setResetLoading(false);
    }
  };

  const handleLocalLoginFallback = () => {
    const emailNamePart = email.split('@')[0].replace(/[._-]/g, ' ');
    const autoFirstName = emailNamePart.split(/\s+/)[0] || 'Corretor';
    const autoLastName = emailNamePart.split(/\s+/).slice(1).join(' ') || '';
    const autoFullName = [autoFirstName, autoLastName].filter(Boolean).join(' ') || 'Corretor';

    const localUser: UserType = {
      id: `usr-${email.trim().replace(/[^a-zA-Z0-9]/g, '_') || Date.now()}`,
      name: autoFullName,
      firstName: autoFirstName,
      lastName: autoLastName,
      email: email.trim(),
      susep: '',
      brokerageName: 'Minha Corretora de Seguros',
      isAdmin: isUserAdmin({ email: email.trim() })
    };

    saveUserProfile(localUser);
    saveCurrentUser(localUser);
    setSuccessMsg('Entrando no modo local seguro...');
    setTimeout(() => onLoginSuccess(localUser), 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsInvalidCredential(false);

    if (!email.trim() || !password) {
      setError('Por favor, informe seu e-mail e sua senha de acesso.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);

    // If Firebase is configured, perform real Firebase Auth
    if (firebaseReady) {
      try {
        const loggedUser = await firebaseSignIn(email.trim(), password);
        saveUserProfile(loggedUser);
        saveCurrentUser(loggedUser);
        onLoginSuccess(loggedUser);
      } catch (err) {
        console.error('Firebase Auth error:', err);
        setError(handleFirebaseError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Fallback if user hasn't connected Firebase yet
    const emailNamePart = email.split('@')[0].replace(/[._-]/g, ' ');
    const firstName = emailNamePart.split(/\s+/)[0] || 'Corretor';
    const lastName = emailNamePart.split(/\s+/).slice(1).join(' ') || '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Corretor';

    const fallbackUser: UserType = {
      id: `usr-${Date.now()}`,
      name: fullName,
      firstName,
      lastName,
      email: email.trim(),
      susep: DEFAULT_USER.susep || '',
      brokerageName: DEFAULT_USER.brokerageName || 'Corretora de Seguros',
      isAdmin: isUserAdmin({ email: email.trim() })
    };
    saveUserProfile(fallbackUser);
    saveCurrentUser(fallbackUser);
    onLoginSuccess(fallbackUser);
    setLoading(false);
  };

  // Demo Mode: 100% isolated mock storage, no access to real broker database
  const handleQuickDemoLogin = () => {
    saveUserProfile(DEFAULT_USER);
    saveCurrentUser(DEFAULT_USER);
    onLoginSuccess(DEFAULT_USER);
  };

  const handleSaveFirebaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim() || !projectIdInput.trim()) {
      alert('Preencha ao menos a API Key e o Project ID do Firebase.');
      return;
    }

    const config: FirebaseClientConfig = {
      apiKey: apiKeyInput.trim(),
      projectId: projectIdInput.trim(),
      authDomain: authDomainInput.trim() || `${projectIdInput.trim()}.firebaseapp.com`,
      storageBucket: storageBucketInput.trim() || `${projectIdInput.trim()}.appspot.com`,
    };

    saveCustomFirebaseConfig(config);
    setConfigSavedNotice(true);
    setTimeout(() => {
      setConfigSavedNotice(false);
      setShowConfigModal(false);
      window.location.reload();
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden transition-colors">
      
      {/* Top action controls: Theme toggle & Firebase Settings */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          type="button"
          id="btn-firebase-config-toggle"
          onClick={() => setShowConfigModal(true)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border shadow-xs transition-all cursor-pointer ${
            firebaseReady 
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' 
              : 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
          }`}
          title="Configuração das credenciais do Firebase"
        >
          <Flame className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {firebaseReady ? 'Firebase Conectado' : 'Conectar Firebase'}
          </span>
        </button>

        {onToggleTheme && (
          <button
            type="button"
            id="btn-login-theme-toggle"
            onClick={onToggleTheme}
            className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-xs transition-all cursor-pointer"
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

      {/* Subtle background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-cyan-600/10 dark:bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-xl shadow-cyan-600/30 mb-3">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            GestãoCorretor
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            CRM automotivo & controle de comissões com sincronização e arquivos na nuvem.
          </p>

          {/* Firebase Status Badge */}
          <div className="mt-3 flex justify-center">
            {firebaseReady ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                Firebase Auth & Firestore Habilitados
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfigModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 transition-colors cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                <span>Clique para conectar ao seu Firebase Console</span>
              </button>
            )}
          </div>
        </div>

        {/* Card Box */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xl">
          
          <div className="mb-5 text-center">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Acesso ao Sistema
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Entre com suas credenciais autorizadas
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>

              {isInvalidCredential && (
                <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/60 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={resetLoading}
                    onClick={handleSendResetPassword}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/50 dark:hover:bg-rose-900/80 text-rose-800 dark:text-rose-200 text-xs font-semibold transition-all cursor-pointer"
                  >
                    {resetLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <KeyRound className="w-3.5 h-3.5" />
                    )}
                    <span>Redefinir Senha por E-mail</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLocalLoginFallback}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-all cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Testar no Modo Local</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <BadgeCheck className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                E-mail Cadastrado *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="input-login-email"
                  type="email"
                  required
                  placeholder="seu-email@gestaocorretor.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Senha de Acesso *
                </label>
                <button
                  type="button"
                  onClick={handleSendResetPassword}
                  className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="input-login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="btn-login-submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-98 disabled:opacity-60 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 transition-all cursor-pointer mt-3"
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

          {/* Discrete Administrator Notice regarding new registrations */}
          <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
            <Info className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              O cadastro de novos corretores é gerenciado exclusivamente pelo <strong>Administrador</strong> do sistema.
            </p>
          </div>

          {/* Demonstration Mode Action */}
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
            <button
              type="button"
              id="btn-demo-quick-login"
              onClick={handleQuickDemoLogin}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700/90 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer group"
            >
              <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform" />
              <span>Acessar Modo Demonstração (Dados Fictícios)</span>
            </button>

            <p className="text-[10.5px] text-slate-400 text-center flex items-center justify-center gap-1 pt-1">
              <Database className="w-3 h-3 text-slate-400" />
              <span>O modo demo é 100% local e isolado das carteiras reais dos corretores.</span>
            </p>
          </div>

        </div>

        {/* Feature Highlights beneath */}
        <div className="mt-6 grid grid-cols-3 gap-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
          <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">Alertas</span>
            <span>10, 15 e 30 dias</span>
          </div>
          <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">Comissões</span>
            <span>Cálculo automático</span>
          </div>
          <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">Storage</span>
            <span>Apólices na Nuvem</span>
          </div>
        </div>

      </div>

      {/* Modal to configure Firebase Credentials directly in UI */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                <Flame className="w-5 h-5 text-amber-500" />
                <span>Configurar Firebase Console (Web App)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
              Você pode inserir as credenciais geradas no <strong>Firebase Console</strong> (Configurações do Projeto &gt; Seus Aplicativos &gt; Web). Se já tiver configurado via variáveis de ambiente no <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-cyan-600">.env</code>, elas serão carregadas automaticamente.
            </p>

            <form onSubmit={handleSaveFirebaseConfig} className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  API Key (VITE_FIREBASE_API_KEY) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="AIzaSy..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Project ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="meu-projeto-firebase"
                    value={projectIdInput}
                    onChange={(e) => setProjectIdInput(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Auth Domain
                  </label>
                  <input
                    type="text"
                    placeholder="meu-projeto.firebaseapp.com"
                    value={authDomainInput}
                    onChange={(e) => setAuthDomainInput(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Storage Bucket
                </label>
                <input
                  type="text"
                  placeholder="meu-projeto.appspot.com"
                  value={storageBucketInput}
                  onChange={(e) => setStorageBucketInput(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                />
              </div>

              {configSavedNotice && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-emerald-600" />
                  <span>Configurações salvas! Recarregando aplicação...</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm transition-all cursor-pointer"
                >
                  Salvar e Conectar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  X, 
  User as UserIcon, 
  Building2, 
  ShieldCheck, 
  Mail, 
  Lock, 
  Save, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Flame,
  Eye,
  EyeOff,
  Crown,
  ArrowRight
} from 'lucide-react';
import { User } from '../types';
import { 
  firebaseUpdateUserProfile, 
  firebaseUpdateUserPassword, 
  isFirebaseConfigured 
} from '../services/firebase';
import { saveUserProfile } from '../services/storage';
import { getUserFirstName, isUserAdmin } from '../utils/insuranceUtils';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onUpdateUser: (updatedUser: User) => void;
  onNavigateToAdmin?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  onNavigateToAdmin
}) => {
  // Personal & Professional Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [brokerageName, setBrokerageName] = useState('');
  const [susep, setSusep] = useState('');

  // Password Update Fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // States for feedback & loaders
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const isFirebase = isFirebaseConfigured();

  // Populate form when modal opens or user changes
  useEffect(() => {
    if (isOpen && currentUser) {
      const derivedFirst = currentUser.firstName || getUserFirstName(currentUser);
      const derivedLast = currentUser.lastName !== undefined 
        ? currentUser.lastName 
        : (currentUser.name ? currentUser.name.split(/\s+/).slice(1).join(' ') : '');

      setFirstName(derivedFirst);
      setLastName(derivedLast);
      setEmail(currentUser.email || '');
      setBrokerageName(currentUser.brokerageName || '');
      setSusep(currentUser.susep || '');

      // Reset loader & feedback states explicitly upon modal open
      setSavingProfile(false);
      setSavingPassword(false);
      setNewPassword('');
      setConfirmPassword('');
      setProfileSuccess(null);
      setProfileError(null);
      setPasswordSuccess(null);
      setPasswordError(null);
    }
  }, [isOpen, currentUser]);

  if (!isOpen || !currentUser) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (!firstName.trim()) {
      setProfileError('O campo "Nome" é obrigatório.');
      return;
    }

    if (!email.trim()) {
      setProfileError('O campo "E-mail" é obrigatório.');
      return;
    }

    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');

    const updatedUser: User = {
      ...currentUser,
      name: fullName,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      brokerageName: brokerageName.trim() || 'Corretora de Seguros',
      susep: susep.trim()
    };

    // 1. Immediate local state & storage update for instant UI responsiveness
    saveUserProfile(updatedUser);
    onUpdateUser(updatedUser);

    setSavingProfile(true);

    try {
      if (isFirebase) {
        await firebaseUpdateUserProfile(updatedUser);
      }

      setProfileSuccess('Perfil atualizado com sucesso!');
      
      // Close modal smoothly after brief confirmation
      setTimeout(() => {
        setProfileSuccess(null);
        onClose();
      }, 300);
    } catch (err: unknown) {
      console.error('Failed to update profile:', err);
      const errMsg = (err as Error)?.message || 'Erro ao atualizar dados no Firebase.';
      if (errMsg.includes('requires-recent-login')) {
        setProfileError('A alteração de e-mail requer um login recente por motivos de segurança. Por favor, saia e faça login novamente.');
      } else {
        setProfileError(errMsg);
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!newPassword) {
      setPasswordError('Digite a nova senha.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas digitadas não coincidem.');
      return;
    }

    setSavingPassword(true);

    try {
      if (isFirebase) {
        await firebaseUpdateUserPassword(newPassword);
      }
      setPasswordSuccess('Senha alterada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
      
      setTimeout(() => {
        setPasswordSuccess(null);
        onClose();
      }, 400);
    } catch (err: unknown) {
      console.error('Failed to update password:', err);
      const errMsg = (err as Error)?.message || 'Erro ao alterar a senha.';
      if (errMsg.includes('requires-recent-login')) {
        setPasswordError('Por segurança, a alteração de senha exige login recente. Por favor, saia da conta e faça login novamente antes de alterar a senha.');
      } else if (errMsg.includes('weak-password')) {
        setPasswordError('Senha muito fraca. Utilize no mínimo 6 caracteres com números ou símbolos.');
      } else {
        setPasswordError(errMsg);
      }
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-600/20">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Perfil do Corretor
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span>Gerencie suas informações profissionais e credenciais de acesso</span>
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
            id="btn-close-profile-modal"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[calc(85vh-120px)] overflow-y-auto">
          
          {/* Admin Banner & Shortcut if user is Admin */}
          {isUserAdmin(currentUser) && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 dark:border-amber-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Privilégio de Administrador Master</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Você possui permissão para gerenciar todos os corretores e suas contas.
                  </p>
                </div>
              </div>
              {onNavigateToAdmin && (
                <button
                  type="button"
                  id="btn-profile-go-admin"
                  onClick={() => {
                    onClose();
                    onNavigateToAdmin();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap"
                >
                  <span>Acessar Painel Admin</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Form: Profile Information */}
          <form id="form-broker-profile" onSubmit={handleSaveProfile} className="space-y-5">
            
            {/* Alerts for Profile Form */}
            {profileError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{profileError}</span>
              </div>
            )}

            {profileSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {/* Section: Informações Pessoais */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                <UserIcon className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                Informações Pessoais
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome *
                  </label>
                  <input
                    id="profile-input-firstname"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ex: Carlos"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sobrenome
                  </label>
                  <input
                    id="profile-input-lastname"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ex: Eduardo Silva"
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
                      id="profile-input-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="corretor@gestaocorretor.com.br"
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Dados Profissionais */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                Dados Profissionais
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome da Corretora
                  </label>
                  <input
                    id="profile-input-brokerage"
                    type="text"
                    value={brokerageName}
                    onChange={(e) => setBrokerageName(e.target.value)}
                    placeholder="Ex: Silva Corretora de Seguros"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Registro SUSEP
                  </label>
                  <input
                    id="profile-input-susep"
                    type="text"
                    value={susep}
                    onChange={(e) => setSusep(e.target.value)}
                    placeholder="Ex: 10.203948/2024"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Save Profile Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                id="btn-save-profile-data"
                disabled={savingProfile}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 active:scale-95 disabled:opacity-60 text-white text-xs font-bold shadow-md shadow-cyan-600/25 transition-all cursor-pointer"
              >
                {savingProfile ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando Alterações...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar Alterações do Perfil</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Section: Alteração de Senha (Firebase Auth) */}
          <div className="pt-5 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Segurança & Alteração de Senha
            </h3>

            {/* Alerts for Password Form */}
            {passwordError && (
              <div className="mb-3.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="mb-3.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form id="form-broker-password" onSubmit={handleUpdatePassword} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Nova Senha
                    </label>
                    <span className="text-[10px] text-slate-400">Min. 6 caracteres</span>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      id="profile-input-new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-9 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Confirmar Nova Senha
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      id="profile-input-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  id="btn-update-password"
                  disabled={savingPassword || !newPassword}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  {savingPassword ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Atualizando Senha...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Atualizar Senha no Firebase</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
            <span>ID do Corretor: {currentUser.id.substring(0, 16)}...</span>
          </div>

          <button
            type="button"
            id="btn-close-profile-footer"
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

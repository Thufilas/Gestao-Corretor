import React from 'react';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  Users, 
  AlertTriangle, 
  Cake, 
  LogOut, 
  Moon, 
  Sun, 
  User as UserIcon,
  Crown,
  Briefcase
} from 'lucide-react';
import { User } from '../types';
import { getUserFirstName, canAccessAdminPanel, isMasterAdmin, isSubAdmin } from '../utils/insuranceUtils';

interface NavbarProps {
  currentTab: 'dashboard' | 'clients' | 'alerts' | 'birthdays' | 'admin';
  setCurrentTab: (tab: 'dashboard' | 'clients' | 'alerts' | 'birthdays' | 'admin') => void;
  user: User | null;
  onLogout: () => void;
  onOpenProfile?: () => void;
  onOpenNewClient?: () => void;
  onOpenImportExport?: () => void;
  onOpenDocs?: () => void;
  onOpenFirebaseTroubleshoot?: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  criticalAlertsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  user,
  onLogout,
  onOpenProfile,
  theme,
  onToggleTheme,
  criticalAlertsCount
}) => {
  const hasAdminAccess = canAccessAdminPanel(user);
  const isMaster = isMasterAdmin(user);
  const isSub = isSubAdmin(user);

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo and Brand */}
          <div className="flex items-center gap-3 mr-4 lg:mr-8">
            <button 
              id="brand-logo-btn"
              onClick={() => setCurrentTab('dashboard')}
              className="flex items-center gap-3 group text-left cursor-pointer focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-cyan-600/20 group-hover:scale-105 transition-transform shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex flex-col justify-center">
                <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight leading-snug truncate max-w-[170px] sm:max-w-[220px]">
                  {user?.brokerageName || 'Corretora de Seguros'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-none mt-0.5">
                  GestãoCorretor CRM
                </span>
              </div>
            </button>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <button
              id="nav-tab-dashboard"
              onClick={() => setCurrentTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                currentTab === 'dashboard'
                  ? 'bg-white dark:bg-slate-700 text-cyan-700 dark:text-cyan-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
              }`}
            >
              <LayoutDashboard className="w-5 h-5 shrink-0" />
              <span>Dashboard</span>
            </button>

            <button
              id="nav-tab-clients"
              onClick={() => setCurrentTab('clients')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                currentTab === 'clients'
                  ? 'bg-white dark:bg-slate-700 text-cyan-700 dark:text-cyan-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
              }`}
            >
              <Users className="w-5 h-5 shrink-0" />
              <span>Clientes</span>
            </button>

            <button
              id="nav-tab-alerts"
              onClick={() => setCurrentTab('alerts')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap relative cursor-pointer ${
                currentTab === 'alerts'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
              }`}
            >
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Renovações</span>
              {criticalAlertsCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                  {criticalAlertsCount}
                </span>
              )}
            </button>

            <button
              id="nav-tab-birthdays"
              onClick={() => setCurrentTab('birthdays')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                currentTab === 'birthdays'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
              }`}
            >
              <Cake className="w-5 h-5 shrink-0" />
              <span>Aniversariantes</span>
            </button>

            {/* Exclusive Admin Navigation Tab for Master Admin and Sub-Admin */}
            {hasAdminAccess && (
              <button
                id="nav-tab-admin"
                onClick={() => setCurrentTab('admin')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  currentTab === 'admin'
                    ? isMaster 
                      ? 'bg-amber-500 text-white shadow-xs font-bold'
                      : 'bg-cyan-600 text-white shadow-xs font-bold'
                    : isMaster
                      ? 'text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 hover:bg-amber-100/80 dark:hover:bg-amber-950/60'
                      : 'text-cyan-700 dark:text-cyan-300 hover:text-cyan-800 dark:hover:text-cyan-200 hover:bg-cyan-100/80 dark:hover:bg-cyan-950/60'
                }`}
              >
                {isMaster ? (
                  <Crown className="w-4 h-4 shrink-0 text-amber-300" />
                ) : (
                  <ShieldCheck className="w-4 h-4 shrink-0 text-cyan-300" />
                )}
                <span>{isMaster ? 'Painel Admin' : 'Gestão da Equipe'}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  currentTab === 'admin'
                    ? 'bg-black/20 text-white'
                    : isMaster
                      ? 'bg-amber-200/80 dark:bg-amber-950/90 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800/80'
                      : 'bg-cyan-200/80 dark:bg-cyan-950/90 text-cyan-800 dark:text-cyan-300 border border-cyan-300/80 dark:border-cyan-800/80'
                }`}>
                  {isMaster ? 'Master' : 'Gestor'}
                </span>
              </button>
            )}
          </nav>

          {/* Right Action Controls & User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* User Profile Trigger Button */}
            <button
              id="btn-nav-user-profile"
              type="button"
              onClick={onOpenProfile}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent hover:border-slate-200 dark:hover:border-slate-700/80 transition-all cursor-pointer group"
              title="Editar Perfil do Corretor"
            >
              <div className={`w-8 h-8 rounded-xl text-white flex items-center justify-center text-xs font-bold shadow-xs group-hover:scale-105 transition-transform shrink-0 ${
                isMaster 
                  ? 'bg-gradient-to-tr from-amber-500 to-amber-600' 
                  : isSub
                    ? 'bg-gradient-to-tr from-purple-600 to-indigo-600'
                    : 'bg-gradient-to-tr from-cyan-600 to-blue-600'
              }`}>
                {isMaster ? (
                  <Crown className="w-4 h-4 text-white" />
                ) : isSub ? (
                  <ShieldCheck className="w-4 h-4 text-white" />
                ) : (
                  <UserIcon className="w-4 h-4 text-white" />
                )}
              </div>

              <div className="flex items-center gap-2">
                <span id="nav-user-first-name" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors whitespace-nowrap">
                  {getUserFirstName(user)}
                </span>
                {isMaster && (
                  <span className="px-1.5 py-0.5 text-[10px] font-extrabold rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800/80 uppercase tracking-wider whitespace-nowrap">
                    ADMIN
                  </span>
                )}
                {isSub && (
                  <span className="px-1.5 py-0.5 text-[10px] font-extrabold rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300 dark:border-purple-800/80 uppercase tracking-wider whitespace-nowrap">
                    GESTOR
                  </span>
                )}
              </div>
            </button>

            {/* Separator */}
            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

            {/* Dark/Light Theme Toggle */}
            <button
              id="btn-nav-theme-toggle"
              onClick={onToggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 transition-all cursor-pointer"
              title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* Logout Button */}
            <button
              id="btn-nav-logout"
              onClick={onLogout}
              className="p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-800/40 transition-all cursor-pointer"
              title="Sair do Sistema"
            >
              <LogOut className="w-4 h-4" />
            </button>

          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-200 dark:border-slate-800 text-xs">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`flex flex-col items-center py-1 px-2 font-medium ${
              currentTab === 'dashboard' ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Painel</span>
          </button>
          <button
            onClick={() => setCurrentTab('clients')}
            className={`flex flex-col items-center py-1 px-2 font-medium ${
              currentTab === 'clients' ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Clientes</span>
          </button>
          <button
            onClick={() => setCurrentTab('alerts')}
            className={`flex flex-col items-center py-1 px-2 font-medium relative ${
              currentTab === 'alerts' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Alertas</span>
            {criticalAlertsCount > 0 && (
              <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>
          <button
            onClick={() => setCurrentTab('birthdays')}
            className={`flex flex-col items-center py-1 px-2 font-medium ${
              currentTab === 'birthdays' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-500'
            }`}
          >
            <Cake className="w-4 h-4" />
            <span>Niver</span>
          </button>

          {hasAdminAccess && (
            <button
              onClick={() => setCurrentTab('admin')}
              className={`flex flex-col items-center py-1 px-2 font-bold ${
                currentTab === 'admin' 
                  ? isMaster ? 'text-amber-600 dark:text-amber-400' : 'text-cyan-600 dark:text-cyan-400'
                  : 'text-slate-500'
              }`}
            >
              {isMaster ? <Crown className="w-4 h-4 text-amber-500" /> : <ShieldCheck className="w-4 h-4 text-cyan-500" />}
              <span>{isMaster ? 'Admin' : 'Equipe'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

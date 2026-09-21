import React from 'react';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  Users, 
  AlertTriangle, 
  Cake, 
  FileSpreadsheet, 
  BookOpen, 
  LogOut, 
  Moon, 
  Sun, 
  User as UserIcon,
  Plus,
  Flame,
  ShieldAlert,
  Crown
} from 'lucide-react';
import { User } from '../types';
import { isFirebaseConfigured } from '../services/firebase';
import { getUserFirstName, isUserAdmin } from '../utils/insuranceUtils';

interface NavbarProps {
  currentTab: 'dashboard' | 'clients' | 'alerts' | 'birthdays' | 'admin';
  setCurrentTab: (tab: 'dashboard' | 'clients' | 'alerts' | 'birthdays' | 'admin') => void;
  user: User | null;
  onLogout: () => void;
  onOpenProfile?: () => void;
  onOpenNewClient: () => void;
  onOpenImportExport: () => void;
  onOpenDocs: () => void;
  onOpenFirebaseTroubleshoot: () => void;
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
  onOpenNewClient,
  onOpenImportExport,
  onOpenDocs,
  onOpenFirebaseTroubleshoot,
  theme,
  onToggleTheme,
  criticalAlertsCount
}) => {
  const isAdmin = isUserAdmin(user);

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <button 
              id="brand-logo-btn"
              onClick={() => setCurrentTab('dashboard')}
              className="flex items-center gap-2.5 group text-left cursor-pointer focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-cyan-600/20 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">GestãoCorretor</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">Auto CRM</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-[170px] sm:max-w-xs">
                  {user?.brokerageName || 'Corretora de Seguros'}
                </p>
              </div>
            </button>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <button
              id="nav-tab-dashboard"
              onClick={() => setCurrentTab('dashboard')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentTab === 'dashboard'
                  ? 'bg-white dark:bg-slate-700 text-cyan-700 dark:text-cyan-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>

            <button
              id="nav-tab-clients"
              onClick={() => setCurrentTab('clients')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentTab === 'clients'
                  ? 'bg-white dark:bg-slate-700 text-cyan-700 dark:text-cyan-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Clientes & Apólices</span>
            </button>

            <button
              id="nav-tab-alerts"
              onClick={() => setCurrentTab('alerts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative cursor-pointer ${
                currentTab === 'alerts'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
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
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentTab === 'birthdays'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Cake className="w-3.5 h-3.5" />
              <span>Aniversariantes</span>
            </button>

            {/* Exclusive Admin Navigation Tab for System Administrator */}
            {isAdmin && (
              <button
                id="nav-tab-admin"
                onClick={() => setCurrentTab('admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentTab === 'admin'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs'
                    : 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                }`}
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Painel Admin</span>
              </button>
            )}
          </nav>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Quick Add Client Button */}
            <button
              id="btn-quick-new-client"
              onClick={onOpenNewClient}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 active:scale-95 text-white text-xs font-semibold shadow-sm shadow-cyan-600/25 transition-all cursor-pointer"
              title="Cadastrar Novo Cliente"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Cliente</span>
            </button>

            {/* Import / Export Planilha */}
            <button
              id="btn-nav-import-export"
              onClick={onOpenImportExport}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
              title="Importar ou Exportar Planilha Excel/PDF"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden lg:inline">Planilhas</span>
            </button>

            {/* Firebase Storage Diagnostic & Troubleshoot */}
            <button
              id="btn-nav-firebase-troubleshoot"
              onClick={onOpenFirebaseTroubleshoot}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-xs font-medium border border-amber-300/80 dark:border-amber-700/60 transition-all cursor-pointer"
              title="Diagnóstico e Resolução do Firebase Storage"
            >
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500/20" />
              <span className="hidden md:inline">Firebase</span>
            </button>

            {/* Architecture & Tutorial Docs */}
            <button
              id="btn-nav-architecture-docs"
              onClick={onOpenDocs}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
              title="Guia de Arquitetura & Como Rodar"
            >
              <BookOpen className="w-4 h-4" />
            </button>

            {/* Dark/Light toggle */}
            <button
              id="btn-nav-theme-toggle"
              onClick={onToggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
              title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* User Profile & Logout */}
            <div className="flex items-center pl-1 border-l border-slate-200 dark:border-slate-700">
              <button
                id="btn-nav-user-profile"
                type="button"
                onClick={onOpenProfile}
                className="hidden xl:flex items-center gap-2 mr-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right cursor-pointer group"
                title="Editar Perfil do Corretor"
              >
                <div className={`w-7 h-7 rounded-lg text-white flex items-center justify-center text-xs font-bold shadow-xs group-hover:scale-105 transition-transform ${
                  isAdmin 
                    ? 'bg-gradient-to-tr from-amber-500 to-amber-700' 
                    : 'bg-gradient-to-tr from-cyan-600 to-blue-600'
                }`}>
                  {isAdmin ? <Crown className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
                </div>
                <div className="flex flex-col items-start text-left">
                  <div className="flex items-center gap-1.5">
                    {isAdmin ? (
                      <span className="text-[10px] font-extrabold px-1 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        ADMIN
                      </span>
                    ) : (
                      isFirebaseConfigured() && (
                        <span title="Firebase Auth & Storage Ativos">
                          <Flame className="w-3 h-3 text-amber-500 fill-amber-500/30" />
                        </span>
                      )
                    )}
                    <span id="nav-user-first-name" className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                      {getUserFirstName(user)}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {isAdmin ? 'Administrador Master' : (user?.susep ? `SUSEP ${user.susep}` : (isFirebaseConfigured() ? 'Firebase Autenticado' : 'Modo Demo'))}
                  </span>
                </div>
              </button>

              {/* Mobile Profile Trigger */}
              <button
                id="btn-nav-user-profile-mobile"
                type="button"
                onClick={onOpenProfile}
                className="xl:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                title="Editar Perfil do Corretor"
              >
                {isAdmin ? <Crown className="w-4 h-4 text-amber-500" /> : <UserIcon className="w-4 h-4" />}
              </button>

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

          {isAdmin && (
            <button
              onClick={() => setCurrentTab('admin')}
              className={`flex flex-col items-center py-1 px-2 font-bold ${
                currentTab === 'admin' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'
              }`}
            >
              <Crown className="w-4 h-4 text-amber-500" />
              <span>Admin</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

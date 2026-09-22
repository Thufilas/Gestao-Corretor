import React, { useState, useEffect } from 'react';
import { Client, PolicyDocument } from './types';
import { 
  loadClients, 
  saveClients, 
  loadTheme, 
  saveTheme, 
  deleteDocumentFile, 
  seedSampleClientsForUser 
} from './services/storage';
import { 
  deletePolicyFromFirebaseStorage, 
  fetchFirestoreClientsByBrokerage, 
  saveClientToFirestore, 
  deleteClientFromFirestore, 
  isFirebaseConfigured 
} from './services/firebase';
import { getExpiryAlerts } from './utils/insuranceUtils';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { ClientList } from './components/ClientList';
import { AlertsView } from './components/AlertsView';
import { BirthdaysView } from './components/BirthdaysView';
import { ClientModal } from './components/ClientModal';
import { ClientDetailModal } from './components/ClientDetailModal';
import { DocumentViewerModal } from './components/DocumentViewerModal';
import { ImportExportModal } from './components/ImportExportModal';
import { ArchitectureDocsModal } from './components/ArchitectureDocsModal';
import { FirebaseTroubleshootModal } from './components/FirebaseTroubleshootModal';
import { ProfileModal } from './components/ProfileModal';
import { LoginView } from './components/LoginView';
import { AdminView } from './components/AdminView';
import { SubAdminBrokerageView } from './components/SubAdminBrokerageView';
import { ShieldCheck, Loader2 } from 'lucide-react';

export default function App() {
  const { 
    user: currentUser, 
    loading: isAuthLoading, 
    isMaster,
    isSubAdmin: isSubFromAuth,
    hasAdminAccess,
    login: handleLogin, 
    logout: handleLogout, 
    updateUser: handleUpdateUser, 
    refreshProfile
  } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadTheme());
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'clients' | 'alerts' | 'birthdays' | 'admin' | 'corretora'>('dashboard');

  // Modals state
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [clientForDetail, setClientForDetail] = useState<Client | null>(null);

  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);
  const [docToView, setDocToView] = useState<PolicyDocument | null>(null);
  const [docClientName, setDocClientName] = useState('');

  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isFirebaseTroubleshootOpen, setIsFirebaseTroubleshootOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Initialize theme class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Checagens unificadas de permissão
  const userRoleUpper = String(currentUser?.role || '').toUpperCase();
  const isUserSubAdmin = isSubFromAuth || userRoleUpper === 'SUB_ADMIN' || userRoleUpper === 'SUBADMIN' || userRoleUpper === 'GESTOR';
  const isUserAdminOrMaster = isMaster || hasAdminAccess || userRoleUpper === 'MASTER' || userRoleUpper === 'ADMIN';

  // Router Guard: If user is on admin or corretora tab, revalidate access
  useEffect(() => {
    if ((currentTab === 'admin' || currentTab === 'corretora') && currentUser) {
      if (currentTab === 'corretora' && !isUserSubAdmin) {
        refreshProfile().then((refreshed) => {
          const refreshedRole = String(refreshed?.role || '').toUpperCase();
          const isValidSub = refreshedRole === 'SUB_ADMIN' || refreshedRole === 'SUBADMIN' || refreshedRole === 'GESTOR';
          if (!refreshed || !isValidSub) {
            setCurrentTab('dashboard');
          }
        }).catch(() => {
          setCurrentTab('dashboard');
        });
      } else if (currentTab === 'admin' && !isUserAdminOrMaster) {
        refreshProfile().then((refreshed) => {
          const refreshedRole = String(refreshed?.role || '').toUpperCase();
          const revalidated = refreshedRole === 'MASTER' || refreshedRole === 'SUB_ADMIN' || refreshedRole === 'ADMIN' || refreshedRole === 'SUBADMIN';
          if (!revalidated) {
            setCurrentTab('dashboard');
          }
        }).catch(() => {
          if (!isUserAdminOrMaster) {
            setCurrentTab('dashboard');
          }
        });
      }
    }
  }, [currentTab, currentUser, isUserSubAdmin, isUserAdminOrMaster, refreshProfile]);

  // Whenever the active user changes, reload strictly their isolated clients
  useEffect(() => {
    if (currentUser?.id) {
      const local = loadClients(currentUser.id);
      setClients(local);

      if (isFirebaseConfigured()) {
        fetchFirestoreClientsByBrokerage(currentUser).then((remoteClients) => {
          if (remoteClients && remoteClients.length > 0) {
            const merged = [...local];
            remoteClients.forEach(rc => {
              const idx = merged.findIndex(c => c.id === rc.id);
              if (idx >= 0) {
                merged[idx] = { ...merged[idx], ...rc };
              } else {
                merged.push(rc);
              }
            });
            setClients(merged);
            saveClients(merged, currentUser.id);
          }
        }).catch(err => {
          console.warn('Could not sync clients from Firestore:', err);
        });
      }
    } else {
      setClients([]);
    }
  }, [currentUser?.id, currentUser?.corretora_id]);

  // Persist clients when changed for the active user
  const updateClients = (updated: Client[]) => {
    setClients(updated);
    saveClients(updated, currentUser?.id);
  };

  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    saveTheme(next);
  };

  const handleSeedDemoClients = () => {
    if (!currentUser?.id) return;
    const seeded = seedSampleClientsForUser(currentUser.id);
    setClients(seeded);
  };

  const handleOpenNewClient = () => {
    setClientToEdit(null);
    setIsClientModalOpen(true);
  };

  const handleOpenEditClient = (client: Client) => {
    setClientToEdit(client);
    setIsClientModalOpen(true);
  };

  const handleViewClientDetails = (client: Client) => {
    setClientForDetail(client);
    setIsDetailModalOpen(true);
  };

  const handleSaveClient = (clientData: Client) => {
    const isEditing = !!clientToEdit;
    let updated: Client[];

    if (isEditing) {
      updated = clients.map(c => c.id === clientData.id ? clientData : c);
    } else {
      updated = [clientData, ...clients];
    }

    updateClients(updated);
    setIsClientModalOpen(false);
    setClientToEdit(null);

    // Sync save to Firestore if configured
    if (currentUser) {
      saveClientToFirestore(clientData, currentUser).catch(err => {
        console.warn('Background Firestore save failed:', err);
      });
    }
  };

  const handleDeleteClient = (id: string) => {
    const clientToDelete = clients.find(c => c.id === id);
    if (clientToDelete?.document?.id) {
      deleteDocumentFile(clientToDelete.document.id);
      if (clientToDelete.document.storagePath) {
        deletePolicyFromFirebaseStorage(clientToDelete.document.storagePath).catch(err => {
          console.warn('Background Firebase Storage document deletion failed:', err);
        });
      }
    }

    const updated = clients.filter(c => c.id !== id);
    updateClients(updated);

    if (clientForDetail?.id === id) {
      setIsDetailModalOpen(false);
      setClientForDetail(null);
    }

    // Sync delete to Firestore if configured
    deleteClientFromFirestore(id).catch(err => {
      console.warn('Background Firestore delete failed:', err);
    });
  };

  const handleViewDocument = (client: Client) => {
    if (client.document) {
      setDocToView(client.document);
      setDocClientName(client.name);
      setIsDocViewerOpen(true);
    }
  };

  const handleImportClients = (imported: Client[], mode: 'append' | 'replace') => {
    if (mode === 'replace') {
      updateClients(imported);
      if (currentUser) {
        imported.forEach(nc => {
          saveClientToFirestore(nc, currentUser).catch(e => console.warn('Import Firestore sync error:', e));
        });
      }
    } else {
      const existingIds = new Set(clients.map(c => c.id));
      const newOnly = imported.filter(c => !existingIds.has(c.id));
      const merged = [...newOnly, ...clients];
      updateClients(merged);

      if (currentUser) {
        newOnly.forEach(nc => {
          saveClientToFirestore(nc, currentUser).catch(e => console.warn('Import Firestore sync error:', e));
        });
      }
    }
  };

  // Critical alerts count for badge in navbar
  const criticalAlertsCount = getExpiryAlerts(clients).filter(
    a => a.alertLevel === 'red' || a.alertLevel === 'expired'
  ).length;

  // Loading state
  if (isAuthLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-700 flex items-center justify-center text-white shadow-xl shadow-cyan-600/20 animate-pulse">
              <ShieldCheck className="w-9 h-9" />
            </div>
            <Loader2 className="w-6 h-6 text-cyan-400 absolute -bottom-1 -right-1 animate-spin" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              GestãoCorretor
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Sincronizando perfil e permissões de acesso...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If user is not authenticated, show modern login view
  if (!currentUser) {
    return (
      <LoginView 
        onLoginSuccess={handleLogin} 
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        user={currentUser}
        onLogout={handleLogout}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenNewClient={handleOpenNewClient}
        onOpenImportExport={() => setIsImportExportOpen(true)}
        onOpenDocs={() => setIsDocsOpen(true)}
        onOpenFirebaseTroubleshoot={() => setIsFirebaseTroubleshootOpen(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        criticalAlertsCount={criticalAlertsCount}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {currentTab === 'dashboard' && (
          <Dashboard
            clients={clients}
            onOpenNewClient={handleOpenNewClient}
            onViewClientDetails={handleViewClientDetails}
            onEditClient={handleOpenEditClient}
            onViewDocument={handleViewDocument}
            onNavigateToClients={() => setCurrentTab('clients')}
            currentUser={currentUser}
            onOpenProfile={() => setIsProfileModalOpen(true)}
            onOpenImportExport={() => setIsImportExportOpen(true)}
            onSeedDemoData={handleSeedDemoClients}
          />
        )}

        {currentTab === 'clients' && (
          <ClientList
            clients={clients}
            onOpenNewClient={handleOpenNewClient}
            onViewClientDetails={handleViewClientDetails}
            onEditClient={handleOpenEditClient}
            onDeleteClient={handleDeleteClient}
            onViewDocument={handleViewDocument}
            onImportClients={(imported) => handleImportClients(imported, 'append')}
            currentUser={currentUser}
          />
        )}

        {currentTab === 'alerts' && (
          <AlertsView
            clients={clients}
            onViewClientDetails={handleViewClientDetails}
            onEditClient={handleOpenEditClient}
            onViewDocument={handleViewDocument}
            currentUser={currentUser}
          />
        )}

        {currentTab === 'birthdays' && (
          <BirthdaysView
            clients={clients}
            onViewClientDetails={handleViewClientDetails}
            currentUser={currentUser}
          />
        )}

        {currentTab === 'admin' && isUserAdminOrMaster && (
          <AdminView
            currentUser={currentUser}
          />
        )}

        {currentTab === 'corretora' && isUserSubAdmin && (
          <SubAdminBrokerageView
            currentUser={currentUser}
          />
        )}
      </main>

      {/* Modals */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSave={handleSaveClient}
        clientToEdit={clientToEdit}
      />

      <ClientDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setClientForDetail(null);
        }}
        client={clientForDetail}
        currentUser={currentUser}
        onEdit={(client) => {
          setIsDetailModalOpen(false);
          handleOpenEditClient(client);
        }}
        onDelete={(id) => {
          handleDeleteClient(id);
        }}
        onViewDocument={handleViewDocument}
      />

      <DocumentViewerModal
        isOpen={isDocViewerOpen}
        onClose={() => {
          setIsDocViewerOpen(false);
          setDocToView(null);
        }}
        document={docToView}
        clientName={docClientName}
      />

      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        clients={clients}
        onImportClients={handleImportClients}
        currentUser={currentUser}
      />

      <ArchitectureDocsModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
      />

      <FirebaseTroubleshootModal
        isOpen={isFirebaseTroubleshootOpen}
        onClose={() => setIsFirebaseTroubleshootOpen(false)}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onUpdateUser={handleUpdateUser}
        onNavigateToAdmin={() => {
          setIsProfileModalOpen(false);
          setCurrentTab('admin');
        }}
      />
    </div>
  );
}
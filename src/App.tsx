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
import { getExpiryAlerts, isMasterAdmin } from './utils/insuranceUtils';
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
import { ShieldCheck, Loader2 } from 'lucide-react';

export default function App() {
  const { 
    user: currentUser, 
    loading: isAuthLoading, 
    isMaster,
    hasAdminAccess,
    login: handleLogin, 
    logout: handleLogout, 
    updateUser: handleUpdateUser, 
    refreshProfile
  } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadTheme());
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'clients' | 'alerts' | 'birthdays' | 'admin'>('dashboard');

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

  const isUserMasterAdmin = isMasterAdmin(currentUser) || isMaster || hasAdminAccess;

  // Router Guard: If user is on admin tab and not master admin, redirect to dashboard
  useEffect(() => {
    if (currentTab === 'admin' && currentUser) {
      if (!isUserMasterAdmin) {
        refreshProfile().then((refreshed) => {
          if (!refreshed || !isMasterAdmin(refreshed)) {
            setCurrentTab('dashboard');
          }
        }).catch(() => {
          setCurrentTab('dashboard');
        });
      }
    }
  }, [currentTab, currentUser, isUserMasterAdmin, refreshProfile]);

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
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
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

  const handleViewDocument = (client: Client) => {
    if (client.document) {
      setDocToView(client.document);
      setDocClientName(client.name);
      setIsDocViewerOpen(true);
    }
  };

  const handleSaveClient = async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) return;

    const now = new Date().toISOString();

    if (clientToEdit) {
      const updatedList = clients.map(c => {
        if (c.id === clientToEdit.id) {
          const updated: Client = {
            ...c,
            ...clientData,
            updatedAt: now
          };
          if (isFirebaseConfigured()) {
            saveClientToFirestore(updated).catch(err => console.warn('Error saving client update to Firestore:', err));
          }
          return updated;
        }
        return c;
      });
      updateClients(updatedList);
    } else {
      const newClient: Client = {
        ...clientData,
        id: `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now,
        updatedAt: now
      };
      const updatedList = [newClient, ...clients];
      updateClients(updatedList);
      if (isFirebaseConfigured()) {
        saveClientToFirestore(newClient).catch(err => console.warn('Error saving new client to Firestore:', err));
      }
    }
    setIsClientModalOpen(false);
    setClientToEdit(null);
  };

  const handleDeleteClient = async (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    if (client.document) {
      try {
        await deleteDocumentFile(client.document.id);
        if (isFirebaseConfigured() && client.document.storagePath) {
          await deletePolicyFromFirebaseStorage(client.document.storagePath);
        }
      } catch (e) {
        console.warn('Error deleting doc files:', e);
      }
    }

    const updated = clients.filter(c => c.id !== clientId);
    updateClients(updated);

    if (isFirebaseConfigured()) {
      deleteClientFromFirestore(clientId).catch(err => console.warn('Error deleting client from Firestore:', err));
    }
  };

  const handleImportClients = (imported: Client[], mode: 'append' | 'replace' = 'append') => {
    if (!currentUser) return;
    const now = new Date().toISOString();

    const processed = imported.map(c => ({
      ...c,
      id: c.id || `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: c.createdAt || now,
      updatedAt: now
    }));

    let nextClients = mode === 'replace' ? processed : [...processed, ...clients];
    updateClients(nextClients);

    if (isFirebaseConfigured()) {
      processed.forEach(c => {
        saveClientToFirestore(c).catch(err => console.warn('Error syncing imported client to Firestore:', err));
      });
    }
  };

  const handleSeedSampleData = () => {
    if (!currentUser) return;
    const seeded = seedSampleClientsForUser(currentUser.id);
    updateClients(seeded);
  };

  // Critical expiry alerts count
  const alertsList = getExpiryAlerts(clients);
  const criticalAlertsCount = alertsList.filter(a => a.alertLevel === 'red' || a.alertLevel === 'expired').length;

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-4">
        <div className="w-16 h-16 rounded-2xl bg-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 animate-pulse">
          <ShieldCheck className="w-8 h-8 text-white" />
        </div>
        <div className="flex items-center gap-2 text-slate-300 font-medium">
          <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
          <span>Carregando GestãoCorretor CRM...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLogin} theme={theme} onToggleTheme={handleToggleTheme} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors flex flex-col">
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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
            onSeedDemoData={handleSeedSampleData}
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

        {currentTab === 'admin' && isUserMasterAdmin && (
          <AdminView
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

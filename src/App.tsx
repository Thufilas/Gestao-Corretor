import React, { useState, useEffect } from 'react';
import { Client, User, PolicyDocument } from './types';
import { 
  loadClients, 
  saveClients, 
  loadCurrentUser, 
  saveCurrentUser, 
  saveUserProfile,
  loadTheme, 
  saveTheme,
  deleteDocumentFile,
  seedSampleClientsForUser
} from './services/storage';
import { 
  subscribeToAuthChanges, 
  firebaseSignOut, 
  deletePolicyFromFirebaseStorage 
} from './services/firebase';
import { getExpiryAlerts, canAccessAdminPanel } from './utils/insuranceUtils';
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

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => loadCurrentUser());
  const [clients, setClients] = useState<Client[]>(() => {
    const user = loadCurrentUser();
    return loadClients(user?.id);
  });
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

  // Sync Firebase auth state
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((fbUser) => {
      if (fbUser) {
        setCurrentUser((prev) => {
          if (
            prev?.id === fbUser.id &&
            prev?.name === fbUser.name &&
            prev?.email === fbUser.email &&
            prev?.isAdmin === fbUser.isAdmin &&
            prev?.brokerageName === fbUser.brokerageName &&
            prev?.susep === fbUser.susep
          ) {
            return prev;
          }
          return fbUser;
        });
        saveCurrentUser(fbUser);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Whenever the active user changes, reload strictly their isolated clients
  useEffect(() => {
    if (currentUser?.id) {
      setClients(loadClients(currentUser.id));
    } else {
      setClients([]);
    }
  }, [currentUser?.id]);

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

  const handleLogin = (user: User) => {
    saveUserProfile(user);
    saveCurrentUser(user);
    setCurrentUser(user);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    saveCurrentUser(updatedUser);
    saveUserProfile(updatedUser);
  };

  const handleLogout = async () => {
    await firebaseSignOut();
    saveCurrentUser(null);
    setCurrentUser(null);
    setClients([]);
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

  const handleViewDocument = (client: Client) => {
    if (!client.document) return;
    setDocToView(client.document);
    setDocClientName(client.name);
    setIsDocViewerOpen(true);
  };

  const handleSaveClient = (client: Client) => {
    const exists = clients.some(c => c.id === client.id);
    let updated: Client[];
    if (exists) {
      updated = clients.map(c => c.id === client.id ? client : c);
    } else {
      updated = [client, ...clients];
    }
    updateClients(updated);

    // If detail modal is open for this client, refresh it
    if (clientForDetail && clientForDetail.id === client.id) {
      setClientForDetail(client);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    const target = clients.find(c => c.id === clientId);
    if (target?.document?.storagePath) {
      await deletePolicyFromFirebaseStorage(target.document.storagePath);
    }
    if (target?.document?.id) {
      await deleteDocumentFile(target.document.id);
    }
    const updated = clients.filter(c => c.id !== clientId);
    updateClients(updated);
  };

  const handleImportClients = (newClients: Client[], mode: 'append' | 'replace') => {
    if (mode === 'replace') {
      updateClients(newClients);
    } else {
      updateClients([...newClients, ...clients]);
    }
  };

  // Critical alerts count for badge in navbar
  const criticalAlertsCount = getExpiryAlerts(clients).filter(
    a => a.alertLevel === 'red' || a.alertLevel === 'expired'
  ).length;

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
            onImportClients={handleImportClients}
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

        {currentTab === 'admin' && canAccessAdminPanel(currentUser) && (
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
        currentUserId={currentUser?.id}
        onOpenTroubleshootGlobal={() => setIsFirebaseTroubleshootOpen(true)}
      />

      <ClientDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        client={clientForDetail}
        onEdit={handleOpenEditClient}
        onDelete={handleDeleteClient}
        onViewDocument={handleViewDocument}
        currentUser={currentUser}
      />

      <DocumentViewerModal
        isOpen={isDocViewerOpen}
        onClose={() => setIsDocViewerOpen(false)}
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
        onNavigateToAdmin={() => setCurrentTab('admin')}
      />

    </div>
  );
}

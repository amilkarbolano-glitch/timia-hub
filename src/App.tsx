import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout, { View } from './components/Layout';
import KanbanBoard from './components/KanbanBoard';
import ProjectStandards from './components/ProjectStandards';
import Analytics from './components/Analytics';
import AuditLog from './components/AuditLog';
import TaskConfirmation from './components/TaskConfirmation';
import SetupProject from './components/SetupProject';
import SetupTeam from './components/SetupTeam';
import BankStatus from './components/BankStatus';
import RolesPermissions from './components/RolesPermissions';
import ProjectTemplates from './components/ProjectTemplates';
import { hasPermission } from './lib/permissions';
import { INITIAL_TEMPLATES } from './lib/templates';
import { ProjectTemplate } from './types';

function AppInner() {
  const { user } = useAuth();
  const userRole = user?.role ?? 'guest';

  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [templates, setTemplates] = useState<ProjectTemplate[]>(INITIAL_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('ingesta');

  const renderView = () => {
    if (currentView === 'audit' && !hasPermission(userRole, 's_audit')) {
      return <div className="p-20 text-center text-slate-500 font-bold">Acceso denegado.</div>;
    }
    if (currentView === 'roles-permissions' && !hasPermission(userRole, 'u_roles')) {
      return <div className="p-20 text-center text-slate-500 font-bold">Acceso denegado.</div>;
    }
    if (currentView === 'standards' && !hasPermission(userRole, 's_standards')) {
      return <div className="p-20 text-center text-slate-500 font-bold">Acceso denegado.</div>;
    }

    switch (currentView) {
      case 'setup-project':
        return (
          <SetupProject
            onNext={() => setCurrentView('setup-team')}
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            onSelectTemplate={setSelectedTemplateId}
          />
        );
      case 'setup-team':
        return <SetupTeam onNext={() => setCurrentView('setup-tasks')} onBack={() => setCurrentView('setup-project')} />;
      case 'setup-tasks':
        return (
          <TaskConfirmation
            onNext={() => setCurrentView('dashboard')}
            onBack={() => setCurrentView('setup-team')}
            initialTasks={templates.find(t => t.id === selectedTemplateId)?.tasks || []}
          />
        );
      case 'dashboard':
        return <KanbanBoard userRole={userRole} setUserRole={() => {}} />;
      case 'bank-status':
        return <BankStatus />;
      case 'standards':
        return <ProjectStandards />;
      case 'analytics':
        return <Analytics />;
      case 'audit':
        return <AuditLog />;
      case 'roles-permissions':
        return <RolesPermissions />;
      case 'project-templates':
        return <ProjectTemplates templates={templates} setTemplates={setTemplates} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full p-20 text-center">
            <h2 className="text-2xl font-bold text-slate-400">Vista en construcción</h2>
            <p className="text-slate-500 mt-2">Estamos trabajando para traerte esta funcionalidad pronto.</p>
            <button onClick={() => setCurrentView('dashboard')} className="mt-6 px-6 py-2 bg-primary text-white rounded-lg font-bold">
              Volver al Tablero
            </button>
          </div>
        );
    }
  };

  return (
    <Layout currentView={currentView} onViewChange={setCurrentView} userRole={userRole}>
      {renderView()}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <AppInner />
      </ProtectedRoute>
    </AuthProvider>
  );
}

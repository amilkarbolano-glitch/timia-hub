import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AuthProvider, useAuth, canAccess, ROLE_LANDING, UserRole } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout, { View } from './components/Layout';
import KanbanBoard from './components/KanbanBoard';
import ProjectStandards from './components/ProjectStandards';
import Analytics from './components/Analytics';
import AuditLog from './components/AuditLog';
import SetupProject from './components/SetupProject';
import SetupTeam from './components/SetupTeam';
import BankStatus from './components/BankStatus';
import RolesPermissions from './components/RolesPermissions';
import ProjectTemplates from './components/ProjectTemplates';
import PMDashboard from './components/PMDashboard';
import AdminPanel from './components/AdminPanel';
import CircuitosBBVA from './components/CircuitosBBVA';
import Bitacora from './components/Bitacora';
import Estimaciones from './components/Estimaciones';
import PlanDeTrabajo from './components/PlanDeTrabajo';
import { INITIAL_TEMPLATES } from './lib/templates';
import { ProjectTemplate } from './types';

// ─── Pantalla de acceso denegado ──────────────────────────────────────────────

function AccessDenied({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-20 text-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-medium text-slate-700">Sin acceso</h2>
        <p className="text-sm text-slate-400 mt-1">Tu rol no tiene permiso para ver esta sección.</p>
      </div>
      <button onClick={onBack} className="px-5 py-2 text-sm font-medium text-white rounded-lg" style={{ background: '#dc2626' }}>
        Volver al inicio
      </button>
    </div>
  );
}

// ─── App principal ────────────────────────────────────────────────────────────

function AppInner() {
  const { user } = useAuth();
  const role = (user?.role ?? 'developer') as UserRole;

  // Redirige automáticamente a la vista correcta según el rol al iniciar sesión
  const [currentView, setCurrentView] = useState<View>(
    (ROLE_LANDING[role] as View) ?? 'dashboard'
  );
  const currentViewRef = useRef<View>(currentView);
  currentViewRef.current = currentView;

  // Navegación con historial del navegador para que el botón "Atrás" funcione dentro de la app
  const navigate = useCallback((view: View) => {
    setCurrentView(view);
    window.history.pushState({ view }, '', window.location.href);
  }, []);

  // Sincroniza el historial al montar y maneja el botón Atrás del navegador
  useEffect(() => {
    window.history.replaceState({ view: currentView }, '', window.location.href);
    const handlePop = (e: PopStateEvent) => {
      const v = (e.state?.view as View | undefined) ?? (ROLE_LANDING[role] as View) ?? 'dashboard';
      setCurrentView(v);
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si el rol cambia (ej: cambio de cuenta), vuelve a la vista correcta
  useEffect(() => {
    navigate((ROLE_LANDING[role] as View) ?? 'dashboard');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const [templates, setTemplates] = useState<ProjectTemplate[]>(INITIAL_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('ingesta');

  // Vista de inicio por defecto para el botón "Volver"
  const goHome = () => navigate((ROLE_LANDING[role] as View) ?? 'dashboard');

  const renderView = () => {
    // ── Guards por vista ──────────────────────────────────────────────────────
    const guards: Record<string, string> = {
      'audit':            's_audit',
      'roles-permissions':'u_roles',
      'standards':        'view_standards',
      'analytics':        'view_analytics',
      'project-templates':'create_projects',
    };

    const requiredPerm = guards[currentView];
    if (requiredPerm && !canAccess(role, requiredPerm)) {
      return <AccessDenied onBack={goHome} />;
    }

    // ── Vistas ────────────────────────────────────────────────────────────────
    switch (currentView) {
      case 'setup-project':
        return (
          <SetupProject
            onNext={() => navigate('setup-team')}
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            onSelectTemplate={setSelectedTemplateId}
          />
        );
      case 'setup-team':
        // Al lanzar el proyecto, va directo a Estimaciones (no hay paso de tareas)
        return <SetupTeam onNext={() => navigate('estimaciones')} onBack={() => navigate('setup-project')} />;

      case 'dashboard':
        return <KanbanBoard userRole={role} setUserRole={() => {}} />;

      case 'bank-status':
        return <BankStatus />;

      case 'estimaciones':
        return canAccess(role, 'view_estimaciones') ? <Estimaciones onViewChange={navigate}/> : <AccessDenied onBack={goHome}/>;

      case 'admin':
        return role === 'pm' ? <AdminPanel /> : <AccessDenied onBack={goHome}/>;

      case 'circuitos-bbva':
        return <CircuitosBBVA />;

      case 'bitacora':
        return <Bitacora />;

      case 'analytics':
        // PM tiene su propio dashboard ejecutivo
        return role === 'pm' ? <PMDashboard onViewChange={navigate} /> : <Analytics />;

      case 'plan-trabajo':
        return canAccess(role, 'view_plan_trabajo')
          ? <div style={{ padding: '28px 36px' }}><PlanDeTrabajo onGoEstimaciones={() => navigate('estimaciones')} /></div>
          : <AccessDenied onBack={goHome}/>;

      case 'audit':
        return <AuditLog />;

      case 'standards':
        return <ProjectStandards />;

      case 'roles-permissions':
        return <RolesPermissions />;

      case 'project-templates':
        return <ProjectTemplates templates={templates} setTemplates={setTemplates} />;

      default:
        return (
          <div className="flex flex-col items-center justify-center h-full p-20 text-center">
            <h2 className="text-2xl font-bold text-slate-400">Vista en construcción</h2>
            <p className="text-slate-500 mt-2">Estamos trabajando para traerte esta funcionalidad pronto.</p>
            <button onClick={goHome} className="mt-6 px-6 py-2 text-white rounded-lg font-bold" style={{ background: '#dc2626' }}>
              Volver al inicio
            </button>
          </div>
        );
    }
  };

  return (
    <Layout currentView={currentView} onViewChange={navigate} userRole={role}>
      {renderView()}
    </Layout>
  );
}

// ─── Entrada ──────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <AppInner />
      </ProtectedRoute>
    </AuthProvider>
  );
}

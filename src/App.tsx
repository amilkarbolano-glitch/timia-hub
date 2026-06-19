import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AuthProvider, useAuth, canAccess, ROLE_LANDING, UserRole } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout, { View } from './components/Layout';
import KanbanBoard from './components/KanbanBoard';
import ProjectStandards from './components/ProjectStandards';
import Analytics from './components/Analytics';
import AuditLog from './components/AuditLog';
import SetupProject from './components/SetupProject';
// SetupTeam removed — team management via Admin panel
import BankStatus from './components/BankStatus';
import RolesPermissions from './components/RolesPermissions';
import ProjectTemplates from './components/ProjectTemplates';
import PMDashboard, { ProyectosPage } from './components/PMDashboard';
import AdminPanel from './components/AdminPanel';
import CircuitosBBVA from './components/CircuitosBBVA';
import Bitacora, { TabLinks, TabInventario } from './components/Bitacora';
import ImputacionesJira from './components/ImputacionesJira';
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

  // Restaura la vista guardada en localStorage; si no hay, usa la landing del rol
  const [currentView, setCurrentView] = useState<View>(() => {
    try {
      const saved = localStorage.getItem('timia_current_view') as View | null;
      const setupViews: View[] = ['setup-project', 'setup-team', 'setup-tasks'];
      if (saved && !setupViews.includes(saved)) return saved;
    } catch {}
    return (ROLE_LANDING[role] as View) ?? 'dashboard';
  });
  const currentViewRef = useRef<View>(currentView);
  currentViewRef.current = currentView;

  // Navegación con historial del navegador para que el botón "Atrás" funcione dentro de la app
  const navigate = useCallback((view: View) => {
    setCurrentView(view);
    try { localStorage.setItem('timia_current_view', view); } catch {}
    window.history.pushState({ view }, '', window.location.href);
  }, []);

  // Sincroniza el historial al montar y maneja el botón Atrás del navegador
  useEffect(() => {
    window.history.replaceState({ view: currentView }, '', window.location.href);
    const handlePop = (e: PopStateEvent) => {
      const v = (e.state?.view as View | undefined) ?? (ROLE_LANDING[role] as View) ?? 'dashboard';
      setCurrentView(v);
      try { localStorage.setItem('timia_current_view', v); } catch {}
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si el rol cambia (ej: cambio de cuenta), limpia vista guardada y va a la landing
  useEffect(() => {
    try { localStorage.removeItem('timia_current_view'); } catch {}
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
            onNext={() => navigate('estimaciones')}
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            onSelectTemplate={setSelectedTemplateId}
          />
        );

      case 'dashboard':
        return <KanbanBoard userRole={role} setUserRole={() => {}} />;

      case 'bank-status':
        return <BankStatus />;

      case 'estimaciones':
        return canAccess(role, 'view_estimaciones')
          ? <div style={{ padding: '28px 36px' }}><Estimaciones onViewChange={navigate} onBack={() => navigate('setup-project')}/></div>
          : <AccessDenied onBack={goHome}/>;

      case 'admin':
        return role === 'pm' ? <AdminPanel onViewChange={navigate} /> : <AccessDenied onBack={goHome}/>;

      case 'circuitos-bbva':
        return <CircuitosBBVA />;

      case 'bitacora':
        return <Bitacora />;

      case 'imputaciones':
        return (
          <div style={{ padding: '28px 36px', maxWidth: 1400, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: '#eff6ff', border: '0.5px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111', letterSpacing: '-.3px' }}>Imputaciones Jira</h2>
                <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', marginTop: 1 }}>Tickets Jira por Q y proyecto — seguimiento de imputación de horas del equipo</p>
              </div>
            </div>
            <ImputacionesJira user={user}/>
          </div>
        );

      case 'links':
        return (
          <div style={{ padding: '28px 36px', maxWidth: 1400, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: '#f0fdf4', border: '0.5px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111', letterSpacing: '-.3px' }}>Links importantes</h2>
                <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', marginTop: 1 }}>Jira, Confluence, Bitbucket y documentación clave del equipo</p>
              </div>
            </div>
            <TabLinks user={user}/>
          </div>
        );

      case 'inventario':
        return (
          <div style={{ padding: '28px 36px', maxWidth: 1600, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: '#faf5ff', border: '0.5px solid #e9d5ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111', letterSpacing: '-.3px' }}>Inventario</h2>
                <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', marginTop: 1 }}>Tablas, objetos, jobs y modelos — estado de entrega por etapa de procesamiento</p>
              </div>
            </div>
            <TabInventario user={user}/>
          </div>
        );

      case 'proyectos':
        return role === 'pm' ? <ProyectosPage /> : <AccessDenied onBack={goHome}/>;

      case 'analytics':
        // PM tiene su propio dashboard ejecutivo
        return role === 'pm' ? <PMDashboard onViewChange={navigate} /> : <Analytics />;

      case 'plan-trabajo':
        return canAccess(role, 'view_plan_trabajo')
          ? <div style={{ padding: '28px 36px' }}><PlanDeTrabajo onGoEstimaciones={() => navigate('estimaciones')} /></div>
          : <AccessDenied onBack={goHome}/>;

      case 'audit':
        return <AuditLog />;

      // standards removed

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

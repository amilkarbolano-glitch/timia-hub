import React, { useState, useRef, useEffect } from 'react';
import { useAuth, canAccess, UserRole } from '../contexts/AuthContext';
import UserProfile from './UserProfile';
import {
  Settings,
  Search,
  GitBranch,
  Shield,
  BarChart3,
  Building2,
  ChevronDown,
  CalendarRange,
  Link2,
  Package,
  Layers,
  Activity,
} from 'lucide-react';
import { TimiaMark, TimiaWordmark } from './TimiaLogo';

export type View = 'setup-project' | 'setup-team' | 'setup-tasks' | 'dashboard' | 'standards' | 'analytics' | 'audit' | 'bank-status' | 'notifications' | 'roles-permissions' | 'project-templates' | 'admin' | 'circuitos-bbva' | 'bitacora' | 'estimaciones' | 'plan-trabajo' | 'imputaciones' | 'inventario' | 'links' | 'proyectos';

interface LayoutProps {
  children: React.ReactNode;
  currentView: View;
  onViewChange: (view: View) => void;
  userRole: string;
}

export default function Layout({ children, currentView, onViewChange, userRole }: LayoutProps) {
  const { user, logout } = useAuth();
  const [showUserMenu,      setShowUserMenu]      = useState(false);
  const [showHerramientas,  setShowHerramientas]  = useState(false);
  const [showRepo,          setShowRepo]          = useState(false);
  const [showProfile,       setShowProfile]       = useState(false);
  const herramRef = useRef<HTMLDivElement>(null);
  const repoRef   = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (herramRef.current && !herramRef.current.contains(e.target as Node)) setShowHerramientas(false);
      if (repoRef.current   && !repoRef.current.contains(e.target as Node))   setShowRepo(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const herramientasViews: View[] = ['roles-permissions','audit','project-templates'];
  const herramientasActive = herramientasViews.includes(currentView);

  const repoViews: View[] = ['imputaciones','inventario','links'];
  const repoActive = repoViews.includes(currentView);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header */}
      <header data-print-hide className="sticky top-0 z-50 flex items-center justify-between h-16 px-6 bg-white border-b border-slate-200">
        <div className="flex items-center gap-8">
            <div 
              className="flex items-center gap-3 cursor-pointer" 
              onClick={() => onViewChange('setup-project')}
            >
              <TimiaMark size={32} bg="none" />
              <TimiaWordmark variant="dark" height={22} />
            </div>
            
            <nav className="hidden md:flex items-center gap-5">

              {/* 1. Vista principal por rol */}
              {userRole !== 'pm' && (
                <button onClick={() => onViewChange('dashboard')}
                  className={`text-sm font-medium transition-colors ${currentView==='dashboard'?'text-primary':'text-slate-600 hover:text-primary'}`}>
                  Tablero
                </button>
              )}
              {canAccess(userRole as UserRole,'view_analytics') && (
                <button onClick={() => onViewChange('analytics')}
                  className={`text-sm font-medium transition-colors ${currentView==='analytics'?'text-primary':'text-slate-600 hover:text-primary'}`}>
                  Dashboard
                </button>
              )}

              {/* 2. Proyectos — solo PM, vista independiente */}
              {canAccess(userRole as UserRole,'view_analytics') && (
                <button onClick={() => onViewChange('proyectos')}
                  className={`text-sm font-medium transition-colors flex items-center gap-1 ${currentView==='proyectos'?'text-primary':'text-slate-600 hover:text-primary'}`}>
                  <Activity size={13}/> Proyectos
                </button>
              )}

              {/* 3. Plan de Trabajo */}
              {canAccess(userRole as UserRole,'view_plan_trabajo') && (
                <button onClick={() => onViewChange('plan-trabajo')}
                  className={`text-sm font-medium transition-colors flex items-center gap-1 ${currentView==='plan-trabajo'?'text-primary':'text-slate-600 hover:text-primary'}`}>
                  <CalendarRange size={13}/> Plan de Trabajo
                </button>
              )}

              {/* 3. Estimaciones */}
              {canAccess(userRole as UserRole,'view_estimaciones') && (
                <button onClick={() => onViewChange('estimaciones')}
                  className={`text-sm font-medium transition-colors flex items-center gap-1 ${currentView==='estimaciones'?'text-primary':'text-slate-600 hover:text-primary'}`}>
                  <BarChart3 size={13}/> Estimaciones
                </button>
              )}

              {/* 4. Alcances */}
              <button onClick={() => onViewChange('bitacora')}
                className={`text-sm font-medium transition-colors ${currentView==='bitacora'?'text-primary':'text-slate-600 hover:text-primary'}`}>
                Alcances
              </button>

              {/* 5. Recursos — Imputaciones · Inventario · Links */}
              <div ref={repoRef} className="relative">
                <button
                  onClick={() => setShowRepo(v => !v)}
                  className={`text-sm font-medium transition-colors flex items-center gap-1 ${repoActive ? 'text-primary' : 'text-slate-600 hover:text-primary'}`}
                >
                  Recursos
                  <ChevronDown size={12} style={{ transition: 'transform .15s', transform: showRepo ? 'rotate(180deg)' : 'rotate(0deg)' }}/>
                </button>
                {showRepo && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden" style={{ minWidth: 196 }}>
                    <div style={{ padding: '8px 14px 6px', borderBottom: '0.5px solid #f1f5f9' }}>
                      <p style={{ margin: 0, fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Recursos del equipo</p>
                    </div>
                    <button onClick={() => { setShowRepo(false); onViewChange('imputaciones'); }}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors ${currentView==='imputaciones'?'bg-primary/10 text-primary font-semibold':'text-slate-600 hover:bg-slate-50'}`}>
                      <Layers size={13}/> Imputaciones Jira
                    </button>
                    <button onClick={() => { setShowRepo(false); onViewChange('inventario'); }}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors ${currentView==='inventario'?'bg-primary/10 text-primary font-semibold':'text-slate-600 hover:bg-slate-50'}`}>
                      <Package size={13}/> Inventario
                    </button>
                    <button onClick={() => { setShowRepo(false); onViewChange('links'); }}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors ${currentView==='links'?'bg-primary/10 text-primary font-semibold':'text-slate-600 hover:bg-slate-50'}`}>
                      <Link2 size={13}/> Links importantes
                    </button>
                  </div>
                )}
              </div>

              {/* 6. Herramientas — solo si tiene al menos un ítem accesible */}
              {(canAccess(userRole as UserRole,'u_roles')||canAccess(userRole as UserRole,'s_audit')||canAccess(userRole as UserRole,'create_projects')) && (
                <div ref={herramRef} className="relative">
                  <button
                    onClick={() => setShowHerramientas(v=>!v)}
                    className={`text-sm font-medium transition-colors flex items-center gap-1 ${herramientasActive?'text-primary':'text-slate-600 hover:text-primary'}`}
                  >
                    Herramientas <ChevronDown size={12} style={{transition:'transform .15s',transform:showHerramientas?'rotate(180deg)':'rotate(0deg)'}}/>
                  </button>
                  {showHerramientas && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden" style={{minWidth:170}}>
                      {canAccess(userRole as UserRole,'u_roles') && (
                        <button onClick={()=>{setShowHerramientas(false);onViewChange('roles-permissions');}}
                          className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors ${currentView==='roles-permissions'?'bg-primary/10 text-primary font-medium':'text-slate-600 hover:bg-slate-50'}`}>
                          <Shield size={13}/> Roles y Permisos
                        </button>
                      )}
                      {canAccess(userRole as UserRole,'s_audit') && (
                        <button onClick={()=>{setShowHerramientas(false);onViewChange('audit');}}
                          className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors ${currentView==='audit'?'bg-primary/10 text-primary font-medium':'text-slate-600 hover:bg-slate-50'}`}>
                          <Shield size={13}/> Auditoría
                        </button>
                      )}
                      {canAccess(userRole as UserRole,'create_projects') && (
                        <button onClick={()=>{setShowHerramientas(false);onViewChange('project-templates');}}
                          className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors ${currentView==='project-templates'?'bg-primary/10 text-primary font-medium':'text-slate-600 hover:bg-slate-50'}`}>
                          <GitBranch size={13}/> Plantillas
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 7. Admin — solo PM, al final */}
              {userRole === 'pm' && (
                <button onClick={() => onViewChange('admin')}
                  className={`text-sm font-medium transition-colors flex items-center gap-1 ${currentView==='admin'?'text-primary':'text-slate-600 hover:text-primary'}`}>
                  <Building2 size={13}/> Admin
                </button>
              )}

              {/* Circuitos BBVA — OCULTO TEMPORALMENTE (no borrar) */}
              {/* {canAccess(userRole as UserRole, 'view_circuitos') && (...)} */}
            </nav>
        </div>

        <div className="flex items-center flex-1 justify-end gap-4">
          <div className="relative hidden lg:block w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar tareas..." 
              className="w-full h-10 pl-10 pr-4 text-sm bg-slate-100 border-none rounded-lg focus:ring-2 focus:ring-primary/20"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowUserMenu(false); setShowProfile(true); }}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary transition-all"
              title="Perfil y configuración"
            >
              <Settings size={20} />
            </button>
            <div className="relative ml-2">
              <button
                onClick={() => setShowUserMenu(v => !v)}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100 transition-all"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
                  style={{ background: (user?.avatarColor ?? '#DC2626') + '20', color: user?.avatarColor ?? '#DC2626' }}
                >
                  {user?.initials ?? '?'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-medium text-slate-700 leading-tight">
                    {user?.name?.split(' ')[0] ?? 'Usuario'}
                  </p>
                  <p className="text-xs leading-tight" style={{ color: user?.avatarColor ?? '#dc2626', fontSize: '10px' }}>
                    {user?.role === 'pm' ? 'Project Manager'
                      : user?.role === 'tech_lead' ? 'Líder Técnico'
                      : user?.role === 'project_lead' ? 'Líder Proyecto'
                      : user?.role === 'tech_ref' ? 'Referente Técnico'
                      : 'Desarrollador'}
                  </p>
                </div>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-sm z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-800 truncate">{user?.name}</p>
                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => { setShowUserMenu(false); setShowProfile(true); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <Settings size={14} /> Ver perfil
                  </button>
                  <div style={{height:1,background:'#f1f5f9',margin:'2px 0'}}/>
                  <button
                    onClick={() => { setShowUserMenu(false); logout(); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* UserProfile modal */}
        {showProfile && <UserProfile onClose={() => setShowProfile(false)} />}

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

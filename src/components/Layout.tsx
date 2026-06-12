import React, { useState, useRef, useEffect } from 'react';
import { useAuth, canAccess, UserRole } from '../contexts/AuthContext';
import UserProfile from './UserProfile';
import {
  Layers,
  Settings,
  Search,
  Bell,
  Database,
  GitBranch,
  Cloud,
  Cpu,
  Archive,
  Shield,
  BarChart3,
  Building2,
  ChevronDown,
  CalendarRange,
} from 'lucide-react';

export type View = 'setup-project' | 'setup-team' | 'setup-tasks' | 'dashboard' | 'standards' | 'analytics' | 'audit' | 'bank-status' | 'notifications' | 'roles-permissions' | 'project-templates' | 'admin' | 'circuitos-bbva' | 'bitacora' | 'estimaciones' | 'plan-trabajo';

interface LayoutProps {
  children: React.ReactNode;
  currentView: View;
  onViewChange: (view: View) => void;
  userRole: string;
}

export default function Layout({ children, currentView, onViewChange, userRole }: LayoutProps) {
  const { user, logout } = useAuth();
  const [showUserMenu,   setShowUserMenu]   = useState(false);
  const [showHerramientas, setShowHerramientas] = useState(false);
  const [showProfile,    setShowProfile]    = useState(false);
  const herramRef = useRef<HTMLDivElement>(null);

  // Close Herramientas dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (herramRef.current && !herramRef.current.contains(e.target as Node)) setShowHerramientas(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const herramientasViews: View[] = ['standards','roles-permissions','audit','project-templates'];
  const herramientasActive = herramientasViews.includes(currentView);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between h-16 px-6 bg-white border-b border-slate-200">
        <div className="flex items-center gap-8">
            <div 
              className="flex items-center gap-3 cursor-pointer" 
              onClick={() => onViewChange('setup-project')}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
                <Database size={20} />
              </div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">Timia Hub</h1>
            </div>
            
            <nav className="hidden md:flex items-center gap-5">
              {/* Tablero — solo roles no-PM */}
              {userRole !== 'pm' && (
                <button onClick={() => onViewChange('dashboard')}
                  className={`text-sm font-medium transition-colors ${currentView==='dashboard'?'text-primary':'text-slate-600 hover:text-primary'}`}>
                  Tablero
                </button>
              )}

              {/* Analytics (PM ve su dashboard ejecutivo) */}
              {canAccess(userRole as UserRole,'view_analytics') && (
                <button onClick={() => onViewChange('analytics')}
                  className={`text-sm font-medium transition-colors ${currentView==='analytics'?'text-primary':'text-slate-600 hover:text-primary'}`}>
                  Analytics
                </button>
              )}

              {/* Circuitos BBVA */}
              <button onClick={() => onViewChange('circuitos-bbva')}
                className={`text-sm font-medium transition-colors ${currentView==='circuitos-bbva'?'text-primary':'text-slate-600 hover:text-primary'}`}>
                Circuitos BBVA
              </button>

              {/* Bitácora */}
              <button onClick={() => onViewChange('bitacora')}
                className={`text-sm font-medium transition-colors ${currentView==='bitacora'?'text-primary':'text-slate-600 hover:text-primary'}`}>
                Bitácora
              </button>

              {/* Estimaciones */}
              {canAccess(userRole as UserRole,'view_estimaciones') && (
                <button onClick={() => onViewChange('estimaciones')}
                  className={`text-sm font-medium transition-colors flex items-center gap-1 ${currentView==='estimaciones'?'text-primary':'text-slate-600 hover:text-primary'}`}>
                  <BarChart3 size={13}/> Estimaciones
                </button>
              )}

              {/* Plan de Trabajo — visible para roles con acceso, excepto PM que lo ve en su Dashboard */}
              {canAccess(userRole as UserRole,'view_plan_trabajo') && userRole !== 'pm' && (
                <button onClick={() => onViewChange('plan-trabajo')}
                  className={`text-sm font-medium transition-colors flex items-center gap-1 ${currentView==='plan-trabajo'?'text-primary':'text-slate-600 hover:text-primary'}`}>
                  <CalendarRange size={13}/> Plan de Trabajo
                </button>
              )}

              {/* Herramientas dropdown — engloba Estándares, Roles, Auditoría */}
              {(canAccess(userRole as UserRole,'view_standards')||canAccess(userRole as UserRole,'u_roles')||canAccess(userRole as UserRole,'view_audit')) && (
                <div ref={herramRef} className="relative">
                  <button
                    onClick={() => setShowHerramientas(v=>!v)}
                    className={`text-sm font-medium transition-colors flex items-center gap-1 ${herramientasActive?'text-primary':'text-slate-600 hover:text-primary'}`}
                  >
                    Herramientas <ChevronDown size={12} style={{transition:'transform .15s',transform:showHerramientas?'rotate(180deg)':'rotate(0deg)'}}/>
                  </button>
                  {showHerramientas && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden" style={{minWidth:170}}>
                      {canAccess(userRole as UserRole,'view_standards') && (
                        <button onClick={()=>{setShowHerramientas(false);onViewChange('standards');}}
                          className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors ${currentView==='standards'?'bg-primary/10 text-primary font-medium':'text-slate-600 hover:bg-slate-50'}`}>
                          <Layers size={13}/> Estándares
                        </button>
                      )}
                      {canAccess(userRole as UserRole,'u_roles') && (
                        <button onClick={()=>{setShowHerramientas(false);onViewChange('roles-permissions');}}
                          className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors ${currentView==='roles-permissions'?'bg-primary/10 text-primary font-medium':'text-slate-600 hover:bg-slate-50'}`}>
                          <Shield size={13}/> Roles y Permisos
                        </button>
                      )}
                      {canAccess(userRole as UserRole,'view_audit') && (
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

              {/* Admin — solo PM */}
              {userRole === 'pm' && (
                <button onClick={() => onViewChange('admin')}
                  className={`text-sm font-medium transition-colors flex items-center gap-1 ${currentView==='admin'?'text-primary':'text-slate-600 hover:text-primary'}`}>
                  <Building2 size={13}/> Admin
                </button>
              )}
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
              onClick={() => onViewChange('notifications')}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary transition-all"
            >
              <Bell size={20} />
            </button>
            <button className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary transition-all">
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

        {/* Sidebar — solo para Estándares (las demás vistas son full-width) */}
        {currentView === 'standards' && (
          <aside className="hidden lg:flex flex-col w-64 p-4 border-r border-slate-200 bg-white">
            <div className="mb-6 px-2">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Consola Admin</h2>
            </div>
            <nav className="flex flex-col gap-1">
              <SidebarLink 
                icon={<Layers size={18} />} 
                label="Estándares" 
                active={currentView === 'standards'} 
                onClick={() => onViewChange('standards')}
              />
              <SidebarLink 
                icon={<Cloud size={18} />} 
                label="Ingesta de Datos" 
                active={false} 
                onClick={() => {}}
              />
              <SidebarLink 
                icon={<Cpu size={18} />} 
                label="Procesamiento" 
                active={false} 
                onClick={() => {}}
              />
              <SidebarLink 
                icon={<Archive size={18} />} 
                label="Reglas de Archivo" 
                active={false} 
                onClick={() => {}}
              />
              <SidebarLink 
                icon={<GitBranch size={18} />} 
                label="Plantillas de Proyecto" 
                active={currentView === 'project-templates'} 
                onClick={() => onViewChange('project-templates')}
              />
              <SidebarLink 
                icon={<Shield size={18} />} 
                label="Roles y Permisos" 
                active={currentView === 'roles-permissions'} 
                onClick={() => onViewChange('roles-permissions')}
              />
              <SidebarLink 
                icon={<Shield size={18} />} 
                label="Registro de Auditoría" 
                active={currentView === 'audit'} 
                onClick={() => onViewChange('audit')}
              />
            </nav>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarLink({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
        active 
          ? 'bg-primary/10 text-primary' 
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

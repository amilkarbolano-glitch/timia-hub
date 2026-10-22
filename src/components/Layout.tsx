import { persist } from '../lib/persist';
import { DENSIDADES, densidadActual, aplicarDensidad, type Densidad } from '../lib/densidad';
import { allRoleMeta, rolPrincipal, esAdminPlataforma } from '../lib/permissions';
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
  Activity, Factory } from 'lucide-react';
import { TimiaMark, TimiaWordmark } from './TimiaLogo';

export type View = 'setup-project' | 'setup-team' | 'setup-tasks' | 'dashboard' | 'standards' | 'analytics' | 'audit' | 'bank-status' | 'notifications' | 'roles-permissions' | 'project-templates' | 'admin' | 'circuitos-bbva' | 'bitacora' | 'estimaciones' | 'plan-trabajo' | 'imputaciones' | 'inventario' | 'links' | 'proyectos' | 'activity-report' | 'fabrica';

interface LayoutProps {
  children: React.ReactNode;
  currentView: View;
  onViewChange: (view: View) => void;
  userRole: string;
}

/**
 * El menú, agrupado por lo que uno viene a hacer. Antes eran nueve ítems
 * sueltos arriba y a 1366 ya no entraban: el nav se desbordaba y en 13" había
 * que arrastrarlo de lado para llegar a Admin.
 *
 * La lista es declarativa a propósito: agregar una pantalla es una línea aquí,
 * no otro bloque de JSX copiado con su propio useState y su propio ref.
 */
export interface ItemMenu { view: View; label: string; icon?: React.ReactNode; perm?: string }
export interface GrupoMenu { label: string; titulo: string; items: ItemMenu[] }

export function menuDe(rol: string): (ItemMenu | GrupoMenu)[] {
  const puede = (p?: string) => !p || canAccess(rol as UserRole, p);
  const grupo = (label: string, titulo: string, items: ItemMenu[]): GrupoMenu | null => {
    const visibles = items.filter(i => puede(i.perm));
    return visibles.length ? { label, titulo, items: visibles } : null;
  };

  const todo: (ItemMenu | GrupoMenu | null)[] = [
    // Las dos pantallas de inicio quedan a un clic: es donde más se entra.
    rol !== 'pm' ? { view: 'dashboard' as View, label: 'Tablero' } : null,
    puede('view_analytics') ? { view: 'analytics' as View, label: 'Dashboard' } : null,

    grupo('Planeación', 'Cómo va el trabajo', [
      { view: 'proyectos',    label: 'Proyectos',       icon: <Activity size={13}/>,      perm: 'view_analytics' },
      { view: 'plan-trabajo', label: 'Plan de Trabajo', icon: <CalendarRange size={13}/>, perm: 'view_plan_trabajo' },
      { view: 'estimaciones', label: 'Estimaciones',    icon: <BarChart3 size={13}/>,     perm: 'view_estimaciones' },
    ]),

    grupo('Seguimiento', 'El día a día', [
      { view: 'bitacora',        label: 'Tareas',             icon: <Layers size={13}/> },
      { view: 'imputaciones',    label: 'Imputaciones Jira',  icon: <Layers size={13}/> },
      { view: 'activity-report', label: 'Activity Report (TR)', icon: <Layers size={13}/> },
    ]),

    grupo('Recursos', 'Recursos del equipo', [
      { view: 'inventario', label: 'Inventario',        icon: <Package size={13}/> },
      { view: 'fabrica',    label: 'Fábrica · estatus', icon: <Factory size={13}/>, perm: 'fabrica.view' },
      { view: 'links',      label: 'Links importantes', icon: <Link2 size={13}/> },
    ]),

    grupo('Admin', 'Administración', [
      { view: 'admin',             label: 'Equipo y proyectos', icon: <Building2 size={13}/>, perm: 'view_admin' },
      { view: 'roles-permissions', label: 'Roles y Permisos',   icon: <Shield size={13}/>,    perm: 'u_roles' },
      { view: 'audit',             label: 'Auditoría',          icon: <Shield size={13}/>,    perm: 's_audit' },
      { view: 'project-templates', label: 'Plantillas',         icon: <GitBranch size={13}/>, perm: 'create_projects' },
    ]),
  ];
  return todo.filter(Boolean) as (ItemMenu | GrupoMenu)[];
}

export const esGrupo = (x: ItemMenu | GrupoMenu): x is GrupoMenu => 'items' in x;

export default function Layout({ children, currentView, onViewChange, userRole }: LayoutProps) {
  const { user, logout } = useAuth();
  const [showUserMenu,      setShowUserMenu]      = useState(false);
  const [showProfile,       setShowProfile]       = useState(false);
  // Un solo desplegable abierto a la vez, identificado por su etiqueta.
  const [abierto, setAbierto] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  const menu = menuDe(userRole);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setAbierto(null);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Cerrar al cambiar de pantalla: si no, el menú queda abierto encima.
  useEffect(() => { setAbierto(null); }, [currentView]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header */}
      {/* El header es la única fuente de scroll horizontal de la app: nav + lado derecho
          sumaban ~1594px y no se encogían. Ahora todo escala por breakpoint y los
          bloques pueden encogerse (min-w-0), así entra desde 1280px sin scroll. */}
      <header data-print-hide className="sticky top-0 z-50 flex items-center justify-between h-16 px-3 xl:px-6 bg-white border-b border-slate-200">
        <div className="flex items-center gap-3 xl:gap-8 min-w-0">
            <div 
              className="flex items-center gap-3 cursor-pointer" 
              onClick={() => onViewChange('setup-project')}
            >
              <TimiaMark size={32} bg="none" />
              <TimiaWordmark variant="dark" height={22} />
            </div>
            
            <nav
              ref={navRef}
              className="hidden md:flex items-center gap-3 lg:gap-4 xl:gap-5 min-w-0"
            >
              {menu.map(entrada => {
                if (!esGrupo(entrada)) {
                  const act = currentView === entrada.view;
                  return (
                    <button key={entrada.label} onClick={() => onViewChange(entrada.view)}
                      className={`text-sm font-medium whitespace-nowrap transition-colors ${act?'text-primary':'text-slate-600 hover:text-primary'}`}>
                      {entrada.label}
                    </button>
                  );
                }
                const activo = entrada.items.some(i => i.view === currentView);
                const open = abierto === entrada.label;
                return (
                  <div key={entrada.label} className="relative">
                    <button
                      onClick={() => setAbierto(open ? null : entrada.label)}
                      aria-expanded={open}
                      className={`text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${activo?'text-primary':'text-slate-600 hover:text-primary'}`}>
                      {entrada.label}
                      <ChevronDown size={12} style={{ transition:'transform .15s', transform: open?'rotate(180deg)':'rotate(0deg)' }}/>
                    </button>
                    {open && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden"
                           style={{ minWidth: 206 }}>
                        <div style={{ padding:'8px 14px 6px', borderBottom:'0.5px solid #f1f5f9' }}>
                          <p style={{ margin:0, fontSize:9, color:'#94a3b8', fontWeight:700,
                                      textTransform:'uppercase', letterSpacing:'.08em' }}>{entrada.titulo}</p>
                        </div>
                        {entrada.items.map(i => (
                          <button key={i.view} onClick={() => { setAbierto(null); onViewChange(i.view); }}
                            className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors ${
                              currentView===i.view?'bg-primary/10 text-primary font-semibold':'text-slate-600 hover:bg-slate-50'}`}>
                            {i.icon} {i.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Circuitos BBVA — OCULTO TEMPORALMENTE (no borrar) */}
            </nav>
        </div>

        <div className="flex items-center flex-1 justify-end gap-2 xl:gap-4 min-w-0">
          <div className="relative hidden xl:block w-44 2xl:w-64 flex-shrink">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar tareas..." 
              className="w-full h-10 pl-10 pr-4 text-sm bg-slate-100 border-none rounded-lg focus:ring-2 focus:ring-primary/20"
            />
          </div>
          
          <div className="flex items-center gap-1 xl:gap-2 flex-shrink-0">
            <BuildBadge/>
            <PendingRequestsBadge onClick={() => onViewChange('admin')}/>
            <PersistBadge/>
            <button
              onClick={() => { setShowUserMenu(false); setShowProfile(true); }}
              className="flex items-center justify-center w-9 h-9 xl:w-10 xl:h-10 rounded-lg bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary transition-all flex-shrink-0"
              title="Perfil y configuración"
            >
              <Settings size={20} />
            </button>
            <div className="relative xl:ml-2 flex-shrink-0">
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
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-medium text-slate-700 leading-tight">
                    {user?.name?.split(' ')[0] ?? 'Usuario'}
                  </p>
                  <p className="text-xs leading-tight" style={{ color: user?.avatarColor ?? '#dc2626', fontSize: '10px' }}>
                    {/* El rol con el que la persona trabaja: el más alto que tiene entre
                        sus proyectos. El permiso administrativo no va acá — se marca con
                        el escudo de al lado. */}
                    {allRoleMeta()[rolPrincipal(user)]?.name ?? 'Sin rol'}
                    {esAdminPlataforma(user) && (
                      <Shield size={9} style={{ display: 'inline', marginLeft: 3, verticalAlign: 'baseline' }}
                        aria-label="Administra la plataforma"/>
                    )}
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
                  <SelectorDensidad/>
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


// ─── Indicador de persistencia: API (Mongo compartida) o Local (db.json + navegador) ──
export function PendingRequestsBadge({ onClick }: { onClick?: () => void }) {
  const { user } = useAuth();
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    const read = () => { try { const r = JSON.parse(localStorage.getItem('timia_access_requests') ?? '[]'); setN(Array.isArray(r) ? r.filter((x: any) => x.status === 'pending').length : 0); } catch { setN(0); } };
    read(); const t = setInterval(read, 15000); return () => clearInterval(t);
  }, []);
  if (!user || !canAccess(user.role, 'team.manage') || n === 0) return null;
  return (
    <button onClick={onClick} title={`${n} solicitud(es) de acceso pendiente(s)`} style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:10, fontWeight:700, color:'#92400e', background:'#fef3c7', border:'0.5px solid #fde68a', borderRadius:10, padding:'3px 8px', cursor:'pointer' }}>
      {n} acceso{n !== 1 ? 's' : ''} por aprobar
    </button>
  );
}

declare global { interface Window { TIMIA_BUILD?: { branch: string; sha: string; at: string } } }
export function BuildBadge() {
  const b = typeof window !== 'undefined' ? window.TIMIA_BUILD : undefined;
  if (!b || b.branch === 'main') return null;
  return <span title={`Build de pruebas · ${b.sha} · ${b.at}`} style={{ fontSize:10, fontWeight:700, color:'#7c3aed', background:'#f5f3ff', border:'0.5px solid #ddd6fe', borderRadius:10, padding:'3px 8px', whiteSpace:'nowrap' }}>pruebas · {b.branch}</span>;
}

/** Tamaño de la interfaz. Se guarda por navegador, no por cuenta: depende del
 *  monitor en el que estés, no de quién sos. */
function SelectorDensidad() {
  const [d, setD] = React.useState<Densidad>(() => densidadActual());
  return (
    <div className="px-4 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">Tamaño de la interfaz</p>
      <div className="flex border border-slate-200 rounded-lg overflow-hidden">
        {DENSIDADES.map(x => (
          <button
            key={x.id}
            title={x.nota}
            onClick={() => { setD(x.id); aplicarDensidad(x.id); }}
            className={`flex-1 py-1.5 text-[11px] font-semibold transition-colors ${
              d === x.id ? 'bg-primary text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PersistBadge() {
  const [, force] = React.useState(0);
  React.useEffect(() => persist.onChange(() => force(v => v + 1)), []);
  const api = persist.mode === 'api';
  const pending = persist.pendingWrites, fail = persist.failures, err = persist.lastError;
  const color = !api ? '#94a3b8' : fail ? '#dc2626' : pending ? '#d97706' : '#15803d';
  const label = !api ? 'Local' : err ? 'API · cambio rechazado' : fail ? 'API · error al guardar' : pending ? 'API · guardando…' : 'API · sincronizado';
  React.useEffect(() => { if (err) { const t = setTimeout(() => persist.clearError(), 8000); return () => clearTimeout(t); } }, [err]);
  return (
    <>
    {err && (
      <div role="alert" style={{ position:'fixed', top:64, right:20, zIndex:2000, maxWidth:380, padding:'10px 14px', background:'#fef2f2', border:'0.5px solid #fecaca', borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,.12)', fontSize:11, color:'#991b1b', lineHeight:1.4 }}>
        <strong>El servidor no permitió el cambio.</strong> {err.detail}
        <div style={{ fontSize:10, color:'#b91c1c', marginTop:3 }}>Se restauró el estado guardado; recarga la vista para verlo.</div>
      </div>
    )}
    <span title={api ? `Conectado a ${persist.apiBase || location.origin}/api (MongoDB · sesión segura)` : 'Sin API: datos en este navegador (db.json + localStorage)'}
      style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:10, color, fontWeight:600, padding:'3px 8px', borderRadius:10, background:`${color}14`, border:`0.5px solid ${color}40`, whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:color }}/>
      <span className="hidden xl:inline">{label}</span>
    </span>
    </>
  );
}

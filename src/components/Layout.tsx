import React from 'react';
import { hasPermission } from '../lib/permissions';
import { 
  LayoutDashboard, 
  Layers, 
  Users, 
  Settings, 
  Search, 
  Bell, 
  Database,
  GitBranch,
  Cloud,
  Cpu,
  Archive,
  Shield,
  History,
  BarChart3,
  Plus
} from 'lucide-react';

export type View = 'setup-project' | 'setup-team' | 'setup-tasks' | 'dashboard' | 'standards' | 'analytics' | 'audit' | 'bank-status' | 'notifications' | 'roles-permissions' | 'project-templates';

interface LayoutProps {
  children: React.ReactNode;
  currentView: View;
  onViewChange: (view: View) => void;
  userRole: string;
}

export default function Layout({ children, currentView, onViewChange, userRole }: LayoutProps) {
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
            
            <nav className="hidden md:flex items-center gap-6">
              <button 
                onClick={() => onViewChange('dashboard')}
                className={`text-sm font-medium transition-colors ${currentView === 'dashboard' ? 'text-primary' : 'text-slate-600 hover:text-primary'}`}
              >
                Tablero
              </button>
              <button 
                onClick={() => onViewChange('bank-status')}
                className={`text-sm font-medium transition-colors ${currentView === 'bank-status' ? 'text-primary' : 'text-slate-600 hover:text-primary'}`}
              >
                Status Semanal
              </button>
              {hasPermission(userRole, 's_standards') && (
                <button 
                  onClick={() => onViewChange('standards')}
                  className={`text-sm font-medium transition-colors ${currentView === 'standards' ? 'text-primary' : 'text-slate-600 hover:text-primary'}`}
                >
                  Estándares
                </button>
              )}
              {hasPermission(userRole, 'u_roles') && (
                <button 
                  onClick={() => onViewChange('roles-permissions')}
                  className={`text-sm font-medium transition-colors ${currentView === 'roles-permissions' ? 'text-primary' : 'text-slate-600 hover:text-primary'}`}
                >
                  Roles
                </button>
              )}
              {hasPermission(userRole, 's_audit') && (
                <button 
                  onClick={() => onViewChange('audit')}
                  className={`text-sm font-medium transition-colors ${currentView === 'audit' ? 'text-primary' : 'text-slate-600 hover:text-primary'}`}
                >
                  Auditoría
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
            <div className="w-10 h-10 ml-2 overflow-hidden border-2 rounded-full border-primary/20">
              <img 
                src="https://picsum.photos/seed/user/100/100" 
                alt="User" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar for specific views */}
        {(currentView === 'standards' || currentView === 'audit' || currentView === 'notifications' || currentView === 'roles-permissions' || currentView === 'project-templates') && (
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

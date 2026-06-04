import React, { useState } from 'react';
import { 
  Shield, 
  Check, 
  X, 
  Info, 
  Users, 
  Lock, 
  Eye, 
  Edit3, 
  Trash2, 
  Plus,
  ChevronRight,
  Search,
  Palette
} from 'lucide-react';
import { Role, PermissionStatus } from '../types';

const PERMISSION_CATEGORIES = [
  {
    id: 'projects',
    name: 'Gestión de Proyectos',
    permissions: [
      { id: 'p_create', name: 'Crear Proyectos', description: 'Permite crear nuevos espacios de trabajo y proyectos.' },
      { id: 'p_edit', name: 'Editar Proyectos', description: 'Modificar nombres, descripciones y configuraciones de proyecto.' },
      { id: 'p_archive', name: 'Archivar/Eliminar', description: 'Mover proyectos al archivo o eliminarlos permanentemente.' },
      { id: 'p_view_all', name: 'Ver Todos los Proyectos', description: 'Acceso a proyectos incluso si no es miembro directo.' },
    ]
  },
  {
    id: 'tasks',
    name: 'Gestión de Tareas',
    permissions: [
      { id: 't_create', name: 'Crear Tareas', description: 'Crear nuevas tareas dentro de los proyectos.' },
      { id: 't_edit', name: 'Editar Tareas', description: 'Modificar títulos, descripciones y detalles de tareas.' },
      { id: 't_assign', name: 'Asignar Tareas', description: 'Cambiar el responsable de una tarea.' },
      { id: 't_delete', name: 'Eliminar Tareas', description: 'Borrar tareas existentes.' },
      { id: 't_comment', name: 'Comentar', description: 'Añadir notas y comentarios a las tareas.' },
      { id: 't_status', name: 'Cambiar Estados', description: 'Mover tareas entre columnas (To Do, Doing, Done).' },
    ]
  },
  {
    id: 'team',
    name: 'Gestión de Equipo',
    permissions: [
      { id: 'u_invite', name: 'Invitar Miembros', description: 'Enviar invitaciones a nuevos usuarios.' },
      { id: 'u_remove', name: 'Eliminar Miembros', description: 'Revocar acceso a usuarios del equipo.' },
      { id: 'u_roles', name: 'Gestionar Roles', description: 'Cambiar los permisos de otros usuarios.' },
    ]
  },
  {
    id: 'admin',
    name: 'Administración y Sistema',
    permissions: [
      { id: 's_audit', name: 'Ver Auditoría', description: 'Acceso al registro de actividades global.' },
      { id: 's_standards', name: 'Configurar Estándares', description: 'Modificar las reglas de calidad del proyecto.' },
      { id: 's_billing', name: 'Facturación', description: 'Gestionar suscripciones y métodos de pago.' },
    ]
  }
];

const INITIAL_ROLES: Role[] = [
  {
    id: 'admin',
    name: 'Super Administrador',
    description: 'Control total sobre la plataforma, usuarios y facturación.',
    color: 'bg-red-500',
    permissions: {
      'p_create': 'allowed', 'p_edit': 'allowed', 'p_archive': 'allowed', 'p_view_all': 'allowed',
      't_create': 'allowed', 't_assign': 'allowed', 't_delete': 'allowed', 't_comment': 'allowed', 't_status': 'allowed',
      'u_invite': 'allowed', 'u_remove': 'allowed', 'u_roles': 'allowed',
      's_audit': 'allowed', 's_standards': 'allowed', 's_billing': 'allowed'
    }
  },
  {
    id: 'leader',
    name: 'Líder de Proyecto',
    description: 'Gestiona equipos y proyectos específicos. No accede a facturación.',
    color: 'bg-indigo-500',
    permissions: {
      'p_create': 'allowed', 'p_edit': 'allowed', 'p_archive': 'denied', 'p_view_all': 'allowed',
      't_create': 'allowed', 't_assign': 'allowed', 't_delete': 'allowed', 't_comment': 'allowed', 't_status': 'allowed',
      'u_invite': 'allowed', 'u_remove': 'allowed', 'u_roles': 'denied',
      's_audit': 'allowed', 's_standards': 'allowed', 's_billing': 'denied'
    }
  },
  {
    id: 'member',
    name: 'Desarrollador',
    description: 'Miembro estándar del equipo. Enfocado en la ejecución de tareas.',
    color: 'bg-emerald-500',
    permissions: {
      'p_create': 'denied', 'p_edit': 'denied', 'p_archive': 'denied', 'p_view_all': 'denied',
      't_create': 'allowed', 't_assign': 'denied', 't_delete': 'denied', 't_comment': 'allowed', 't_status': 'allowed',
      'u_invite': 'denied', 'u_remove': 'denied', 'u_roles': 'denied',
      's_audit': 'denied', 's_standards': 'denied', 's_billing': 'denied'
    }
  },
  {
    id: 'guest',
    name: 'Invitado / Cliente',
    description: 'Acceso limitado para visualización y feedback externo.',
    color: 'bg-amber-500',
    permissions: {
      'p_create': 'denied', 'p_edit': 'denied', 'p_archive': 'denied', 'p_view_all': 'denied',
      't_create': 'denied', 't_assign': 'denied', 't_delete': 'denied', 't_comment': 'allowed', 't_status': 'denied',
      'u_invite': 'denied', 'u_remove': 'denied', 'u_roles': 'denied',
      's_audit': 'denied', 's_standards': 'denied', 's_billing': 'denied'
    }
  }
];

const COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 
  'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 
  'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 
  'bg-pink-500', 'bg-rose-500', 'bg-slate-500'
];

export default function RolesPermissions() {
  const [roles, setRoles] = useState<Role[]>(INITIAL_ROLES);
  const [selectedRoleId, setSelectedRoleId] = useState<string>(roles[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New Role Form State
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleColor, setNewRoleColor] = useState(COLORS[0]);

  const selectedRole = roles.find(r => r.id === selectedRoleId) || roles[0];

  const togglePermission = (roleId: string, permissionId: string) => {
    setRoles(prev => prev.map(role => {
      if (role.id !== roleId) return role;
      
      const current = role.permissions[permissionId];
      const next: PermissionStatus = current === 'allowed' ? 'denied' : 'allowed';

      return {
        ...role,
        permissions: { ...role.permissions, [permissionId]: next }
      };
    }));
  };

  const handleCreateRole = () => {
    if (!newRoleName.trim()) return;

    const newRole: Role = {
      id: `role-${Date.now()}`,
      name: newRoleName,
      description: newRoleDesc,
      color: newRoleColor,
      permissions: Object.fromEntries(
        PERMISSION_CATEGORIES.flatMap(c => c.permissions.map(p => [p.id, 'denied' as PermissionStatus]))
      )
    };

    setRoles([...roles, newRole]);
    setSelectedRoleId(newRole.id);
    setIsModalOpen(false);
    setNewRoleName('');
    setNewRoleDesc('');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="text-primary" />
            Roles y Permisos
          </h1>
          <p className="text-slate-500 mt-1">Define qué puede hacer cada miembro en la plataforma Timia Hub.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          <Plus size={20} />
          Nuevo Rol
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar: Roles List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar rol..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Roles del Sistema</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {roles.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())).map(role => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`w-full flex items-center gap-4 p-4 text-left transition-all ${
                    selectedRoleId === role.id ? 'bg-primary/5 border-l-4 border-primary' : 'hover:bg-slate-50 border-l-4 border-transparent'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl ${role.color} flex items-center justify-center text-white shadow-sm`}>
                    <Users size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-bold truncate ${selectedRoleId === role.id ? 'text-primary' : 'text-slate-900'}`}>{role.name}</h4>
                    <p className="text-xs text-slate-500 truncate">{role.description}</p>
                  </div>
                  <ChevronRight size={16} className={selectedRoleId === role.id ? 'text-primary' : 'text-slate-300'} />
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
            <div className="flex gap-3">
              <Info className="text-indigo-500 shrink-0" size={20} />
              <div>
                <h4 className="text-sm font-bold text-indigo-900">Sobre los Permisos</h4>
                <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
                  Los cambios realizados aquí afectan a todos los usuarios asignados a este rol de manera inmediata.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main: Permissions Matrix */}
        <div className="lg:col-span-8">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl ${selectedRole.color} flex items-center justify-center text-white shadow-md`}>
                  <Shield size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedRole.name}</h2>
                  <p className="text-sm text-slate-500">{selectedRole.description}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors">
                  <Edit3 size={20} />
                </button>
                <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={20} />
                </button>
              </div>
            </div>

            <div className="p-0">
              {PERMISSION_CATEGORIES.map((category) => (
                <div key={category.id} className="border-b border-slate-100 last:border-0">
                  <div className="px-6 py-4 bg-slate-50/30">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">{category.name}</h3>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {category.permissions.map((permission) => {
                      const status = selectedRole.permissions[permission.id] || 'denied';
                      return (
                        <div key={permission.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                          <div className="flex-1 pr-8">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-700 text-sm">{permission.name}</span>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="relative group/tooltip">
                                  <Info size={14} className="text-slate-400 cursor-help" />
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded shadow-xl pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-opacity z-10">
                                    {permission.description}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{permission.description}</p>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                              <button
                                onClick={() => togglePermission(selectedRole.id, permission.id)}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                  status === 'allowed' 
                                    ? 'bg-white text-emerald-600 shadow-sm' 
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                              >
                                {status === 'allowed' ? <Check size={14} /> : <div className="w-3.5 h-3.5" />}
                                Permitido
                              </button>
                              <button
                                onClick={() => togglePermission(selectedRole.id, permission.id)}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                  status === 'denied' 
                                    ? 'bg-white text-red-500 shadow-sm' 
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                              >
                                {status === 'denied' ? <X size={14} /> : <div className="w-3.5 h-3.5" />}
                                Denegado
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                Descartar Cambios
              </button>
              <button className="px-6 py-2 text-sm font-bold bg-primary text-white rounded-lg hover:bg-primary/90 transition-all shadow-md shadow-primary/10">
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* New Role Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-900">Crear Nuevo Rol</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nombre del Rol</label>
                <input 
                  type="text" 
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Ej: Auditor Externo"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Descripción</label>
                <textarea 
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="¿Qué responsabilidades tiene este rol?"
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Palette size={16} />
                  Color de Identificación
                </label>
                <div className="grid grid-cols-5 gap-3">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewRoleColor(color)}
                      className={`h-8 rounded-lg transition-all ${color} ${newRoleColor === color ? 'ring-4 ring-slate-200 scale-110' : 'hover:scale-105'}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreateRole}
                disabled={!newRoleName.trim()}
                className="flex-1 px-4 py-3 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Crear Rol
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

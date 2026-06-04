import { Role, PermissionStatus } from '../types';

export const INITIAL_ROLES: Role[] = [
  {
    id: 'admin',
    name: 'Super Administrador',
    description: 'Control total sobre la plataforma, usuarios y facturación.',
    color: 'bg-red-500',
    permissions: {
      'p_create': 'allowed', 'p_edit': 'allowed', 'p_archive': 'allowed', 'p_view_all': 'allowed',
      't_create': 'allowed', 't_edit': 'allowed', 't_assign': 'allowed', 't_delete': 'allowed', 't_comment': 'allowed', 't_status': 'allowed',
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
      't_create': 'allowed', 't_edit': 'allowed', 't_assign': 'allowed', 't_delete': 'allowed', 't_comment': 'allowed', 't_status': 'allowed',
      'u_invite': 'allowed', 'u_remove': 'allowed', 'u_roles': 'allowed',
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
      't_create': 'allowed', 't_edit': 'allowed', 't_assign': 'denied', 't_delete': 'denied', 't_comment': 'allowed', 't_status': 'allowed',
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

export function hasPermission(roleId: string, permissionId: string): boolean {
  const role = INITIAL_ROLES.find(r => r.id === roleId);
  if (!role) return false;
  return role.permissions[permissionId] === 'allowed';
}

export function getRole(roleId: string): Role | undefined {
  return INITIAL_ROLES.find(r => r.id === roleId);
}

// Seed the database with initial TIMIA Hub data
// Run: npx tsx server/seed.ts

import { prisma } from './lib/prisma';

async function main() {
  console.log('🌱 Seeding Timia Hub database...');

  // Roles
  const roles = [
    {
      id: 'admin', name: 'Super Administrador',
      description: 'Control total sobre la plataforma.',
      color: 'bg-red-500',
      permissions: {
        p_create: 'allowed', p_edit: 'allowed', p_archive: 'allowed', p_view_all: 'allowed',
        t_create: 'allowed', t_edit: 'allowed', t_assign: 'allowed', t_delete: 'allowed',
        t_comment: 'allowed', t_status: 'allowed',
        u_invite: 'allowed', u_remove: 'allowed', u_roles: 'allowed',
        s_audit: 'allowed', s_standards: 'allowed', s_billing: 'allowed',
      },
    },
    {
      id: 'leader', name: 'Líder de Proyecto',
      description: 'Gestiona equipos y proyectos específicos.',
      color: 'bg-indigo-500',
      permissions: {
        p_create: 'allowed', p_edit: 'allowed', p_archive: 'denied', p_view_all: 'allowed',
        t_create: 'allowed', t_edit: 'allowed', t_assign: 'allowed', t_delete: 'allowed',
        t_comment: 'allowed', t_status: 'allowed',
        u_invite: 'allowed', u_remove: 'allowed', u_roles: 'allowed',
        s_audit: 'allowed', s_standards: 'allowed', s_billing: 'denied',
      },
    },
    {
      id: 'member', name: 'Desarrollador',
      description: 'Miembro estándar del equipo.',
      color: 'bg-emerald-500',
      permissions: {
        p_create: 'denied', p_edit: 'denied', p_archive: 'denied', p_view_all: 'denied',
        t_create: 'allowed', t_edit: 'allowed', t_assign: 'denied', t_delete: 'denied',
        t_comment: 'allowed', t_status: 'allowed',
        u_invite: 'denied', u_remove: 'denied', u_roles: 'denied',
        s_audit: 'denied', s_standards: 'denied', s_billing: 'denied',
      },
    },
    {
      id: 'guest', name: 'Invitado / Cliente',
      description: 'Acceso limitado para visualización.',
      color: 'bg-amber-500',
      permissions: {
        p_create: 'denied', p_edit: 'denied', p_archive: 'denied', p_view_all: 'denied',
        t_create: 'denied', t_assign: 'denied', t_delete: 'denied', t_comment: 'allowed', t_status: 'denied',
        u_invite: 'denied', u_remove: 'denied', u_roles: 'denied',
        s_audit: 'denied', s_standards: 'denied', s_billing: 'denied',
      },
    },
  ];

  for (const { permissions, ...roleData } of roles) {
    await prisma.role.upsert({
      where: { id: roleData.id },
      update: {},
      create: roleData,
    });
    for (const [permission, status] of Object.entries(permissions)) {
      await prisma.rolePermission.upsert({
        where: { roleId_permission: { roleId: roleData.id, permission } },
        update: { status },
        create: { roleId: roleData.id, permission, status },
      });
    }
  }
  console.log('✅ Roles seeded');

  // Users
  const users = [
    { id: 'user-1', name: 'Alfonso Portillo', email: 'a.portillo@timia.ai', avatar: 'AP', roleId: 'leader' },
    { id: 'user-2', name: 'Juan Pablo Arévalo', email: 'jp.arevalo@timia.ai', avatar: 'JA', roleId: 'leader' },
    { id: 'user-3', name: 'Ana García', email: 'a.garcia@timia.ai', avatar: 'AG', roleId: 'member' },
    { id: 'user-4', name: 'Carlos Ruiz', email: 'c.ruiz@timia.ai', avatar: 'CR', roleId: 'member' },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: user,
    });
  }
  console.log('✅ Users seeded');

  // Default project
  const project = await prisma.project.upsert({
    where: { id: 'project-1' },
    update: {},
    create: {
      id: 'project-1',
      name: 'Ingesta Principal',
      description: 'Proyecto de ingesta de datos a la plataforma ADA.',
      templateId: 'ingesta',
    },
  });

  // ANS rules for default project
  const ansRules = [
    { name: 'Tarea Baja Complejidad', complexityLevel: 1, maxDaysWork: 2 },
    { name: 'Tarea Media Complejidad', complexityLevel: 2, maxDaysWork: 5 },
    { name: 'Tarea Alta Complejidad', complexityLevel: 3, maxDaysWork: 10 },
    { name: 'Tarea Crítica', complexityLevel: 4, maxDaysWork: 15 },
  ];

  for (const rule of ansRules) {
    await prisma.ansRule.upsert({
      where: { id: `ans-${project.id}-${rule.complexityLevel}` },
      update: {},
      create: { id: `ans-${project.id}-${rule.complexityLevel}`, ...rule, projectId: project.id },
    });
  }
  console.log('✅ ANS rules seeded');

  // Sample tasks
  const tasks = [
    {
      id: 'task-1', title: 'Construcción de Prediccionario', jiraId: 'THUB-101',
      description: 'Definición de esquemas base para el prediccionario de la fuente.',
      priority: 'Alta', status: 'in-progress', startDate: '2026-03-01', endDate: '2026-03-15',
      isLocked: true, assignees: ['user-1'],
    },
    {
      id: 'task-2', title: 'Mapeo de Datos SQL', jiraId: 'THUB-102',
      description: 'Transformación de tablas relacionales a JSON.',
      priority: 'Media', status: 'in-progress', startDate: '2026-03-05', endDate: '2026-03-20',
      assignees: ['user-2'],
    },
    {
      id: 'task-3', title: 'Validación de Calidad', jiraId: 'THUB-103',
      description: 'Reglas de limpieza y deduplicación.',
      priority: 'Baja', status: 'backlog', startDate: '2026-03-10', endDate: '2026-03-25',
      assignees: [],
    },
    {
      id: 'task-4', title: 'Documentación Técnica API v2', jiraId: 'THUB-104',
      description: 'Generación de Swagger y ejemplos de uso.',
      priority: 'Media', status: 'review', startDate: '2026-03-01', endDate: '2026-03-12',
      assignees: ['user-3'],
    },
  ];

  for (const { assignees, ...taskData } of tasks) {
    const task = await prisma.task.upsert({
      where: { id: taskData.id },
      update: {},
      create: { ...taskData, projectId: project.id },
    });
    for (const userId of assignees) {
      await prisma.taskAssignee.upsert({
        where: { taskId_userId: { taskId: task.id, userId } },
        update: {},
        create: { taskId: task.id, userId },
      });
    }
  }
  console.log('✅ Tasks seeded');

  // Sample audit logs
  const auditEntries = [
    { event: 'Movimiento de Tarea', detail: 'De "En Progreso" a "Revisión"', status: 'COMPLETADO', code: 'TASK-1', type: 'AUDIT', taskId: 'task-1', userId: 'user-1' },
    { event: 'Desviación de Tiempo', detail: 'Retraso detectado en Tarea 2', status: 'CRÍTICO', code: 'ALERTA', type: 'ALERT', taskId: 'task-2' },
    { event: 'Tarea Creada', detail: 'Nueva tarea añadida al Backlog', status: 'COMPLETADO', code: 'TASK-3', type: 'AUDIT', taskId: 'task-3', userId: 'user-2' },
  ];

  for (const entry of auditEntries) {
    await prisma.auditLog.create({ data: entry });
  }
  console.log('✅ Audit logs seeded');

  console.log('🎉 Database ready!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

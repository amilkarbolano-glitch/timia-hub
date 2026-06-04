import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/tasks?projectId=xxx
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.query;
    const tasks = await prisma.task.findMany({
      where: projectId ? { projectId: String(projectId) } : {},
      include: {
        assignees: { include: { user: true } },
        comments: { include: { user: true }, orderBy: { createdAt: 'asc' } },
        attachments: true,
        links: true,
      },
      orderBy: [{ status: 'asc' }, { order: 'asc' }],
    });
    res.json(tasks);
  } catch (e) {
    res.status(500).json({ error: 'Error fetching tasks' });
  }
});

// POST /api/tasks
router.post('/', async (req, res) => {
  try {
    const { assignees = [], ...data } = req.body;
    const task = await prisma.task.create({
      data: {
        ...data,
        assignees: {
          create: assignees.map((userId: string) => ({ userId })),
        },
      },
      include: { assignees: { include: { user: true } }, comments: true, attachments: true, links: true },
    });

    // Audit log
    await prisma.auditLog.create({
      data: { event: 'Tarea Creada', detail: `"${task.title}" añadida`, status: 'COMPLETADO', code: task.id, type: 'AUDIT', taskId: task.id },
    });

    res.json(task);
  } catch (e) {
    res.status(500).json({ error: 'Error creating task' });
  }
});

// PATCH /api/tasks/:id
router.patch('/:id', async (req, res) => {
  try {
    const { assignees, ...data } = req.body;
    const prev = await prisma.task.findUnique({ where: { id: req.params.id } });

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data,
      include: { assignees: { include: { user: true } }, comments: { include: { user: true } }, attachments: true, links: true },
    });

    // Audit: status change
    if (prev && data.status && prev.status !== data.status) {
      const labels: Record<string, string> = { backlog: 'Backlog', 'in-progress': 'En Progreso', review: 'Revisión', done: 'Finalizado' };
      await prisma.auditLog.create({
        data: {
          event: 'Movimiento de Tarea',
          detail: `De "${labels[prev.status]}" a "${labels[data.status]}"`,
          status: 'COMPLETADO', code: task.id, type: 'AUDIT', taskId: task.id,
        },
      });
    }

    res.json(task);
  } catch (e) {
    res.status(500).json({ error: 'Error updating task' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    await prisma.task.delete({ where: { id: req.params.id } });
    await prisma.auditLog.create({
      data: { event: 'Tarea Eliminada', detail: `"${task?.title}" eliminada`, status: 'COMPLETADO', code: req.params.id, type: 'AUDIT' },
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error deleting task' });
  }
});

// POST /api/tasks/:id/comments
router.post('/:id/comments', async (req, res) => {
  try {
    const comment = await prisma.comment.create({
      data: { text: req.body.text, taskId: req.params.id, userId: req.body.userId },
      include: { user: true },
    });
    res.json(comment);
  } catch (e) {
    res.status(500).json({ error: 'Error adding comment' });
  }
});

export default router;

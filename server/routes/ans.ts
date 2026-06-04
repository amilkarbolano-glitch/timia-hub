import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/ans/status?projectId=xxx — returns tasks with ANS compliance status
router.get('/status', async (req, res) => {
  try {
    const { projectId } = req.query;
    const project = await prisma.project.findFirst({
      where: projectId ? { id: String(projectId) } : {},
      include: {
        ansRules: true,
        tasks: {
          where: { status: { not: 'done' } },
          include: { assignees: { include: { user: true } } },
        },
      },
    });

    if (!project) return res.json([]);

    const priorityToComplexity: Record<string, number> = {
      Baja: 1, Media: 2, Alta: 3, Crítica: 4,
    };

    const now = new Date();
    const result = project.tasks.map(task => {
      const level = priorityToComplexity[task.priority] ?? 2;
      const rule = project.ansRules.find(r => r.complexityLevel === level);
      const maxDays = rule?.maxDays ?? 5;

      const start = task.startDate ? new Date(task.startDate) : task.createdAt;
      const elapsedDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const remainingDays = maxDays - elapsedDays;
      const pct = Math.min(100, Math.round((elapsedDays / maxDays) * 100));

      let semaphore: 'green' | 'yellow' | 'red';
      if (remainingDays > 2) semaphore = 'green';
      else if (remainingDays >= 0) semaphore = 'yellow';
      else semaphore = 'red';

      return {
        taskId: task.id,
        title: task.title,
        priority: task.priority,
        status: task.status,
        maxDays,
        elapsedDays,
        remainingDays,
        percentUsed: pct,
        semaphore,
        assignees: task.assignees.map(a => a.user.name),
      };
    });

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Error calculating ANS status' });
  }
});

export default router;

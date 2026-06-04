import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: { _count: { select: { tasks: true } }, ansRules: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(projects);
  } catch (e) {
    res.status(500).json({ error: 'Error fetching projects' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { tasks: { include: { assignees: { include: { user: true } } } }, ansRules: true },
    });
    if (!project) return res.status(404).json({ error: 'Not found' });
    res.json(project);
  } catch (e) {
    res.status(500).json({ error: 'Error fetching project' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { ansRules, ...data } = req.body;
    const project = await prisma.project.create({
      data: {
        ...data,
        ansRules: ansRules ? { create: ansRules } : undefined,
      },
      include: { ansRules: true },
    });
    res.json(project);
  } catch (e) {
    res.status(500).json({ error: 'Error creating project' });
  }
});

export default router;

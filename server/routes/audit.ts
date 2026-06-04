import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { limit = '50', type } = req.query;
    const logs = await prisma.auditLog.findMany({
      where: type ? { type: String(type) } : {},
      include: { user: true, task: true },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
    });
    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: 'Error fetching audit logs' });
  }
});

export default router;

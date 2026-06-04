import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const users = await prisma.user.findMany({ include: { role: { include: { permissions: true } } } });
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});

router.post('/', async (req, res) => {
  try {
    const user = await prisma.user.create({ data: req.body, include: { role: true } });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: 'Error creating user' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const user = await prisma.user.update({ where: { id: req.params.id }, data: req.body, include: { role: true } });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: 'Error updating user' });
  }
});

export default router;

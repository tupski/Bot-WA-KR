import { Router } from 'express';

const router = Router();

// Placeholder routes - will be implemented in System Configuration API task
router.get('/', (req, res) => {
  res.json({ message: 'Get system config endpoint - to be implemented' });
});

router.put('/', (req, res) => {
  res.json({ message: 'Update system config endpoint - to be implemented' });
});

router.get('/apartments', (req, res) => {
  res.json({ message: 'Get apartments config endpoint - to be implemented' });
});

router.put('/apartments', (req, res) => {
  res.json({ message: 'Update apartments config endpoint - to be implemented' });
});

export default router;

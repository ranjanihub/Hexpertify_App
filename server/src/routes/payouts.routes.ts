import { Router } from 'express';
import { PayoutsController } from '../controllers/payouts.controller';
import { requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Admins only: the list carries therapists' bank/UPI details and clients' names per session
router.get('/', requireAdmin, PayoutsController.getAll);
router.post('/release', requireAdmin, PayoutsController.releasePayout);
router.post('/', requireAdmin, PayoutsController.releasePayout);
router.put('/:id', requireAdmin, PayoutsController.update);
router.patch('/:id', requireAdmin, PayoutsController.update);

export default router;

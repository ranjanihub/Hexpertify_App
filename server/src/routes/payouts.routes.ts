import { Router } from 'express';
import { PayoutsController } from '../controllers/payouts.controller';
import { requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', PayoutsController.getAll);
router.post('/release', requireAdmin, PayoutsController.releasePayout);
router.post('/', requireAdmin, PayoutsController.releasePayout);
router.put('/:id', requireAdmin, PayoutsController.update);
router.patch('/:id', requireAdmin, PayoutsController.update);

export default router;

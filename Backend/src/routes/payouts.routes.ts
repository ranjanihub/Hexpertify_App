import { Router } from 'express';
import { PayoutsController } from '../controllers/payouts.controller';

const router = Router();

router.get('/', PayoutsController.getAll);
router.post('/release', PayoutsController.releasePayout);
router.post('/', PayoutsController.releasePayout);

export default router;

import { Router } from 'express';
import { RevenueController } from '../controllers/revenue.controller';

const router = Router();

router.get('/', RevenueController.getRevenue);
router.get('/summary', RevenueController.getRevenue);
router.get('/analytics', RevenueController.getRevenue);
router.get('/transactions', RevenueController.getRevenue);

export default router;

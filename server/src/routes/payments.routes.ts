import { Router } from 'express';
import { PaymentsController } from '../controllers/payments.controller';
import { optionalAuth, requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Customer checkout
router.post('/order', optionalAuth, PaymentsController.createOrder);
router.post('/verify', optionalAuth, PaymentsController.verify);

// Gateway callbacks (raw body is preserved in index.ts)
router.post('/webhook/:provider', PaymentsController.webhook);

// Admin
router.get('/', requireAdmin, PaymentsController.list);
router.get('/:id', requireAdmin, PaymentsController.getOne);
router.post('/:id/refund', requireAdmin, PaymentsController.refund);

export default router;

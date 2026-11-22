import { Router } from 'express';
import { NotificationsController } from '../controllers/notifications.controller';
import { optionalAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(optionalAuth);

router.get('/', NotificationsController.getAll);
router.post('/', NotificationsController.create);
router.put('/:id/read', NotificationsController.markRead);
router.post('/mark-all-read', NotificationsController.markAllRead);

export default router;

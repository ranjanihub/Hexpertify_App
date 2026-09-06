import { Router } from 'express';
import { NotificationsController } from '../controllers/notifications.controller';

const router = Router();

router.get('/', NotificationsController.getAll);
router.post('/', NotificationsController.create);
router.put('/:id/read', NotificationsController.markRead);
router.post('/mark-all-read', NotificationsController.markAllRead);

export default router;

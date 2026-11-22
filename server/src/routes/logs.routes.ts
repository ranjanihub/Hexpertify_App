import { Router } from 'express';
import { LogsController } from '../controllers/logs.controller';

const router = Router();

router.get('/stats', LogsController.getStats);
router.delete('/clear', LogsController.clearAll);
router.get('/', LogsController.getAll);
router.post('/', LogsController.create);

export default router;

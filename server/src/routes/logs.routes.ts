import { Router } from 'express';
import { LogsController } from '../controllers/logs.controller';
import { requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

// The audit trail is for administrators only. Entries can't be edited or deleted through the API;
// state-changing admin requests are also recorded by the server itself (services/admin-audit.ts).
router.use(requireAdmin);

router.get('/stats', LogsController.getStats);
router.get('/', LogsController.getAll);
router.post('/', LogsController.create);
// Anything else (DELETE /clear, PUT/PATCH/DELETE of an entry) is refused
router.all('*', LogsController.refuseChange);

export default router;

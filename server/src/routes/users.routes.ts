import { Router } from 'express';
import { UsersController } from '../controllers/users.controller';
import { optionalAuth } from '../middlewares/auth.middleware';

const router = Router();

// Identifies the caller (never rejects) so staff-only fields are honoured only for staff
router.use(optionalAuth);

router.get('/', UsersController.getAll);
router.get('/client-data', UsersController.getClientData);
router.get('/getClientData', UsersController.getClientData);
router.get('/:id', UsersController.getById);
router.post('/', UsersController.create);
router.put('/', UsersController.update);
router.put('/:id', UsersController.update);
router.delete('/', UsersController.delete);
router.delete('/:id', UsersController.delete);

export default router;

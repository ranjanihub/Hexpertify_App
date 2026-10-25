import { Router } from 'express';
import { UsersController } from '../controllers/users.controller';

const router = Router();

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

import { Router } from 'express';
import { ResourcesController } from '../controllers/resources.controller';

const router = Router();

router.get('/', ResourcesController.getAll);
router.get('/:id', ResourcesController.getById);
router.post('/', ResourcesController.create);
router.put('/', ResourcesController.update);
router.put('/:id', ResourcesController.update);
router.delete('/', ResourcesController.delete);
router.delete('/:id', ResourcesController.delete);

export default router;

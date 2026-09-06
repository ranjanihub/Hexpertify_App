import { Router } from 'express';
import { AssetsController } from '../controllers/assets.controller';

const router = Router();

router.get('/', AssetsController.getAll);
router.get('/:id', AssetsController.getById);
router.post('/', AssetsController.create);
router.put('/', AssetsController.update);
router.put('/:id', AssetsController.update);
router.delete('/', AssetsController.delete);
router.delete('/:id', AssetsController.delete);

export default router;

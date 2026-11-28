import { Router } from 'express';
import { AssetsController } from '../controllers/assets.controller';
import { requireAdminOrInternal } from '../services/clinical-access';

const router = Router();

router.get('/', AssetsController.getAll);
// The file itself (uploads are stored inline and served here)
router.get('/:id/file', AssetsController.getFile);
router.get('/:id', AssetsController.getById);
// The media library is managed by the admin team (the website reads it through Prisma, not this API)
router.post('/', requireAdminOrInternal, AssetsController.create);
router.put('/', requireAdminOrInternal, AssetsController.update);
router.put('/:id', requireAdminOrInternal, AssetsController.update);
router.delete('/', requireAdminOrInternal, AssetsController.delete);
router.delete('/:id', requireAdminOrInternal, AssetsController.delete);

export default router;

import { Router } from 'express';
import { ProfessionsController } from '../controllers/professions.controller';
import { requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Reads are public; changes need an administrator
router.get('/', ProfessionsController.getAll);
router.get('/:id', ProfessionsController.getById);
router.post('/', requireAdmin, ProfessionsController.create);
router.put('/', requireAdmin, ProfessionsController.update);
router.put('/:id', requireAdmin, ProfessionsController.update);
router.delete('/', requireAdmin, ProfessionsController.delete);
router.delete('/:id', requireAdmin, ProfessionsController.delete);

export default router;

import { Router } from 'express';
import { ProfessionsController } from '../controllers/professions.controller';

const router = Router();

router.get('/', ProfessionsController.getAll);
router.get('/:id', ProfessionsController.getById);
router.post('/', ProfessionsController.create);
router.put('/', ProfessionsController.update);
router.put('/:id', ProfessionsController.update);
router.delete('/', ProfessionsController.delete);
router.delete('/:id', ProfessionsController.delete);

export default router;

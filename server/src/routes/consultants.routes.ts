import { Router } from 'express';
import { ConsultantsController } from '../controllers/consultants.controller';
import { optionalAuth, requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.use(optionalAuth);

router.get('/client/therapist', ConsultantsController.getClientTherapist);
router.get('/', ConsultantsController.getAll);
router.get('/:id', ConsultantsController.getById);
// Outcome scores calculated from sessions, homework, goals and assessments (admin panel)
router.get('/:id/outcomes', requireAdmin, ConsultantsController.getOutcomes);
router.post('/', ConsultantsController.create);
router.put('/', ConsultantsController.update);
router.put('/:id', ConsultantsController.update);
router.delete('/', ConsultantsController.delete);
router.delete('/:id', ConsultantsController.delete);

export default router;

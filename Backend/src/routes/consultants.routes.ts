import { Router } from 'express';
import { ConsultantsController } from '../controllers/consultants.controller';

const router = Router();

router.get('/client/therapist', ConsultantsController.getClientTherapist);
router.get('/', ConsultantsController.getAll);
router.get('/:id', ConsultantsController.getById);
router.post('/', ConsultantsController.create);
router.put('/', ConsultantsController.update);
router.put('/:id', ConsultantsController.update);
router.delete('/', ConsultantsController.delete);
router.delete('/:id', ConsultantsController.delete);

export default router;

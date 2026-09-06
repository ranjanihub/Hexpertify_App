import { Router } from 'express';
import { AvailabilityController } from '../controllers/availability.controller';

const router = Router();

router.get('/', AvailabilityController.getAll);
router.post('/', AvailabilityController.create);
router.post('/assign', AvailabilityController.assign);
router.post('/toggle-block', AvailabilityController.toggleBlock);
router.delete('/', AvailabilityController.delete);
router.delete('/:id', AvailabilityController.delete);

export default router;

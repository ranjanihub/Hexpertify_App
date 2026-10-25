import { Router } from 'express';
import { AvailabilityController } from '../controllers/availability.controller';
import { optionalAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(optionalAuth);

router.get('/', AvailabilityController.getAll);
router.get('/slots', AvailabilityController.getSlots);
router.post('/', AvailabilityController.create);
router.post('/assign', AvailabilityController.assign);
router.post('/toggle-block', AvailabilityController.toggleBlock);
router.delete('/', AvailabilityController.delete);
router.delete('/:id', AvailabilityController.delete);

export default router;

import { Router } from 'express';
import { AvailabilityController } from '../controllers/availability.controller';
import { MonthPlanController } from '../controllers/month-plan.controller';
import { optionalAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(optionalAuth);

router.get('/', AvailabilityController.getAll);
router.get('/slots', AvailabilityController.getSlots);
// Month plans (before the /:id routes)
router.get('/month-plan/status', MonthPlanController.status);
router.get('/month-plan', MonthPlanController.get);
router.put('/month-plan', MonthPlanController.save);
router.delete('/month-plan', MonthPlanController.remove);
router.post('/', AvailabilityController.create);
router.post('/assign', AvailabilityController.assign);
router.post('/toggle-block', AvailabilityController.toggleBlock);
router.delete('/', AvailabilityController.delete);
router.delete('/:id', AvailabilityController.delete);

export default router;

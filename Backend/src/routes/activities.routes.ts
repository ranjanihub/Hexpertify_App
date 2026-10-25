import { Router } from 'express';
import { ActivitiesController } from '../controllers/activities.controller';

const router = Router();

router.get('/', ActivitiesController.getAll);
router.get('/:id', ActivitiesController.getById);
router.post('/assign', ActivitiesController.assign);
router.post('/', ActivitiesController.create);
router.put('/', ActivitiesController.update);
router.put('/:id', ActivitiesController.update);
router.delete('/', ActivitiesController.delete);
router.delete('/:id', ActivitiesController.delete);

export default router;

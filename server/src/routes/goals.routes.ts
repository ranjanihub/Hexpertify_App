import { Router } from 'express';
import { GoalsController } from '../controllers/goals.controller';

const router = Router();

router.get('/', GoalsController.getAll);
router.post('/', GoalsController.create);
router.put('/:id', GoalsController.update);

export default router;

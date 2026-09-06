import { Router } from 'express';
import { AssessmentsController } from '../controllers/assessments.controller';

const router = Router();

router.get('/', AssessmentsController.getAll);
router.get('/scores', AssessmentsController.getAll);
router.post('/score', AssessmentsController.saveScore);
router.post('/submit', AssessmentsController.saveScore);
router.post('/assign', AssessmentsController.assign);

export default router;

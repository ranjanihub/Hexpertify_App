import { Router } from 'express';
import { SessionFeedbackController } from '../controllers/session-feedback.controller';
import { optionalAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(optionalAuth);

router.get('/pending', SessionFeedbackController.pending);
router.get('/', SessionFeedbackController.list);
router.post('/', SessionFeedbackController.submit);

export default router;

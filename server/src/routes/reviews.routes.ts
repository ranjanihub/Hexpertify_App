import { Router } from 'express';
import { ReviewsController } from '../controllers/reviews.controller';

const router = Router();

router.get('/', ReviewsController.getReviews);
router.get('/summary', ReviewsController.getReviews);

export default router;

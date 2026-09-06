import { Router } from 'express';
import { BookingsController } from '../controllers/bookings.controller';

const router = Router();

router.get('/', BookingsController.getAll);
router.post('/', BookingsController.create);
router.put('/:id', BookingsController.update);
router.delete('/:id', BookingsController.delete);

export default router;

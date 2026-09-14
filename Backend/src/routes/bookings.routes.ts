import { Router } from 'express';
import { BookingsController } from '../controllers/bookings.controller';

const router = Router();

router.get('/', BookingsController.getAll);
router.post('/', BookingsController.create);
router.post('/cancel', (req, res) => {
  req.body.status = 'CANCELLED';
  BookingsController.update(req, res);
});
router.post('/:id/cancel', (req, res) => {
  req.body.status = 'CANCELLED';
  BookingsController.update(req, res);
});
router.put('/', BookingsController.update);
router.put('/:id', BookingsController.update);
router.delete('/', BookingsController.delete);
router.delete('/:id', BookingsController.delete);

export default router;

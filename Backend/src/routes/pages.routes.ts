import { Router } from 'express';
import { PagesController } from '../controllers/pages.controller';

const router = Router();

router.get('/zombie-pages', PagesController.getZombiePages);
router.post('/zombie-pages', PagesController.saveZombiePage);
router.put('/zombie-pages', PagesController.saveZombiePage);
router.delete('/zombie-pages', PagesController.deleteZombiePage);

router.get('/homepage', PagesController.getHomepage);
router.post('/homepage', PagesController.updateHomepage);
router.put('/homepage', PagesController.updateHomepage);

export default router;

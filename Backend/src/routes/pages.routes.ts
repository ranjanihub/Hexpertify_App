import { Router } from 'express';
import { PagesController } from '../controllers/pages.controller';
import { requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Reads are public (the website renders zombie pages); changes need an administrator
router.get('/zombie-pages', PagesController.getZombiePages);
router.post('/zombie-pages', requireAdmin, PagesController.saveZombiePage);
router.put('/zombie-pages', requireAdmin, PagesController.saveZombiePage);
router.delete('/zombie-pages', requireAdmin, PagesController.deleteZombiePage);

router.get('/homepage', PagesController.getHomepage);
router.post('/homepage', requireAdmin, PagesController.updateHomepage);
router.put('/homepage', requireAdmin, PagesController.updateHomepage);

export default router;

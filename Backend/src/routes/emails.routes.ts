import { Router } from 'express';
import { EmailsController } from '../controllers/emails.controller';
import { requireInternal } from '../middlewares/auth.middleware';

const router = Router();

// The live website's sign-up
router.post('/welcome', requireInternal, EmailsController.welcome);

// Scheduler (GitHub Actions / Vercel Cron) — authenticated inside the handler
router.get('/session-reminders', EmailsController.sessionReminders);
router.post('/session-reminders', EmailsController.sessionReminders);

export default router;

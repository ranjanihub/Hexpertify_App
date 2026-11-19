import { Router, Request, Response } from 'express';
import { optionalAuth } from '../middlewares/auth.middleware';
import { resolveClientViewer } from '../services/client-access';
import { isPushConfigured, pushPublicKey, removeSubscription, saveSubscription } from '../services/push.service';

const router = Router();

router.use(optionalAuth);

/** GET /api/push/public-key — the VAPID key browsers need to subscribe */
router.get('/public-key', (_req: Request, res: Response) => {
  res.json({ success: true, enabled: isPushConfigured(), publicKey: pushPublicKey() });
});

/** POST /api/push/subscribe — { subscription, clientEmail?, clientId? } */
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const subscription = req.body?.subscription;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      res.status(400).json({ success: false, error: 'A valid push subscription is required' });
      return;
    }

    // The client's API token when present, else (legacy client panel) the email/id it sends
    const viewer = await resolveClientViewer(req);
    let email = String(req.body?.clientEmail || '');
    let id = String(req.body?.clientId || '');
    if (viewer.kind === 'client') {
      const ids = [...viewer.ids];
      email = ids.find((v) => v.includes('@')) || email;
      id = ids.find((v) => !v.includes('@')) || id;
    } else if (viewer.kind !== 'anonymous') {
      res.status(403).json({ success: false, error: 'Booking notifications are for client accounts' });
      return;
    }
    if (!email && !id) {
      res.status(400).json({ success: false, error: 'Client email or id is required' });
      return;
    }

    await saveSubscription(subscription, { email, id });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to save subscription' });
  }
});

/** POST /api/push/unsubscribe — { endpoint } */
router.post('/unsubscribe', async (req: Request, res: Response) => {
  try {
    if (req.body?.endpoint) await removeSubscription(String(req.body.endpoint));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to remove subscription' });
  }
});

export default router;

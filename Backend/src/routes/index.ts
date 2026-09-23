import { Router, Request, Response } from 'express';
import authRoutes from './auth.routes';
import consultantsRoutes from './consultants.routes';
import usersRoutes from './users.routes';
import bookingsRoutes from './bookings.routes';
import goalsRoutes from './goals.routes';
import notificationsRoutes from './notifications.routes';
import availabilityRoutes from './availability.routes';
import messagesRoutes from './messages.routes';
import assessmentsRoutes from './assessments.routes';
import revenueRoutes from './revenue.routes';
import reviewsRoutes from './reviews.routes';
import professionsRoutes from './professions.routes';
import assetsRoutes from './assets.routes';
import resourcesRoutes from './resources.routes';
import pagesRoutes from './pages.routes';
import payoutsRoutes from './payouts.routes';
import activitiesRoutes from './activities.routes';
import blogRoutes from './blog.routes';
import dashboardRoutes from './dashboard.routes';
import logsRoutes from './logs.routes';

const router = Router();

// Root API directory & welcome endpoint
router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    service: 'Hexpertify Central Backend & Identity Gateway',
    version: '1.0.0',
    database: 'MongoDB Atlas (Connected)',
    panels: {
      superAdmin: 'http://localhost:5000/admin',
      consultantSuite: 'http://localhost:5000/consultant',
      clientPortal: 'http://localhost:5000/client'
    }
  });
});

// Health check endpoint
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'Hexpertify Central API Gateway',
    database: 'MongoDB Atlas (Connected)'
  });
});

// Mount Central Routes (Both /api/<resource> and /api/admin/<resource>)
router.use('/auth', authRoutes);

import { ConsultantsController } from '../controllers/consultants.controller';
import { UsersController } from '../controllers/users.controller';

router.use('/consultants', consultantsRoutes);
router.use('/admin/consultants', consultantsRoutes);
router.get('/client/therapist', ConsultantsController.getClientTherapist);
router.get('/therapist', ConsultantsController.getClientTherapist);

router.get('/client/me', UsersController.getClientProfile);
router.patch('/client/me', UsersController.updateClientProfile);
router.put('/client/me', UsersController.updateClientProfile);
router.get('/client/profile', UsersController.getClientProfile);
router.patch('/client/profile', UsersController.updateClientProfile);
router.put('/client/profile', UsersController.updateClientProfile);

// Consultation-gated client data endpoints
router.get('/client-data', UsersController.getClientData);
router.get('/getClientData', UsersController.getClientData);

router.use('/users', usersRoutes);
router.use('/admin/users', usersRoutes);

router.use('/bookings', bookingsRoutes);
router.use('/admin/bookings', bookingsRoutes);
router.use('/client/bookings', bookingsRoutes);

router.use('/goals', goalsRoutes);
router.use('/goal', goalsRoutes);

router.use('/notifications', notificationsRoutes);
router.use('/admin/notifications', notificationsRoutes);

router.use('/availability', availabilityRoutes);
router.use('/admin/availability', availabilityRoutes);

router.use('/messages', messagesRoutes);
router.use('/api/messages', messagesRoutes);

router.use('/assessments', assessmentsRoutes);
router.use('/admin/assessments', assessmentsRoutes);

router.use('/revenue', revenueRoutes);
router.use('/admin/revenue', revenueRoutes);

router.use('/reviews', reviewsRoutes);
router.use('/admin/reviews', reviewsRoutes);

router.use('/professions', professionsRoutes);
router.use('/admin/professions', professionsRoutes);

router.use('/assets', assetsRoutes);
router.use('/admin/assets', assetsRoutes);

router.use('/resources', resourcesRoutes);
router.use('/admin/resources', resourcesRoutes);

router.use('/payouts', payoutsRoutes);
router.use('/admin/payouts', payoutsRoutes);

router.use('/activities', activitiesRoutes);
router.use('/admin/activities', activitiesRoutes);

router.use('/blog', blogRoutes);
router.use('/admin/blog', blogRoutes);
router.use('/blogs', blogRoutes);
router.use('/admin/blogs', blogRoutes);

router.use('/dashboard', dashboardRoutes);
router.use('/admin/dashboard', dashboardRoutes);

router.use('/logs', logsRoutes);
router.use('/admin/logs', logsRoutes);
router.use('/audit-logs', logsRoutes);
router.use('/admin/audit-logs', logsRoutes);

router.use('/admin', pagesRoutes);
router.use('/', pagesRoutes);

export default router;

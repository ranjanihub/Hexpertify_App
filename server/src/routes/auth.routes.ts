import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { UsersController } from '../controllers/users.controller';
import { optionalAuth, requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);
router.get('/logout', AuthController.logout);
router.post('/register', UsersController.create);
// Admins opening a therapist/client panel as that account; sign-in tickets are issued inside the login handlers
router.post('/sso-ticket', requireAdmin, AuthController.createSsoTicket);
router.post('/sso-verify', AuthController.verifySsoTicket);
// Forgotten client password: email a single-use link, then set the new password with it
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);
router.get('/me', AuthController.getMe);
// Who the signed API token belongs to (401 when missing, forged or expired); the panels check it on load
router.get('/whoami', optionalAuth, AuthController.getSession);

// Google OAuth 2.0 endpoints
router.get('/google/config', AuthController.getGoogleConfig);
router.get('/google', AuthController.initiateGoogleAuth);
router.get('/google/callback', AuthController.handleGoogleCallback);
router.post('/google', AuthController.verifyGoogleToken);

export default router;

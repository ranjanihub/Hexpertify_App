import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { UsersController } from '../controllers/users.controller';

const router = Router();

router.post('/login', AuthController.login);
router.post('/register', UsersController.create);
router.post('/sso-ticket', AuthController.createSsoTicket);
router.post('/sso-verify', AuthController.verifySsoTicket);
router.get('/me', AuthController.getMe);

// Google OAuth 2.0 endpoints
router.get('/google/config', AuthController.getGoogleConfig);
router.get('/google', AuthController.initiateGoogleAuth);
router.get('/google/callback', AuthController.handleGoogleCallback);
router.post('/google', AuthController.verifyGoogleToken);

export default router;

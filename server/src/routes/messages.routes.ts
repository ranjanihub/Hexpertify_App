import { Router } from 'express';
import { MessagesController } from '../controllers/messages.controller';

const router = Router();

router.get('/stream', MessagesController.stream);
router.get('/presence', MessagesController.getPresence);
router.get('/consultant', MessagesController.getAssignedConsultant);
router.post('/typing', MessagesController.setTyping);
router.delete('/cleanup-greetings', MessagesController.deleteHardcodedGreetings);
router.get('/', MessagesController.getAll);
router.post('/', MessagesController.create);
router.put('/read', MessagesController.markRead);

export default router;

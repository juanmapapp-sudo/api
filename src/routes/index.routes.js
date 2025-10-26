import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import googleMapRoutes from './google-map.routes.js';
import ttsRoutes from './tts.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/google-map', googleMapRoutes);
router.use('/tts', ttsRoutes);

export default router;

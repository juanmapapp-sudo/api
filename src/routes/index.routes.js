import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import googleMapRoutes from './google-map.routes.js';
import ttsRoutes from './tts.routes.js';
import apiKeyManagementRoutes from './api-key-management.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/google-map', googleMapRoutes);
router.use('/tts', ttsRoutes);
router.use('/api-key-management', apiKeyManagementRoutes);

export default router;

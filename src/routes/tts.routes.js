/**
 * @openapi
 * tags:
 *   name: Text To Speech
 *   description: API for Text To Speech
 */
import { Router } from 'express';
import { asyncHandler } from '../middlewares/async.js';
import { generate } from '../controllers/tts.controller.js';

const router = Router();


/**
 * @openapi
 * /api/tts:
 *   get:
 *     tags: [Text To Speech]
 *     summary: Get Text to Speech
 *     parameters:
 *       - in: query
 *         name: text
 *         schema:
 *           type: string
 *         description: text
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *         description: source
 *         example: auto
 *       - in: query
 *         name: target
 *         schema:
 *           type: string
 *         description: target
 *         example: tl
 *     responses:
 *       200:
 *         description: Text to Speech
 *         content:
 *           audio/mpeg:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/', asyncHandler(generate));

export default router;

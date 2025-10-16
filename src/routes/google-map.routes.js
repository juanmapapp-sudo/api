/**
 * @openapi
 * tags:
 *   name: Google Map
 *   description: API for Google Map
 */
import { Router } from 'express';
import { asyncHandler } from '../middlewares/async.js';
import { getGeoBoundary } from '../controllers/google-map.controller.js';

const router = Router();

/**
 * @openapi
 * /api/google-map/boundary:
 *   get:
 *     tags: [Google Map]
 *     summary: Get a user by userId
 *     parameters:
 *       - in: query
 *         name: q
 *         required: false
 *         schema:
 *           type: string
 *           default: San Juan City
 *       - in: query
 *         name: hintLat
 *         required: false
 *         schema:
 *           type: string
 *           default: 14.603179674407787
 *       - in: query
 *         name: hintLng
 *         required: false
 *         schema:
 *           type: string
 *           default: 121.03603853653271
 *     responses:
 *       200:
 *         description: Get Geo boundary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     displayName:
 *                       type: string
 *                     bbox:
 *                       type: array
 *                     paths:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           lat:
 *                             type: string
 *                           lng:
 *                             type: string
 */
router.get("/boundary", asyncHandler(getGeoBoundary));
export default router;

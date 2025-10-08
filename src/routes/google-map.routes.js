/**
 * @openapi
 * tags:
 *   name: Google Map
 *   description: API for Google Map
 */
import { Router } from 'express';
import { asyncHandler } from '../middlewares/async.js';
import { getRouteByEndpoint } from '../controllers/google-map.controller.js';

const router = Router();

/**
 * @openapi
 * /api/google-map/route:
 *   post:
 *     tags: [Google Map]
 *     summary: Get Google Map Directions route
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - origin
 *               - destination
 *               - mode
 *             properties:
 *               origin:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: string
 *                   lng:
 *                     type: string
 *               destination:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: string
 *                   lng:
 *                     type: string
 *               mode:
 *                 type: string
 *                 default: "driving"
 *     responses:
 *       200:
 *         description: Google Map Directions route
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
 *                     overviewPath:
 *                       type: string
 *                     steps:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           polyline:
 *                             type: string
 *                           distance:
 *                             type: string
 *                           distanceText:
 *                             type: string
 *                           street:
 *                             type: string
 *                     totalDistanceText:
 *                       type: string
 *                     durationText:
 *                       type: string
 *                     arrivalTimeText:
 *                       type: string
 */
router.post("/route", asyncHandler(getRouteByEndpoint));
export default router;

/**
 * @openapi
 * tags:
 *   name: User
 *   description: API for user
 */
import { Router } from 'express';
import { asyncHandler } from '../middlewares/async.js';
import { getUser, update, saveRecentPlaces, removeRecentPlace } from '../controllers/user.controller.js';
import { body, validationResult } from 'express-validator';

const router = Router();

/**
 * @openapi
 * /api/user/{userId}:
 *   get:
 *     tags: [User]
 *     summary: Get a user by userId
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The id of the user
 *     responses:
 *       200:
 *         description: User details
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
 *                     userId:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     email:
 *                       type: string
 *                     birthDate:
 *                       type: string
 *                     phoneNumber:
 *                       type: string
 */
router.get("/:userId", asyncHandler(getUser));
/**
 * @openapi
 * /api/user/{userId}:
 *   put:
 *     tags: [User]
 *     summary: Update a user's profile
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The id of the user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - birthDate
 *               - phoneNumber
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               birthDate:
 *                 type: string
 *                 description: Date of birth in format YYYY-MM-DD
 *                 pattern: '^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'
 *                 example: "1995-06-21"
 *               phoneNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: User profile updated successfully
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
 *                     userId:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     email:
 *                       type: string
 *                     birthDate:
 *                       type: string
 *                     phoneNumber:
 *                       type: string
 *       401:
 *         description: Invalid data or user not exists
 */
router.put('/:userId', [
  body('birthDate')
    .matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/)
    .withMessage('birthDate must be in format YYYY-MM-DD'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const err = new Error(errors.array()[0].msg);
      err.status = 400;            // <- key line
      return next(err);
    }
    next();
  }
], asyncHandler(update));

/**
 * @openapi
 * /api/user/save-recent-places:
 *   post:
 *     tags: [User]
 *     summary: Save recent places
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - placeId
 *               - name
 *               - formattedAddress
 *               - lat
 *               - lng
 *               - types
 *             properties:
 *               userId:
 *                 type: string
 *               placeId:
 *                 type: string
 *               name:
 *                 type: string
 *               formattedAddress:
 *                 type: string
 *               lat:
 *                 type: number
 *                 format: double
 *                 description: Latitude (decimal)
 *                 example: 10.313036
 *               lng:
 *                 type: number
 *                 format: double
 *                 description: Longitude (decimal)
 *                 example: 123.965146
 *               types:
 *                 type: array
 *                 description: JSON object of place types
 *                 items:
 *                   type: string
 *                 example: ["restaurant", "cafe", "bar"]
 *     responses:
 *       200:
 *         description: Place has been successfully saved to recent places
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
 *                     userId:
 *                       type: string
 *                     placeId:
 *                       type: string
 *                     name:
 *                       type: string
 *                     formattedAddress:
 *                       type: string
 *                     lat:
 *                       type: string
 *                     lng:
 *                       type: string
 *                     types:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *       401:
 *         description: Invalid data
 */
router.post('/save-recent-places', [
  body('lat')
    .isDecimal()
    .withMessage('lat must be a decimal number'),
  body('lng')
    .isDecimal()
    .withMessage('lng must be a decimal number'),
  body('types')
    .custom((value) => {
      if (!Array.isArray(value)) {
        throw new Error('types must be an array');
      }
      return true;
    }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(createError(400, errors.array()[0].msg));
    }
    next();
  }
], asyncHandler(saveRecentPlaces));

/**
 * @openapi
 * /api/user/remove-recent-place/{placeId}:
 *   delete:
 *     tags: [User]
 *     summary: Remove recent place
 *     parameters:
 *       - in: path
 *         name: placeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Place has been successfully saved to recent places
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
 *                     userId:
 *                       type: string
 *                     placeId:
 *                       type: string
 *                     name:
 *                       type: string
 *                     formattedAddress:
 *                       type: string
 *                     lat:
 *                       type: string
 *                     lng:
 *                       type: string
 *                     types:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *       401:
 *         description: Invalid data
 */
router.delete("/remove-recent-place/:placeId", asyncHandler(removeRecentPlace));
export default router;

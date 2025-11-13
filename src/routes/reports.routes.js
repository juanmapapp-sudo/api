/**
 * @openapi
 * tags:
 *   name: Reports
 *   description: API for Reports
 */
import { Router } from "express";
import { asyncHandler } from "../middlewares/async.js";
import {
  getReport,
  create,
  getAll,
} from "../controllers/reports.controller.js";
import { body, validationResult, query } from "express-validator";

const router = Router();

// Reusable middleware to return validation errors
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
}

/**
 * @openapi
 * /api/reports/all:
 *   get:
 *     tags: [Reports]
 *     summary: Get all reports
 *     parameters:
 *       - in: query
 *         name: lat
 *         schema:
 *           type: number
 *         description: Latitude
 *         required: true
 *       - in: query
 *         name: lng
 *         schema:
 *           type: number
 *         description: Longitude
 *         required: true
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *         description: Radius
 *         required: true
 *         example: 1
 *     responses:
 *       200:
 *         description: Get all reports
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       reportId:
 *                         type: string
 *                       reportType:
 *                         type: string
 *                       createdByUser:
 *                         type: string
 *                       description:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                       latitude:
 *                         type: string
 *                       longitude:
 *                         type: string
 *                       routePolyline:
 *                         type: string
 */
router.get(
  "/all",
  [
    query("lat")
      .exists()
      .withMessage("latitude is required")
      .isFloat({ min: -180, max: 180 })
      .withMessage("latitude must be a valid number between -180 and 180"),
    query("lng")
      .exists()
      .withMessage("longitude is required")
      .isFloat({ min: -180, max: 180 })
      .withMessage("longitude must be a valid number between -180 and 180"),
    query("radius")
      .exists()
      .withMessage("radius is required")
      .isNumeric({ min: 1, max: 200 })
      .withMessage("radius must be a valid number between 1 and 200"),
  ],
  validate, asyncHandler(getAll)
);

/**
 * @openapi
 * /api/reports/{reportId}:
 *   get:
 *     tags: [Reports]
 *     summary: Get reports by id
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *         description: The id of the report
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
 *                     reportId:
 *                       type: string
 *                     reportType:
 *                       type: string
 *                     createdByUser:
 *                       type: string
 *                     description:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                     latitude:
 *                       type: string
 *                     longitude:
 *                       type: string
 *                     routePolyline:
 *                       type: string
 */
router.get("/:reportId", asyncHandler(getReport));

/**
 * @openapi
 * /api/reports:
 *   post:
 *     tags: [Reports]
 *     summary: Create report
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - createdByUser
 *               - reportType
 *               - latitude
 *               - longitude
 *             properties:
 *               createdByUser:
 *                 type: string
 *               reportType:
 *                 type: string
 *               latitude:
 *                 type: string
 *               longitude:
 *                 type: string
 *               routePolyline:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
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
 *                     reportId:
 *                       type: string
 *                     reportType:
 *                       type: string
 *                     createdByUser:
 *                       type: string
 *                     description:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                     latitude:
 *                       type: string
 *                     longitude:
 *                       type: string
 *                     routePolyline:
 *                       type: string
 *       401:
 *         description: Invalid credentials
 */
router.post(
  "/",
  [
    body("createdByUser")
      .exists()
      .withMessage("createdByUser is required")
      .isString(),
    body("latitude")
      .exists()
      .withMessage("latitude is required")
      .isFloat({ min: -90, max: 90 })
      .withMessage("latitude must be a valid number between -90 and 90"),

    body("longitude")
      .exists()
      .withMessage("longitude is required")
      .isFloat({ min: -180, max: 180 })
      .withMessage("longitude must be a valid number between -180 and 180"),

    body("reportType")
      .exists()
      .withMessage("reportType is required")
      .isString()
      .withMessage("reportType must be a string")
      .isIn([
        "TRAFFIC",
        "TRAFFIC_HEAVY",
        "TRAFFIC_STANDSTILL",
        "POLICE",
        "POLICE_MOBILE_CAMERA",
        "POLICE_HIDDEN",
        "POLICE_OTHER_SIDE",
        "ACCIDENT",
        "ACCIDENT_MAJOR",
        "ACCIDENT_OTHER_SIDE",
        "HAZARD",
        "HAZARD_ROARDWORKS",
        "HAZARD_VEHICLE_ON_SHOULDER",
        "HAZARD_BROKEN_SIGNAL_LIGHT",
        "HAZARD_PATHOLE",
        "HAZARD_OBJECT",
        "CLOSURE",
        "BLOCKED_LANE",
        "BLOCKED_LANE_LEFT_LANE",
        "BLOCKED_LANE_RIGHT_LANE",
        "BLOCKED_LANE_CENTER_LANE",
      ])
      .withMessage(
        `reportType must be one of: ${[
          "TRAFFIC",
          "TRAFFIC_HEAVY",
          "TRAFFIC_STANDSTILL",
          "POLICE",
          "POLICE_MOBILE_CAMERA",
          "POLICE_HIDDEN",
          "POLICE_OTHER_SIDE",
          "ACCIDENT",
          "ACCIDENT_MAJOR",
          "ACCIDENT_OTHER_SIDE",
          "HAZARD",
          "HAZARD_ROARDWORKS",
          "HAZARD_VEHICLE_ON_SHOULDER",
          "HAZARD_BROKEN_SIGNAL_LIGHT",
          "HAZARD_PATHOLE",
          "HAZARD_OBJECT",
          "CLOSURE",
          "BLOCKED_LANE",
          "BLOCKED_LANE_LEFT_LANE",
          "BLOCKED_LANE_RIGHT_LANE",
          "BLOCKED_LANE_CENTER_LANE",
        ].join(", ")}`
      ),
    // ✅ Conditional requirement:
    body("routePolyline")
      .if(body("reportType").equals("CLOSURE"))
      .exists({ checkFalsy: true })
      .withMessage("routePolyline is required when reportType is CLOSURE")
      .isString()
      .withMessage("routePolyline must be a string"),
  ],
  validate, // <-- make sure this is before your handler
  asyncHandler(create)
);

export default router;

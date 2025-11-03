
import { ERROR_REPORT_NOT_FOUND, SAVE_REPORT_SUCCESS } from '../constants/reports.constant.js';
import { ERROR_USER_NOT_FOUND } from '../constants/user.constant.js';
import { getReportById, createReport, getAllReports } from '../services/reports.service.js';
import { getById } from '../services/user.service.js';
import NodeCache from "node-cache";
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

function trimOneDecimal(num) {
  return Math.floor(num * 10) / 10;
}

function deleteKeysStartingWith(prefix) {
  const allKeys = cache.keys();
  const matched = allKeys.filter(k => k.startsWith(prefix));
  if (matched.length) cache.del(matched);
  console.log(`Deleted keys:`, matched);
}

export async function getReport(req, res) {
  const { reportId } = req.params;
  if(!reportId) {
      return res.status(400).json({ success: false, message: "Missing report id params" });
  }
  const report = await getReportById(reportId);
  if(!report) {
    return res.status(400).json({ success: false, message: ERROR_REPORT_NOT_FOUND });
  }
  return res.json({ success: true, data: report });
}

export async function getAll(req, res) {
  const { lat, lng, radius } = req.query;
  const cachedKey = `${trimOneDecimal(lat)}_${trimOneDecimal(lng)}_${radius}`;

  const fromCache = cache.get(cachedKey);
  if (fromCache) {
    return res.json({ success: true, data: fromCache });
  }
  const report = await getAllReports(lat, lng, radius);
  cache.set(cachedKey, report);
  return res.json({ success: true, data: report });
}

export async function create(req, res) {
  const { createdByUser, reportType, description, latitude, longitude, routePolyline } = req.body;

  const cachedKey = `${trimOneDecimal(latitude)}_${trimOneDecimal(longitude)}`;
  deleteKeysStartingWith(cachedKey);
  try {

    const user = await getById(createdByUser);
    if(!user) {
      return res.status(400).json({ success: false, message: ERROR_USER_NOT_FOUND });
    }

    const report = await createReport(createdByUser, reportType, description, latitude, longitude, routePolyline)
    
    return res.json({ success: true, data: report });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
  
}
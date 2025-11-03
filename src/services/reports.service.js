import pool from "../db/db.js";
import camelcaseKeys from "camelcase-keys";

export async function getReportById(reportId) {
  const sql = `
    SELECT *
    FROM dbo."Reports"
    WHERE "ReportId" = $1
    LIMIT 1;
  `;
  const result = await pool.query(sql, [reportId]);
  if (result.rows.length === 0) return null;
  return camelcaseKeys(result.rows[0]);
}

export async function getAllReports(lat, lng, radiusKmInput) {
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
    throw new Error("lat and lng must be numbers");
  }

  let radiusKm = Number(radiusKmInput ?? 1);
  if (!(radiusKm > 0)) radiusKm = 1;
  if (radiusKm < 1) radiusKm = 1;

  const radiusM = Math.max(1000, radiusKm * 1000);

  const sql = `
    WITH params AS (
      SELECT $1::double precision AS lat0,
             $2::double precision AS lng0,
             $3::double precision AS r_m
    )
    SELECT
      r."ReportId", r."ReportType", r."CreatedByUser", r."Description",
      r."CreatedAt", r."Latitude", r."Longitude", r."RoutePolyline",
      ROUND((earth_distance(
               ll_to_earth(p.lat0, p.lng0),
               ll_to_earth(r."Latitude", r."Longitude")
             ) / 1000.0)::numeric, 3) AS distance_km
    FROM dbo."Reports" r
    CROSS JOIN params p
    WHERE r."CreatedAt" >= NOW() - INTERVAL '24 hours'
      AND earth_box(ll_to_earth(p.lat0, p.lng0), p.r_m)
          @> ll_to_earth(r."Latitude", r."Longitude")
      AND earth_distance(
            ll_to_earth(p.lat0, p.lng0),
            ll_to_earth(r."Latitude", r."Longitude")
          ) <= p.r_m
    ORDER BY distance_km;
  `;

  const params = [latNum, lngNum, radiusM];
  const results = await pool.query(sql, params);
  return camelcaseKeys(results?.rows);
}

export async function createReport(
  createdByUser,
  reportType,
  description,
  latitude,
  longitude,
  routePolyline
) {
  const sql = `
    INSERT INTO "dbo"."Reports"
      ("ReportType", 
      "CreatedByUser", 
      "Description", 
      "CreatedAt", 
      "Latitude", 
      "Longitude", 
      "RoutePolyline")
    VALUES
      ($1, $2, $3, NOW(), $4, $5, $6)
    RETURNING *;
  `;

  const params = [
    reportType,
    createdByUser,
    description,
    latitude,
    longitude,
    routePolyline,
  ];

  const result = await pool.query(sql, params);
  return camelcaseKeys(result.rows[0]);
}

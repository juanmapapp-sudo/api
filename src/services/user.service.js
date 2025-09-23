import pool from "../db/db.js";
import camelcaseKeys from "camelcase-keys";

export async function getById(userId) {
  const sql = `
    SELECT *
    FROM dbo."User"
    WHERE "UserId" = $1 AND "Active" = true
    LIMIT 1;
  `;
  const result = await pool.query(sql, [userId]);
  if (result.rows.length === 0) return null;
  return camelcaseKeys(result.rows[0]);
}

export async function updateUser(
  userId,
  firstName,
  lastName,
  email,
  birthDate,
  phoneNumber
) {
  const sql = `
    UPDATE dbo."User" set 
    "FirstName" = $2 ,
    "LastName" = $3 ,
    "Email" = $4 ,
    "BirthDate" = $5 ,
    "PhoneNumber" = $6
    WHERE "UserId" = $1
    RETURNING "UserId", "FirstName", "LastName", "Email", "BirthDate", "PhoneNumber", "CurrentOTP", "Active", "IsVerifiedUser";
  `;
  const params = [userId, firstName, lastName, email, birthDate, phoneNumber]; // Default OTP for now
  const result = await pool.query(sql, params);
  return camelcaseKeys(result.rows[0]);
}

export async function getRecentPlaceByUserId(userId) {
  const sql = `
    SELECT *
    FROM dbo."RecentPlaces"
    WHERE "UserId" = $1
    LIMIT 1;
  `;
  const result = await pool.query(sql, [userId]);
  if (result.rows.length === 0) return [];
  return camelcaseKeys(result.rows);
}

export async function getRecentPlaceById(placeId) {
  const sql = `
    SELECT *
    FROM dbo."RecentPlaces"
    WHERE "PlaceId" = $1
    LIMIT 1;
  `;
  const result = await pool.query(sql, [placeId]);
  if (result.rows.length === 0) return null;
  return camelcaseKeys(result.rows[0]);
}

export async function addRecentPlaces(
  userId,
  placeId,
  name,
  formattedAddress,
  lat,
  lng,
  types // array or object; will be stored as JSONB
) {
  const sql = `
    INSERT INTO "dbo"."RecentPlaces"
      ("UserId", "PlaceId", "Name", "FormattedAddress", "Lat", "Lng", "Types")
    VALUES
      ($1, $2, $3, $4, $5, $6, $7::jsonb)
    ON CONFLICT ("UserId", "PlaceId")
    DO UPDATE SET
      "Name"              = EXCLUDED."Name",
      "FormattedAddress"  = EXCLUDED."FormattedAddress",
      "Lat"               = EXCLUDED."Lat",
      "Lng"               = EXCLUDED."Lng",
      "Types"             = EXCLUDED."Types"
    RETURNING
      "RecentPlaceId", "UserId", "PlaceId", "Name", "FormattedAddress",
      "Lat", "Lng", "Types", "CreatedAt",
      (xmax = 0) AS "inserted";  -- true if inserted, false if updated
  `;

  const params = [
    userId,
    placeId,
    name,
    formattedAddress,
    lat,
    lng,
    JSON.stringify(types ?? []), // ensure JSONB input
  ];

  const result = await pool.query(sql, params);
  return camelcaseKeys(result.rows[0]);
}

export async function deleteRecentPlaces(placeId) {
  const sql = `
    DELETE
    FROM dbo."RecentPlaces"
    WHERE "PlaceId" = $1;
  `;
  const result = await pool.query(sql, [placeId]);
  if (result.rows.length === 0) return null;
  return camelcaseKeys(result.rows[0]);
}

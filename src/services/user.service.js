import pool from '../db/db.js';
import camelcaseKeys from 'camelcase-keys';

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

export async function updateUser(userId, firstName, lastName, email, birthDate, phoneNumber) {
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

export async function getRecentPlaceById(recentPlaceId) {
  const sql = `
    SELECT *
    FROM dbo."RecentPlaces"
    WHERE "RecentPlaceId" = $1
    LIMIT 1;
  `;
  const result = await pool.query(sql, [recentPlaceId]);
  if (result.rows.length === 0) return null;
  return camelcaseKeys(result.rows[0]);
}

export async function addRecentPlaces(userId, name, formattedAddress, lat, lng, types) {
  const sql = `
    INSERT INTO dbo."RecentPlaces" ("UserId", "Name", "FormattedAddress", "Lat", "Lng", "Types")
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING "RecentPlaceId", "UserId", "Name", "FormattedAddress", "Lat", "Lng", "Types", "CreatedAt";
  `;
  const params = [userId, name, formattedAddress, lat, lng, types]; // Default OTP for now
  const result = await pool.query(sql, params);
  return camelcaseKeys(result.rows[0]);
}

export async function deleteRecentPlaces(recentPlaceId) {
  const sql = `
    DELETE
    FROM dbo."RecentPlaces"
    WHERE "RecentPlaceId" = $1;
  `;
  const result = await pool.query(sql, [recentPlaceId]);
  if (result.rows.length === 0) return null;
  return camelcaseKeys(result.rows[0]);
}
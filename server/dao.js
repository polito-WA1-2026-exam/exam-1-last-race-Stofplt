import crypto from "crypto";
import sqlite3 from "sqlite3";
import { promisify } from "util";
import { Line, Segment, Station } from "./models.js";

const db = new sqlite3.Database("db.sqlite");
const scrypt = promisify(crypto.scrypt);

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function toPublicUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name
  };
}

async function getUser(username, password) {
  const user = await get(
    "SELECT id, email, name, hash, salt FROM users WHERE email = ?",
    [username]
  );

  if (!user) {
    return false;
  }

  const storedHash = Buffer.from(user.hash, "hex");
  const computedHash = await scrypt(password, user.salt, storedHash.length);

  if (!crypto.timingSafeEqual(storedHash, computedHash)) {
    return false;
  }

  return toPublicUser(user);
}

async function getUserById(id) {
  const user = await get("SELECT id, email, name FROM users WHERE id = ?", [id]);
  return user ? toPublicUser(user) : false;
}

async function getStations() {
  const rows = await all(
    `SELECT id, name, x, y
     FROM stations
     ORDER BY name`
  );

  return rows.map((row) => new Station(row.id, row.name, row.x, row.y));
}

async function getLines() {
  const rows = await all(
    `SELECT id, name, color
     FROM lines
     ORDER BY id`
  );

  return rows.map((row) => new Line(row.id, row.name, row.color));
}

async function getSegments() {
  const rows = await all(
    `SELECT id, from_station_id, to_station_id, line_id
     FROM segments
     ORDER BY line_id, id`
  );

  return rows.map(
    (row) =>
      new Segment(row.id, row.from_station_id, row.to_station_id, row.line_id)
  );
}

async function createGame(userId, startStationId, destinationStationId) {
  const result = await run(
    `INSERT INTO games (
       user_id,
       start_station_id,
       destination_station_id,
       status,
       final_score,
       created_at,
       completed_at
     )
     VALUES (?, ?, ?, 'planning', NULL, ?, NULL)`,
    [userId, startStationId, destinationStationId, new Date().toISOString()]
  );

  return result.lastID;
}

async function getGameForUser(gameId, userId) {
  return await get(
    `SELECT id,
            user_id,
            start_station_id,
            destination_station_id,
            status,
            final_score,
            created_at,
            completed_at
     FROM games
     WHERE id = ? AND user_id = ?`,
    [gameId, userId]
  );
}

async function getSegmentsByIds(segmentIds) {
  if (segmentIds.length === 0) {
    return [];
  }

  const placeholders = segmentIds.map(() => "?").join(",");
  const rows = await all(
    `SELECT id, from_station_id, to_station_id, line_id
     FROM segments
     WHERE id IN (${placeholders})`,
    segmentIds
  );

  const segments = rows.map(
    (row) =>
      new Segment(row.id, row.from_station_id, row.to_station_id, row.line_id)
  );
  const segmentById = new Map(segments.map((segment) => [segment.id, segment]));

  return segmentIds.map((id) => segmentById.get(id) ?? null);
}

async function getInterchangeStationIds() {
  const rows = await all(
    `SELECT station_id
     FROM (
       SELECT from_station_id AS station_id, line_id FROM segments
       UNION
       SELECT to_station_id AS station_id, line_id FROM segments
     )
     GROUP BY station_id
     HAVING COUNT(DISTINCT line_id) > 1`
  );

  return new Set(rows.map((row) => row.station_id));
}

async function savePlannedRoute(gameId, segmentIds) {
  await run("BEGIN TRANSACTION");

  try {
    await run("DELETE FROM game_steps WHERE game_id = ?", [gameId]);

    for (let i = 0; i < segmentIds.length; i++) {
      await run(
        `INSERT INTO game_steps (game_id, step_index, segment_id, event_id)
         VALUES (?, ?, ?, NULL)`,
        [gameId, i + 1, segmentIds[i]]
      );
    }

    await run("UPDATE games SET status = 'executing' WHERE id = ?", [gameId]);
    await run("COMMIT");
  } catch (err) {
    await run("ROLLBACK");
    throw err;
  }
}

async function failGame(gameId) {
  await run(
    `UPDATE games
     SET status = 'failed',
         final_score = 0,
         completed_at = ?
     WHERE id = ?`,
    [new Date().toISOString(), gameId]
  );
}

export {
  getUser,
  getUserById,
  getStations,
  getLines,
  getSegments,
  createGame,
  getGameForUser,
  getSegmentsByIds,
  getInterchangeStationIds,
  savePlannedRoute,
  failGame
};

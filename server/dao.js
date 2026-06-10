import crypto from "crypto";
import fs from "fs";
import sqlite3 from "sqlite3";
import { promisify } from "util";
import { Line, Segment, Station } from "./models.js";

if (!fs.existsSync("db.sqlite")) {
  throw new Error("Database file not found. Run 'npm run init-db' in server/.");
}

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
    name: row.name,
  };
}

async function getUser(username, password) {
  const user = await get(
    "SELECT id, email, name, hash, salt FROM users WHERE email = ?",
    [username],
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
  const user = await get("SELECT id, email, name FROM users WHERE id = ?", [
    id,
  ]);
  return user ? toPublicUser(user) : false;
}

async function getStations() {
  const rows = await all(
    `SELECT id, name, x, y
     FROM stations
     ORDER BY name`,
  );

  return rows.map((row) => new Station(row.id, row.name, row.x, row.y));
}

async function getLines() {
  const rows = await all(
    `SELECT id, name, color
     FROM lines
     ORDER BY id`,
  );

  return rows.map((row) => new Line(row.id, row.name, row.color));
}

async function getSegments() {
  const rows = await all(
    `SELECT id, from_station_id, to_station_id, line_id, path
     FROM segments
     ORDER BY line_id, id`,
  );

  return rows.map(
    (row) =>
      new Segment(
        row.id,
        row.from_station_id,
        row.to_station_id,
        row.line_id,
        row.path,
      ),
  );
}

async function getPlanningSegmentPairs() {
  const segments = await getSegments();
  const stations = await getStations();
  const stationById = new Map(stations.map((station) => [station.id, station]));
  const pairByKey = new Map();

  for (const segment of segments) {
    const stationAId = Math.min(segment.fromStationId, segment.toStationId);
    const stationBId = Math.max(segment.fromStationId, segment.toStationId);
    const pairId = `${stationAId}-${stationBId}`;

    if (!pairByKey.has(pairId)) {
      pairByKey.set(pairId, {
        id: pairId,
        stationAId,
        stationAName: stationById.get(stationAId)?.name ?? String(stationAId),
        stationBId,
        stationBName: stationById.get(stationBId)?.name ?? String(stationBId),
        directions: [],
      });
    }

    pairByKey.get(pairId).directions.push({
      id: segment.id,
      fromStationId: segment.fromStationId,
      toStationId: segment.toStationId,
    });
  }

  return [...pairByKey.values()].map((pair) => ({
    ...pair,
    directions: pair.directions.sort((first, second) => first.id - second.id),
  }));
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
    [userId, startStationId, destinationStationId, new Date().toISOString()],
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
    [gameId, userId],
  );
}

async function getPlanningGame(gameId, userId) {
  return await get(
    `SELECT g.id,
            g.status,
            ss.id AS start_station_id,
            ss.name AS start_station_name,
            ds.id AS destination_station_id,
            ds.name AS destination_station_name
     FROM games g
     JOIN stations ss ON ss.id = g.start_station_id
     JOIN stations ds ON ds.id = g.destination_station_id
     WHERE g.id = ? AND g.user_id = ?`,
    [gameId, userId],
  );
}

async function getSegmentsByIds(segmentIds) {
  if (segmentIds.length === 0) {
    return [];
  }

  const placeholders = segmentIds.map(() => "?").join(",");
  const rows = await all(
    `SELECT id, from_station_id, to_station_id, line_id, path
     FROM segments
     WHERE id IN (${placeholders})`,
    segmentIds,
  );

  const segments = rows.map(
    (row) =>
      new Segment(
        row.id,
        row.from_station_id,
        row.to_station_id,
        row.line_id,
        row.path,
      ),
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
     HAVING COUNT(DISTINCT line_id) > 1`,
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
        [gameId, i + 1, segmentIds[i]],
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
    [new Date().toISOString(), gameId],
  );
}

async function getNextStep(gameId) {
  return await get(
    `SELECT gs.game_id,
            gs.step_index,
            gs.segment_id,
            s.from_station_id,
            fs.name AS from_station_name,
            s.to_station_id,
            ts.name AS to_station_name,
            s.line_id,
            s.path,
            l.name AS line_name
     FROM game_steps gs
     JOIN segments s ON s.id = gs.segment_id
     JOIN stations fs ON fs.id = s.from_station_id
     JOIN stations ts ON ts.id = s.to_station_id
     JOIN lines l ON l.id = s.line_id
     WHERE gs.game_id = ? AND gs.event_id IS NULL
     ORDER BY gs.step_index
     LIMIT 1`,
    [gameId],
  );
}

async function getRandomEvent() {
  return await get(
    `SELECT id, description, effect
     FROM events
     ORDER BY RANDOM()
     LIMIT 1`,
  );
}

async function getCurrentCoins(gameId) {
  const row = await get(
    `SELECT COALESCE(20 + SUM(e.effect), 20) AS coins
     FROM game_steps gs
     LEFT JOIN events e ON e.id = gs.event_id
     WHERE gs.game_id = ?`,
    [gameId],
  );

  return row.coins;
}

async function applyEventToStep(gameId, stepIndex, eventId) {
  await run(
    `UPDATE game_steps
     SET event_id = ?
     WHERE game_id = ? AND step_index = ?`,
    [eventId, gameId, stepIndex],
  );
}

async function hasPendingSteps(gameId) {
  const row = await get(
    `SELECT COUNT(*) AS count
     FROM game_steps
     WHERE game_id = ? AND event_id IS NULL`,
    [gameId],
  );

  return row.count > 0;
}

async function completeGame(gameId, finalScore) {
  await run(
    `UPDATE games
     SET status = 'completed',
         final_score = ?,
         completed_at = ?
     WHERE id = ?`,
    [Math.max(0, finalScore), new Date().toISOString(), gameId],
  );
}

async function getGameResult(gameId, userId) {
  return await get(
    `SELECT g.id,
            g.status,
            g.final_score,
            g.created_at,
            g.completed_at,
            ss.id AS start_station_id,
            ss.name AS start_station_name,
            ds.id AS destination_station_id,
            ds.name AS destination_station_name
     FROM games g
     JOIN stations ss ON ss.id = g.start_station_id
     JOIN stations ds ON ds.id = g.destination_station_id
     WHERE g.id = ? AND g.user_id = ?`,
    [gameId, userId],
  );
}

async function getExecutedSteps(gameId) {
  return await all(
    `SELECT gs.step_index,
            gs.segment_id,
            s.from_station_id,
            fs.name AS from_station_name,
            s.to_station_id,
            ts.name AS to_station_name,
            s.line_id,
            s.path,
            l.name AS line_name,
            e.description AS event_description,
            e.effect AS event_effect
     FROM game_steps gs
     JOIN segments s ON s.id = gs.segment_id
     JOIN stations fs ON fs.id = s.from_station_id
     JOIN stations ts ON ts.id = s.to_station_id
     JOIN lines l ON l.id = s.line_id
     JOIN events e ON e.id = gs.event_id
     WHERE gs.game_id = ?
     ORDER BY gs.step_index`,
    [gameId],
  );
}

async function getRanking() {
  return await all(
    `SELECT u.id AS user_id,
            u.name,
            MAX(g.final_score) AS best_score
     FROM users u
     JOIN games g ON g.user_id = u.id
     WHERE g.status = 'completed'
     GROUP BY u.id, u.name
     ORDER BY best_score DESC, u.name ASC`,
  );
}

export {
  getUser,
  getUserById,
  getStations,
  getLines,
  getSegments,
  getPlanningSegmentPairs,
  createGame,
  getGameForUser,
  getPlanningGame,
  getSegmentsByIds,
  getInterchangeStationIds,
  savePlannedRoute,
  failGame,
  getNextStep,
  getRandomEvent,
  getCurrentCoins,
  applyEventToStep,
  hasPendingSteps,
  completeGame,
  getGameResult,
  getExecutedSteps,
  getRanking,
};

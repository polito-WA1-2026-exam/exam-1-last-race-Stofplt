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
let writeQueue = Promise.resolve();

// Wraps sqlite3 single-row reads in promises for async route handlers.
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Wraps sqlite3 multi-row reads in promises.
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Wraps sqlite3 writes and exposes metadata such as changes and lastID.
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

/*
 * Serializes write transactions in process. SQLite already locks the database,
 * but this queue keeps double-clicked route submits or Next requests ordered
 * before they enter BEGIN IMMEDIATE transactions.
 */
async function withWriteLock(operation) {
  const previousOperation = writeQueue;
  let releaseLock;

  writeQueue = new Promise((resolve) => {
    releaseLock = resolve;
  });

  await previousOperation.catch(() => {});

  try {
    return await operation();
  } finally {
    releaseLock();
  }
}

// Removes password material before returning a user to the session/client.
function toPublicUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
  };
}

// Authenticates by recomputing the salted hash and comparing it in constant time.
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

// Reloads the public user stored in the session serializer.
async function getUserById(id) {
  const user = await get("SELECT id, email, name FROM users WHERE id = ?", [
    id,
  ]);
  return user ? toPublicUser(user) : false;
}

// Returns station coordinates used by all map variants.
async function getStations() {
  const rows = await all(
    `SELECT id, name, x, y
     FROM stations
     ORDER BY name`,
  );

  return rows.map((row) => new Station(row.id, row.name, row.x, row.y));
}

// Returns fixed metro lines with their display colors.
async function getLines() {
  const rows = await all(
    `SELECT id, name, color
     FROM lines
     ORDER BY id`,
  );

  return rows.map((row) => new Line(row.id, row.name, row.color));
}

// Returns directed network segments, including SVG paths for trusted views.
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

// Collapses opposite directed segments into one planning pair with two directions.
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

// Creates a planning game; the assigned stations are chosen before this call.
async function createGame(userId, startStationId, destinationStationId) {
  return await withWriteLock(async () => {
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
  });
}

// Fetches one game owned by a user for status-sensitive API guards.
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

// Fetches the planning payload without exposing route or event details.
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

// Resolves submitted segment ids in the same order selected by the player.
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

// Derives interchange stations from stations served by more than one line.
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

/*
 * Persists a valid route as ordered game_steps rows with event_id = NULL.
 * The status update and inserts share one transaction, so a duplicate submit
 * cannot partially overwrite an already accepted route.
 */
async function savePlannedRoute(gameId, segmentIds) {
  return await withWriteLock(async () => {
    await run("BEGIN IMMEDIATE TRANSACTION");

    try {
      const statusUpdate = await run(
        "UPDATE games SET status = 'executing' WHERE id = ? AND status = 'planning'",
        [gameId],
      );

      if (statusUpdate.changes === 0) {
        await run("ROLLBACK");
        return false;
      }

      await run("DELETE FROM game_steps WHERE game_id = ?", [gameId]);

      for (let i = 0; i < segmentIds.length; i++) {
        await run(
          `INSERT INTO game_steps (game_id, step_index, segment_id, event_id)
           VALUES (?, ?, ?, NULL)`,
          [gameId, i + 1, segmentIds[i]],
        );
      }

      await run("COMMIT");
      return true;
    } catch (err) {
      await run("ROLLBACK");
      throw err;
    }
  });
}

// Stores an invalid or expired planning phase as a zero-score failed game.
async function failGame(gameId) {
  await withWriteLock(() =>
    run(
      `UPDATE games
       SET status = 'failed',
           final_score = 0,
           completed_at = ?
       WHERE id = ? AND status = 'planning'`,
      [new Date().toISOString(), gameId],
    ),
  );
}

// Picks one event uniformly for a single execution step.
async function getRandomEvent() {
  return await get(
    `SELECT id, description, effect
     FROM events
     ORDER BY RANDOM()
     LIMIT 1`,
  );
}

// Computes current coins from the initial 20 plus already assigned events.
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

/*
 * Executes exactly one expected pending step. The transaction reads the target
 * row, assigns one random event, and only completes the game when no NULL
 * event_id rows remain, protecting against repeated Next clicks.
 */
async function executeNextPendingStep(gameId, expectedStepIndex) {
  return await withWriteLock(async () => {
    await run("BEGIN IMMEDIATE TRANSACTION");

    try {
      const step = await get(
        `SELECT gs.game_id,
                gs.step_index,
                gs.segment_id,
                s.line_id,
                s.path
         FROM game_steps gs
         JOIN segments s ON s.id = gs.segment_id
         WHERE gs.game_id = ? AND gs.step_index = ? AND gs.event_id IS NULL
         LIMIT 1`,
        [gameId, expectedStepIndex],
      );

      if (!step) {
        await run("ROLLBACK");
        return null;
      }

      const currentCoins = await getCurrentCoins(gameId);
      const event = await getRandomEvent();
      const updatedCoins = currentCoins + event.effect;
      const stepUpdate = await run(
        `UPDATE game_steps
         SET event_id = ?
         WHERE game_id = ? AND step_index = ? AND event_id IS NULL`,
        [event.id, gameId, step.step_index],
      );

      if (stepUpdate.changes === 0) {
        await run("ROLLBACK");
        return null;
      }

      const pending = await get(
        `SELECT COUNT(*) AS count
         FROM game_steps
         WHERE game_id = ? AND event_id IS NULL`,
        [gameId],
      );
      const completed = pending.count === 0;

      if (completed) {
        await run(
          `UPDATE games
           SET status = 'completed',
               final_score = ?,
               completed_at = ?
           WHERE id = ? AND status = 'executing'`,
          [Math.max(0, updatedCoins), new Date().toISOString(), gameId],
        );
      }

      await run("COMMIT");

      return {
        completed,
        score: completed ? Math.max(0, updatedCoins) : undefined,
        step,
        event,
        coins: updatedCoins,
      };
    } catch (err) {
      await run("ROLLBACK");
      throw err;
    }
  });
}

// Fetches the final game header shown on the result page.
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

// Returns executed steps with station names, line names, paths and event data.
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

// Returns each user's best completed score for the leaderboard.
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
  getRandomEvent,
  getCurrentCoins,
  executeNextPendingStep,
  getGameResult,
  getExecutedSteps,
  getRanking,
};

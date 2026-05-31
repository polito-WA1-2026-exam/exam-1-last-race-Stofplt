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

export {
  getUser,
  getUserById,
  getStations,
  getLines,
  getSegments,
  createGame
};

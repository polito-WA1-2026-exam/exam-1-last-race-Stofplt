import crypto from "crypto";
import sqlite3 from "sqlite3";
import { promisify } from "util";

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

export { getUser, getUserById };

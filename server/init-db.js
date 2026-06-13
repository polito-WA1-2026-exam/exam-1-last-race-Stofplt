import fs from "fs";
import path from "path";
import sqlite3 from "sqlite3";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "db.sqlite");
const sqlPath = path.join(__dirname, "init.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

// Rebuilds the bundled SQLite database from the authoritative seed script.
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const db = new sqlite3.Database(dbPath);

// Executes schema creation and seed inserts as one SQL script.
db.exec(sql, (err) => {
  if (err) {
    console.error("Cannot initialize database:", err.message);
    db.close();
    process.exit(1);
  }

  db.close((closeErr) => {
    if (closeErr) {
      console.error("Cannot close database:", closeErr.message);
      process.exit(1);
    }

    console.log(`Database initialized at ${dbPath}`);
  });
});

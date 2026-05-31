PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS game_steps;
DROP TABLE IF EXISTS games;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS segments;
DROP TABLE IF EXISTS stations;
DROP TABLE IF EXISTS lines;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  hash TEXT NOT NULL,
  salt TEXT NOT NULL
);

CREATE TABLE lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL
);

CREATE TABLE stations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL
);

CREATE TABLE segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_station_id INTEGER NOT NULL,
  to_station_id INTEGER NOT NULL,
  line_id INTEGER NOT NULL,
  UNIQUE (from_station_id, to_station_id, line_id),
  FOREIGN KEY (from_station_id) REFERENCES stations(id),
  FOREIGN KEY (to_station_id) REFERENCES stations(id),
  FOREIGN KEY (line_id) REFERENCES lines(id),
  CHECK (from_station_id <> to_station_id)
);

CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  description TEXT NOT NULL,
  effect INTEGER NOT NULL CHECK (effect >= -4 AND effect <= 4)
);

CREATE TABLE games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  start_station_id INTEGER NOT NULL,
  destination_station_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planning', 'executing', 'completed', 'failed')),
  final_score INTEGER CHECK (final_score IS NULL OR final_score >= 0),
  created_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (start_station_id) REFERENCES stations(id),
  FOREIGN KEY (destination_station_id) REFERENCES stations(id)
);

CREATE TABLE game_steps (
  game_id INTEGER NOT NULL,
  step_index INTEGER NOT NULL,
  segment_id INTEGER NOT NULL,
  event_id INTEGER,
  PRIMARY KEY (game_id, step_index),
  FOREIGN KEY (game_id) REFERENCES games(id),
  FOREIGN KEY (segment_id) REFERENCES segments(id),
  FOREIGN KEY (event_id) REFERENCES events(id)
);

INSERT INTO users (id, email, name, hash, salt) VALUES
  (1, 'alice@example.com', 'Alice', 'd3f74546f092216982494478e182890922676435cb58679c484b693908d57467', '915a99a6d7d24913fc178a4b3ef93ec4'),
  (2, 'bruno@example.com', 'Bruno', '32c1ac48df27ab24f81104a974fbc5f5b27308e1ed07f9e944864558ad86b672', '8c11646122c59c91fc78bc5087229e4a'),
  (3, 'carla@example.com', 'Carla', 'e0a773a0ba7946c8aba597e6c5a91470e47db90fa37ca90425e0f330d2f7dede', 'eb1d0c637059b552ff957622928a6071');

INSERT INTO lines (id, name, color) VALUES
  (1, 'Aurora Line', '#d64545'),
  (2, 'Harbor Line', '#2f80ed'),
  (3, 'Ember Line', '#f2994a'),
  (4, 'Garden Line', '#27ae60');

INSERT INTO stations (id, name, x, y) VALUES
  (1, 'North Pier', 120, 80),
  (2, 'Clocktower', 260, 80),
  (3, 'Glass Market', 400, 80),
  (4, 'East Depot', 540, 140),
  (5, 'Old Harbor', 120, 220),
  (6, 'Civic Museum', 260, 220),
  (7, 'Lantern Square', 400, 220),
  (8, 'Hill Garden', 540, 220),
  (9, 'West Gate', 40, 220),
  (10, 'South Workshop', 260, 360),
  (11, 'Library Park', 400, 360),
  (12, 'Cedar Junction', 260, 150);

INSERT INTO segments (id, from_station_id, to_station_id, line_id) VALUES
  (1, 1, 2, 1),
  (2, 2, 1, 1),
  (3, 2, 3, 1),
  (4, 3, 2, 1),
  (5, 3, 7, 1),
  (6, 7, 3, 1),
  (7, 7, 4, 1),
  (8, 4, 7, 1),
  (9, 9, 5, 2),
  (10, 5, 9, 2),
  (11, 5, 2, 2),
  (12, 2, 5, 2),
  (13, 2, 6, 2),
  (14, 6, 2, 2),
  (15, 6, 10, 2),
  (16, 10, 6, 2),
  (17, 5, 6, 3),
  (18, 6, 5, 3),
  (19, 6, 7, 3),
  (20, 7, 6, 3),
  (21, 7, 8, 3),
  (22, 8, 7, 3),
  (23, 8, 11, 3),
  (24, 11, 8, 3),
  (25, 1, 12, 4),
  (26, 12, 1, 4),
  (27, 12, 3, 4),
  (28, 3, 12, 4),
  (29, 3, 7, 4),
  (30, 7, 3, 4),
  (31, 7, 11, 4),
  (32, 11, 7, 4),
  (33, 11, 10, 4),
  (34, 10, 11, 4);

INSERT INTO events (id, description, effect) VALUES
  (1, 'Quiet journey', 0),
  (2, 'Found a spare ticket', 2),
  (3, 'Helpful driver', 1),
  (4, 'Small delay at the platform', -1),
  (5, 'Wrong platform', -2),
  (6, 'Signal failure', -3),
  (7, 'Lost wallet', -4),
  (8, 'Express tunnel opened', 3),
  (9, 'Inspector refund', 4),
  (10, 'Crowded carriage', -1);

INSERT INTO games (id, user_id, start_station_id, destination_station_id, status, final_score, created_at, completed_at) VALUES
  (1, 1, 1, 10, 'completed', 26, '2026-05-20T14:10:00.000Z', '2026-05-20T14:16:00.000Z'),
  (2, 1, 9, 4, 'completed', 21, '2026-05-21T09:30:00.000Z', '2026-05-21T09:36:00.000Z'),
  (3, 2, 5, 11, 'completed', 18, '2026-05-22T18:05:00.000Z', '2026-05-22T18:12:00.000Z');

INSERT INTO game_steps (game_id, step_index, segment_id, event_id) VALUES
  (1, 1, 25, 8),
  (1, 2, 27, 2),
  (1, 3, 29, 3),
  (1, 4, 31, 1),
  (1, 5, 33, 1),
  (2, 1, 9, 4),
  (2, 2, 11, 3),
  (2, 3, 3, 2),
  (2, 4, 5, 5),
  (2, 5, 7, 3),
  (3, 1, 17, 6),
  (3, 2, 19, 1),
  (3, 3, 31, 3);

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
  path TEXT NOT NULL,
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
  (1, 'ulisse@lastrace.test', 'Ulisse', 'd3f74546f092216982494478e182890922676435cb58679c484b693908d57467', '915a99a6d7d24913fc178a4b3ef93ec4'),
  (2, 'belacqua@lastrace.test', 'Belacqua', '32c1ac48df27ab24f81104a974fbc5f5b27308e1ed07f9e944864558ad86b672', '8c11646122c59c91fc78bc5087229e4a'),
  (3, 'rifeo@lastrace.test', 'Rifeo', 'e0a773a0ba7946c8aba597e6c5a91470e47db90fa37ca90425e0f330d2f7dede', 'eb1d0c637059b552ff957622928a6071');

INSERT INTO lines (id, name, color) VALUES
  (1, 'Red Line', '#E32017'),
  (2, 'Blue Line', '#003688'),
  (3, 'Green Line', '#00782A'),
  (4, 'Yellow Line', '#FFD300');

INSERT INTO stations (id, name, x, y) VALUES
  (1, 'Shady Grove', 150, 120),
  (2, 'Bethesda', 150, 180),
  (3, 'Farragut North', 230, 300),
  (4, 'Union Station', 450, 250),
  (5, 'Rhode Island', 550, 200),
  (6, 'Brookland', 650, 200),
  (7, 'Rosslyn', 110, 250),
  (8, 'Foggy Bottom', 210, 250),
  (9, 'Navy Yard', 350, 400),
  (10, 'Waterfront', 350, 470),
  (11, 'Shaw', 400, 130),
  (12, 'Mt Vernon Sq', 400, 220),
  (13, 'Archives', 480, 380),
  (14, 'Suitland', 580, 450),
  (15, 'Branch Ave', 650, 450),
  (16, 'Huntington', 200, 490),
  (17, 'Pentagon', 250, 370),
  (18, 'Judiciary Sq', 480, 320),
  (19, 'King St', 550, 370),
  (20, 'Crystal City', 650, 420),
  (21, 'Metro Center', 150, 250),
  (22, 'L''Enfant Plaza', 320, 320),
  (23, 'Gallery Place', 400, 300),
  (24, 'Chinatown', 420, 320);

INSERT INTO segments (id, from_station_id, to_station_id, line_id, path) VALUES
  (1, 1, 2, 1, 'M 150 120 L 150 180'),
  (2, 2, 1, 1, 'M 150 180 L 150 120'),
  (3, 2, 21, 1, 'M 150 180 L 150 250'),
  (4, 21, 2, 1, 'M 150 250 L 150 180'),
  (5, 21, 3, 1, 'M 150 250 L 150 300 L 230 300'),
  (6, 3, 21, 1, 'M 230 300 L 150 300 L 150 250'),
  (7, 3, 23, 1, 'M 230 300 L 400 300'),
  (8, 23, 3, 1, 'M 400 300 L 230 300'),
  (9, 23, 4, 1, 'M 400 300 L 450 250'),
  (10, 4, 23, 1, 'M 450 250 L 400 300'),
  (11, 4, 5, 1, 'M 450 250 L 500 200 L 550 200'),
  (12, 5, 4, 1, 'M 550 200 L 500 200 L 450 250'),
  (13, 5, 6, 1, 'M 550 200 L 650 200'),
  (14, 6, 5, 1, 'M 650 200 L 550 200'),
  (15, 7, 21, 2, 'M 110 250 L 150 250'),
  (16, 21, 7, 2, 'M 150 250 L 110 250'),
  (17, 21, 8, 2, 'M 150 250 L 210 250'),
  (18, 8, 21, 2, 'M 210 250 L 150 250'),
  (19, 8, 22, 2, 'M 210 250 L 250 250 L 320 320'),
  (20, 22, 8, 2, 'M 320 320 L 250 250 L 210 250'),
  (21, 22, 9, 2, 'M 320 320 L 350 350 L 350 400'),
  (22, 9, 22, 2, 'M 350 400 L 350 350 L 320 320'),
  (23, 9, 10, 2, 'M 350 400 L 350 470'),
  (24, 10, 9, 2, 'M 350 470 L 350 400'),
  (25, 11, 12, 3, 'M 400 130 L 400 220'),
  (26, 12, 11, 3, 'M 400 220 L 400 130'),
  (27, 12, 23, 3, 'M 400 220 L 400 300'),
  (28, 23, 12, 3, 'M 400 300 L 400 220'),
  (29, 23, 13, 3, 'M 400 300 L 480 380'),
  (30, 13, 23, 3, 'M 480 380 L 400 300'),
  (31, 13, 14, 3, 'M 480 380 L 550 450 L 580 450'),
  (32, 14, 13, 3, 'M 580 450 L 550 450 L 480 380'),
  (33, 14, 15, 3, 'M 580 450 L 650 450'),
  (34, 15, 14, 3, 'M 650 450 L 580 450'),
  (35, 16, 17, 4, 'M 200 490 L 200 420 L 250 370'),
  (36, 17, 16, 4, 'M 250 370 L 200 420 L 200 490'),
  (37, 17, 22, 4, 'M 250 370 L 300 320 L 320 320'),
  (38, 22, 17, 4, 'M 320 320 L 300 320 L 250 370'),
  (39, 22, 24, 4, 'M 320 320 L 420 320'),
  (40, 24, 22, 4, 'M 420 320 L 320 320'),
  (41, 24, 18, 4, 'M 420 320 L 480 320'),
  (42, 18, 24, 4, 'M 480 320 L 420 320'),
  (43, 18, 19, 4, 'M 480 320 L 500 320 L 550 370'),
  (44, 19, 18, 4, 'M 550 370 L 500 320 L 480 320'),
  (45, 19, 20, 4, 'M 550 370 L 600 420 L 650 420'),
  (46, 20, 19, 4, 'M 650 420 L 600 420 L 550 370');

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
  (1, 1, 1, 10, 'completed', 27, '2026-05-20T14:10:00.000Z', '2026-05-20T14:16:00.000Z'),
  (2, 1, 11, 6, 'completed', 20, '2026-05-21T09:30:00.000Z', '2026-05-21T09:36:00.000Z'),
  (3, 2, 16, 20, 'completed', 22, '2026-05-22T18:05:00.000Z', '2026-05-22T18:12:00.000Z');

INSERT INTO game_steps (game_id, step_index, segment_id, event_id) VALUES
  (1, 1, 1, 8),
  (1, 2, 3, 2),
  (1, 3, 17, 3),
  (1, 4, 19, 1),
  (1, 5, 21, 1),
  (1, 6, 23, 3),
  (2, 1, 25, 4),
  (2, 2, 27, 3),
  (2, 3, 9, 2),
  (2, 4, 11, 5),
  (2, 5, 13, 3),
  (3, 1, 35, 6),
  (3, 2, 37, 8),
  (3, 3, 39, 1),
  (3, 4, 41, 3),
  (3, 5, 43, 2),
  (3, 6, 45, 4);

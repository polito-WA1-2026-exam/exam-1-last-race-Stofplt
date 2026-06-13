import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import { configurePassport, isLoggedIn } from "./auth.js";
import {
  createGame,
  executeNextPendingStep,
  failGame,
  getCurrentCoins,
  getExecutedSteps,
  getGameForUser,
  getGameResult,
  getInterchangeStationIds,
  getLines,
  getPlanningGame,
  getPlanningSegmentPairs,
  getRanking,
  getSegments,
  getSegmentsByIds,
  getStations,
  savePlannedRoute,
} from "./dao.js";
import {
  buildGameStartPayload,
  buildResultPayload,
  hasPlanningTimeExpired,
  pickStartAndDestination,
  validateRoute,
} from "./gameLogic.js";

const app = express();
const port = process.env.PORT || 3001;

configurePassport(passport);

// Common middleware keeps JSON APIs, cross-origin cookies, and Passport sessions aligned.
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.use(
  session({
    secret: "last-race-development-secret",
    resave: false,
    saveUninitialized: false,
  }),
);
app.use(passport.authenticate("session"));

// Health check used for quick manual API verification.
app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "last-race-api" });
});

// Public rules payload mirrors the instructions page without exposing the network.
app.get("/api/instructions", (req, res) => {
  res.json({
    title: "Last Race",
    rules: [
      "Study the full metro network before starting a game.",
      "After pressing play, build a route from the assigned start station to the assigned destination.",
      "During planning, only station names and connected station pairs are available.",
      "The route must be submitted within 90 seconds.",
      "Valid routes are executed one segment at a time, with random events changing the coin total.",
    ],
  });
});

// Creates a session by delegating salted password verification to Passport.
app.post("/api/sessions", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({ error: info?.message });
    }

    req.login(user, (loginErr) => {
      if (loginErr) {
        return next(loginErr);
      }
      return res.status(201).json(req.user);
    });
  })(req, res, next);
});

// Returns the user currently stored in the session cookie.
app.get("/api/sessions/current", isLoggedIn, (req, res) => {
  res.json(req.user);
});

// Destroys the Passport login state for the current session.
app.delete("/api/sessions/current", isLoggedIn, (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.end();
  });
});

// Setup intentionally receives the full network and unlocks game creation.
app.get("/api/network/full", isLoggedIn, async (req, res, next) => {
  try {
    const [stations, lines, segments] = await Promise.all([
      getStations(),
      getLines(),
      getSegments(),
    ]);

    req.session.networkLoaded = true;
    res.json({ stations, lines, segments });
  } catch (err) {
    next(err);
  }
});

// Planning map needs station coordinates but not line or path data.
app.get("/api/network/stations", isLoggedIn, async (req, res, next) => {
  try {
    const stations = await getStations();

    res.json({ stations });
  } catch (err) {
    next(err);
  }
});

// Planning receives station pairs and both directions, but no line names or SVG paths.
app.get("/api/network/planning", isLoggedIn, async (req, res, next) => {
  try {
    const [stations, segmentPairs] = await Promise.all([
      getStations(),
      getPlanningSegmentPairs(),
    ]);

    res.json({ stations, segmentPairs });
  } catch (err) {
    next(err);
  }
});

// Execution receives enough network shape to frame the map without revealing future paths.
app.get("/api/network/execution", isLoggedIn, async (req, res, next) => {
  try {
    const [stations, lines, segments] = await Promise.all([
      getStations(),
      getLines(),
      getSegments(),
    ]);

    res.json({
      stations,
      lines,
      segments: segments.map((segment) => ({
        id: segment.id,
        fromStationId: segment.fromStationId,
        toStationId: segment.toStationId,
        lineId: segment.lineId,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// Starts a game only after the player has loaded the setup network in this session.
app.post("/api/games", isLoggedIn, async (req, res, next) => {
  try {
    if (!req.session.networkLoaded) {
      return res.status(409).json({
        error: "Load the network before starting a game",
      });
    }

    const [stations, segments] = await Promise.all([
      getStations(),
      getSegments(),
    ]);
    const pair = pickStartAndDestination(stations, segments);
    const gameId = await createGame(
      req.user.id,
      pair.startStation.id,
      pair.destinationStation.id,
    );

    req.session.gameStartTimes ??= {};
    req.session.gameStartTimes[gameId] = Date.now();

    res.status(201).json(buildGameStartPayload(gameId, pair));
  } catch (err) {
    next(err);
  }
});

// Returns assignment and remaining planning time for refresh-safe planning pages.
app.get("/api/games/:id/planning", isLoggedIn, async (req, res, next) => {
  try {
    const gameId = Number(req.params.id);

    if (!Number.isInteger(gameId) || gameId <= 0) {
      return res.status(422).json({ error: "Invalid game id" });
    }

    const game = await getPlanningGame(gameId, req.user.id);

    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }
    if (game.status !== "planning") {
      return res
        .status(409)
        .json({ error: "The game is not accepting a route" });
    }

    const startedAt = req.session.gameStartTimes?.[gameId];
    const remainingSeconds = startedAt
      ? Math.max(0, 90 - Math.floor((Date.now() - startedAt) / 1000))
      : 90;

    res.json({
      gameId: game.id,
      status: game.status,
      remainingSeconds,
      startStation: {
        id: game.start_station_id,
        name: game.start_station_name,
      },
      destinationStation: {
        id: game.destination_station_id,
        name: game.destination_station_name,
      },
    });
  } catch (err) {
    next(err);
  }
});

/*
 * Validates and accepts the submitted route before execution starts. Expired or
 * invalid plans are failed immediately, while valid plans are persisted as
 * ordered game_steps rows by the DAO.
 */
app.post("/api/games/:id/route", isLoggedIn, async (req, res, next) => {
  try {
    const gameId = Number(req.params.id);

    if (!Number.isInteger(gameId) || gameId <= 0) {
      return res.status(422).json({ error: "Invalid game id" });
    }
    if (!Array.isArray(req.body.segments)) {
      return res.status(422).json({ error: "segments must be an array" });
    }
    if (
      req.body.segments.some(
        (segmentId) => !Number.isInteger(segmentId) || segmentId <= 0,
      )
    ) {
      return res.status(422).json({ error: "segments must be valid" });
    }

    const game = await getGameForUser(gameId, req.user.id);

    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }
    if (game.status !== "planning") {
      return res
        .status(409)
        .json({ error: "The game is not accepting a route" });
    }

    const startedAt = req.session.gameStartTimes?.[gameId];

    if (hasPlanningTimeExpired(startedAt)) {
      await failGame(gameId);
      delete req.session.gameStartTimes?.[gameId];
      return res.json({
        valid: false,
        score: 0,
        reason: "Planning time expired",
      });
    }

    const selectedSegments = await getSegmentsByIds(req.body.segments);
    const interchangeStationIds = await getInterchangeStationIds();
    const validation = validateRoute(
      game,
      selectedSegments,
      interchangeStationIds,
    );

    if (!validation.valid) {
      await failGame(gameId);
      delete req.session.gameStartTimes?.[gameId];
      return res.json({
        valid: false,
        score: 0,
        reason: validation.reason,
      });
    }

    const saved = await savePlannedRoute(gameId, req.body.segments);
    if (!saved) {
      return res
        .status(409)
        .json({ error: "The game is not accepting a route" });
    }
    delete req.session.gameStartTimes?.[gameId];

    res.json({
      valid: true,
      gameId,
      status: "executing",
    });
  } catch (err) {
    next(err);
  }
});

// Executes one expected route step and returns only the new event/path payload.
app.post("/api/games/:id/execute/next", isLoggedIn, async (req, res, next) => {
  try {
    const gameId = Number(req.params.id);
    const expectedStepIndex = req.body?.expectedStepIndex;

    if (!Number.isInteger(gameId) || gameId <= 0) {
      return res.status(422).json({ error: "Invalid game id" });
    }
    if (!Number.isInteger(expectedStepIndex) || expectedStepIndex <= 0) {
      return res
        .status(422)
        .json({ error: "expectedStepIndex must be valid" });
    }

    const game = await getGameForUser(gameId, req.user.id);

    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }
    if (game.status !== "executing") {
      return res
        .status(409)
        .json({ error: "The game is not ready for execution" });
    }

    const execution = await executeNextPendingStep(gameId, expectedStepIndex);

    if (!execution) {
      return res.status(409).json({ error: "Step is not available" });
    }

    res.json({
      completed: execution.completed,
      score: execution.score,
      step: {
        index: execution.step.step_index,
        segmentId: execution.step.segment_id,
        lineId: execution.step.line_id,
        path: execution.step.path,
        event: {
          description: execution.event.description,
          effect: execution.event.effect,
        },
        coins: execution.coins,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Rebuilds the execution page from persisted steps after refresh or navigation.
app.get("/api/games/:id/execution", isLoggedIn, async (req, res, next) => {
  try {
    const gameId = Number(req.params.id);
    if (!Number.isInteger(gameId) || gameId <= 0) {
      return res.status(422).json({ error: "Invalid game id" });
    }
    const game = await getGameForUser(gameId, req.user.id);
    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }
    if (game.status !== "executing" && game.status !== "completed") {
      return res.status(409).json({ error: "The game is not in execution" });
    }
    const [coins, steps] = await Promise.all([
      getCurrentCoins(gameId),
      getExecutedSteps(gameId),
    ]);
    res.json({
      gameId: game.id,
      status: game.status,
      coins,
      lastEvent:
        steps.length > 0
          ? {
              description: steps[steps.length - 1].event_description,
              effect: steps[steps.length - 1].event_effect,
            }
          : null,
      steps: steps.map((s) => ({
        index: s.step_index,
        segmentId: s.segment_id,
        lineId: s.line_id,
        path: s.path,
        event: {
          description: s.event_description,
          effect: s.event_effect,
        },
      })),
      score: game.status === "completed" ? game.final_score : undefined,
    });
  } catch (err) {
    next(err);
  }
});

// Returns final game data for both completed and failed games owned by the user.
app.get("/api/games/:id/result", isLoggedIn, async (req, res, next) => {
  try {
    const gameId = Number(req.params.id);

    if (!Number.isInteger(gameId) || gameId <= 0) {
      return res.status(422).json({ error: "Invalid game id" });
    }

    const game = await getGameResult(gameId, req.user.id);

    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    const steps = await getExecutedSteps(gameId);
    res.json(buildResultPayload(game, steps));
  } catch (err) {
    next(err);
  }
});

// Exposes each player's best completed score.
app.get("/api/ranking", isLoggedIn, async (req, res, next) => {
  try {
    const ranking = await getRanking();
    res.json(
      ranking.map((entry) => ({
        userId: entry.user_id,
        name: entry.name,
        bestScore: entry.best_score,
      })),
    );
  } catch (err) {
    next(err);
  }
});

// Keeps missing API paths JSON-shaped for the client.
app.use((req, res, next) => {
  res.status(404).json({ error: "API route not found" });
});

// Centralizes unexpected failures without leaking internals to the client.
app.use((err, req, res, next) => {
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
});

// Starts the API server used by the Vite client in the two-server setup.
app.listen(port, () => {
  console.log(`Last Race API listening at http://localhost:${port}`);
});

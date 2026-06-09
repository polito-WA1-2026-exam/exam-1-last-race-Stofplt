import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import { configurePassport, isLoggedIn } from "./auth.js";
import {
  applyEventToStep,
  completeGame,
  createGame,
  failGame,
  getCurrentCoins,
  getExecutedSteps,
  getGameForUser,
  getGameResult,
  getInterchangeStationIds,
  getLines,
  getNextStep,
  getPlanningGame,
  getPlanningSegmentPairs,
  getRanking,
  getRandomEvent,
  getSegments,
  getSegmentsByIds,
  getStations,
  hasPendingSteps,
  savePlannedRoute,
} from "./dao.js";
import {
  applyEventEffect,
  buildGameStartPayload,
  buildResultPayload,
  hasPlanningTimeExpired,
  pickStartAndDestination,
  validateRoute,
} from "./gameLogic.js";

const app = express();
const port = process.env.PORT || 3001;

configurePassport(passport);

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

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "last-race-api" });
});

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

app.get("/api/sessions/current", isLoggedIn, (req, res) => {
  res.json(req.user);
});

app.delete("/api/sessions/current", isLoggedIn, (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.end();
  });
});

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

app.get("/api/network/stations", isLoggedIn, async (req, res, next) => {
  try {
    const stations = await getStations();

    res.json({ stations });
  } catch (err) {
    next(err);
  }
});

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

    res.json({
      gameId: game.id,
      status: game.status,
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
      return res
        .status(422)
        .json({ error: "segments must contain positive integers" });
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

    await savePlannedRoute(gameId, req.body.segments);
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

app.post("/api/games/:id/execute/next", isLoggedIn, async (req, res, next) => {
  try {
    const gameId = Number(req.params.id);

    if (!Number.isInteger(gameId) || gameId <= 0) {
      return res.status(422).json({ error: "Invalid game id" });
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

    const step = await getNextStep(gameId);

    if (!step) {
      return res.status(409).json({ error: "No pending steps to execute" });
    }

    const [currentCoins, event] = await Promise.all([
      getCurrentCoins(gameId),
      getRandomEvent(),
    ]);
    const updatedCoins = applyEventEffect(currentCoins, event);

    await applyEventToStep(gameId, step.step_index, event.id);

    const completed = !(await hasPendingSteps(gameId));

    if (completed) {
      await completeGame(gameId, updatedCoins);
    }

    res.json({
      completed,
      score: completed ? Math.max(0, updatedCoins) : undefined,
      step: {
        index: step.step_index,
        segmentId: step.segment_id,
        fromStation: step.from_station_name,
        toStation: step.to_station_name,
        line: step.line_name,
        lineId: step.line_id,
        path: step.path,
        event: {
          description: event.description,
          effect: event.effect,
        },
        coins: updatedCoins,
      },
    });
  } catch (err) {
    next(err);
  }
});

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

app.use((req, res, next) => {
  res.status(404).json({ error: "API route not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`Last Race API listening at http://localhost:${port}`);
});

# Exam 1: "Last Race"
## Student: s346322 MICLAUS ENRICO

Last Race is a Web Applications I project built with a React single-page client and a Node.js/Express API server backed by SQLite.

## React Client Application Routes

- Route `/`: public instructions page with the game rules and a login dialog entry point.
- Route `/login`: public login page.
- Route `/setup`: protected setup page showing the full metro network before starting a game.
- Route `/planning/:gameId`: protected planning page where the player builds and submits a route within the time limit.
- Route `/execution/:gameId`: protected execution page where the submitted route is executed step by step.
- Route `/result/:gameId`: protected result page showing the final outcome of a game.
- Route `/ranking`: protected ranking page with the best score for each user.
- Route `*`: redirects unknown client routes to `/`.

## API Server

- GET `/api/health`
  - Public health check.
  - Response body: `{ ok, service }`.

- GET `/api/instructions`
  - Public static rules payload.
  - Response body: `{ title, rules }`.

- POST `/api/sessions`
  - Request body: `{ username, password }`.
  - Creates an authenticated session.
  - Response body: public user object `{ id, email, name }`.

- GET `/api/sessions/current`
  - Requires authentication.
  - Response body: current public user object.

- DELETE `/api/sessions/current`
  - Requires authentication.
  - Logs out the current user.

- GET `/api/network/full`
  - Requires authentication.
  - Loads the full network used by the setup page and enables game creation for the session.
  - Response body: `{ stations, lines, segments }`.

- GET `/api/network/stations`
  - Requires authentication.
  - Response body: `{ stations }`.

- GET `/api/network/planning`
  - Requires authentication.
  - Returns the reduced network data available during planning.
  - Response body: `{ stations, segmentPairs }`.

- GET `/api/network/execution`
  - Requires authentication.
  - Returns the execution map data without exposing segment SVG paths until execution.
  - Response body: `{ stations, lines, segments }`.

- POST `/api/games`
  - Requires authentication and a previously loaded full network in the same session.
  - Creates a new game with random start and destination stations.
  - Response body: game start payload with `gameId`, start station, destination station and planning status.

- GET `/api/games/:id/planning`
  - Requires authentication.
  - Route parameter: `id`, the game id.
  - Response body: planning state, remaining seconds, start station and destination station.

- POST `/api/games/:id/route`
  - Requires authentication.
  - Route parameter: `id`, the game id.
  - Request body: `{ segments: number[] }`.
  - Validates and stores the planned route.
  - Response body: `{ valid, gameId, status }` for valid routes or `{ valid, score, reason }` for failed routes.

- GET `/api/games/:id/execution`
  - Requires authentication.
  - Route parameter: `id`, the game id.
  - Response body: current execution state, coins, executed steps, last event and optional final score.

- POST `/api/games/:id/execute/next`
  - Requires authentication.
  - Route parameter: `id`, the game id.
  - Request body: `{ expectedStepIndex }`.
  - Executes the next pending route step.
  - Response body: `{ completed, score, step }`.

- GET `/api/games/:id/result`
  - Requires authentication.
  - Route parameter: `id`, the game id.
  - Response body: final game result and executed steps.

- GET `/api/ranking`
  - Requires authentication.
  - Response body: list of users with their best score.

## Database Tables

- Table `users` - registered users, public profile fields and salted password hashes.
- Table `lines` - metro lines with name and display color.
- Table `stations` - metro stations with unique names and map coordinates.
- Table `segments` - directed connections between adjacent stations on a line, including SVG path data.
- Table `events` - random execution events and their coin effect.
- Table `games` - game sessions, owner, start/destination stations, status, score and timestamps.
- Table `game_steps` - planned/executed route steps, associated segment and execution event.

The relational model is also documented in `docs/DB_RELATIONAL_MODEL.md`.

## Main React Components

- `InstructionsPage` (in `InstructionsPage.jsx`): public rules/home page.
- `SetupPage` (in `SetupPage.jsx`): game setup and network preview page.
- `PlanningPage` (in `PlanningPage.jsx`): timed route planning workflow.
- `ExecutionPage` (in `ExecutionPage.jsx`): step-by-step route execution workflow.
- `ResultPage` (in `ResultPage.jsx`): final result summary.
- `RankingPage` (in `RankingPage.jsx`): best-score leaderboard.
- `NetworkMap` (in `NetworkMap.jsx`): interactive setup map showing the full metro network.
- `PlanningMap` (in `PlanningMap.jsx`): planning map focused on stations, start and destination.
- `ExecutionMap` (in `ExecutionMap.jsx`): execution map that reveals route progress.
- `SegmentList` (in `SegmentList.jsx`): available segment selection list for planning.
- `RouteBuilder` (in `RouteBuilder.jsx`): selected route panel and route submission controls.

## Screenshot

Screenshot to be added before final submission.

## Users Credentials

- `ulisse@lastrace.test`, `race-pass-1`
- `belacqua@lastrace.test`, `race-pass-2`
- `rifeo@lastrace.test`, `race-pass-3`

## Development

Install dependencies and start the server:

```bash
cd server
npm install
nodemon index.js
```

Install dependencies and start the client in another terminal:

```bash
cd client
npm install
npm run dev
```

The API server runs on `http://localhost:3001` by default. The Vite client runs on `http://localhost:5173`.

## Use of AI Tools

AI tools were used as programming assistance for debugging, UI/CSS iteration, code cleanup and documentation drafting. Generated suggestions were manually reviewed, adapted to the project structure and verified with local builds and runtime checks.

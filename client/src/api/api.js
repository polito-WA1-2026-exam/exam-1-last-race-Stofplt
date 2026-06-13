const SERVER_URL = "http://localhost:3001/api";

// Centralizes authenticated JSON requests and server error normalization.
async function requestJson(path, options = {}) {
  const response = await fetch(`${SERVER_URL}${path}`, {
    credentials: "include",
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "API request failed");
  }

  return await response.json();
}

// Loads the setup map and marks the session ready to create games.
async function getNetwork() {
  return await requestJson("/network/full");
}

// Loads station pairs available during planning without line/path details.
async function getPlanningNetwork() {
  return await requestJson("/network/planning");
}

// Loads station coordinates used by the station-only planning map.
async function getNetworkStations() {
  return await requestJson("/network/stations");
}

// Loads execution map metadata while keeping route paths tied to executed steps.
async function getExecutionNetwork() {
  return await requestJson("/network/execution");
}

// Requests a new server-assigned game.
async function createGame() {
  return await requestJson("/games", { method: "POST" });
}

// Reloads planning assignment and remaining time for a game.
async function getPlanningGame(gameId) {
  return await requestJson(`/games/${gameId}/planning`);
}

// Submits ordered directed segment ids for server-side validation.
async function submitRoute(gameId, segments) {
  return await requestJson(`/games/${gameId}/route`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ segments }),
  });
}

// Executes one expected pending step to avoid skipped or repeated steps.
async function executeNextStep(gameId, expectedStepIndex) {
  return await requestJson(`/games/${gameId}/execute/next`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expectedStepIndex }),
  });
}

// Rebuilds the execution page from persisted progress.
async function getExecutionState(gameId) {
  return await requestJson(`/games/${gameId}/execution`);
}

// Loads final result data for completed or failed games.
async function getGameResult(gameId) {
  return await requestJson(`/games/${gameId}/result`);
}

// Loads the leaderboard with each player's best completed score.
async function getRanking() {
  return await requestJson("/ranking");
}

export {
  SERVER_URL,
  createGame,
  executeNextStep,
  getExecutionNetwork,
  getExecutionState,
  getGameResult,
  getNetwork,
  getNetworkStations,
  getPlanningNetwork,
  getPlanningGame,
  getRanking,
  submitRoute,
};

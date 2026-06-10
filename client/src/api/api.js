const SERVER_URL = "http://localhost:3001/api";

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

async function getHealth() {
  return await requestJson("/health");
}

async function getInstructions() {
  return await requestJson("/instructions");
}

async function getNetwork() {
  return await requestJson("/network/full");
}

async function getPlanningNetwork() {
  return await requestJson("/network/planning");
}

async function getNetworkStations() {
  return await requestJson("/network/stations");
}

async function createGame() {
  return await requestJson("/games", { method: "POST" });
}

async function getPlanningGame(gameId) {
  return await requestJson(`/games/${gameId}/planning`);
}

async function submitRoute(gameId, segments) {
  return await requestJson(`/games/${gameId}/route`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ segments }),
  });
}

async function executeNextStep(gameId) {
  return await requestJson(`/games/${gameId}/execute/next`, {
    method: "POST",
  });
}

async function getExecutionState(gameId) {
  return await requestJson(`/games/${gameId}/execution`);
}

async function getGameResult(gameId) {
  return await requestJson(`/games/${gameId}/result`);
}

async function getRanking() {
  return await requestJson("/ranking");
}

export {
  SERVER_URL,
  createGame,
  executeNextStep,
  getExecutionState,
  getGameResult,
  getHealth,
  getInstructions,
  getNetwork,
  getNetworkStations,
  getPlanningNetwork,
  getPlanningGame,
  getRanking,
  submitRoute,
};

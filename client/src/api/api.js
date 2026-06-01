const SERVER_URL = "http://localhost:3001/api";

async function requestJson(path, options = {}) {
  const response = await fetch(`${SERVER_URL}${path}`, {
    credentials: "include",
    ...options
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

async function createGame() {
  return await requestJson("/games", { method: "POST" });
}

export { SERVER_URL, createGame, getHealth, getInstructions, getNetwork };

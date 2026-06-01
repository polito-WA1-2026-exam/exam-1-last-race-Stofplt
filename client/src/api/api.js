const SERVER_URL = "http://localhost:3001/api";

async function getJson(path, options = {}) {
  const response = await fetch(`${SERVER_URL}${path}`, {
    credentials: "include",
    ...options
  });

  if (!response.ok) {
    throw new Error("API request failed");
  }

  return await response.json();
}

async function getHealth() {
  return await getJson("/health");
}

async function getInstructions() {
  return await getJson("/instructions");
}

export { SERVER_URL, getHealth, getInstructions };

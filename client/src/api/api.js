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

export { SERVER_URL, getHealth };

import { SERVER_URL } from "./api.js";

async function login(credentials) {
  const response = await fetch(`${SERVER_URL}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(credentials)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Login failed");
  }

  return await response.json();
}

async function getCurrentUser() {
  const response = await fetch(`${SERVER_URL}/sessions/current`, {
    credentials: "include"
  });

  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error("Cannot retrieve current user");
  }

  return await response.json();
}

async function logout() {
  const response = await fetch(`${SERVER_URL}/sessions/current`, {
    method: "DELETE",
    credentials: "include"
  });

  if (!response.ok && response.status !== 401) {
    throw new Error("Logout failed");
  }
}

export { login, getCurrentUser, logout };

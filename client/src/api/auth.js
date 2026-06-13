import { SERVER_URL } from "./api.js";

// Creates a Passport session and returns the public user payload.
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

// Treats 401 as an anonymous visitor rather than an application error.
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

// Ends the current session; a missing session is already logged out.
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

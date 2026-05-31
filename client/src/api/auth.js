async function login() {
  throw new Error("Authentication API unavailable");
}

async function getCurrentUser() {
  return null;
}

async function logout() {}

export { login, getCurrentUser, logout };
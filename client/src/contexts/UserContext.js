import { createContext, createElement, useContext, useEffect, useMemo, useState } from "react";
import {
  getCurrentUser,
  login as apiLogin,
  logout as apiLogout
} from "../api/auth.js";

const UserContext = createContext(null);

// Owns the session user so protected routes and navigation share one auth state.
function UserProvider({ children }) {
  // Null means anonymous; a user object means the server session is active.
  const [user, setUser] = useState(null);
  // Loading prevents protected routes from redirecting before the session check returns.
  const [loading, setLoading] = useState(true);

  // Refreshes the session user from the server on app startup or manual checks.
  async function checkAuth() {
    setLoading(true);
    try {
      setUser(await getCurrentUser());
    } finally {
      setLoading(false);
    }
  }

  // Updates context immediately after a successful login response.
  async function login(credentials) {
    const loggedUser = await apiLogin(credentials);
    setUser(loggedUser);
    return loggedUser;
  }

  // Clears context only after the server has accepted logout.
  async function logout() {
    await apiLogout();
    setUser(null);
  }

  // Performs the initial session lookup once for the whole SPA.
  useEffect(() => {
    checkAuth();
  }, []);

  // Memoizes auth actions and state so consumers do not rerender unnecessarily.
  const value = useMemo(
    () => ({
      user,
      loggedIn: user !== null,
      loading,
      login,
      logout,
      checkAuth
    }),
    [user, loading]
  );

  return createElement(UserContext.Provider, { value }, children);
}

// Provides a guarded consumer hook so auth state is never read outside provider.
function useUser() {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useUser must be used inside UserProvider");
  }

  return context;
}

export { UserProvider, useUser };

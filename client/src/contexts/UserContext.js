import { createContext, createElement, useContext, useEffect, useMemo, useState } from "react";
import {
  getCurrentUser,
  login as apiLogin,
  logout as apiLogout
} from "../api/auth.js";

const UserContext = createContext(null);

function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function checkAuth() {
    setLoading(true);
    try {
      setUser(await getCurrentUser());
    } finally {
      setLoading(false);
    }
  }

  async function login(credentials) {
    const loggedUser = await apiLogin(credentials);
    setUser(loggedUser);
    return loggedUser;
  }

  async function logout() {
    await apiLogout();
    setUser(null);
  }

  useEffect(() => {
    checkAuth();
  }, []);

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

function useUser() {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useUser must be used inside UserProvider");
  }

  return context;
}

export { UserProvider, useUser };

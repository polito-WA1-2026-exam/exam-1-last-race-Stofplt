import { createContext, createElement, useContext } from "react";

const UserContext = createContext(null);

function UserProvider({ children }) {
  const value = { user: null, loggedIn: false };
  return createElement(UserContext.Provider, { value }, children);
}

function useUser() {
  return useContext(UserContext);
}

export { UserProvider, useUser };
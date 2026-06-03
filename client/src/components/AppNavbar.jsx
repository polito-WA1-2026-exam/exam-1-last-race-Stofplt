import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useUser } from "../contexts/UserContext.js";
import LoginDialog from "./LoginDialog.jsx";

function AppNavbar() {
  const { loggedIn, logout, user } = useUser();
  const navigate = useNavigate();
  const [loginOpen, setLoginOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <>
      <header className="app-navbar">
        <Link className="brand-link" to="/">
          Last Race
        </Link>
        <nav className="main-nav">
          <Link to="/ranking">Ranking</Link>
        </nav>
        <div className="session-actions">
          {loggedIn ? (
            <>
              <span className="user-name">{user.name}</span>
              <button
                aria-label="Logout"
                className="nes-btn logout-button"
                onClick={handleLogout}
                title="Logout"
                type="button"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M5 3h9v2H7v14h7v2H5z" />
                  <path d="M13 7h2v3h6v4h-6v3h-2l-5-5z" />
                </svg>
              </button>
            </>
          ) : (
            <button
              className="nes-btn is-primary"
              onClick={() => setLoginOpen(true)}
              type="button"
            >
              Login
            </button>
          )}
        </div>
      </header>
      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}

export default AppNavbar;

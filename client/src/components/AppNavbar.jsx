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
      <header className="app-navbar d-flex align-items-center gap-3 px-4 py-3">
        <Link className="brand-link nes-pointer text-decoration-none" to="/">
          Last Race
        </Link>
        <nav className="d-flex align-items-center gap-3 flex-grow-1">
          <Link
            className="nav-link-pixel nes-pointer text-decoration-none"
            to="/ranking"
          >
            Ranking
          </Link>
        </nav>
        <div className="d-flex align-items-center gap-2">
          {loggedIn ? (
            <>
              <span className="user-name">{user.name}</span>
              <button
                aria-label="Logout"
                className="nes-btn nes-pointer logout-button"
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
              className="nes-btn is-primary nes-pointer"
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

import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { useUser } from "../contexts/UserContext.js";

function LoginPage() {
  const { loggedIn, login } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState("alice@example.com");
  const [password, setPassword] = useState("race-pass-1");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loggedIn) {
    return <Navigate to="/setup" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login({ username, password });
      navigate(location.state?.from?.pathname ?? "/setup", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="login-dialog nes-container is-rounded mx-auto mt-5">
      <h2 className="m-0 mb-2">Login</h2>
      {error && <p className="nes-text is-error">{error}</p>}
      <form className="d-grid gap-3" onSubmit={handleSubmit}>
        <label className="m-0" htmlFor="username">
          Email
        </label>
        <input
          autoComplete="username"
          className="nes-input mb-3"
          id="username"
          onChange={(event) => setUsername(event.target.value)}
          required
          type="email"
          value={username}
        />

        <label className="m-0" htmlFor="password">
          Password
        </label>
        <input
          autoComplete="current-password"
          className="nes-input mb-3"
          id="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />

        <button
          className="nes-btn is-primary nes-pointer mx-auto w-50"
          disabled={submitting}
          type="submit"
        >
          {submitting ? "Logging in..." : "Enter"}
        </button>
      </form>
    </section>
  );
}

export default LoginPage;

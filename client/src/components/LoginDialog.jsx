import { useState } from "react";
import { useUser } from "../contexts/UserContext.js";

function LoginDialog({ onClose, onSuccess, open }) {
  const { login } = useUser();
  const [username, setUsername] = useState("alice@example.com");
  const [password, setPassword] = useState("race-pass-1");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) {
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login({ username, password });
      onClose();
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        aria-labelledby="login-dialog-title"
        className="nes-container is-rounded login-dialog"
        role="dialog"
      >
        <div className="dialog-title-row">
          <h2 id="login-dialog-title">Login</h2>
          <button
            aria-label="Close login dialog"
            className="nes-btn is-error"
            onClick={onClose}
            type="button"
          >
            X
          </button>
        </div>
        {error && <p className="nes-text is-error">{error}</p>}
        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="username">Email</label>
          <input
            autoComplete="username"
            className="nes-input"
            id="username"
            onChange={(event) => setUsername(event.target.value)}
            required
            type="email"
            value={username}
          />

          <label htmlFor="password">Password</label>
          <input
            autoComplete="current-password"
            className="nes-input"
            id="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />

          <button className="nes-btn is-primary" disabled={submitting} type="submit">
            {submitting ? "Logging in..." : "Enter"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default LoginDialog;

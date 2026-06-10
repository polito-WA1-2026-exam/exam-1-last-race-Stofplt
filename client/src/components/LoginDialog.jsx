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
    <div
      className="dialog-backdrop d-flex align-items-center justify-content-center p-3"
      role="presentation"
    >
      <section
        aria-labelledby="login-dialog-title"
        className="nes-container is-rounded login-dialog"
        role="dialog"
      >
        <div className="d-flex align-items-center justify-content-between gap-3 mb-4">
          <h2 className="m-0" id="login-dialog-title">
            Login
          </h2>
          <button
            aria-label="Close login dialog"
            className="nes-btn is-error nes-pointer"
            onClick={onClose}
            type="button"
          >
            X
          </button>
        </div>
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
    </div>
  );
}

export default LoginDialog;

import { useState } from "react";
import { useUser } from "../contexts/UserContext.js";

// Reusable login form used by both the route page and modal dialog.
function LoginForm({ idPrefix = "login", onSuccess }) {
  const { login } = useUser();
  // Controlled credentials stay empty until the user types them.
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  // Displays authentication failures returned by the server.
  const [error, setError] = useState("");
  // Prevents duplicate login attempts while Passport responds.
  const [submitting, setSubmitting] = useState(false);

  // Delegates credential validation to the auth context and then notifies parent UI.
  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login({ username, password });
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {error && <p className="nes-text is-error">{error}</p>}
      <form className="d-grid gap-3" onSubmit={handleSubmit}>
        <label className="m-0" htmlFor={`${idPrefix}-username`}>
          Email
        </label>
        <input
          autoComplete="username"
          className="nes-input mb-3"
          id={`${idPrefix}-username`}
          onChange={(event) => setUsername(event.target.value)}
          required
          type="email"
          value={username}
        />

        <label className="m-0" htmlFor={`${idPrefix}-password`}>
          Password
        </label>
        <input
          autoComplete="current-password"
          className="nes-input mb-3"
          id={`${idPrefix}-password`}
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
    </>
  );
}

export default LoginForm;

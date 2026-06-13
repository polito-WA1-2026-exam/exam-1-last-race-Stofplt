import { useState } from "react";
import { useUser } from "../contexts/UserContext.js";

function LoginForm({ idPrefix = "login", onSuccess }) {
  const { login } = useUser();
  const [username, setUsername] = useState("ulisse@lastrace.test");
  const [password, setPassword] = useState("race-pass-1");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

import { useState } from "react";
import { Alert, Button, Form } from "react-bootstrap";
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
    <section className="auth-panel">
      <h1>Login</h1>
      {error && <Alert variant="danger">{error}</Alert>}
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3" controlId="username">
          <Form.Label>Email</Form.Label>
          <Form.Control
            autoComplete="username"
            onChange={(event) => setUsername(event.target.value)}
            required
            type="email"
            value={username}
          />
        </Form.Group>
        <Form.Group className="mb-4" controlId="password">
          <Form.Label>Password</Form.Label>
          <Form.Control
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </Form.Group>
        <Button disabled={submitting} type="submit">
          {submitting ? "Logging in..." : "Login"}
        </Button>
      </Form>
    </section>
  );
}

export default LoginPage;

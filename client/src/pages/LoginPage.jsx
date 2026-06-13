import { Navigate, useLocation, useNavigate } from "react-router";
import LoginForm from "../components/LoginForm.jsx";
import { useUser } from "../contexts/UserContext.js";

// Standalone login route, preserving the protected page that requested auth.
function LoginPage() {
  const { loggedIn } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  // ProtectedRoute stores the attempted destination in location state.
  const from = location.state?.from;
  const destination = from
    ? `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`
    : "/";

  if (loggedIn) {
    return <Navigate to={destination} replace />;
  }

  return (
    <section className="login-dialog nes-container is-rounded mx-auto mt-5">
      <h2 className="m-0 mb-2">Login</h2>
      <LoginForm
        idPrefix="login-page"
        onSuccess={() =>
          navigate(destination, {
            replace: true,
          })
        }
      />
    </section>
  );
}

export default LoginPage;

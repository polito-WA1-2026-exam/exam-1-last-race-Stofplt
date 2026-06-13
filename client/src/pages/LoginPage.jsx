import { Navigate, useLocation, useNavigate } from "react-router";
import LoginForm from "../components/LoginForm.jsx";
import { useUser } from "../contexts/UserContext.js";

function LoginPage() {
  const { loggedIn } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
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

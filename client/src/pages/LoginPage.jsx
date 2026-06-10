import { Navigate, useLocation, useNavigate } from "react-router";
import LoginForm from "../components/LoginForm.jsx";
import { useUser } from "../contexts/UserContext.js";

function LoginPage() {
  const { loggedIn } = useUser();
  const location = useLocation();
  const navigate = useNavigate();

  if (loggedIn) {
    return <Navigate to="/setup" replace />;
  }

  return (
    <section className="login-dialog nes-container is-rounded mx-auto mt-5">
      <h2 className="m-0 mb-2">Login</h2>
      <LoginForm
        idPrefix="login-page"
        onSuccess={() =>
          navigate(location.state?.from?.pathname ?? "/setup", {
            replace: true,
          })
        }
      />
    </section>
  );
}

export default LoginPage;

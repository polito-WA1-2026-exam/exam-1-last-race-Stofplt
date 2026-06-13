import { Navigate, useLocation } from "react-router";
import { Spinner } from "react-bootstrap";
import { useUser } from "../contexts/UserContext.js";

// Blocks protected pages until the session check proves the user is logged in.
function ProtectedRoute({ children }) {
  const { loggedIn, loading } = useUser();
  const location = useLocation();

  if (loading) {
    return (
      <div className="page-loader">
        <Spinner animation="border" role="status" />
      </div>
    );
  }

  if (!loggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;

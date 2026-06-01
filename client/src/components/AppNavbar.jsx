import { Button, Container, Nav, Navbar } from "react-bootstrap";
import { Link, useNavigate } from "react-router";
import { useUser } from "../contexts/UserContext.js";

function AppNavbar() {
  const { loggedIn, logout, user } = useUser();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <Navbar bg="dark" data-bs-theme="dark" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to="/">
          Last Race
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-navbar" />
        <Navbar.Collapse id="main-navbar">
          <Nav className="me-auto">
            {loggedIn && (
              <>
                <Nav.Link as={Link} to="/setup">
                  Setup
                </Nav.Link>
                <Nav.Link as={Link} to="/ranking">
                  Ranking
                </Nav.Link>
              </>
            )}
          </Nav>
          <Nav className="ms-auto align-items-lg-center gap-2">
            {loggedIn ? (
              <>
                <Navbar.Text>{user.name}</Navbar.Text>
                <Button variant="outline-light" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <Button as={Link} to="/login" variant="outline-light" size="sm">
                Login
              </Button>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default AppNavbar;

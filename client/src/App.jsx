import { Container, Nav, Navbar } from "react-bootstrap";

function App() {
  return (
    <>
      <Navbar bg="dark" data-bs-theme="dark" expand="lg">
        <Container>
          <Navbar.Brand>Last Race</Navbar.Brand>
          <Nav className="ms-auto">
            <Nav.Link disabled>Setup</Nav.Link>
            <Nav.Link disabled>Ranking</Nav.Link>
          </Nav>
        </Container>
      </Navbar>

      <main>
        <Container className="py-4">
          <h1>Last Race</h1>
          <p className="lead">Last Race.</p>
        </Container>
      </main>
    </>
  );
}

export default App;

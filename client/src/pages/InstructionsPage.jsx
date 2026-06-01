import { useEffect, useState } from "react";
import { Alert, Button, ListGroup, Spinner } from "react-bootstrap";
import { Link } from "react-router";
import { getInstructions } from "../api/api.js";
import { useUser } from "../contexts/UserContext.js";

function InstructionsPage() {
  const { loggedIn } = useUser();
  const [instructions, setInstructions] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getInstructions()
      .then((data) => {
        if (active) {
          setInstructions(data);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  if (!instructions) {
    return (
      <div className="page-loader">
        <Spinner animation="border" role="status" />
      </div>
    );
  }

  return (
    <section className="page-section">
      <h1>{instructions.title}</h1>
      <ListGroup className="mb-4">
        {instructions.rules.map((rule) => (
          <ListGroup.Item key={rule}>{rule}</ListGroup.Item>
        ))}
      </ListGroup>
      <Button as={Link} to={loggedIn ? "/setup" : "/login"} variant="primary">
        {loggedIn ? "Go to setup" : "Login"}
      </Button>
    </section>
  );
}

export default InstructionsPage;

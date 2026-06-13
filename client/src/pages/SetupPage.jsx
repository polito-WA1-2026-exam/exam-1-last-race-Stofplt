import { useEffect, useState } from "react";
import { Alert, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router";
import { createGame, getNetwork } from "../api/api.js";
import NetworkMap from "../components/NetworkMap.jsx";

// Shows the complete network before creating a server-assigned game.
function SetupPage() {
  const navigate = useNavigate();
  // Full setup network includes stations, lines, and segment SVG paths.
  const [network, setNetwork] = useState(null);
  // Surface API errors without leaving the protected setup route.
  const [error, setError] = useState("");
  // Disables Start while game creation is in flight.
  const [starting, setStarting] = useState(false);

  // Loading the network also marks the session ready for game creation.
  useEffect(() => {
    let active = true;

    getNetwork()
      .then((data) => {
        if (active) {
          setNetwork(data);
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

  // Creates a game and passes the initial assignment to Planning for fast render.
  async function handleStartGame() {
    setError("");
    setStarting(true);

    try {
      const game = await createGame();
      navigate(`/planning/${game.gameId}`, { state: game });
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  }

  if (error && !network) {
    return <Alert variant="danger">{error}</Alert>;
  }

  if (!network) {
    return (
      <div className="page-loader d-flex align-items-center">
        <Spinner animation="border" role="status" />
      </div>
    );
  }

  return (
    <section className="setup-page d-grid gap-4">
      <div className="setup-header d-flex align-items-center justify-content-between gap-3">
        <h1>Setup</h1>
      </div>
      {error && <Alert variant="danger">{error}</Alert>}
      <NetworkMap
        lines={network.lines}
        segments={network.segments}
        stations={network.stations}
      />
      <div className="setup-actions d-flex justify-content-end w-100 mx-auto">
        <button
          className="nes-btn is-success nes-pointer"
          disabled={starting}
          onClick={handleStartGame}
          type="button"
        >
          {starting ? "Starting..." : "Start"}
        </button>
      </div>
    </section>
  );
}

export default SetupPage;

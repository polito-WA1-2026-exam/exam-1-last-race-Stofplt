import { useEffect, useState } from "react";
import { Alert, Button, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router";
import { createGame, getNetwork } from "../api/api.js";
import NetworkMap from "../components/NetworkMap.jsx";
import SegmentList from "../components/SegmentList.jsx";

function SetupPage() {
  const navigate = useNavigate();
  const [network, setNetwork] = useState(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

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
      <div className="page-loader">
        <Spinner animation="border" role="status" />
      </div>
    );
  }

  return (
    <section className="setup-page">
      <div className="page-title-row">
        <h1>Setup</h1>
        <Button disabled={starting} onClick={handleStartGame}>
          {starting ? "Starting..." : "Play"}
        </Button>
      </div>
      {error && <Alert variant="danger">{error}</Alert>}
      <NetworkMap lines={network.lines} stations={network.stations} />
      <section>
        <h2>Segments</h2>
        <SegmentList
          lines={network.lines}
          segments={network.segments}
          stations={network.stations}
        />
      </section>
    </section>
  );
}

export default SetupPage;

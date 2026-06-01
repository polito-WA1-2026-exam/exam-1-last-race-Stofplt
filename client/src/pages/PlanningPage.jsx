import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Spinner } from "react-bootstrap";
import { useLocation, useNavigate, useParams } from "react-router";
import {
  getNetwork,
  getPlanningGame,
  submitRoute
} from "../api/api.js";
import RouteBuilder from "../components/RouteBuilder.jsx";
import SegmentList from "../components/SegmentList.jsx";

function PlanningPage() {
  const { gameId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [game, setGame] = useState(location.state ?? null);
  const [network, setNetwork] = useState(null);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedSegments = useMemo(() => {
    if (!network) {
      return [];
    }

    const segmentById = new Map(
      network.segments.map((segment) => [segment.id, segment])
    );

    return selectedSegmentIds
      .map((segmentId) => segmentById.get(segmentId))
      .filter(Boolean);
  }, [network, selectedSegmentIds]);

  const selectedCounts = useMemo(() => {
    const counts = new Map();

    for (const segmentId of selectedSegmentIds) {
      counts.set(segmentId, (counts.get(segmentId) ?? 0) + 1);
    }

    return counts;
  }, [selectedSegmentIds]);

  useEffect(() => {
    let active = true;

    Promise.all([getNetwork(), getPlanningGame(gameId)])
      .then(([networkData, gameData]) => {
        if (active) {
          setNetwork(networkData);
          setGame(gameData);
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
  }, [gameId]);

  function addSegment(segmentId) {
    setSelectedSegmentIds((current) => [...current, segmentId]);
  }

  function removeLastSegment() {
    setSelectedSegmentIds((current) => current.slice(0, -1));
  }

  function clearRoute() {
    setSelectedSegmentIds([]);
  }

  async function handleSubmitRoute() {
    setError("");
    setSubmitting(true);

    try {
      const result = await submitRoute(Number(gameId), selectedSegmentIds);

      if (!result.valid) {
        setError(result.reason || "The route is not valid");
        return;
      }

      navigate(`/execution/${gameId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (error && (!network || !game)) {
    return <Alert variant="danger">{error}</Alert>;
  }

  if (!network || !game) {
    return (
      <div className="page-loader">
        <Spinner animation="border" role="status" />
      </div>
    );
  }

  return (
    <section className="planning-page">
      <div className="page-title-row">
        <h1>Planning</h1>
        <Button
          disabled={selectedSegmentIds.length === 0 || submitting}
          onClick={handleSubmitRoute}
        >
          {submitting ? "Submitting..." : "Submit route"}
        </Button>
      </div>
      {error && <Alert variant="danger">{error}</Alert>}
      <dl className="planning-summary">
        <div>
          <dt>Game</dt>
          <dd>{gameId}</dd>
        </div>
        <div>
          <dt>Start</dt>
          <dd>{game.startStation.name}</dd>
        </div>
        <div>
          <dt>Destination</dt>
          <dd>{game.destinationStation.name}</dd>
        </div>
      </dl>

      <section>
        <h2>Selected route</h2>
        <RouteBuilder
          lines={network.lines}
          onClear={clearRoute}
          onRemoveLast={removeLastSegment}
          segments={selectedSegments}
          stations={network.stations}
        />
      </section>

      <section>
        <h2>Available segments</h2>
        <SegmentList
          lines={network.lines}
          onSelect={addSegment}
          selectedCounts={selectedCounts}
          segments={network.segments}
          stations={network.stations}
        />
      </section>
    </section>
  );
}

export default PlanningPage;

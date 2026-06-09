import { useEffect, useRef, useState } from "react";
import { Alert, Spinner } from "react-bootstrap";
import { useNavigate, useParams } from "react-router";
import { executeNextStep, getNetwork } from "../api/api.js";
import ExecutionMap from "../components/ExecutionMap.jsx";

function ExecutionPage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [network, setNetwork] = useState(null);
  const [error, setError] = useState("");
  const [executing, setExecuting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState(null);
  const [coins, setCoins] = useState(20);
  const [lastEvent, setLastEvent] = useState(null);
  const [executedPaths, setExecutedPaths] = useState([]);
  const [allStepsDone, setAllStepsDone] = useState(false);
  const executingRef = useRef(false);

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

  async function handleExecute() {
    if (executingRef.current || allStepsDone) {
      return;
    }

    setError("");
    setExecuting(true);
    executingRef.current = true;

    try {
      const result = await executeNextStep(gameId);

      setCoins(result.step.coins);
      setLastEvent(result.step.event);

      setExecutedPaths((current) => [
        ...current,
        {
          segmentId: result.step.segmentId,
          path: result.step.path,
          lineId: result.step.lineId,
        },
      ]);

      if (result.completed) {
        setCompleted(true);
        setScore(result.score);
        setAllStepsDone(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setExecuting(false);
      executingRef.current = false;
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
    <section className="execution-page d-grid gap-4">
      <div className="execution-header d-flex align-items-center justify-content-between gap-3">
        <h1>Route</h1>
        <div className="execution-coins nes-container is-rounded d-inline-flex align-items-center justify-content-center gap-2">
          <i className="nes-icon coin is-small" aria-hidden="true" />
          <span>{coins}</span>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <div className="execution-map-wrapper">
        <ExecutionMap
          executedPaths={executedPaths}
          lines={network.lines}
          stations={network.stations}
          allSegments={network.segments}
        />
      </div>

      <div className="execution-bottom mx-auto">
        <div className="execution-event nes-container is-rounded d-flex align-items-center justify-content-center gap-2">
          {lastEvent ? (
            <>
              <span className="execution-event-text m-0">
                {lastEvent.description}
              </span>
              <span
                className={`execution-event-effect${
                  lastEvent.effect > 0
                    ? " is-positive"
                    : lastEvent.effect < 0
                      ? " is-negative"
                      : ""
                }`}
              >
                {lastEvent.effect > 0
                  ? `+${lastEvent.effect}`
                  : lastEvent.effect}
              </span>
            </>
          ) : (
            <span className="execution-event-text m-0">
              Press Next to execute the first segment.
            </span>
          )}
        </div>
        {completed ? (
          <button
            className="nes-btn is-success nes-pointer"
            onClick={() => navigate(`/result/${gameId}`)}
            type="button"
          >
            View result
          </button>
        ) : (
          <button
            className="nes-btn is-success nes-pointer"
            disabled={executing}
            onClick={handleExecute}
            type="button"
          >
            {executing ? "Executing..." : "Next"}
          </button>
        )}
      </div>
    </section>
  );
}

export default ExecutionPage;

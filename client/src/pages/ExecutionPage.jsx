import { useEffect, useRef, useState } from "react";
import { Spinner } from "react-bootstrap";
import { useNavigate, useParams } from "react-router";
import {
  executeNextStep,
  getExecutionNetwork,
  getExecutionState,
} from "../api/api.js";
import ExecutionMap from "../components/ExecutionMap.jsx";

// Replays the submitted route one persisted game_step at a time.
function ExecutionPage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  // Execution network frames the map while executedPaths reveal the actual route.
  const [network, setNetwork] = useState(null);
  // Prevents the Next button from firing while a step request is in flight.
  const [executing, setExecuting] = useState(false);
  // Marks that the server has completed the final route step.
  const [completed, setCompleted] = useState(false);
  // Final score is returned only when the last pending step is executed.
  const [score, setScore] = useState(null);
  // Current coins are derived server-side from events already applied.
  const [coins, setCoins] = useState(20);
  // Last event drives the visible execution message.
  const [lastEvent, setLastEvent] = useState(null);
  // Each executed path is revealed on the map in route order.
  const [executedPaths, setExecutedPaths] = useState([]);
  // Only the latest segment id animates; older paths stay visible.
  const [animatedSegmentId, setAnimatedSegmentId] = useState(null);
  // Guards against asking the server for a step after completion.
  const [allStepsDone, setAllStepsDone] = useState(false);
  // Ref guard blocks rapid double-clicks before React disables the button.
  const executingRef = useRef(false);

  // Rebuilds execution state after refresh by combining network metadata and stored steps.
  useEffect(() => {
    let active = true;

    Promise.all([getExecutionNetwork(), getExecutionState(gameId)])
      .then(([networkData, execState]) => {
        if (active) {
          const executed = execState.steps.map((s) => ({
            segmentId: s.segmentId,
            path: s.path,
            lineId: s.lineId,
          }));

          setNetwork(networkData);
          setCoins(execState.coins);
          setExecutedPaths(executed);
          setAnimatedSegmentId(executed.at(-1)?.segmentId ?? null);
          setLastEvent(execState.lastEvent);
          if (execState.status === "completed") {
            setCompleted(true);
            setScore(execState.score);
            setAllStepsDone(true);
          }
        }
      })
      .catch(() => {
        if (active) navigate("/", { replace: true });
      });

    return () => {
      active = false;
    };
  }, [gameId, navigate]);

  // Requests the exact next step index so the server can reject duplicate Next calls.
  async function handleExecute() {
    if (executingRef.current || allStepsDone) {
      return;
    }

    setExecuting(true);
    executingRef.current = true;

    try {
      const result = await executeNextStep(gameId, executedPaths.length + 1);

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
      setAnimatedSegmentId(result.step.segmentId);

      if (result.completed) {
        setCompleted(true);
        setScore(result.score);
        setAllStepsDone(true);
      }
    } catch {
      navigate("/", { replace: true });
    } finally {
      setExecuting(false);
      executingRef.current = false;
    }
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

      <div className="execution-map-wrapper">
        <ExecutionMap
          animatedSegmentId={animatedSegmentId}
          executedPaths={executedPaths}
          lines={network.lines}
          stations={network.stations}
          networkSegments={network.segments}
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
            Next
          </button>
        )}
      </div>
    </section>
  );
}

export default ExecutionPage;

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Spinner } from "react-bootstrap";
import { useLocation, useNavigate, useParams } from "react-router";
import {
  getNetworkStations,
  getPlanningGame,
  getPlanningNetwork,
  submitRoute,
} from "../api/api.js";
import PlanningMap from "../components/PlanningMap.jsx";
import RouteBuilder from "../components/RouteBuilder.jsx";
import SegmentList from "../components/SegmentList.jsx";

const PLANNING_SECONDS = 90;

// Coordinates the timed route-building phase and submits the selected segment ids.
function PlanningPage() {
  const { gameId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  // Initial navigation state avoids a blank page while the server payload reloads.
  const [game, setGame] = useState(location.state ?? null);
  // Planning map uses station positions only, separate from selectable segment pairs.
  const [mapStations, setMapStations] = useState([]);
  // Reduced planning network: station names plus bidirectional segment pairs.
  const [network, setNetwork] = useState(null);
  // Ordered directed segment ids chosen by the player.
  const [selectedSegmentIds, setSelectedSegmentIds] = useState([]);
  // Disables submit controls while the server validates the route.
  const [submitting, setSubmitting] = useState(false);
  // Client-side countdown mirrors the authoritative remaining seconds from the server.
  const [timeLeft, setTimeLeft] = useState(PLANNING_SECONDS);
  // Refs keep timeout and submit callbacks reading fresh state instead of stale closures.
  const selectedSegmentIdsRef = useRef([]);
  const submittingRef = useRef(false);
  const autoSubmittedRef = useRef(false);

  // Keeps the timeout callback aligned with the latest selected route.
  useEffect(() => {
    selectedSegmentIdsRef.current = selectedSegmentIds;
  }, [selectedSegmentIds]);

  // Maps each directed segment id to its data for fast selected-route rendering.
  const segmentById = useMemo(() => {
    if (!network) {
      return new Map();
    }

    return new Map(
      network.segmentPairs
        .flatMap((pair) => pair.directions)
        .map((segment) => [segment.id, segment]),
    );
  }, [network]);

  // Expands selected ids into ordered segment objects shown in the route panel.
  const selectedSegments = useMemo(() => {
    return selectedSegmentIds
      .map((segmentId) => segmentById.get(segmentId))
      .filter(Boolean);
  }, [segmentById, selectedSegmentIds]);

  // Links each directed segment back to its physical planning pair.
  const segmentIdToPairId = useMemo(() => {
    if (!network) {
      return new Map();
    }

    const pairs = new Map();

    for (const pair of network.segmentPairs) {
      for (const direction of pair.directions) {
        pairs.set(direction.id, pair.id);
      }
    }

    return pairs;
  }, [network]);

  // Provides pair metadata when switching an already selected direction.
  const pairById = useMemo(() => {
    if (!network) {
      return new Map();
    }

    return new Map(network.segmentPairs.map((pair) => [pair.id, pair]));
  }, [network]);

  // Tracks selected physical pairs so the list can prevent duplicate pair usage.
  const selectedPairIds = useMemo(
    () =>
      new Set(
        selectedSegmentIds
          .map((segmentId) => segmentIdToPairId.get(segmentId))
          .filter(Boolean),
      ),
    [segmentIdToPairId, selectedSegmentIds],
  );

  // Stores the selected direction for each physical pair.
  const selectedSegmentIdByPairId = useMemo(() => {
    const selectedPairs = new Map();

    for (const segmentId of selectedSegmentIds) {
      const pairId = segmentIdToPairId.get(segmentId);

      if (pairId) {
        selectedPairs.set(pairId, segmentId);
      }
    }

    return selectedPairs;
  }, [segmentIdToPairId, selectedSegmentIds]);

  // Converts remaining seconds into NES progress state.
  const timePercentage = Math.ceil((timeLeft / PLANNING_SECONDS) * 100);
  const timerClass =
    timePercentage <= 20
      ? "is-error"
      : timePercentage <= 50
        ? "is-warning"
        : "is-success";

  // Loads all planning data together so the page switches from loader to ready once.
  useEffect(() => {
    let active = true;

    Promise.all([
      getPlanningNetwork(),
      getNetworkStations(),
      getPlanningGame(gameId),
    ])
      .then(([networkData, stationData, gameData]) => {
        if (active) {
          setMapStations(stationData.stations);
          setNetwork(networkData);
          setGame(gameData);
          setTimeLeft(gameData.remainingSeconds);
        }
      })
      .catch(() => {
        if (active) {
          navigate("/", { replace: true });
        }
      });

    return () => {
      active = false;
    };
  }, [gameId, navigate]);

  // Submits once; invalid routes go directly to result, valid routes enter execution.
  const submitSelectedRoute = useCallback(
    async (segmentIds = selectedSegmentIdsRef.current) => {
      if (submittingRef.current) {
        return;
      }

      setSubmitting(true);
      submittingRef.current = true;

      try {
        const result = await submitRoute(Number(gameId), segmentIds);

        if (!result.valid) {
          navigate(`/result/${gameId}`, { replace: true });
          return;
        }

        navigate(`/execution/${gameId}`);
      } catch {
        navigate("/", { replace: true });
      } finally {
        setSubmitting(false);
        submittingRef.current = false;
      }
    },
    [gameId, navigate],
  );

  /*
   * Starts the local countdown from the server-provided remaining time. The
   * timeout submits the latest ref-held route so an expired timer cannot submit
   * an older selection captured when the effect was created.
   */
  useEffect(() => {
    if (!network || !game) {
      return undefined;
    }

    const startedAt = Date.now();
    const initialSeconds = game.remainingSeconds ?? PLANNING_SECONDS;

    setTimeLeft(initialSeconds);

    const timerId = window.setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      setTimeLeft(Math.max(initialSeconds - elapsedSeconds, 0));
    }, 250);
    const timeoutId = window.setTimeout(() => {
      if (!autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        submitSelectedRoute(selectedSegmentIdsRef.current);
      }
    }, initialSeconds * 1000);

    return () => {
      window.clearInterval(timerId);
      window.clearTimeout(timeoutId);
    };
  }, [game, network, submitSelectedRoute]);

  // Toggles a physical pair by adding its current direction or removing the pair.
  function toggleSegment(pairId, segmentId) {
    setSelectedSegmentIds((current) => {
      if (current.some((id) => segmentIdToPairId.get(id) === pairId)) {
        return current.filter((id) => segmentIdToPairId.get(id) !== pairId);
      }

      return [...current, segmentId];
    });
  }

  // Replaces the selected direction while preserving the pair's route position.
  function switchSelectedDirection(segmentId) {
    const pairId = segmentIdToPairId.get(segmentId);
    const pair = pairById.get(pairId);

    if (!pair) {
      return;
    }

    const replacement = pair.directions.find(
      (direction) => direction.id !== segmentId,
    );

    if (!replacement) {
      return;
    }

    setSelectedSegmentIds((current) =>
      current.map((id) => (id === segmentId ? replacement.id : id)),
    );
  }

  // Removes a single directed segment from the planned order.
  function removeSelectedSegment(segmentId) {
    setSelectedSegmentIds((current) =>
      current.filter((id) => id !== segmentId),
    );
  }

  // Clears all planned segments without touching timer or assignment state.
  function clearRoute() {
    setSelectedSegmentIds([]);
  }

  if (!network || !game) {
    return (
      <div className="page-loader d-flex align-items-center">
        <Spinner animation="border" role="status" />
      </div>
    );
  }

  return (
    <section className="planning-page container-fluid py-4">
      <div className="d-flex align-items-center justify-content-between gap-3 mb-3">
        <h1 className="mb-0">Planning</h1>
      </div>

      <div className="planning-board">
        <section className="planning-segments-panel">
          <div className="planning-labeled-block">
            <h2 className="planning-panel-heading m-0">Map</h2>
            <PlanningMap
              destinationStationId={game.destinationStation.id}
              startStationId={game.startStation.id}
              stations={mapStations}
            />
          </div>
          <div className="planning-labeled-block">
            <h2 className="planning-panel-heading mt-4">Available segments</h2>
            <SegmentList
              onSwitchSelected={switchSelectedDirection}
              onToggle={toggleSegment}
              selectedSegmentIdByPairId={selectedSegmentIdByPairId}
              selectedPairIds={selectedPairIds}
              segmentPairs={network.segmentPairs}
              stations={network.stations}
            />
          </div>
        </section>

        <aside className="planning-route-panel">
          <div className="planning-status-row">
            <div className="planning-labeled-block planning-status-block">
              <h2 className="planning-panel-heading m-0">Timer</h2>
              <div className="planning-timer nes-container is-rounded d-inline-flex align-items-center gap-3">
                <progress
                  className={`nes-progress ${timerClass}`}
                  max="100"
                  value={timePercentage}
                />
                <span>{timeLeft}s</span>
              </div>
            </div>
            <div className="planning-labeled-block planning-status-block">
              <h2 className="planning-panel-heading m-0">Coins</h2>
              <div className="planning-coins nes-container is-rounded d-inline-flex align-items-center justify-content-center gap-2">
                <i className="nes-icon coin is-small" aria-hidden="true" />
                <span>20</span>
              </div>
            </div>
          </div>
          <div className="planning-labeled-block planning-route-block mt-4">
            <h2 className="planning-panel-heading m-0">Selected route</h2>
            <RouteBuilder
              onClear={clearRoute}
              onRemoveSegment={removeSelectedSegment}
              onSubmit={() => submitSelectedRoute(selectedSegmentIds)}
              segments={selectedSegments}
              stations={network.stations}
              submitting={submitting}
            />
          </div>
        </aside>
      </div>
    </section>
  );
}

export default PlanningPage;

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

function PlanningPage() {
  const { gameId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [game, setGame] = useState(location.state ?? null);
  const [mapStations, setMapStations] = useState([]);
  const [network, setNetwork] = useState(null);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(PLANNING_SECONDS);
  const selectedSegmentIdsRef = useRef([]);
  const submittingRef = useRef(false);
  const autoSubmittedRef = useRef(false);

  useEffect(() => {
    selectedSegmentIdsRef.current = selectedSegmentIds;
  }, [selectedSegmentIds]);

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

  const selectedSegments = useMemo(() => {
    return selectedSegmentIds
      .map((segmentId) => segmentById.get(segmentId))
      .filter(Boolean);
  }, [segmentById, selectedSegmentIds]);

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
  const pairById = useMemo(() => {
    if (!network) {
      return new Map();
    }

    return new Map(network.segmentPairs.map((pair) => [pair.id, pair]));
  }, [network]);

  const selectedPairIds = useMemo(
    () =>
      new Set(
        selectedSegmentIds
          .map((segmentId) => segmentIdToPairId.get(segmentId))
          .filter(Boolean),
      ),
    [segmentIdToPairId, selectedSegmentIds],
  );
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
  const timePercentage = Math.ceil((timeLeft / PLANNING_SECONDS) * 100);
  const timerClass =
    timePercentage <= 20
      ? "is-error"
      : timePercentage <= 50
        ? "is-warning"
        : "is-success";

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

  function toggleSegment(pairId, segmentId) {
    setSelectedSegmentIds((current) => {
      if (current.some((id) => segmentIdToPairId.get(id) === pairId)) {
        return current.filter((id) => segmentIdToPairId.get(id) !== pairId);
      }

      return [...current, segmentId];
    });
  }

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

  function removeSelectedSegment(segmentId) {
    setSelectedSegmentIds((current) =>
      current.filter((id) => id !== segmentId),
    );
  }

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

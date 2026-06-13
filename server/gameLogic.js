const PLANNING_TIME_LIMIT_MS = 90_000;

const DEBUG_FIXED_ROUTE = false;
const FIXED_START_ID = 1;
const FIXED_DEST_ID = 10;

// Builds a directed adjacency list because route distance depends on segment direction.
function buildAdjacency(segments) {
  const adjacency = new Map();

  for (const segment of segments) {
    const outgoing = adjacency.get(segment.fromStationId) ?? [];
    outgoing.push(segment.toStationId);
    adjacency.set(segment.fromStationId, outgoing);
  }

  return adjacency;
}

// Computes the fewest directed segments from a station with a plain BFS.
function computeDistances(startStationId, segments) {
  const adjacency = buildAdjacency(segments);
  const distances = new Map([[startStationId, 0]]);
  const queue = [startStationId];

  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    const currentDistance = distances.get(current);

    for (const next of adjacency.get(current) ?? []) {
      if (!distances.has(next)) {
        distances.set(next, currentDistance + 1);
        queue.push(next);
      }
    }
  }

  return distances;
}

// Picks a uniformly random item from a non-empty candidate list.
function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

// Selects a reachable start/destination pair at least minDistance segments apart.
function pickStartAndDestination(stations, segments, minDistance = 3) {
  if (DEBUG_FIXED_ROUTE) {
    const start = stations.find((s) => s.id === FIXED_START_ID);
    const dest = stations.find((s) => s.id === FIXED_DEST_ID);
    if (start && dest) {
      return { startStation: start, destinationStation: dest };
    }
  }

  const validPairs = [];

  for (const startStation of stations) {
    const distances = computeDistances(startStation.id, segments);

    for (const destinationStation of stations) {
      const distance = distances.get(destinationStation.id);

      if (distance !== undefined && distance >= minDistance) {
        validPairs.push({ startStation, destinationStation });
      }
    }
  }

  if (validPairs.length === 0) {
    throw new Error(
      "The network does not contain valid start/destination pairs",
    );
  }

  return pickRandom(validPairs);
}

// Sends only the game id and assigned stations needed by the client.
function buildGameStartPayload(gameId, pair) {
  return {
    gameId,
    startStation: {
      id: pair.startStation.id,
      name: pair.startStation.name,
    },
    destinationStation: {
      id: pair.destinationStation.id,
      name: pair.destinationStation.name,
    },
  };
}

// Validates the planned route against the server-side game assignment.
function validateRoute(game, selectedSegments, interchangeStationIds) {
  if (selectedSegments.length === 0) {
    return { valid: false, reason: "The route is empty" };
  }

  if (selectedSegments.some((segment) => !segment)) {
    return { valid: false, reason: "The route contains an unknown segment" };
  }

  /*
   * Segment ids are directed, but the rule bans reusing the same physical
   * connection in either direction. Sorting the station ids gives A-B and B-A
   * the same key while preserving the directed ids for continuity checks below.
   */
  const usedPhysicalSegments = new Set();

  for (const segment of selectedSegments) {
    const from = Math.min(segment.fromStationId, segment.toStationId);
    const to = Math.max(segment.fromStationId, segment.toStationId);
    const physicalSegmentKey = `${from}-${to}`;

    if (usedPhysicalSegments.has(physicalSegmentKey)) {
      return { valid: false, reason: "The route reuses a segment" };
    }

    usedPhysicalSegments.add(physicalSegmentKey);
  }

  if (selectedSegments[0].fromStationId !== game.start_station_id) {
    return {
      valid: false,
      reason: "The route does not start from the assigned station",
    };
  }

  for (let i = 0; i < selectedSegments.length - 1; i++) {
    const current = selectedSegments[i];
    const next = selectedSegments[i + 1];

    if (current.toStationId !== next.fromStationId) {
      return {
        valid: false,
        reason: "The route contains non-consecutive segments",
      };
    }

    /*
     * Consecutive segments prove the train reaches the next station; this
     * separate line-id check enforces that changing line is legal only at an
     * interchange station.
     */
    if (
      current.lineId !== next.lineId &&
      !interchangeStationIds.has(current.toStationId)
    ) {
      return {
        valid: false,
        reason: "Line change outside interchange station",
      };
    }
  }

  if (
    selectedSegments[selectedSegments.length - 1].toStationId !==
    game.destination_station_id
  ) {
    return {
      valid: false,
      reason: "The route does not reach the assigned destination",
    };
  }

  return { valid: true };
}

// Treats missing session timing as expired, so refresh gaps cannot extend planning.
function hasPlanningTimeExpired(startedAt, now = Date.now()) {
  return !startedAt || now - startedAt > PLANNING_TIME_LIMIT_MS;
}

// Replays executed events from the initial 20 coins to build the result payload.
function buildResultPayload(game, steps) {
  let coins = 20;

  return {
    gameId: game.id,
    status: game.status,
    score: game.final_score,
    startStation: {
      id: game.start_station_id,
      name: game.start_station_name,
    },
    destinationStation: {
      id: game.destination_station_id,
      name: game.destination_station_name,
    },
    steps: steps.map((step) => {
      if (step.event_effect !== null) {
        coins += step.event_effect;
      }

      return {
        index: step.step_index,
        segmentId: step.segment_id,
        fromStation: step.from_station_name,
        toStation: step.to_station_name,
        line: step.line_name,
        event:
          step.event_effect === null
            ? null
            : {
                description: step.event_description,
                effect: step.event_effect,
              },
        coins: step.event_effect === null ? null : coins,
      };
    }),
  };
}

export {
  PLANNING_TIME_LIMIT_MS,
  pickStartAndDestination,
  buildGameStartPayload,
  validateRoute,
  hasPlanningTimeExpired,
  buildResultPayload,
};

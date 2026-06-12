const PLANNING_TIME_LIMIT_MS = 90_000;

// ┌─────────────────────────────────────────────────────────┐
// │ DEBUG: metti a true per avere sempre la stessa tratta. │
// └─────────────────────────────────────────────────────────┘
const DEBUG_FIXED_ROUTE = false;
const FIXED_START_ID = 1; // Shady Grove
const FIXED_DEST_ID = 10; // Waterfront

function buildAdjacency(segments) {
  const adjacency = new Map();

  for (const segment of segments) {
    const outgoing = adjacency.get(segment.fromStationId) ?? [];
    outgoing.push(segment.toStationId);
    adjacency.set(segment.fromStationId, outgoing);
  }

  return adjacency;
}

function computeDistances(startStationId, segments) {
  const adjacency = buildAdjacency(segments);
  const distances = new Map([[startStationId, 0]]);
  const queue = [startStationId];

  // BFS is enough here because every segment counts as one stop.
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

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

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

function validateRoute(game, selectedSegments, interchangeStationIds) {
  if (selectedSegments.length === 0) {
    return { valid: false, reason: "The route is empty" };
  }

  if (selectedSegments.some((segment) => !segment)) {
    return { valid: false, reason: "The route contains an unknown segment" };
  }

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

    // With the current segment model this is mostly guaranteed by consecutive
    // segments, but keeping the check makes the interchange rule explicit.
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

function hasPlanningTimeExpired(startedAt, now = Date.now()) {
  return !startedAt || now - startedAt > PLANNING_TIME_LIMIT_MS;
}

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

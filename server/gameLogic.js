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
    throw new Error("The network does not contain valid start/destination pairs");
  }

  return pickRandom(validPairs);
}

function buildGameStartPayload(gameId, pair) {
  return {
    gameId,
    startStation: {
      id: pair.startStation.id,
      name: pair.startStation.name
    },
    destinationStation: {
      id: pair.destinationStation.id,
      name: pair.destinationStation.name
    }
  };
}

export { pickStartAndDestination, buildGameStartPayload };

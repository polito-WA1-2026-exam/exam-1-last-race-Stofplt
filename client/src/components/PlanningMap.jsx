const MAP_PADDING = 60;
const STATION_SIZE = 8;
const HIGHLIGHT_SIZE = 14;
const LABEL_OFFSET_X = 10;
const LABEL_RAISE_Y = -11;
const LABEL_LOWER_Y = 11;

function buildViewBox(stations) {
  if (stations.length === 0) {
    return "0 0 800 600";
  }

  const xs = stations.map((station) => station.x);
  const ys = stations.map((station) => station.y);
  const minX = Math.min(...xs) - MAP_PADDING;
  const minY = Math.min(...ys) - MAP_PADDING;
  const maxX = Math.max(...xs) + MAP_PADDING;
  const maxY = Math.max(...ys) + MAP_PADDING;

  return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
}

function getLabelOffsetByStation(stations) {
  const stationsByY = new Map();

  stations.forEach((station) => {
    const row = stationsByY.get(station.y) ?? [];
    row.push(station);
    stationsByY.set(station.y, row);
  });

  const offsetByStation = new Map();

  stationsByY.forEach((row) => {
    row
      .sort((first, second) => first.x - second.x)
      .forEach((station, index) => {
        offsetByStation.set(
          station.id,
          index % 2 === 0 ? LABEL_LOWER_Y : LABEL_RAISE_Y,
        );
      });
  });

  return offsetByStation;
}

function PlanningMap({ destinationStationId, startStationId, stations = [] }) {
  const labelOffsetByStation = getLabelOffsetByStation(stations);

  function getStationClass(stationId) {
    if (stationId === startStationId) {
      return "planning-map-station is-start";
    }
    if (stationId === destinationStationId) {
      return "planning-map-station is-destination";
    }

    return "planning-map-station";
  }

  function getStationSize(stationId) {
    return stationId === startStationId || stationId === destinationStationId
      ? HIGHLIGHT_SIZE
      : STATION_SIZE;
  }

  return (
    <div className="planning-map-panel nes-container is-rounded">
      <svg
        aria-label="Planning network map"
        className="planning-map"
        role="img"
        viewBox="100 60 660 490"
      >
        <g className="planning-map-stations">
          {stations.map((station) => {
            const size = getStationSize(station.id);
            const labelY =
              station.y +
              (labelOffsetByStation.get(station.id) ?? LABEL_LOWER_Y);

            return (
              <g className="planning-map-marker" key={station.id}>
                <rect
                  className={getStationClass(station.id)}
                  height={size}
                  width={size}
                  x={station.x - size / 2}
                  y={station.y - size / 2}
                />
                <text
                  className="planning-map-label"
                  dominantBaseline="middle"
                  textAnchor="start"
                  x={station.x + LABEL_OFFSET_X}
                  y={labelY}
                >
                  {station.name}
                </text>
                {station.id === startStationId && (
                  <text
                    className="planning-map-tag is-start"
                    dominantBaseline="middle"
                    textAnchor="start"
                    x={station.x + LABEL_OFFSET_X}
                    y={labelY + 12}
                  >
                    START
                  </text>
                )}
                {station.id === destinationStationId && (
                  <text
                    className="planning-map-tag is-destination"
                    dominantBaseline="middle"
                    textAnchor="start"
                    x={station.x + LABEL_OFFSET_X}
                    y={labelY + 12}
                  >
                    FINISH
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

export default PlanningMap;

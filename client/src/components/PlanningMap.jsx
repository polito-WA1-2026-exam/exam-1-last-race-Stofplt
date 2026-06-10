import {
  LABEL_LOWER_Y,
  LABEL_OFFSET_X,
  STATION_SIZE,
  getLabelOffsetByStation,
} from "./mapUtils.js";

const HIGHLIGHT_SIZE = 14;

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

function RouteBuilder({
  lines = [],
  onClear,
  onRemoveLast,
  segments = [],
  stations = []
}) {
  const stationById = new Map(stations.map((station) => [station.id, station]));
  const lineById = new Map(lines.map((line) => [line.id, line]));

  if (segments.length === 0) {
    return (
      <div className="route-builder empty-route">
        <p className="mb-0">Select segments from the list below.</p>
      </div>
    );
  }

  return (
    <div className="route-builder">
      <ol className="route-steps">
        {segments.map((segment, index) => (
          <li key={`${segment.id}-${index}`}>
            <span className="segment-id">#{segment.id}</span>
            <span>
              {stationById.get(segment.fromStationId)?.name ?? segment.fromStationId}
            </span>
            <span aria-hidden="true">{"->"}</span>
            <span>
              {stationById.get(segment.toStationId)?.name ?? segment.toStationId}
            </span>
            <span className="segment-line">
              {lineById.get(segment.lineId)?.name ?? segment.lineId}
            </span>
          </li>
        ))}
      </ol>
      <div className="route-actions">
        <button onClick={onRemoveLast} type="button">
          Remove last
        </button>
        <button onClick={onClear} type="button">
          Clear
        </button>
      </div>
    </div>
  );
}

export default RouteBuilder;

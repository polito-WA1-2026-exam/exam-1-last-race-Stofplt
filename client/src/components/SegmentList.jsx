function SegmentList({ lines = [], segments = [], stations = [] }) {
  const stationById = new Map(stations.map((station) => [station.id, station]));
  const lineById = new Map(lines.map((line) => [line.id, line]));

  return (
    <div className="segment-list">
      {segments.map((segment) => (
        <div className="segment-row" key={segment.id}>
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
        </div>
      ))}
    </div>
  );
}

export default SegmentList;

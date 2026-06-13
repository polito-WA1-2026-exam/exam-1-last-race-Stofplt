// Renders the ordered route and exposes clear/remove/submit actions.
function RouteBuilder({
  onClear,
  onRemoveSegment,
  onSubmit,
  segments = [],
  submitting = false,
  stations = []
}) {
  // Resolves station names locally so the server receives only segment ids.
  const stationById = new Map(stations.map((station) => [station.id, station]));

  return (
    <div
      className={`route-builder nes-container is-rounded${
        segments.length === 0 ? " empty-route" : ""
      }`}
    >
      {segments.length === 0 ? (
        <p>Select segments from the list.</p>
      ) : (
        <ol className="route-steps">
          {segments.map((segment, index) => (
            <li
              className="route-step-item nes-container is-rounded d-grid align-items-center"
              key={`${segment.id}-${index}`}
            >
              <span className="route-step-index">{index + 1}</span>
              <div className="route-step-content">
                <span>
                  {stationById.get(segment.fromStationId)?.name ??
                    segment.fromStationId}{" "}
                  {"->"}{" "}
                  {stationById.get(segment.toStationId)?.name ??
                    segment.toStationId}
                </span>
              </div>
              <button
                aria-label="Remove selected segment"
                className="nes-btn is-error nes-pointer route-remove-button"
                onClick={() => onRemoveSegment(segment.id)}
                type="button"
              >
                <i className="nes-icon close is-small" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
      )}
      <div className="d-grid gap-3 route-actions">
        <button
          className="nes-btn is-error nes-pointer"
          disabled={segments.length === 0 || submitting}
          onClick={onClear}
          type="button"
        >
          Clear
        </button>
        <button
          className="nes-btn is-success nes-pointer"
          disabled={submitting}
          onClick={onSubmit}
          type="button"
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </div>
    </div>
  );
}

export default RouteBuilder;

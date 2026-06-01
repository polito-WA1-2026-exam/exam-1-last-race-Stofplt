function NetworkMap({ lines = [], stations = [] }) {
  return (
    <div className="network-summary">
      <section>
        <h2>Lines</h2>
        <div className="line-list">
          {lines.map((line) => (
            <span className="line-chip" key={line.id}>
              <span
                aria-hidden="true"
                className="line-swatch"
                style={{ backgroundColor: line.color }}
              />
              {line.name}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h2>Stations</h2>
        <div className="station-grid">
          {stations.map((station) => (
            <span key={station.id}>{station.name}</span>
          ))}
        </div>
      </section>
    </div>
  );
}

export default NetworkMap;

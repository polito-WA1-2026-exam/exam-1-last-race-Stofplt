import { useState } from "react";

// CSS-drawn icon keeps the direction switch consistent with the pixel UI.
function PixelSwapIcon() {
  return (
    <span className="pixel-swap-icon" aria-hidden="true">
      <span className="swap-arrow swap-arrow-top" />
      <span className="swap-arrow swap-arrow-bottom" />
    </span>
  );
}

// Lists physical station pairs while letting the player choose one direction.
function SegmentList({
  onSwitchSelected,
  onToggle,
  selectedSegmentIdByPairId = new Map(),
  selectedPairIds = new Set(),
  segmentPairs = [],
  stations = []
}) {
  // Station lookup keeps labels readable without changing the selected payload.
  const stationById = new Map(stations.map((station) => [station.id, station]));
  // Tracks unselected pairs currently shown in reverse direction.
  const [reversedPairIds, setReversedPairIds] = useState(new Set());

  // Returns the direction currently represented by a physical pair button.
  function getDirection(pair) {
    const forward =
      pair.directions.find(
        (direction) =>
          direction.fromStationId === pair.stationAId &&
          direction.toStationId === pair.stationBId
      ) ?? pair.directions[0];
    const reverse =
      pair.directions.find(
        (direction) =>
          direction.fromStationId === pair.stationBId &&
          direction.toStationId === pair.stationAId
      ) ?? pair.directions[1] ?? forward;

    return reversedPairIds.has(pair.id) ? reverse : forward;
  }

  // Switches either local display direction or the already selected route step.
  function switchDirection(pair, selectedSegmentId) {
    if (selectedSegmentId) {
      onSwitchSelected(selectedSegmentId);
      return;
    }

    setReversedPairIds((current) => {
      const next = new Set(current);

      if (next.has(pair.id)) {
        next.delete(pair.id);
      } else {
        next.add(pair.id);
      }

      return next;
    });
  }

  return (
    <div className="planning-segment-container nes-container is-rounded">
      <div className="planning-segment-grid">
        {segmentPairs.map((pair) => {
          const selected = selectedPairIds.has(pair.id);
          const selectedSegmentId = selectedSegmentIdByPairId.get(pair.id);
          const direction = selectedSegmentId
            ? pair.directions.find(
                (currentDirection) => currentDirection.id === selectedSegmentId
              ) ?? getDirection(pair)
            : getDirection(pair);
          const fromName =
            stationById.get(direction.fromStationId)?.name ??
            direction.fromStationId;
          const toName =
            stationById.get(direction.toStationId)?.name ??
            direction.toStationId;

          return (
            <div
              className={`segment-control-group${
                selected ? " is-selected" : ""
              }`}
              key={pair.id}
              role="group"
            >
              <button
                className={`nes-btn nes-pointer segment-toggle-button${
                  selected ? " is-primary" : ""
                }`}
                onClick={() => onToggle(pair.id, direction.id)}
                type="button"
              >
                <span>
                  {fromName} {"->"} {toName}
                </span>
              </button>
              <button
                aria-label={`Switch ${fromName} and ${toName}`}
                className="nes-btn nes-pointer segment-switch-button"
                onClick={() => switchDirection(pair, selectedSegmentId)}
                type="button"
              >
                <PixelSwapIcon />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SegmentList;

import { useEffect, useMemo, useRef } from "react";

const SVG_NS = "http://www.w3.org/2000/svg";
const PIXEL_STEP = 3;
const PIXEL_SIZE = 4;
const SHADOW_OFFSET = 1.2;
const DRAW_DURATION = 3000;
const HOLD_AT_START = 200;
const MAP_PADDING = 60;
const LABEL_OFFSET_X = 10;
const LABEL_RAISE_Y = -11;
const LABEL_LOWER_Y = 11;
const STATION_SIZE = 8;
const INTERCHANGE_SIZE = 12;

function svgEl(tag, attributes = {}) {
  const element = document.createElementNS(SVG_NS, tag);

  Object.entries(attributes).forEach(([name, value]) => {
    element.setAttribute(name, value);
  });

  return element;
}

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

function dedupePhysicalSegments(segments) {
  const seen = new Set();

  return segments.filter((segment) => {
    const key = `${segment.lineId}:${segment.path}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getStationLineIds(stations, segments) {
  const lineIdsByStation = new Map(
    stations.map((station) => [station.id, new Set()])
  );

  segments.forEach((segment) => {
    lineIdsByStation.get(segment.fromStationId)?.add(segment.lineId);
    lineIdsByStation.get(segment.toStationId)?.add(segment.lineId);
  });

  return lineIdsByStation;
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
          index % 2 === 0 ? LABEL_LOWER_Y : LABEL_RAISE_Y
        );
      });
  });

  return offsetByStation;
}

function NetworkMap({ lines = [], segments = [], stations = [] }) {
  const svgRef = useRef(null);
  const physicalSegments = useMemo(
    () => dedupePhysicalSegments(segments),
    [segments]
  );
  const stationLineIds = useMemo(
    () => getStationLineIds(stations, segments),
    [stations, segments]
  );
  const lineById = useMemo(
    () => new Map(lines.map((line) => [line.id, line])),
    [lines]
  );
  const labelOffsetByStation = useMemo(
    () => getLabelOffsetByStation(stations),
    [stations]
  );
  const viewBox = useMemo(() => buildViewBox(stations), [stations]);

  useEffect(() => {
    const svg = svgRef.current;

    if (!svg) {
      return undefined;
    }

    const state = {
      annotations: [],
      lineLengths: new Map(),
      pixels: [],
      revealByStation: new Map()
    };
    const frame = { id: null };

    function addReveal(stationId, lineId, distance) {
      if (!state.revealByStation.has(stationId)) {
        state.revealByStation.set(stationId, []);
      }

      state.revealByStation.get(stationId).push({ lineId, distance });
    }

    function buildPixel(point, lineId, distance, color, isShadow, pixelLayer) {
      const offset = isShadow ? SHADOW_OFFSET : 0;
      const pixel = svgEl("rect", {
        class: isShadow ? "metro-pixel-shadow" : "metro-pixel",
        fill: color,
        height: PIXEL_SIZE,
        width: PIXEL_SIZE,
        x: point.x - PIXEL_SIZE / 2 + offset,
        y: point.y - PIXEL_SIZE / 2 + offset
      });

      pixelLayer.appendChild(pixel);
      state.pixels.push({ distance, element: pixel, lineId });
    }

    function buildPixels(path, lineId, color, offset, length, pixelLayer) {
      for (let distance = 0; distance <= length; distance += PIXEL_STEP) {
        const point = path.getPointAtLength(distance);
        const totalDistance = offset + distance;

        buildPixel(point, lineId, totalDistance, "#000000", true, pixelLayer);
        buildPixel(point, lineId, totalDistance, color, false, pixelLayer);
      }
    }

    function buildMarker(station, annotationLayer) {
      const lineIds = stationLineIds.get(station.id) ?? new Set();
      const isInterchange = lineIds.size > 1;
      const marker = svgEl("g", {
        class: "station-marker",
        tabindex: "0"
      });
      const size = isInterchange ? INTERCHANGE_SIZE : STATION_SIZE;
      const point = svgEl("rect", {
        class: isInterchange ? "interchange" : "station",
        height: size,
        width: size,
        x: station.x - size / 2,
        y: station.y - size / 2
      });

      if (!isInterchange && lineIds.size === 1) {
        const [lineId] = lineIds;
        point.setAttribute("stroke", lineById.get(lineId)?.color ?? "#f7f7f2");
      }

      const text = svgEl("text", {
        class: "label",
        x: station.x + LABEL_OFFSET_X,
        y: station.y + (labelOffsetByStation.get(station.id) ?? LABEL_LOWER_Y),
        "dominant-baseline": "middle",
        "text-anchor": "start"
      });

      text.textContent = station.name;
      marker.append(point, text);
      annotationLayer.appendChild(marker);
      state.annotations.push({ element: marker, stationId: station.id });
    }

    function buildLine(line, sourceLayer, pixelLayer) {
      const lineSegments = physicalSegments.filter(
        (segment) => segment.lineId === line.id
      );
      let offset = 0;

      lineSegments.forEach((segment) => {
        const path = svgEl("path", {
          class: "source-line",
          d: segment.path,
          stroke: line.color
        });

        sourceLayer.appendChild(path);

        const length = path.getTotalLength();

        addReveal(segment.fromStationId, line.id, offset);
        addReveal(segment.toStationId, line.id, offset + length);
        buildPixels(path, line.id, line.color, offset, length, pixelLayer);

        offset += length;
      });

      state.lineLengths.set(line.id, offset);
    }

    function updateAnnotations(lineProgress) {
      state.annotations.forEach(({ element, stationId }) => {
        const reveals = state.revealByStation.get(stationId) ?? [];
        const isVisible = reveals.some(
          ({ lineId, distance }) => lineProgress.get(lineId) >= distance
        );

        element.classList.toggle("is-visible", isVisible);
      });
    }

    function updatePixels(lineProgress) {
      state.pixels.forEach(({ distance, element, lineId }) => {
        element.classList.toggle("is-visible", lineProgress.get(lineId) >= distance);
      });
    }

    function animate(startTime) {
      frame.startTime ??= startTime;

      const elapsed = startTime - frame.startTime;
      const progress = Math.min(
        Math.max((elapsed - HOLD_AT_START) / DRAW_DURATION, 0),
        1
      );
      const lineProgress = new Map();

      state.lineLengths.forEach((length, lineId) => {
        lineProgress.set(lineId, length * progress);
      });

      updatePixels(lineProgress);
      updateAnnotations(lineProgress);

      if (progress < 1) {
        frame.id = requestAnimationFrame(animate);
      }
    }

    svg.setAttribute("viewBox", viewBox);
    svg.replaceChildren();

    const sourceLayer = svgEl("g", { class: "source-lines" });
    const pixelLayer = svgEl("g", { class: "pixel-lines" });
    const annotationLayer = svgEl("g", { class: "map-annotations" });

    svg.append(sourceLayer, pixelLayer, annotationLayer);
    lines.forEach((line) => buildLine(line, sourceLayer, pixelLayer));
    stations.forEach((station) => buildMarker(station, annotationLayer));

    frame.id = requestAnimationFrame(animate);

    return () => {
      if (frame.id !== null) {
        cancelAnimationFrame(frame.id);
      }
      svg.replaceChildren();
    };
  }, [
    labelOffsetByStation,
    lineById,
    lines,
    physicalSegments,
    stationLineIds,
    stations,
    viewBox
  ]);

  return (
    <div className="metro-map-panel">
      <svg
        ref={svgRef}
        aria-label="Full underground network map"
        className="metro-map"
        role="img"
        xmlns={SVG_NS}
      />
    </div>
  );
}

export default NetworkMap;

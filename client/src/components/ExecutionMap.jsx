import { useEffect, useMemo, useRef } from "react";

const SVG_NS = "http://www.w3.org/2000/svg";
const PIXEL_STEP = 3;
const PIXEL_SIZE = 4;
const SHADOW_OFFSET = 1.2;
const DRAW_DURATION = 500;
const HOLD_AT_START = 0;
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

  const xs = stations.map((s) => s.x);
  const ys = stations.map((s) => s.y);
  const minX = Math.min(...xs) - MAP_PADDING;
  const minY = Math.min(...ys) - MAP_PADDING;
  const maxX = Math.max(...xs) + MAP_PADDING;
  const maxY = Math.max(...ys) + MAP_PADDING;

  return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
}

function getStationLineIds(stations, segments) {
  const lineIdsByStation = new Map(stations.map((s) => [s.id, new Set()]));

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
      .sort((a, b) => a.x - b.x)
      .forEach((station, index) => {
        offsetByStation.set(
          station.id,
          index % 2 === 0 ? LABEL_LOWER_Y : LABEL_RAISE_Y,
        );
      });
  });

  return offsetByStation;
}

function ExecutionMap({
  animatedSegmentId = null,
  executedPaths = [],
  lines = [],
  stations = [],
  networkSegments = [],
}) {
  const svgRef = useRef(null);

  const lineById = useMemo(() => new Map(lines.map((l) => [l.id, l])), [lines]);
  const labelOffsetByStation = useMemo(
    () => getLabelOffsetByStation(stations),
    [stations],
  );
  const viewBox = useMemo(() => buildViewBox(stations), [stations]);

  const executedSegments = useMemo(
    () => executedPaths.filter((segment) => segment.path),
    [executedPaths],
  );

  const stationLineIds = useMemo(
    () => getStationLineIds(stations, networkSegments),
    [stations, networkSegments],
  );

  useEffect(() => {
    const svg = svgRef.current;

    if (!svg) {
      return undefined;
    }

    const state = {
      annotations: [],
      pixels: [],
    };
    const frame = { id: null };
    const hasAnimatedSegment = executedSegments.some(
      (segment) => segment.segmentId === animatedSegmentId,
    );

    function buildMarker(station, annotationLayer) {
      const lineIds = stationLineIds.get(station.id) ?? new Set();
      const isInterchange = lineIds.size > 1;
      const marker = svgEl("g", {
        class: "station-marker is-visible",
        tabindex: "0",
      });
      const size = isInterchange ? INTERCHANGE_SIZE : STATION_SIZE;
      const point = svgEl("rect", {
        class: isInterchange ? "interchange" : "station",
        height: size,
        width: size,
        x: station.x - size / 2,
        y: station.y - size / 2,
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
        "text-anchor": "start",
      });

      text.textContent = station.name;
      marker.append(point, text);
      annotationLayer.appendChild(marker);
      state.annotations.push({ element: marker, stationId: station.id });
    }

    function buildLine(line, sourceLayer, pixelLayer) {
      const lineSegments = executedSegments.filter(
        (segment) => segment.lineId === line.id,
      );

      lineSegments.forEach((segment) => {
        const pathEl = svgEl("path", {
          class: "source-line",
          d: segment.path,
          stroke: line.color,
        });

        sourceLayer.appendChild(pathEl);

        const length = pathEl.getTotalLength();
        const shouldAnimate = segment.segmentId === animatedSegmentId;

        for (let distance = 0; distance <= length; distance += PIXEL_STEP) {
          const point = pathEl.getPointAtLength(distance);

          const shadowPixel = svgEl("rect", {
            class: "metro-pixel-shadow",
            fill: "#000000",
            height: PIXEL_SIZE,
            width: PIXEL_SIZE,
            x: point.x - PIXEL_SIZE / 2 + SHADOW_OFFSET,
            y: point.y - PIXEL_SIZE / 2 + SHADOW_OFFSET,
          });

          if (!shouldAnimate) {
            shadowPixel.classList.add("is-visible");
          }

          pixelLayer.appendChild(shadowPixel);
          state.pixels.push({
            distance,
            element: shadowPixel,
            segmentLength: length,
          });

          const colorPixel = svgEl("rect", {
            class: "metro-pixel",
            fill: line.color,
            height: PIXEL_SIZE,
            width: PIXEL_SIZE,
            x: point.x - PIXEL_SIZE / 2,
            y: point.y - PIXEL_SIZE / 2,
          });

          if (!shouldAnimate) {
            colorPixel.classList.add("is-visible");
          }

          pixelLayer.appendChild(colorPixel);
          state.pixels.push({
            distance,
            element: colorPixel,
            segmentLength: length,
          });
        }
      });
    }

    function animate(startTime) {
      frame.startTime ??= startTime;

      const elapsed = startTime - frame.startTime;
      const progress = Math.min(
        Math.max((elapsed - HOLD_AT_START) / DRAW_DURATION, 0),
        1,
      );

      state.pixels.forEach(({ distance, element, segmentLength }) => {
        if (!element.classList.contains("is-visible")) {
          const localProgress =
            segmentLength > 0 ? distance / segmentLength : 0;
          element.classList.toggle("is-visible", progress >= localProgress);
        }
      });

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

    const linesWithSegments = lines.filter((line) =>
      executedSegments.some((s) => s.lineId === line.id),
    );
    linesWithSegments.forEach((line) =>
      buildLine(line, sourceLayer, pixelLayer),
    );

    stations.forEach((station) => buildMarker(station, annotationLayer));

    if (hasAnimatedSegment) {
      frame.id = requestAnimationFrame(animate);
    }

    return () => {
      if (frame.id !== null) {
        cancelAnimationFrame(frame.id);
      }
      svg.replaceChildren();
    };
  }, [
    executedSegments,
    animatedSegmentId,
    labelOffsetByStation,
    lineById,
    lines,
    stationLineIds,
    stations,
    viewBox,
  ]);

  return (
    <div className="metro-map-panel">
      <svg
        ref={svgRef}
        aria-label="Execution network map"
        className="metro-map"
        role="img"
        xmlns={SVG_NS}
      />
    </div>
  );
}

export default ExecutionMap;

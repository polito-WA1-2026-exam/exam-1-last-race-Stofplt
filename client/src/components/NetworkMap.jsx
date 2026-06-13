import { useEffect, useMemo, useRef } from "react";
import {
  INTERCHANGE_SIZE,
  LABEL_LOWER_Y,
  LABEL_OFFSET_X,
  STATION_SIZE,
  SVG_NS,
  buildViewBox,
  getLabelOffsetByStation,
  getStationLineIds,
  svgEl,
} from "./mapUtils.js";

const PIXEL_STEP = 3;
const PIXEL_SIZE = 4;
const SHADOW_OFFSET = 1.2;
const DRAW_DURATION = 3000;
const HOLD_AT_START = 200;

// Removes duplicate opposite paths so setup draws each physical line once.
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

// Animated full-network map used during setup.
function NetworkMap({ lines = [], segments = [], stations = [] }) {
  // The SVG is rebuilt imperatively because path length sampling is DOM-based.
  const svgRef = useRef(null);
  // Drawing uses one physical path per line segment to avoid double-thick pixels.
  const physicalSegments = useMemo(
    () => dedupePhysicalSegments(segments),
    [segments]
  );
  // Interchange styling depends on how many lines touch each station.
  const stationLineIds = useMemo(
    () => getStationLineIds(stations, segments),
    [stations, segments]
  );
  // Fast line lookup provides colors for marker outlines.
  const lineById = useMemo(
    () => new Map(lines.map((line) => [line.id, line])),
    [lines]
  );
  // Label offsets are derived once per station list to keep text readable.
  const labelOffsetByStation = useMemo(
    () => getLabelOffsetByStation(stations),
    [stations]
  );
  // ViewBox is generated from seeded coordinates instead of hardcoding bounds.
  const viewBox = useMemo(() => buildViewBox(stations), [stations]);

  /*
   * The animation is built from sampled SVG path points. React owns the
   * component lifecycle, while DOM APIs provide getTotalLength and
   * getPointAtLength for the pixel-by-pixel reveal.
   */
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

    // Records when a station should become visible along one animated line.
    function addReveal(stationId, lineId, distance) {
      if (!state.revealByStation.has(stationId)) {
        state.revealByStation.set(stationId, []);
      }

      state.revealByStation.get(stationId).push({ lineId, distance });
    }

    // Creates one colored or shadow pixel at a sampled path point.
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

    // Samples a source path into evenly spaced pixel rectangles.
    function buildPixels(path, lineId, color, offset, length, pixelLayer) {
      for (let distance = 0; distance <= length; distance += PIXEL_STEP) {
        const point = path.getPointAtLength(distance);
        const totalDistance = offset + distance;

        buildPixel(
          point,
          lineId,
          totalDistance,
          "var(--map-pixel-shadow-color)",
          true,
          pixelLayer
        );
        buildPixel(point, lineId, totalDistance, color, false, pixelLayer);
      }
    }

    // Builds marker and label in one group so hover scaling remains stable in Safari.
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
        point.setAttribute(
          "stroke",
          lineById.get(lineId)?.color ?? "var(--map-text-color)"
        );
      }

      const labelX = station.x + LABEL_OFFSET_X;
      const labelY =
        station.y + (labelOffsetByStation.get(station.id) ?? LABEL_LOWER_Y);
      const labelBaseTransform = `translate(${labelX} ${labelY})`;
      const labelHoverTransform = `${labelBaseTransform} scale(1.8)`;
      const labelAnchor = svgEl("g", {
        class: "label-anchor",
        transform: labelBaseTransform
      });
      // Scaling the translated group avoids Safari moving SVG text on hover.
      const showLabelHover = () =>
        labelAnchor.setAttribute("transform", labelHoverTransform);
      const hideLabelHover = () =>
        labelAnchor.setAttribute("transform", labelBaseTransform);

      marker.addEventListener("mouseenter", showLabelHover);
      marker.addEventListener("mouseleave", hideLabelHover);
      marker.addEventListener("focus", showLabelHover);
      marker.addEventListener("blur", hideLabelHover);

      const text = svgEl("text", {
        class: "label",
        x: 0,
        y: 0,
        "dominant-baseline": "middle",
        "text-anchor": "start"
      });

      text.textContent = station.name;
      labelAnchor.appendChild(text);
      marker.append(point, labelAnchor);
      annotationLayer.appendChild(marker);
      state.annotations.push({ element: marker, stationId: station.id });
    }

    // Adds hidden source geometry and visible pixel layers for one metro line.
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

    // Reveals stations once any serving line has reached their sampled distance.
    function updateAnnotations(lineProgress) {
      state.annotations.forEach(({ element, stationId }) => {
        const reveals = state.revealByStation.get(stationId) ?? [];
        const isVisible = reveals.some(
          ({ lineId, distance }) => lineProgress.get(lineId) >= distance
        );

        element.classList.toggle("is-visible", isVisible);
      });
    }

    // Toggles visibility for pixels already reached by the current line progress.
    function updatePixels(lineProgress) {
      state.pixels.forEach(({ distance, element, lineId }) => {
        element.classList.toggle("is-visible", lineProgress.get(lineId) >= distance);
      });
    }

    // Advances all lines together from hidden pixels to the full network.
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

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
const DRAW_DURATION = 500;
const HOLD_AT_START = 0;

// Draws only executed route segments and animates the most recent one.
function ExecutionMap({
  animatedSegmentId = null,
  executedPaths = [],
  lines = [],
  stations = [],
  networkSegments = [],
}) {
  // Dynamic SVG is rebuilt from execution state because path sampling is DOM-only.
  const svgRef = useRef(null);

  // Line metadata supplies colors for executed segment pixels and station outlines.
  const lineById = useMemo(() => new Map(lines.map((l) => [l.id, l])), [lines]);
  // Label offsets match the setup map so station names do not overlap.
  const labelOffsetByStation = useMemo(
    () => getLabelOffsetByStation(stations),
    [stations],
  );
  // Execution map bounds follow the full station set, not only executed paths.
  const viewBox = useMemo(() => buildViewBox(stations), [stations]);

  // Keeps only steps that already expose an SVG path from the server.
  const executedSegments = useMemo(
    () => executedPaths.filter((segment) => segment.path),
    [executedPaths],
  );

  // Interchange styling still uses the full network shape.
  const stationLineIds = useMemo(
    () => getStationLineIds(stations, networkSegments),
    [stations, networkSegments],
  );

  // Rebuilds the SVG whenever execution progress changes.
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

    // Builds always-visible station annotations with Safari-safe hover labels.
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
        point.setAttribute(
          "stroke",
          lineById.get(lineId)?.color ?? "var(--map-text-color)",
        );
      }

      const labelX = station.x + LABEL_OFFSET_X;
      const labelY =
        station.y + (labelOffsetByStation.get(station.id) ?? LABEL_LOWER_Y);
      const labelBaseTransform = `translate(${labelX} ${labelY})`;
      const labelHoverTransform = `${labelBaseTransform} scale(1.8)`;
      const labelAnchor = svgEl("g", {
        class: "label-anchor",
        transform: labelBaseTransform,
      });
      // Scaling the translated group avoids Safari shifting text coordinates.
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
        "text-anchor": "start",
      });

      text.textContent = station.name;
      labelAnchor.appendChild(text);
      marker.append(point, labelAnchor);
      annotationLayer.appendChild(marker);
      state.annotations.push({ element: marker, stationId: station.id });
    }

    // Samples executed paths into visible pixels, leaving the newest path hidden for animation.
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
            fill: "var(--map-pixel-shadow-color)",
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

    // Reveals hidden pixels along the newest executed segment from start to end.
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

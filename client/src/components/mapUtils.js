const SVG_NS = "http://www.w3.org/2000/svg";
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

function getStationLineIds(stations, segments) {
  const lineIdsByStation = new Map(
    stations.map((station) => [station.id, new Set()]),
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
          index % 2 === 0 ? LABEL_LOWER_Y : LABEL_RAISE_Y,
        );
      });
  });

  return offsetByStation;
}

export {
  INTERCHANGE_SIZE,
  LABEL_LOWER_Y,
  LABEL_OFFSET_X,
  STATION_SIZE,
  SVG_NS,
  buildViewBox,
  getLabelOffsetByStation,
  getStationLineIds,
  svgEl,
};

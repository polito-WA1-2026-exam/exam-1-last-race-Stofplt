// Station coordinates are stored server-side and reused by every SVG map.
class Station {
  constructor(id, name, x, y) {
    this.id = id;
    this.name = name;
    this.x = x;
    this.y = y;
  }
}

// A metro line carries the display color used by setup and execution maps.
class Line {
  constructor(id, name, color) {
    this.id = id;
    this.name = name;
    this.color = color;
  }
}

// Segments are directed edges; opposite travel directions have separate ids.
class Segment {
  constructor(id, fromStationId, toStationId, lineId, path) {
    this.id = id;
    this.fromStationId = fromStationId;
    this.toStationId = toStationId;
    this.lineId = lineId;
    this.path = path;
  }
}

export { Station, Line, Segment };

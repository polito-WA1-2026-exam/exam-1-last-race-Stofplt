class Station {
  constructor(id, name, x, y) {
    this.id = id;
    this.name = name;
    this.x = x;
    this.y = y;
  }
}

class Line {
  constructor(id, name, color) {
    this.id = id;
    this.name = name;
    this.color = color;
  }
}

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

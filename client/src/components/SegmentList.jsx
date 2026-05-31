function SegmentList({ segments = [] }) {
  return (
    <ul className="list-unstyled">
      {segments.map((segment) => (
        <li key={segment.id}>
          {segment.fromStation} - {segment.toStation}
        </li>
      ))}
    </ul>
  );
}

export default SegmentList;
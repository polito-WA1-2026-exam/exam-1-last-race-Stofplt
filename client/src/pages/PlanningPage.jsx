import { Alert } from "react-bootstrap";
import { useLocation, useParams } from "react-router";

function PlanningPage() {
  const { gameId } = useParams();
  const location = useLocation();
  const game = location.state;

  return (
    <section className="page-section">
      <h1>Planning</h1>
      {game ? (
        <dl className="planning-summary">
          <div>
            <dt>Game</dt>
            <dd>{gameId}</dd>
          </div>
          <div>
            <dt>Start</dt>
            <dd>{game.startStation.name}</dd>
          </div>
          <div>
            <dt>Destination</dt>
            <dd>{game.destinationStation.name}</dd>
          </div>
        </dl>
      ) : (
        <Alert variant="warning">
          Game data is not available. Start a new game from Setup.
        </Alert>
      )}
    </section>
  );
}

export default PlanningPage;

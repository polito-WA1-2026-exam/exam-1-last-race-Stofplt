import { useEffect, useState } from "react";
import { Alert, Spinner } from "react-bootstrap";
import { useParams } from "react-router";
import { getGameResult } from "../api/api.js";
import ExecutionStep from "../components/ExecutionStep.jsx";

function ResultPage() {
  const { gameId } = useParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getGameResult(gameId)
      .then((data) => {
        if (active) {
          setResult(data);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
        }
      });

    return () => {
      active = false;
    };
  }, [gameId]);

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  if (!result) {
    return (
      <div className="page-loader d-flex align-items-center">
        <Spinner animation="border" role="status" />
      </div>
    );
  }

  return (
    <section className="result-page d-grid gap-4">
      <h1>Result</h1>
      <dl className="planning-summary">
        <div>
          <dt>Status</dt>
          <dd>{result.status}</dd>
        </div>
        <div>
          <dt>Score</dt>
          <dd>{result.score}</dd>
        </div>
        <div>
          <dt>Start</dt>
          <dd>{result.startStation.name}</dd>
        </div>
        <div>
          <dt>Destination</dt>
          <dd>{result.destinationStation.name}</dd>
        </div>
      </dl>

      <section>
        <h2>Executed route</h2>
        <div className="d-grid gap-3">
          {result.steps.map((step) => (
            <ExecutionStep key={step.index} step={step} />
          ))}
        </div>
      </section>
    </section>
  );
}

export default ResultPage;

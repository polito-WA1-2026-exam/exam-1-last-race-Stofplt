import { useState } from "react";
import { Alert, Button } from "react-bootstrap";
import { useNavigate, useParams } from "react-router";
import { executeNextStep } from "../api/api.js";
import ExecutionStep from "../components/ExecutionStep.jsx";

function ExecutionPage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [steps, setSteps] = useState([]);
  const [error, setError] = useState("");
  const [executing, setExecuting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState(null);

  async function handleExecuteNext() {
    setError("");
    setExecuting(true);

    try {
      const result = await executeNextStep(gameId);
      setSteps((current) => [...current, result.step]);

      if (result.completed) {
        setCompleted(true);
        setScore(result.score);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setExecuting(false);
    }
  }

  return (
    <section className="execution-page d-grid gap-4">
      <div className="d-flex align-items-center justify-content-between gap-3">
        <h1>Execution</h1>
        {completed ? (
          <Button onClick={() => navigate(`/result/${gameId}`)}>View result</Button>
        ) : (
          <Button disabled={executing} onClick={handleExecuteNext}>
            {executing ? "Executing..." : "Execute next"}
          </Button>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {completed && (
        <Alert variant="success">
          Race completed. Final score: {score}
        </Alert>
      )}

      {steps.length === 0 ? (
        <div className="empty-route">
          <p className="mb-0">Execute the first segment to reveal its event.</p>
        </div>
      ) : (
        <div className="d-grid gap-3">
          {steps.map((step) => (
            <ExecutionStep key={step.index} step={step} />
          ))}
        </div>
      )}
    </section>
  );
}

export default ExecutionPage;

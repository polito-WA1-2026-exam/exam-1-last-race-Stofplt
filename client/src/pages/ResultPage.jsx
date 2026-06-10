import { useEffect, useState } from "react";
import { Spinner } from "react-bootstrap";
import { useNavigate, useParams } from "react-router";
import { getGameResult } from "../api/api.js";

function ResultPage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);

  useEffect(() => {
    let active = true;

    getGameResult(gameId)
      .then((data) => {
        if (active) {
          setResult(data);
        }
      })
      .catch(() => {
        if (active) {
          navigate("/", { replace: true });
        }
      });

    return () => {
      active = false;
    };
  }, [gameId, navigate]);

  if (!result) {
    return (
      <div className="page-loader d-flex align-items-center">
        <Spinner animation="border" role="status" />
      </div>
    );
  }

  const won = result.status === "completed";

  return (
    <section className="result-page d-grid gap-4">
      <div className="result-header">
        <h1>{won ? "Victory!" : "Game Over"}</h1>
      </div>

      <div className="result-card nes-container is-rounded mx-auto d-flex flex-column align-items-center gap-4">
        <div className="result-score d-flex flex-column align-items-center gap-2">
          <span className="result-score-label">
            {won ? "Final score" : "Score"}
          </span>
          <div className="d-flex align-items-center justify-content-center gap-2">
            <i className="nes-icon coin is-medium" aria-hidden="true" />
            <span className="result-score-value">{result.score}</span>
          </div>
        </div>
      </div>

      <div className="result-actions d-flex justify-content-end w-100 mx-auto">
        <button
          className="nes-btn is-success nes-pointer"
          onClick={() => navigate("/setup", { replace: true })}
          type="button"
        >
          Play again
        </button>
      </div>
    </section>
  );
}

export default ResultPage;

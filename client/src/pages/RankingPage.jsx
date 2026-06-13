import { useEffect, useState } from "react";
import { Spinner } from "react-bootstrap";
import { useNavigate } from "react-router";
import { getRanking } from "../api/api.js";

// Shows the best completed score for each registered player.
function RankingPage() {
  const navigate = useNavigate();
  // Null means loading; an empty array means no completed games.
  const [ranking, setRanking] = useState(null);

  // Ranking is protected, so request failures fall back to the public page.
  useEffect(() => {
    let active = true;

    getRanking()
      .then((data) => {
        if (active) {
          setRanking(data);
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
  }, [navigate]);

  if (!ranking) {
    return (
      <div className="page-loader d-flex align-items-center">
        <Spinner animation="border" role="status" />
      </div>
    );
  }

  return (
    <section className="ranking-page d-grid gap-4">
      <div className="ranking-header">
        <h1>Ranking</h1>
      </div>

      {ranking.length === 0 ? (
        <p className="text-secondary mb-0">No completed games yet.</p>
      ) : (
        <div className="ranking-table-wrapper">
          <table className="nes-table is-bordered is-centered">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Best score</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((entry, index) => (
                <tr key={entry.userId}>
                  <td>{index + 1}</td>
                  <td>{entry.name}</td>
                  <td>{entry.bestScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default RankingPage;

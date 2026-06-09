import { useEffect, useState } from "react";
import { Alert, Spinner, Table } from "react-bootstrap";
import { getRanking } from "../api/api.js";

function RankingPage() {
  const [ranking, setRanking] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getRanking()
      .then((data) => {
        if (active) {
          setRanking(data);
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
  }, []);

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  if (!ranking) {
    return (
      <div className="page-loader d-flex align-items-center">
        <Spinner animation="border" role="status" />
      </div>
    );
  }

  return (
    <section className="ranking-page d-grid gap-4">
      <h1>Ranking</h1>
      {ranking.length === 0 ? (
        <p className="text-secondary mb-0">No completed games yet.</p>
      ) : (
        <Table className="ranking-table" hover responsive>
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
        </Table>
      )}
    </section>
  );
}

export default RankingPage;

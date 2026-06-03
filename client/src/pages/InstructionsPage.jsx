import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { getInstructions } from "../api/api.js";
import LoginDialog from "../components/LoginDialog.jsx";
import { useUser } from "../contexts/UserContext.js";

function InstructionsPage() {
  const { loggedIn } = useUser();
  const navigate = useNavigate();
  const [instructions, setInstructions] = useState(null);
  const [error, setError] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    let active = true;

    getInstructions()
      .then((data) => {
        if (active) {
          setInstructions(data);
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

  function handlePlayNow() {
    if (loggedIn) {
      navigate("/setup");
    } else {
      setLoginOpen(true);
    }
  }

  if (error) {
    return <p className="nes-text is-error">{error}</p>;
  }

  if (!instructions) {
    return (
      <div className="page-loader">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <section className="home-page">
        <div className="instruction-grid">
          {instructions.rules.map((rule, index) => (
            <article className="nes-container instruction-card" key={rule}>
              <span className="instruction-number">{index + 1}</span>
              <p>{rule}</p>
            </article>
          ))}
        </div>
        <div className="play-row">
          <button className="nes-btn is-success play-button" onClick={handlePlayNow}>
            Play now
          </button>
        </div>
      </section>
      <LoginDialog
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={() => navigate("/setup")}
      />
    </>
  );
}

export default InstructionsPage;

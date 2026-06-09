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
      <div className="page-loader d-flex align-items-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <section className="container-fluid py-4">
        <div className="row row-cols-1 row-cols-md-2 row-cols-xl-5 g-3">
          {instructions.rules.map((rule, index) => (
            <div className="col" key={rule}>
              <article className="nes-container is-rounded instruction-card d-grid gap-3 h-100">
                <span className="instruction-number d-inline-flex align-items-center justify-content-center">{index + 1}</span>
                <p className="m-0">{rule}</p>
              </article>
            </div>
          ))}
        </div>
        <div className="row justify-content-center pt-4">
          <div className="col-12 col-md-4 col-xl-3">
          <button
            className="nes-btn is-success nes-pointer w-100"
            onClick={handlePlayNow}
          >
            Play now
          </button>
          </div>
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

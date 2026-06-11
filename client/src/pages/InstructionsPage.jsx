import { useState } from "react";
import { useNavigate } from "react-router";
import LoginDialog from "../components/LoginDialog.jsx";
import { useUser } from "../contexts/UserContext.js";

const HOW_TO_PLAY_CARDS = [
  {
    title: "Study the Underground",
    text: "Look at the full network before starting the race.",
    icon: "map",
  },
  {
    title: "Build the path",
    text: "Choose connected segments from start to finish.",
    icon: "route",
  },
  {
    title: "Quickly",
    text: "Submit the route before the timer runs out.",
    icon: "timer",
  },
  {
    title: "Reach your destination",
    text: "Execute each step and keep enough coins to finish.",
    icon: "finish",
  },
];

function InstructionsPage() {
  const { loggedIn } = useUser();
  const navigate = useNavigate();
  const [loginOpen, setLoginOpen] = useState(false);

  function handlePlayNow() {
    if (loggedIn) {
      navigate("/setup");
    } else {
      setLoginOpen(true);
    }
  }

  return (
    <>
      <section className="home-page d-grid gap-4 mx-auto w-100">
        <header className="d-flex align-items-center justify-content-between">
          <h1 className="m-0">How To Play</h1>
        </header>

        <div className="row row-cols-1 row-cols-md-2 row-cols-xl-4 g-4 pt-4">
          {HOW_TO_PLAY_CARDS.map((card, index) => (
            <div className="col" key={card.title}>
              <article className="home-rule-card nes-container is-rounded h-100 d-flex flex-column">
                <div className="d-flex align-items-start justify-content-between gap-3">
                  <span className="home-rule-number d-inline-flex align-items-center justify-content-center">
                    {index + 1}
                  </span>
                </div>
                <div className="home-rule-art d-flex align-items-center justify-content-center">
                  <span
                    aria-hidden="true"
                    className={`home-rule-icon is-${card.icon}`}
                  />
                </div>
                <div className="home-rule-copy d-grid gap-3 w-100">
                  <h2 className="m-0">{card.title}</h2>
                  <p className="m-0">{card.text}</p>
                </div>
              </article>
            </div>
          ))}
        </div>

        <div className="row justify-content-center pt-4">
          <div className="col-12 col-md-4 col-xl-3">
            <button
              className="nes-btn is-success nes-pointer w-100"
              onClick={handlePlayNow}
              type="button"
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

import "bootstrap/dist/css/bootstrap.min.css";
import "@fontsource/press-start-2p";
import "nes.css/css/nes.min.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

// StrictMode surfaces unsafe React patterns during development evaluation.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

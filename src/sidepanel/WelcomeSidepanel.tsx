import React from "react";
import ReactDOM from "react-dom/client";
import Welcome from "../welcome/Welcome";
import "../welcome/index.css";
import "../styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Welcome />
  </React.StrictMode>,
);

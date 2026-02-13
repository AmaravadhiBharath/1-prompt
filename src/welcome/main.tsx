import React from "react";
import ReactDOM from "react-dom/client";
import WelcomeWebsite from "./WelcomeWebsite";
import "./index.css";
import "../styles/index.css"; // Import global styles if any

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WelcomeWebsite />
  </React.StrictMode>,
);

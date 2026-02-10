import ReactDOM from "react-dom/client";
import { ErrorBoundary } from "./ErrorBoundary";
import OnePromptApp from "./OnePromptApp";

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <ErrorBoundary>
    <OnePromptApp />
  </ErrorBoundary>,
);

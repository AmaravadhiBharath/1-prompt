import ReactDOM from "react-dom/client";
import { ErrorBoundary } from "./ErrorBoundary";
import OnePromptApp from "./OnePromptApp";

// TAB DETECTION: Prevent the side panel from running in a regular browser tab
// If we are in a tab (not a side panel), redirect to the welcome page
if (
  window.location.protocol === "chrome-extension:" &&
  window.location.pathname.includes("sidepanel/index.html")
) {
  // chrome.tabs.getCurrent returns the tab object ONLY if we are in a tab.
  // In a side panel context, it returns undefined or doesn't behave like a tab.
  chrome.tabs.getCurrent((tab) => {
    if (tab) {
      // We are in a real tab, redirect to the landing page
      window.location.href = "../welcome.html";
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <ErrorBoundary>
    <OnePromptApp />
  </ErrorBoundary>,
);

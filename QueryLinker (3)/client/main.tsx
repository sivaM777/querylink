import React from "react";
import "./global.css";
import "./force-light-theme.css";
import "./theme-init";
import { createRoot } from "react-dom/client";
import App from "./App";

// Suppress recharts defaultProps warnings
const originalWarn = console.warn;
console.warn = (...args) => {
  const message = args[0];
  const component = args[1];

  // Check for the specific React defaultProps warning pattern
  if (
    typeof message === "string" &&
    message.includes("Support for defaultProps will be removed") &&
    ((typeof component === "string" &&
      (component.includes("XAxis") || component.includes("YAxis"))) ||
      // Also check if the warning mentions XAxis or YAxis in the message itself
      message.includes("XAxis") ||
      message.includes("YAxis"))
  ) {
    return;
  }

  originalWarn.apply(console, args);
};

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}

// Check if root already exists to prevent double mounting
if (!container.hasAttribute("data-root-created")) {
  container.setAttribute("data-root-created", "true");
  const root = createRoot(container);
  root.render(<App />);
}

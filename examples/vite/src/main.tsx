import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "@threadcraft/react/styles.css";
import "./example.scss";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

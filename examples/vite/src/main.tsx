import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "@simplishelf/threadcraft/styles.css";
import "./example.scss";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

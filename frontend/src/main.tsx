import React from "react";
import ReactDOM from "react-dom/client";
import AppWithAuth from "./AppWithAuth";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppWithAuth />
  </React.StrictMode>
);

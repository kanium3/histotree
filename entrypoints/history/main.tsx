import React from "react";
import ReactDOM from "react-dom/client";
import App from "../popup/App.tsx";
import "@/assets/tailwind.css";
import "../popup/style.css";
import { ThemeProvider } from "@/components/theme-provider.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App fullPage />
    </ThemeProvider>
  </React.StrictMode>,
);

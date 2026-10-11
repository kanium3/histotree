import React from "react";
import ReactDOM from "react-dom/client";
import Options from "./Options.tsx";
import "@/assets/tailwind.css";
import "./style.css";
import { ThemeProvider } from "@/components/theme-provider.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <React.Suspense fallback={null}>
      <ThemeProvider>
        <Options />
      </ThemeProvider>
    </React.Suspense>
  </React.StrictMode>,
);

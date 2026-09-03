import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./hooks/useAuth";
import { ErrorBoundary } from "./components/layout/ErrorBoundary";
import { installGlobalErrorReporting } from "./lib/report-error";
import { installStaleBuildRecovery } from "./lib/stale-build";
import "./styles/globals.css";

installStaleBuildRecovery();
installGlobalErrorReporting();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);

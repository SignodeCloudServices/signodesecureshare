import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { PublicClientApplication, EventType } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "@/lib/auth-config";
import { AuthProvider, DEMO_MODE } from "@/lib/auth-context";
import { PersonaProvider } from "@/lib/persona-context";
import App from "./App";
// @ts-ignore: side-effect import of CSS file for bundler/runtime
import "./index.css";

const msalInstance = new PublicClientApplication(msalConfig);

 

/**
 * MSAL v3 requires explicit initialisation before any other call, and it is
 * async — hence the bootstrap wrapper rather than top-level await, which the
 * build target does not support.
 */
async function bootstrap() {
  await msalInstance.initialize();

  // Restore the active account on reload. Without this, acquireTokenSilent has
  // no account to work with and every Graph call falls back to a popup.
  const existing = msalInstance.getAllAccounts();
  if (existing.length > 0) {
    msalInstance.setActiveAccount(existing[0]);
  }

  msalInstance.addEventCallback((event) => {
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
      const payload = event.payload as { account?: unknown };
      if (payload.account) {
        msalInstance.setActiveAccount(payload.account as never);
      }
    }
  });

  if (DEMO_MODE) {
    console.info("SecureShare running in DEMO MODE — mock data, no Graph calls.");
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <BrowserRouter>
          {/* PersonaProvider stays for VITE_DEMO_MODE; AuthProvider supplies
              real identity and scope when live. Both are mounted so the UI can
              read either without conditional hooks. */}
          <AuthProvider>
            <PersonaProvider>
              <App />
            </PersonaProvider>
          </AuthProvider>
        </BrowserRouter>
      </MsalProvider>
    </React.StrictMode>
  );
}

bootstrap().catch((e) => {
  // A failure here means the app never mounts, so render something rather
  // than leaving a blank page with only a console error.
  console.error("MSAL bootstrap failed", e);
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML =
      '<div style="font-family:system-ui;padding:2rem;color:#231F20">' +
      "<h1>Sign-in unavailable</h1><p>The portal could not initialise authentication. " +
      "Please contact your internal Signode Support Contact.</p></div>";
  }
});

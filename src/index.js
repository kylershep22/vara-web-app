import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// ---------------------------------------------------------------------------
// Web gate (top-level, above routing/auth/Firebase)
// ---------------------------------------------------------------------------
// Until web PMF is validated, public visits to the hosted web app show a
// static, on-brand "coming soon" screen. The gate short-circuits ABOVE the
// router, auth, and Firebase: when ON, the app tree is never imported, so
// src/firebase.js (which calls initializeApp() at module load), the auth
// listener, signup, and all Firestore access are unreachable — no route can
// bypass it because no route is loaded at all.
//
// Controlled by REACT_APP_WEB_GATED (CRA bakes this in at build time):
//   - production build : set 'true' in .env.production.local  -> gated screen
//   - local dev / npm start : unset                           -> full app
//
// Reversible: flip the flag, rebuild, redeploy. No app/route/data code is
// modified by this gate.
// ---------------------------------------------------------------------------
const WEB_GATED = process.env.REACT_APP_WEB_GATED === 'true';

const root = ReactDOM.createRoot(document.getElementById('root'));

if (WEB_GATED) {
  // Gated: load ONLY the static placeholder. Nothing else enters the graph.
  import('./components/WebComingSoon').then(({ default: WebComingSoon }) => {
    root.render(
      <React.StrictMode>
        <WebComingSoon />
      </React.StrictMode>
    );
  });
} else {
  // Full app. Dynamic imports keep the app/auth/Firebase modules out of the
  // bundle path that runs when gated above.
  Promise.all([
    import('./App'),
    import('react-router-dom'),
    import('./context/AuthContext'),
    import('./context/ToastContext'),
    import('./components/ErrorBoundary'),
    import('./reportWebVitals'),
  ]).then(
    ([
      { default: App },
      { BrowserRouter },
      { AuthProvider },
      { ToastProvider },
      { default: ErrorBoundary },
      { default: reportWebVitals },
    ]) => {
      root.render(
        <React.StrictMode>
          <ErrorBoundary level="root">
            <BrowserRouter>
              <ToastProvider>
                <AuthProvider>
                  <App />
                </AuthProvider>
              </ToastProvider>
            </BrowserRouter>
          </ErrorBoundary>
        </React.StrictMode>
      );

      reportWebVitals();
    }
  );
}

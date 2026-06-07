import React from 'react';

/**
 * WebComingSoon
 *
 * Static, on-brand placeholder shown on the public web app while it is gated
 * (REACT_APP_WEB_GATED === 'true'). It is rendered ABOVE all routing, auth,
 * and Firebase (see src/index.js): when gated, the app/auth/Firestore module
 * tree is never imported, so nothing below this screen can execute.
 *
 * Styles are intentionally self-contained inline styles (no Tailwind / app CSS
 * dependency) so the screen renders identically regardless of app state. Inter
 * is already loaded by public/index.html. Reversible: flip the flag.
 */

const MIST_WHITE = '#FAFAF6';
const EVERGREEN_TEAL = '#1B5E57';
const FONT_STACK =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export default function WebComingSoon() {
  return (
    <main
      style={{
        minHeight: '100vh',
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: MIST_WHITE,
        color: EVERGREEN_TEAL,
        fontFamily: FONT_STACK,
        padding: '32px 24px',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '34rem', width: '100%' }}>
        <p
          style={{
            margin: '0 0 3rem',
            fontSize: '0.8125rem',
            fontWeight: 600,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            opacity: 0.65,
          }}
        >
          Vara
        </p>

        <h1
          style={{
            margin: '0 0 1.5rem',
            fontSize: 'clamp(1.75rem, 4.5vw, 2.5rem)',
            fontWeight: 600,
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
          }}
        >
          Vara is coming to the web.
        </h1>

        <p
          style={{
            margin: 0,
            fontSize: 'clamp(1rem, 2.2vw, 1.125rem)',
            fontWeight: 400,
            lineHeight: 1.7,
            opacity: 0.85,
          }}
        >
          Right now, Vara lives on iOS — a calmer way to recover from stress and
          support how your brain handles it. The web experience is on its way.
        </p>
      </div>
    </main>
  );
}

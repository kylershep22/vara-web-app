# CLAUDE.md

Guidance for Claude Code working in this repository.

**Last Updated:** 2026-08-30

## Two apps live here

| | Path | Status |
|---|---|---|
| **Mobile** | `mobile/` | **ACTIVE.** React Native + Expo + TypeScript. All current product work happens here. |
| **Web** | repo root (`src/`, `backend/`) | **Dormant.** React 19 SPA talking directly to Firestore, plus an Express backend used only for OpenAI calls. Largely unmaintained; mobile is the standard. |

## Working on mobile

**Read `mobile/CLAUDE.md` first.** It carries the source-of-truth precedence ladder, the machine-enforced guards, the non-negotiables, and the workflow. Nothing in this file governs mobile work.

Run mobile commands from `mobile/`, not from here.

## Working on the web app

Confirm with Kyle before making changes; the web app is dormant and parity work is paused. `mobile/` is the standard that web is expected to follow, not the reverse.

Scripts in the root `package.json` (present and unchanged, **unverified — web app dormant**):

```bash
npm start        # frontend, port 3000
npm run server   # Express backend, port 5001
npm run dev      # both
npm run build    # production build
npm test         # react-scripts test
```

`npm run test:rules` is the exception: it is current, it is how Firestore rules are tested for **both** apps, and it runs from this directory. It needs the Firebase emulator.

Environment: `.env` at the root for the frontend (React vars must be prefixed `REACT_APP_`), `backend/.env` for `OPENAI_API_KEY`. Never commit either.

## Live setup and security guides

- `FIRESTORE_SECURITY_RULES.md` — what the rules enforce and why.
- `TESTING_SECURITY_RULES.md` — how to test rules before deploying.
- `ENVIRONMENT_VARIABLES_SETUP.md` — environment setup.
- `POST_DEPLOYMENT_TESTING.md` — post-deploy checklist.

Other root `.md` files are historical. One-off completion reports and fix writeups have moved to `docs/archive/root-reports/`.

## Repo-wide rules

- Firestore rules are allowlist and fail-closed. A new collection needs rules before its first write.
- Deploy state is not inferrable from the repo. Never claim rules "need deploying" — ask Kyle.
- Never commit secrets. `.env` files stay untracked.

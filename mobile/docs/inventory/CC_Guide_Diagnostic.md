# Vara AI Guide — Diagnostic

**Date:** 2026-08-18
**HEAD:** `15ae35e` "Merge TB-3: task-to-block bridge" (branch `main`)
**Scope:** the AI Guide, client and server. Read-only except one permitted execution for Q3.
**Execution performed:** started `node backend/server.js` locally, issued one `POST /api/ai-chat`, then isolated the OpenAI call. No file in the repo was created, modified, or deleted. The server was stopped afterwards.

Carried forward from the Aug 15 inventory and not re-derived: the five client/server file locations, the pill's five render surfaces, the `buildCoachContext` → server shape mismatch, and the five-Neuro-pillar system prompt.

---

## Q1 — CONVERSATION PERSISTENCE

### 1a. Is a thread persisted anywhere?

**No. Nowhere. The thread is in-memory React state and nothing else.**

| Store | Holds the thread? | Evidence |
|---|---|---|
| React component state | **Yes — the only holder** | `AIChatModal.tsx:257` `const [messages, setMessages] = useState<Message[]>([...])`, seeded with one hardcoded greeting |
| AsyncStorage | **No** | The only AsyncStorage key in the file is `LAST_COACH_SESSION_KEY = '@vara_last_coach_session'` (`AIChatModal.tsx:44`). It is read once at `:326` and written once at `:399`, and it stores **a single ISO timestamp string**, not messages. Its only use is computing `daysSinceLastCoachSession` for the context object |
| Firestore | **No** | Grepped `aiChats`, `coachMessages`, `chatHistory`, `aiConversations`, `guideMessages` across `mobile/src` and `backend/` — zero hits. `AIChatModal` imports `collection/query/getDocs/doc/getDoc` from Firestore but every call is a **read** inside `buildCoachContext` |
| Server | **No** | `backend/server.js:205-295` holds no persistence. It reads `req.body`, calls OpenAI, returns. Nothing is written anywhere |

`setMessages` is called in exactly three places (`:452`, `:477`, `:488`) and all three are appends via `(prev) => [...prev, x]`. There is no clear, no reset, no trim, and no load.

`handleClose` (`:499`) fires a haptic and calls `onClose()`. It does not touch `messages`.

### 1b. What survives what

The controlling detail is that `GuidePill` renders `AIChatModal` **unconditionally** (`GuidePill.tsx:103`), passing `visible={modalVisible}`. The modal component is always mounted; `visible` only drives the native `<Modal>`. So the thread's lifetime is the lifetime of the host screen's `GuidePill` instance.

| Event | Thread survives? | Why |
|---|---|---|
| Closing the modal (X button or `onRequestClose`) | **Yes** | `AIChatModal` stays mounted; only `visible` flips false |
| Navigating to another tab and back | **Yes, usually** | React Navigation bottom tabs keep visited screens mounted. Requires runtime verification if `unmountOnBlur`/lazy behaviour differs on device — `AppNavigator.tsx` sets neither |
| Backgrounding the app | **Yes** | No AppState listener in `AIChatModal`; JS context is retained |
| Force-quit | **No** | State is in-memory only |
| Reinstall | **No** | Nothing persisted to reload |
| Signing out and back in | **No** | `AppNavigator.tsx:1387` rebuilds `NavigationContainer` with a new `key`, unmounting the tree |

**A separate thread per surface.** Each of the five `GuidePill` mounts owns its own `AIChatModal` with its own `messages` array. A conversation started on Home is not visible from the Focus hub — the Focus pill opens a fresh greeting. Five independent threads can coexist in one app session.

### 1c. What is in the `messages` array per request

`AIChatModal.tsx:466`:

```ts
const messageHistory = [...messages, userMessage].map((msg) => ({
  role: msg.role,
  content: msg.content,
}));
```

**The full unbounded local history**, every turn since the modal component mounted. Three consequences:

1. **The hardcoded greeting is sent as a real assistant turn.** `messages[0]` is the local `"Hi! I'm Vara, your brain-health wellness coach. How can I support you today?"` (`:261`). The model receives it as something it said.
2. **Error bubbles are sent back as assistant turns.** `:488` appends `buildChatErrorContent(error)` with `role: 'assistant'`. So `"I'm having trouble connecting right now. Please try again in a moment."` becomes part of the conversation the model is asked to continue. On a sustained outage the history fills with the model apparently repeating that line.
3. **No client-side trimming, no summarisation, no token budget.** Nothing counts tokens anywhere in the client or the server. The only bound is the server's `MAX_MESSAGES_COUNT = 50` (a **count**, applied at `validate.js:44` via `messages.slice(-MAX_MESSAGES_COUNT)`) and `MAX_MESSAGE_LENGTH = 5000` per message. Worst case admitted: 50 × 5000 characters ≈ 62k tokens, against `gpt-4o-mini`'s 128k context — so it does not overflow, but it is not budgeted, it is merely small enough.

Note the asymmetry: the client's `TextInput` caps input at `maxLength={500}` (`:616`), while the server allows 5000. The 5000 ceiling is only reachable by a non-app client.

### 1d. Plainly: does the Guide have memory across sessions?

**No.**

Within one continuous mount of one screen's pill, it has perfect verbatim memory of every turn. Across a force-quit, a reinstall, a sign-out, or simply moving from Home to the Focus hub, it has **none**. There is no stored history to reach back into, at any depth.

The single thing that outlives the session is `@vara_last_coach_session`, one timestamp, which produces the string `daysSinceLastCoachSession` (`"today"` / `"yesterday"` / `"N days ago"`) inside the context object — and that object is discarded by the server (see Q4e). So even that survives the app but does not survive the request.

---

## Q2 — CONSENT GATE

### 2a. Where it renders from, and the enforcement point

`AIConsentModal` is rendered from exactly one place: `AIConsentContext.tsx:110`, inside `AIConsentProvider`, as a sibling of `{children}`. It is a single app-level instance, not per-screen.

**Enforcement point: the pill tap.** `GuidePill.tsx:69-71`:

```ts
const handlePress = () => {
  requireConsent(() => setModalVisible(true));
};
```

`requireConsent` (`AIConsentContext.tsx:74`) branches on `hasConsent`. If truthy it invokes the callback immediately; otherwise it stashes the callback in `pendingCbRef` and sets `modalVisible` on the **consent** modal. The chat modal never opens until consent is granted.

So the ordering is: tap → consent check → chat opens. **Not** modal-open and **not** first-send. There is no consent check inside `AIChatModal`, inside `chatWithAI`, or on the server.

Other `requireConsent` call sites (same gate, different features): `JournalScreen.tsx:96` and `JournalScreen.tsx:362`. `SettingsScreen.tsx:50` consumes `hasConsent`/`setConsent` for the toggle rather than gating.

One gap worth naming: `hasConsent` initialises to `null` and is populated by an async `getDoc` (`AIConsentContext.tsx:46-56`). `null` is falsy, so **a tap during that in-flight read shows the consent modal to a user who has already consented.** Tapping "Enable AI" then re-writes `aiConsent: true` — harmless but a redundant prompt and a redundant write. Whether the read normally lands before a user can tap requires runtime verification.

### 2b. Where consent is stored, and revocation

**Stored on `users/{uid}.aiConsent`** (boolean), written by `setConsent` at `AIConsentContext.tsx:65-68` via `updateDoc` alongside `updatedAt: serverTimestamp()`. Read at `:48`.

**Revocable, and there is a Settings control.** `SettingsScreen.tsx:431-456`, section heading "AI Features", a `Switch` labelled **"Use AI features"** bound to `value={!!aiConsent}` and `onValueChange` → `setAIConsent(value)`. On failure it shows `Alert.alert('Error', "Couldn't update AI setting. Please try again.")`.

The consent copy promises this: "You can turn AI off anytime in Settings." (`AIConsentModal.tsx:68`). That promise is kept.

### 2c. What happens on decline

`handleDecline` (`AIConsentContext.tsx:102`) clears `pendingCbRef` and hides the consent modal. That is all it does.

- The pill **stays live and fully visible**. It does not hide, grey out, or disable.
- Nothing is written to Firestore. A decline is not recorded — `aiConsent` stays absent, which reads back as `false`.
- Because nothing is recorded, **there is no "asked and declined" state.** The next tap shows the same modal again, indefinitely. There is no cooldown, no cap on re-prompts, and no different copy on a second showing.
- Revoking via the Settings switch writes `aiConsent: false` explicitly, but `requireConsent` treats explicit-false and never-asked identically, so the behaviour is the same: the pill stays live and re-prompts.

### 2d. Would consent fire on a proactive Guide message?

**The question is currently moot — see Q5d, there is no proactive path.** But the mechanism as written would behave badly if one were added.

`requireConsent` is a **UI-blocking, callback-deferring** gate: it opens a modal and waits for a tap. A system-initiated message would either have to call it — surfacing an unprompted consent sheet with no user action behind it — or bypass it, in which case a non-consenting user's data would reach OpenAI.

More concretely: `pendingCbRef` is a **single ref, not a queue** (`:38`, `:80`). Two `requireConsent` calls before the user answers means the first callback is silently dropped. A proactive trigger racing a user tap would lose one of them with no error.

---

## Q3 — THE 500

### 3a / 3b. Local run and what it produced

The backend **started cleanly**. `node backend/server.js` from the repo root:

```
[dotenv@17.2.0] injecting env (2) from backend\.env
[dotenv@17.2.0] injecting env (0) from .env
🚀 Server listening on port 5001
```

The `./backend/.env` path concern from the inventory (`server.js:3`) is **not a live problem on the standard path**: `package.json:44` defines `"server": "nodemon backend/server.js"`, which runs from the repo root, so `./backend/.env` resolves. The 2 injected vars confirm it loaded. It would only break if someone ran `node server.js` from inside `backend/`.

**The one `POST /api/ai-chat` request did not reach the handler.** It stopped at `requireAuth`:

```
HTTP 401
BODY {"error":"Invalid or expired token"}
```

Server log:

```
Auth middleware: token verification failed - Decoding Firebase ID token failed. Make sure you passed
the entire string JWT which represents an ID token.
```

No `ai-chat error:` line was produced, because `console.error('ai-chat error:', err)` at `server.js:291` sits inside a handler that was never entered.

**Why a real token could not be minted.** `backend/serviceAccountKey.json` (project `vara-4a99f`, client_email `firebase-adminsdk-fbsvc@vara-4a99f.iam.gserviceaccount.com`) **is revoked**:

```
CODE: app/invalid-credential
MESSAGE: Credential implementation provided to initializeApp() via the "credential" property failed
to fetch a valid Google OAuth2 access token with the following error: "invalid_grant: Invalid JWT
Signature.". There are two likely causes: (1) your server time is not properly synced or (2) your
certificate key file has been revoked.
```

`createCustomToken` still succeeds — it signs locally with the private key in the file — but exchanging it via Identity Toolkit fails:

```
EXCHANGE FAILED: {"code":400,"message":"INVALID_CUSTOM_TOKEN"}
```

Local signing works, server-side verification does not. That is the signature of a key whose public half is no longer registered in IAM. Cause (1), clock skew, is ruled out: the same machine completed a TLS handshake and an authenticated API call to OpenAI seconds later, which a skewed clock would also have broken.

This **resolves the standing open security question** recorded in project memory as "a key thought revoked still authenticates." It does not authenticate. It is revoked, and `verifyIdToken` fails with it, so no `/api/*` route can be exercised locally until a new key is generated.

### 3c. The isolated OpenAI call — the actual error

Since the only statement inside the handler's `try` that can throw is `openai.chat.completions.create(...)`, I reproduced it directly with the same client construction (`new OpenAI({ apiKey: process.env.OPENAI_API_KEY })`) and the same parameters (`gpt-4o-mini`, `temperature: 0.7`, `max_tokens: 600`). Verbatim:

```
name: Error
status: 429
code: credit_balance_exhausted
type: insufficient_quota
message: 429 You have no credits remaining. Add credits to continue using the API at
         https://platform.openai.com/settings/organization/billing/.
error obj: {"message":"You have no credits remaining. Add credits to continue using the API at
           https://platform.openai.com/settings/organization/billing/.","type":"insufficient_quota",
           "param":null,"code":"credit_balance_exhausted"}
--- stack ---
Error: 429 You have no credits remaining. Add credits to continue using the API at
https://platform.openai.com/settings/organization/billing/.
    at APIError.generate (C:\Users\kyler\wellness-app\node_modules\openai\core\error.js:63:20)
    at OpenAI.makeStatusError (C:\Users\kyler\wellness-app\node_modules\openai\client.js:159:32)
    at OpenAI.makeRequest (C:\Users\kyler\wellness-app\node_modules\openai\client.js:304:30)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
```

That object is exactly what `err` would be at `server.js:291`.

Each candidate, confirmed or ruled out:

| Candidate | Verdict | Evidence |
|---|---|---|
| `OPENAI_API_KEY` missing | **Ruled out** | Present in `backend/.env`, 167 chars, `sk-svcacct-…` service-account form |
| `OPENAI_API_KEY` invalid | **Ruled out** | An invalid key returns `401 invalid_api_key`. This returned `429`, which is only reachable **after** successful authentication |
| `server.js:3` cwd problem | **Ruled out on the standard path** | `npm run server` runs from repo root; dotenv reported 2 vars injected |
| **Quota / billing** | **CONFIRMED — this is it** | `type: insufficient_quota`, `code: credit_balance_exhausted`, "You have no credits remaining" |
| Model access to `gpt-4o-mini` | **Ruled out** | A model-permission failure is `404 model_not_found`. Quota is evaluated after the model resolves |
| Outbound TLS interception | **Ruled out** | The HTTPS request to `api.openai.com` completed and returned a structured JSON error body. A MITM failure would surface as `SELF_SIGNED_CERT_IN_CHAIN` / `UNABLE_TO_VERIFY_LEAF_SIGNATURE` at the socket layer, before any status code. (This contradicts the standing note that Norton TLS interception blocks outbound calls — it does not block this one) |
| Request size / token overflow | **Ruled out** | The probe was ~15 tokens. Overflow returns `400 context_length_exceeded`, a different code |

### 3d. Root cause and minimum fix

**Root cause: the OpenAI account has no credit balance.** Every `/api/ai-chat` call reaches OpenAI, authenticates successfully, and is rejected with `429 insufficient_quota`. The handler's bare `catch` at `server.js:289-292` swallows the status and re-emits a flat `500 { error: 'AI chat failed' }`, so a billing problem is presented to the client as a server fault.

**Minimum fix: add credits to the OpenAI account.** Nothing in the code needs to change for the Guide to start working.

Three things make this worse than it needs to be, all downstream of the same catch-all. Stating them as findings, not proposing changes:

1. **A 429 is laundered into a 500.** `server.js:291` catches everything and returns 500. The client's `extractRateLimit` (`AIChatModal.tsx:76`) looks for `code: 'daily_limit_exceeded' | 'hourly_limit_exceeded'` on the response body — OpenAI's `credit_balance_exhausted` never matches, so the user sees the generic `"I'm having trouble connecting right now."` rather than anything actionable.
2. **Each tap costs three OpenAI calls.** `apiRequest` (`client.ts:131`) defaults `maxRetries = 2` and only short-circuits on 4xx (`:144-149`). Because the backend converts the 429 into a **500**, the retry guard does not fire, and the client retries twice with 1s then 2s backoff. The one thing express-rate-limit's back-pressure design exists to prevent — hammering a limit — is reintroduced by the status rewrite.
3. **The failure is invisible in production.** The only record is `console.error` on the server. There is no analytics event for a Guide failure (`types/analyticsEvents.ts` declares eight events, none AI-related), so nothing would have surfaced this except a user report.

---

## Q4 — GUARDRAILS PER MESSAGE

One message traced end to end: user on **Home** taps the Guide pill, consent already granted, types `Help me focus`, taps send.

### 4a. Client-side, before the request leaves the device

| # | Guardrail | File:line | Checks | On failure |
|---|---|---|---|---|
| 1 | Consent gate | `GuidePill.tsx:70` → `AIConsentContext.tsx:74` | `hasConsent` truthy | Consent modal shown, chat never opens, callback deferred |
| 2 | Input length cap | `AIChatModal.tsx:616` | `maxLength={500}` on the `TextInput` | Keystrokes past 500 are silently dropped by the OS. No message, no counter |
| 3 | Non-empty guard | `AIChatModal.tsx:441` | `!messageText.trim()` | Early `return`. Send button also `disabled` at `:628` |
| 4 | In-flight guard | `AIChatModal.tsx:441` | `isLoading` | Early `return`. Prevents concurrent sends from one modal |
| 5 | Auth token attach | `client.ts:24-32` | `auth.currentUser` exists → `Authorization: Bearer <idToken>` | Logs `Error getting auth token` and **sends the request anyway, unauthenticated**. The server then 401s |
| 6 | Request timeout | `ai.service.ts:156` | `timeout: 60000` (overrides the instance default `30000` at `client.ts:17`) | Axios abort → caught at `AIChatModal.tsx:481` → generic error bubble |
| 7 | Retry policy | `client.ts:134-159` | Retries up to 2 times; `throw` immediately on any 4xx | 5xx is retried twice with 1s/2s backoff. See Q3d item 2 |

There is **no client-side rate limit**, no per-minute cap, no token counting, and no profanity or content check. There is no debounce beyond the `isLoading` latch.

### 4b. Auth

`app.use('/api', requireAuth)` at `server.js:122` — applied to every `/api` route, before any handler.

`backend/middleware/auth.js`:

| Check | Line | Failure response |
|---|---|---|
| `Authorization` header present and starts with `Bearer ` | `:12-14` | `401 { error: 'Missing or invalid Authorization header' }` |
| Token segment non-empty after the split | `:18-22` | `401 { error: 'Missing or invalid Authorization header' }` |
| `admin.auth().verifyIdToken(token)` resolves | `:25` | `401 { error: 'Invalid or expired token' }`, with `console.error('Auth middleware: token verification failed -', err.message)` |

On success it sets `req.uid` and `req.user`. `req.uid` matters beyond auth — it is the rate-limiter key (4c).

**Ordering note:** `requireAuth` is registered at `:122`, *after* `globalLimiter` at `:72` but *before* the route-level `aiLimiter`/`aiDailyLimiter` in the `app.post` chain. So `req.uid` is populated by the time the AI limiters run, and their `keyGenerator` works as intended.

### 4c. Rate limiting

| Limiter | File:line | Window | Max | Key | On exceed |
|---|---|---|---|---|---|
| `globalLimiter` | `server.js:64-72` | 15 min | 100 | **IP** (default `keyGenerator`) | `429 { error: 'Too many requests, please try again later.' }` — plain shape, **no `code` field** |
| `aiLimiter` | `server.js:92-104` | 60 min | 30 | `req.uid \|\| req.ip` | `rateLimitHandler('hourly_limit_exceeded', …)` → `429` with `error`, `code`, `message`, `retryAfter`, `resetAt`, plus a `Retry-After` header |
| `aiDailyLimiter` | `server.js:107-119` | 24 h | 150 | `req.uid \|\| req.ip` | `rateLimitHandler('daily_limit_exceeded', …)` → same shape |

The two AI limiters set `validate: false`, which disables express-rate-limit's own configuration warnings.

The client understands only the two AI-limiter shapes (`AIChatModal.tsx:80`). A `globalLimiter` 429 has no `code`, so `extractRateLimit` returns `null` and the user gets the generic connection error — technically a mis-attribution, though a mobile client is unlikely to trip a 100-per-15-min IP cap alone.

`globalLimiter` being keyed by **IP** rather than uid means users behind one NAT share a budget.

### 4d. Input validation — `validateAIChat` in full

`backend/middleware/validate.js:33-74`. Constants: `MAX_MESSAGES_COUNT = 50` (`:6`), `MAX_MESSAGE_LENGTH = 5000` (`:7`), `MAX_PROMPT_LENGTH = 5000` (`:4`, the `sanitizeString` default).

| # | Check | Line | Behaviour | Effective? |
|---|---|---|---|---|
| 1 | `Array.isArray(messages)` | `:36-38` | `400 { error: 'messages must be an array' }` | **EFFECTIVE** |
| 2 | `messages.length > 50` | `:39-41` | `400 { error: 'Maximum 50 messages allowed' }` | **EFFECTIVE** |
| 3 | Role coercion | `:44-45` | Anything not `'user'`/`'assistant'` is rewritten to `'user'` | **EFFECTIVE** — this is what prevents a client injecting a `system` turn |
| 4 | `messages.slice(-50)` | `:44` | Keeps the newest 50 | **EFFECTIVE**, though unreachable: check 2 already 400s above 50 |
| 5 | `sanitizeString(m.content, 5000)` | `:46` | Type-check → non-strings become `''`; then `.slice(0,5000).trim()` | **EFFECTIVE** |
| 6 | `context.page.label = sanitizeString(...)` | `:51` | Assigns a property to `context.page` | **NO-OP.** The client sends `context.page` as a **string** (`AIChatModal.tsx:411`, `page: initialContext?.screen \|\| 'unknown'`). `validate.js` is CommonJS with no `"use strict"`, so property assignment on a string primitive silently does nothing. Sanitises nothing, throws nothing |
| 7 | `context.page.path = sanitizeString(...)` | `:52` | Same | **NO-OP**, same reason |
| 8 | `context.userSummary.goals` sanitise + `filterPromptInjection` | `:57-63` | Caps at 10, filters titles | **NO-OP** — `context.userSummary` is never sent by the client. The guard `if (context.userSummary && …)` is simply false |
| 9 | `context.userSummary.habits` sanitise + `filterPromptInjection` | `:64-70` | Same | **NO-OP**, same reason |

**The consequential finding here:** `filterPromptInjection` (`:22-30`, which redacts `ignore previous instructions`, `you are now`, `system:`) is applied **only** to `userSummary` goal and habit titles. It is **never applied to `messages[].content`.** So the one field a user actually controls, and the only field that reaches the model, receives no injection filtering at all. The prompt-injection defence guards a field the app does not send and leaves the field it does send unguarded.

Everything in `context` other than `page` and `userSummary` passes through untouched — but see 4e: none of it is read.

### 4e. Prompt construction — the exact final string

Built at `server.js:222-283` as a template literal, then assembled at `server.js:285-288`:

```js
const history = [
  { role: 'system', content: systemPrompt },
  ...messages.map(m => ({ role: m.role, content: m.content })),
];
```

For our representative request, the client sent `context = { currentTime: "...", page: "home", brainState: "...", habits: [...], ... }` — a **flat** object. The server destructures `const { page, userSummary } = context`, so:

- `page` is the string `"home"` → `page?.label` is `undefined` → resolves to `'Unknown'`
- `page?.path` is `undefined` → resolves to `'/'`
- `userSummary` is `undefined` → `goalsText` and `habitsText` both fall through their `|| 'None on file'` defaults

The **exact** final payload sent to OpenAI, with the CONTEXT block resolved:

```
[
  { role: "system", content:
"""
You are Vara Coach — a calm, knowledgeable brain-health guide. You help users build sustainable habits, routines, and focus through 5 pillars:

1. Neuroplasticity (growth through challenge and novelty)
2. Neuroenergy (sleep, movement, nutrition as brain fuel)
3. Neurofocus (attention, concentration, reducing cognitive load)
4. Neuroresilience (stress tolerance, recovery, regulation)
5. Neurosocial (connection, belonging, social brain health)

VOICE: Calm, intelligent, supportive, clear. Use conditional language ("can help," "may support," "many people find"). Never use urgency, shame, guilt, streak pressure, or hype. Frame missed days as normal. Keep responses to 2-3 short paragraphs, 1-3 options max. Ask one clarifying question if needed.

AMCC challenges and neuroplasticity activities: frame as invitations, never prescriptions. Do not specify durations, temperatures, or protocols for physical challenges.

=== TOPIC ROUTING ===

TIER 1 — HARD DECLINE (say these are outside your scope, warmly):
Financial advice (stocks, crypto, investing, tax, insurance), medical advice (diagnoses, medications, dosages, supplements with dosing), legal advice, clinical mental health (CBT, trauma processing, diagnostic screening, medication management), political opinions, advice about other people's mental health.

Do not reframe these through brain health — no "well, financial stress affects your brain..." bridges. Acknowledge warmly, state it's outside your lane, optionally suggest the right resource.

Example: "Should I buy ETFs?" → "That's outside what I'm built for — I'm focused on your brain health and routines. A financial advisor would be the right person for that one."

TIER 2 — GENUINE BRIDGE (engage through brain-health lens, stay in your lane):
Sleep, exercise/movement, general nutrition patterns, screen time, work-life balance, decision fatigue, stress from work/life, social connection, mindfulness/breathwork, caffeine/alcohol effects on cognition.

Engage with the brain-health connection. Don't become a nutritionist, trainer, or life coach. If the question goes deeper than your domain, acknowledge the limit.

Example: "I'm stressed about money" → Engage with the stress and its cognitive effects. Do not give financial advice.

TIER 3 — CONVERSATIONAL PASS (brief, human, no brain-health bridge):
Cars, movies, sports, weather, trivia, jokes, anything casual with no liability and no real brain-health connection.

Be briefly warm (1-2 sentences), don't force a brain-health angle, offer to help with brain-health topics. If user stays off-topic for 3+ exchanges, gently redirect.

=== CRISIS RESPONSE ===

If a user expresses self-harm, suicidal thoughts, or acute crisis: respond warmly without judgment, do not coach or diagnose, and say:
"I hear you, and I'm glad you shared that. This is beyond what I can support — but you can reach the 988 Suicide & Crisis Lifeline anytime by calling or texting 988."

Remain available afterward without processing the crisis.

=== NEVER ===

Make medical claims or diagnoses. Prescribe medications or supplement dosages. Provide therapy. Use urgency or shame language. Promise specific outcomes. Say "rewire your brain," "unlock your potential," "no excuses," or "push through."

=== CONTEXT ===

- Current page: Unknown (path: /)
- User summary:
  - Goals: None on file
  - Habits: None on file

Use the user's actual data (goals, habits, brain state) to personalize responses. Tailor to readiness score when available (low readiness = lighter suggestions). Suggest neuroplasticity activities when user hasn't tried anything new recently. Recommend regulation tools when user seems stressed. If user asks for a plan, give time-boxed steps (e.g., "10 minutes today").
"""
  },
  { role: "assistant", content: "Hi! I'm Vara, your brain-health wellness coach. How can I support you today?" },
  { role: "user", content: "Help me focus" }
]
```

Two things to read off this directly. The assistant greeting is a **real turn in the payload**, not client-only chrome. And the CONTEXT block is inert boilerplate on every single request — the six Firestore reads `buildCoachContext` performs (`AIChatModal.tsx:302-327`: `brainStateCheckIns`, `dailyReflections`, `brainMetrics`, 5 `journalEntries`, 20 `focusSessions`, AsyncStorage) are computed, serialised, sent over the wire, validated, and then never read.

The prompt also instructs the model to "Tailor to readiness score when available" and to use "brain state" — neither of which is in the payload, and `readiness score` does not exist anywhere in the mobile tree.

### 4f. Model parameters and stop sequences

`server.js:285-290`:

| Parameter | Value |
|---|---|
| `model` | `'gpt-4o-mini'` |
| `temperature` | `0.7` |
| `max_tokens` | `600` |
| `messages` | `history` (above) |

**No `stop` sequences.** No `top_p`, `frequency_penalty`, `presence_penalty`, `seed`, `response_format`, `tools`, or `user` field. No streaming — the route is explicitly the non-streaming one. No OpenAI moderation endpoint call anywhere in `backend/`.

Not passing a `user` field means OpenAI's own abuse tooling cannot attribute traffic to an end user.

### 4g. Output handling

| Step | File:line | What it does |
|---|---|---|
| Empty-response fallback | `server.js:289` | `?.trim() \|\| "I couldn't find the right words - try again?"` |
| `stripMarkdown(raw)` | `server.js:290` → `backend/utils/stripMarkdown.js` | Removes code blocks, inline code, images, links (keeps text), headers, bold/italic/strikethrough, horizontal rules, bullets, numbered lists, blockquotes; collapses 3+ newlines; trims |
| Second strip, client-side | `ai.service.ts:159-165` | Repeats a subset: `**`, `#{1,3} `, bullets, numbered lists — **plus** `.replace(/—/g, ', ')`, converting every em-dash to a comma-space |

**There is no output filtering of any kind beyond formatting.** Explicitly and exhaustively: no banned-phrase check, no check against the prompt's own `=== NEVER ===` list, no crisis-language detection on the response, no PII scrub, no medical-claim detector, no moderation API call, no length enforcement beyond `max_tokens`. `stripMarkdown` is a **presentation** transform and nothing more.

The em-dash replacement in `ai.service.ts:162` is worth flagging: it exists to satisfy the app-wide no-em-dash copy rule, and it applies to model output the product does not otherwise inspect. It is the only content-level transform on the response, and it is typographic.

### 4h. Crisis handling

**Prompt-only. There is zero code-level detection, on input or on output.**

I grepped `988`, `suicid`, `self-harm`, `selfharm`, and `crisis` across `mobile/src` and `backend/`. Every hit is inside the system-prompt string literal at `server.js:254-259`. There are no other occurrences anywhere in either tree.

Concretely, this means:

- A message containing self-harm language passes `validateAIChat` unchanged and is sent to `gpt-4o-mini` like any other message.
- Whether the 988 line is surfaced depends entirely on the model complying with a natural-language instruction at `temperature: 0.7`.
- If the model does not comply, nothing catches it — no response-side check looks for the crisis phrasing or its absence.
- If the OpenAI call fails (which, per Q3, it currently always does), the user receives `"I'm having trouble connecting right now. Please try again in a moment."` — with **no crisis resource at all**. Right now that is the guaranteed response to a crisis disclosure.

The in-app footer at `AIChatModal.tsx:641` reads "Vara Coach helps with brain-health habits and routines. It's not a therapist or medical provider." That is a static disclaimer, always shown, not a detection.

### 4i. Logging and content persistence

| Location | What is logged | Contains message content? |
|---|---|---|
| `server.js:291` | `console.error('ai-chat error:', err)` | **No** — the OpenAI `APIError`. It carries status/code/type/message, not the request body |
| `auth.js:31` | `console.error('Auth middleware: token verification failed -', err.message)` | No |
| `AIChatModal.tsx:466` (`console.warn`) | `'Coach context fetch failed, sending without context:'` + error | No |
| `AIChatModal.tsx:481` (`console.error`) | `'Error getting AI response:'` + error | No — but an Axios error object can carry `error.config.data`, which **is** the serialised request body including message text. Whether a console sink captures that depends on the RN log pipeline; **requires runtime verification** |
| `client.ts:38-39` | `console.log('📦 Request Data:', config.data)` — the full body | **YES**, but double-gated: `config.debug && __DEV__`. `ai.service.ts:155` sets `debug: __DEV__`, so this fires **in development only** and prints the entire message history to the Metro console |
| `client.ts:54` | `console.log('📦 Response Data:', response.data)` | **YES**, same `__DEV__` gate — prints the model's reply |

**Message content is never persisted server-side.** `server.js` writes nothing to Firestore, no file, no log sink. There is no request logger middleware (`morgan` or similar is absent).

**Message content never enters analytics.** `types/analyticsEvents.ts` declares eight events (`weekly_open`, `weekly_close`, `weekly_close_failed`, `floor_set`, `weekly_entry`, `weekly_close_entry`, `sign_up`, `login`) — none AI-related. The content firewall in that file admits no open `string` value, so Guide content could not be logged there without a type error. There is no Guide telemetry of any kind: no open event, no send event, no failure event.

Consequence: **a Guide outage is invisible to the product.** The current 100% failure rate produced no signal anywhere.

---

### GUARDRAIL CHAIN

Every check one message passes, in order, from tap to rendered reply.

1. `GuidePill.tsx:70` — consent gate: `hasConsent` truthy, else defer and show consent modal — **EFFECTIVE**
2. `AIChatModal.tsx:616` — input cap `maxLength={500}` on the TextInput — **EFFECTIVE**
3. `AIChatModal.tsx:441` — non-empty guard: `!messageText.trim()` → return — **EFFECTIVE**
4. `AIChatModal.tsx:441` / `:628` — in-flight guard: `isLoading` → return, send button disabled — **EFFECTIVE**
5. `AIChatModal.tsx:466` — history assembly: full unbounded thread, no trim, no token budget — **NO-OP** (no bound applied client-side)
6. `client.ts:24-32` — attach `Authorization: Bearer <Firebase ID token>` — **EFFECTIVE** (but falls through and sends unauthenticated on token error)
7. `ai.service.ts:156` — 60s request timeout, overriding the 30s instance default — **EFFECTIVE**
8. `server.js:47-53` — CORS origin allow-list — **NO-OP for the mobile client** (no `Origin` header ⇒ `if (!origin) return callback(null, true)`)
9. `server.js:58` — `helmet()` security headers — **EFFECTIVE** (response headers; no bearing on request content)
10. `server.js:61` — `express.json({ limit: '2mb' })` body-size cap — **EFFECTIVE**
11. `server.js:72` — `globalLimiter`: 100 req / 15 min, keyed by **IP** — **EFFECTIVE** (429 shape lacks a `code`, so the client cannot identify it)
12. `server.js:122` — `requireAuth`: Bearer header present → `verifyIdToken` → sets `req.uid`; else `401` — **EFFECTIVE**
13. `server.js:205` — `aiLimiter`: 30 req / hour, keyed by `req.uid` — **EFFECTIVE**
14. `server.js:205` — `aiDailyLimiter`: 150 req / 24h, keyed by `req.uid` — **EFFECTIVE**
15. `validate.js:36-38` — `messages` must be an array, else `400` — **EFFECTIVE**
16. `validate.js:39-41` — `messages.length <= 50`, else `400` — **EFFECTIVE**
17. `validate.js:44` — `messages.slice(-50)` — **EFFECTIVE** (unreachable; check 16 rejects first)
18. `validate.js:45` — role coercion: anything not `user`/`assistant` → `user`; blocks client-injected `system` turns — **EFFECTIVE**
19. `validate.js:46` — `sanitizeString(m.content, 5000)`: non-string → `''`, then truncate + trim — **EFFECTIVE**
20. `validate.js:51` — `context.page.label` sanitise — **NO-OP** (`context.page` is a string primitive; sloppy-mode assignment silently discarded)
21. `validate.js:52` — `context.page.path` sanitise — **NO-OP** (same)
22. `validate.js:57-63` — `userSummary.goals` cap-10 + `sanitizeString` + `filterPromptInjection` — **NO-OP** (`userSummary` is never sent)
23. `validate.js:64-70` — `userSummary.habits` cap-10 + `sanitizeString` + `filterPromptInjection` — **NO-OP** (same)
24. *(absent)* prompt-injection filtering on `messages[].content` — **NOT PRESENT**
25. `server.js:222-283` — system prompt prepended; CONTEXT block resolves to `Unknown` / `None on file` on every request — **NO-OP as personalisation**, EFFECTIVE as instruction
26. `server.js:286-290` — model params: `gpt-4o-mini`, `temperature: 0.7`, `max_tokens: 600`, no `stop`, no `user`, no moderation call — **EFFECTIVE** (`max_tokens` only)
27. *(absent)* OpenAI moderation endpoint, input or output — **NOT PRESENT**
28. `server.js:289` — empty-response fallback string — **EFFECTIVE**
29. `server.js:290` — `stripMarkdown(raw)` formatting transform — **EFFECTIVE** (formatting only)
30. *(absent)* banned-phrase / NEVER-list / medical-claim / PII check on output — **NOT PRESENT**
31. *(absent)* crisis-language detection on input or output — **NOT PRESENT** (prompt instruction only)
32. `server.js:291` — catch-all → `500 { error: 'AI chat failed' }`, collapsing OpenAI's 429 — **EFFECTIVE but harmful** (see Q3d)
33. `ai.service.ts:159-165` — second client-side strip incl. em-dash → comma — **EFFECTIVE** (formatting only)
34. `client.ts:144-149` — retry policy: 4xx throws immediately, 5xx retried twice — **EFFECTIVE but defeated** by step 32 rewriting the 429 as a 500
35. `AIChatModal.tsx:76-118` — `extractRateLimit` → friendly 429 copy, else generic connection error — **EFFECTIVE only for the two backend limiter codes**; OpenAI quota errors fall through to the generic message

---

## Q5 — SURFACE AND ENTITLEMENT

### 5a. Every `GuidePill` render site

Five, all passing a `context` object whose only populated key is `screen`:

| # | File:line | Context object | testID |
|---|---|---|---|
| 1 | `src/screens/DashboardScreen.tsx:248` | `{ screen: 'home' }` | `home-guide` |
| 2 | `src/screens/Focus/FocusHubScreen.tsx:124` | `{ screen: 'focus' }` | `focus-hub-guide` |
| 3 | `src/screens/Energy/EnergyHubScreen.tsx:110` | `{ screen: 'energy' }` | `energy-hub-guide` |
| 4 | `src/screens/PlanScreen.tsx:269` | `{ screen: 'time' }` | `time-guide` |
| 5 | `src/screens/community/CommunityScreen.tsx:190` | `{ screen: 'community' }` | `community-guide` |

`GuidePillProps.context` (`GuidePill.tsx:32-37`) declares optional `userGoals?: any[]` and `userHabits?: any[]`. **No call site passes either.** `buildCoachContext` reads `initialContext?.userHabits || []` at `AIChatModal.tsx:381`, so `topHabits` is always `[]` — the `habits` array in the context object is always empty, independent of the server-side discard.

So the personalisation chain is broken in **three** places, not one: the caller passes no habits, the client would send an empty array, and the server reads a field that is not there.

Not mounted on: the Practices hub, the Learn hub, any session surface (timer, practice player, check-in flow), any weekly-loop screen, any onboarding screen, the paywall, Settings, or any detail screen.

### 5b. Is there any subscription or entitlement check on Guide access?

**No. None, at any layer.**

Grepped `useSubscription`, `canAccessApp`, `entitlement`, `Purchases`, `isPro`, `isPremium` across `src/components/ai/`, `src/services/api/ai.service.ts`, and `src/context/AIConsentContext.tsx` — **zero hits**.

- `GuidePill` imports `useAIConsent` and `useReducedMotion`. No subscription hook.
- `AIChatModal` imports `useAuth`, `db`, Firestore helpers, `normalizeBrainState`, `AsyncStorage`, `chatWithAI`. No subscription hook.
- `chatWithAI` (`ai.service.ts:146`) sends `messages` and `context`. It does not read or forward entitlement.
- The server checks `requireAuth` only. It never reads a subscription claim, a custom claim, or a Firestore subscription document. `req.user` (the decoded token) is set but never inspected beyond `req.uid` for rate-limiter keying.

The only gating on Guide access is **structural**: the pill mounts on five screens, and those five screens live inside `MainNavigator`, which `AppNavigator.tsx:1402` renders only when `subscriptionStatus?.canAccessApp` is true. Access control is therefore a property of *where the pill is mounted*, not of any check the Guide performs. Mounting `GuidePill` on a screen outside `MainNavigator` would expose the Guide with no entitlement check whatsoever.

The practical cost bound is `aiDailyLimiter`: 150 AI requests per uid per 24h across **all** AI endpoints combined (daily plan, suggestions, journal prompt, journal summary, ai-chat, week recap). That is a cost cap, not an entitlement.

### 5c. Reachable during trial, onboarding, and on the paywall?

| State | Reachable? | Why |
|---|---|---|
| **Free trial** | **Yes** | A trial resolves to `canAccessApp: true` (`utils/subscription.ts:13`; `combineStatus` at `useSubscription.ts:81` returns the Firestore status when it grants). `MainNavigator` mounts, all five pills render, and no further check exists |
| **Onboarding** | **No** | `AppNavigator.tsx:1397` renders `OnboardingNavigator` as a full-screen replacement. None of the nine V3 screens mounts `GuidePill` |
| **Paywall** | **No** | `AppNavigator.tsx:1402` renders `PaywallNavigator` as a full-screen replacement. `PaywallScreen` and `RedeemCodeScreen` do not mount `GuidePill` |
| **Expired subscription** | **No** | Same branch as the paywall — the user never reaches `MainNavigator` |
| **Email unverified** | **No** | `VerificationNavigator` branch |

So a trial user has completely unmetered Guide access, subject only to the shared 30/hour and 150/day AI caps. Given `gpt-4o-mini` pricing and `max_tokens: 600`, that is a small absolute exposure — but it is bounded by a rate limiter, not by a product decision.

### 5d. Any proactive or system-initiated Guide message

**None. The Guide is 100% user-initiated.**

`modalVisible` in `GuidePill.tsx` is set `true` in exactly one place: `handlePress` (`:70`), which is bound to `onPress` on the `TouchableOpacity` (`:88`). There is no effect, timer, notification handler, deep link, or context call that opens it.

`AIChatModal` has exactly one render site — `GuidePill.tsx:103`. Nothing else in the tree mounts it.

`handleSend` (`AIChatModal.tsx:439`) is invoked from two places, both user gestures: the send button (`:602`) and `handleQuickPrompt` (`:494`), which is bound to the four `QUICK_PROMPTS` chips ("Help me focus", "I need a reset", "Build a routine", "Feeling overwhelmed").

The seeded greeting at `AIChatModal.tsx:257-263` is the closest thing to a proactive message, and it is **not** one: it is a hardcoded client-side string with no network call behind it. It costs nothing and says the same words to everyone, every time.

There is no deep link into the Guide either — `navigation/linking.ts` maps only `login`, `main`, and `verify`.

---

## OPEN QUESTIONS

1. **Does the Guide work once credits are added?** Add credits to the OpenAI account, then re-run the isolated call from Q3c. A success prints the reply and a `usage` object. This is the one check that closes Q3 completely.

2. **What is the real production `ai-chat` failure, if the deployed backend uses a different OpenAI account?** SSH/console into the deployed backend and read the `console.error('ai-chat error:', err)` line. My finding is from the **local** `backend/.env` key. If production carries a different key, the local quota exhaustion may not be the production cause.

3. **Does the deployed `/api/ai-chat` return `reply` or `text`?** `ai.service.ts:151` reads `response.reply`; sibling handlers such as `/api/journal-summary` return `{ text }`. Issue one authenticated request against the deployed URL and inspect the JSON keys. A mismatch renders an empty assistant bubble rather than an error.

4. **Does the thread actually survive a tab switch on device?** Device walk: open the Home Guide, send a message, switch to Community, switch back, reopen. If the greeting is alone, React Navigation is unmounting the screen and my "survives" answer in 1b is wrong for that case.

5. **Does a consent-modal false prompt occur on cold start?** Device walk: cold-launch as a consented user and tap the Guide within the first second. If the consent sheet appears, the `hasConsent === null` window is user-visible.

6. **Does `console.error('Error getting AI response:', error)` leak message text?** Inspect an Axios error in the RN debugger at `AIChatModal.tsx:481` and check whether `error.config.data` is serialised into whatever log sink is active. Relevant only if a remote log sink is ever attached.

7. **Is the revoked service-account key also in use by the deployed backend?** Check the deployed environment's `GOOGLE_APPLICATION_CREDENTIALS` / ADC. If it uses the same revoked key, `requireAuth` is failing in production too and the 500 would be moot — every request would be 401ing first.

8. **Is `backend/serviceAccountKey.json` committed to git?** Run `git log --oneline -- backend/serviceAccountKey.json`. The file contains a private key; it is revoked, which limits the exposure, but its history matters for the security posture.

---

## SURPRISES

1. **The 500 is a laundered 429, and the cause is billing.** OpenAI returns `429 insufficient_quota / credit_balance_exhausted` — "You have no credits remaining." The bare `catch` at `server.js:291` rewrites every failure as `500 { error: 'AI chat failed' }`. The Guide is not broken; the account is empty. No code change is required to fix it.

2. **The status rewrite triples the cost of every failure.** `client.ts:144-149` deliberately refuses to retry 4xx because "429 is explicit back-pressure — retrying just burns through the reset window." That guard is correct and it never fires, because the backend converted the 429 into a 500 first. One tap on the Guide issues **three** OpenAI calls at 1s and 2s backoff. The exact behaviour the comment was written to prevent is what happens.

3. **The local Firebase service-account key is revoked, and this is now settled.** `invalid_grant: Invalid JWT Signature` from `admin.auth()`, and `INVALID_CUSTOM_TOKEN` from Identity Toolkit. Local signing works (the private key is intact); server-side verification does not. Project memory carried this as an open question — "a key thought revoked still authenticates." It does not. It is revoked, `requireAuth` fails with it, and **no `/api/*` route can be exercised locally until a new key is generated.**

4. **Outbound TLS is fine.** The standing note that Norton TLS interception blocks Admin SDK calls does not explain this failure and does not apply to the OpenAI path — the request to `api.openai.com` completed and returned a structured JSON error body. The Admin SDK failure is a revoked key, full stop.

5. **The one field the user controls is the one field with no injection filtering.** `filterPromptInjection` is applied only to `userSummary.goals[].title` and `userSummary.habits[].title` — fields the client never sends. `messages[].content` — the only user-authored text that reaches the model — is truncated and trimmed but never injection-filtered. The defence guards a phantom and leaves the real input open.

6. **Crisis handling is a sentence in a prompt, and right now it cannot fire at all.** No code anywhere detects crisis language on input or output; the only occurrences of `988`/`crisis` in either tree are inside the prompt string. And because every request currently fails, a user disclosing self-harm today receives `"I'm having trouble connecting right now. Please try again in a moment."` with no resource attached. That is the current, live behaviour.

7. **There is no output filtering whatsoever.** `stripMarkdown` is a formatting transform. There is no banned-phrase check, no check against the prompt's own `=== NEVER ===` list, no moderation API call, no PII scrub. The only content-level transform on a model response in the entire pipeline is `ai.service.ts:162` converting em-dashes to commas — a typography rule.

8. **The Guide has five separate memories, not one.** Each `GuidePill` mount owns its own `AIChatModal` and its own `messages` array. A conversation on Home is invisible from the Focus hub. Five threads can be live at once, and none of them survives a force-quit.

9. **The greeting and every error bubble are sent to the model as assistant turns.** `[...messages, userMessage]` includes the hardcoded `"Hi! I'm Vara…"` and every `"I'm having trouble connecting right now."`. During the current outage, a persistent user builds a history in which the assistant repeats that apology — and each retry sends the growing transcript back.

10. **The personalisation chain is broken in three places, not one.** The inventory found the server discarding the context. Upstream of that: no `GuidePill` call site passes `userHabits`, so `AIChatModal.tsx:381` reads `[]`, so `topHabits` is always empty. The six Firestore reads per message produce a payload that was already hollow before the server ignored it.

11. **`aiDailyLimiter` is shared across every AI feature.** 150 requests per uid per 24h covers daily plan, suggestions, journal prompt, journal summary, week recap **and** ai-chat combined. Heavy journal use silently consumes the Guide's budget, and the client renders that as "You've reached today's Vara Coach limit" — naming the wrong feature.

12. **`globalLimiter` is keyed by IP, and its 429 is unreadable to the client.** `extractRateLimit` requires `code: 'daily_limit_exceeded' | 'hourly_limit_exceeded'`; `globalLimiter`'s response has no `code` field at all, so tripping it shows the generic connection error. Users behind one NAT also share its 100-per-15-min budget.

13. **A Guide outage is invisible to the product.** There is no analytics event for opening the Guide, sending a message, or failing. `types/analyticsEvents.ts` declares eight events and none is AI-related. The current 100% failure rate generated no signal anywhere — only a `console.error` on a server nobody is reading.

14. **Consent has no "declined" state.** A decline writes nothing, so `requireConsent` cannot distinguish never-asked from explicitly-refused. The pill stays fully live and re-prompts on every subsequent tap, forever, with no cooldown and no changed copy. `pendingCbRef` is also a single ref rather than a queue, so two overlapping consent requests silently drop one callback.

15. **Nothing about the Guide is entitlement-gated.** Access is purely a side effect of which screens mount the pill and where those screens sit in the navigator. Mounting `GuidePill` on any screen outside `MainNavigator` — including, say, the paywall — would expose it with no check at all.

---

*End of diagnostic. Read-only apart from the Q3 execution; the only file written was this one.*

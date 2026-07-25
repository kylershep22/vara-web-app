# Video Playback Foundation — Read-Only Audit

**Date:** 2026-07-24
**Scope:** Current state of media playback, Firebase Storage media loading, and modal/sheet
patterns in `mobile/`, ahead of speccing a reusable video player modal for Focus explainer content.
**Method:** Read-only inspection of `mobile/src`, `mobile/package.json`, `mobile/app.json`,
`mobile/node_modules`, and root `storage.rules`. No code was changed.

---

## 1. Audio playback today

### Library

**`expo-av`, version `~16.0.8`** (resolved `16.0.8` in `node_modules`). It is a **direct
dependency** in `mobile/package.json:42`. There is no `react-native-track-player`, no
`react-native-video`, and **`expo-audio` is NOT installed** (absent from `node_modules`).

`expo-av` is the sole audio engine. It is imported directly in 9 source files:

| File | Use |
|---|---|
| `src/services/audio/protocolAudioLoader.ts` | Protocol/practice audio loader (the ElevenLabs path) |
| `src/context/AudioPlayerContext.tsx` | Global persistent player (sleep sounds, podcast, meditations) |
| `src/components/protocol/AudioStepView.tsx` | Per-step audio inside `GuidedSessionPlayer` |
| `src/components/library/BreathworkTimer.tsx` | Breathwork cue audio |
| `src/hooks/useAmbientSound.ts` | Focus-timer ambient sound |
| `src/hooks/useCompletionSound.ts` | Completion chime |
| `src/screens/NotificationSettingsScreen.tsx` | Notification sound preview |
| `src/screens/_dev/ProtocolAudioLoaderTestScreen.tsx` | Dev harness |
| `src/hooks/useStepCountdown.ts` | Comment only — countdown is driven by `onPlaybackStatusUpdate` |

### Where the practice audio lives and how it's fetched

`mobile/src/services/audio/protocolAudioLoader.ts` is the loader for guided-practice audio.
Concretely:

1. Takes a relative path (e.g. `nsdr/nsdr_10min_v1.mp3`).
2. Prefixes it with the Storage root constant `STORAGE_ROOT = 'protocolAudio'` (line 22).
3. Calls `getDownloadURL(ref(storage, fullPath))` from `firebase/storage` → an **HTTPS download
   URL**, not a local path and not a bundled asset.
4. Caches the resolved URL in an in-memory `Map` for the JS-bundle lifetime (deliberately not
   persisted — comment at lines 25–27 cites signed-URL/token expiry).
5. Feeds that URL to `Audio.Sound.createAsync({ uri: url }, { shouldPlay: false })`.

It also exposes `prefetchProtocolAudio()` (line 66), called from the Protocol Detail screen on
mount, which resolves the URL and briefly opens+unloads a `Sound` to pull bytes into the platform
HTTP cache. The stated budget is **<2s to first play on a warm network** (header comment lines
9–12).

`AudioPlayerContext` follows the same shape via a different resolver: `library.service.ts`
`getSleepAudioUrl()` (line 269) maps a content id → a hardcoded `sleep-audio/...` path →
`getDownloadURL` → `playTrack(title, uri)`.

### Streaming vs. full download

**It streams progressively.** Evidence, not inference:

- `Audio.Sound.createAsync(source, initialStatus, onPlaybackStatusUpdate, downloadFirst = true)` —
  `downloadFirst` defaults to `true` (`node_modules/expo-av/build/Audio/Sound.js:42`).
- But in `node_modules/expo-av/build/AV.js:140`, the guard is
  `if (downloadFirst && asset) { await asset.downloadAsync(); }`. `asset` is only non-null for
  `require()`d/bundled sources. The adjacent TODO comment reads *"we can download remote uri too
  once @nikki93 has integrated this into Asset."*
- Both call sites pass a remote `{ uri: 'https://…' }` object, so `asset` is `null`, the
  download-first branch is skipped, and the URI goes straight to native `AVPlayer` / `ExoPlayer`,
  which buffer progressively.

The prefetch-then-unload trick in `prefetchProtocolAudio` exists precisely because there is no
"download the whole file first" API on the remote path — it warms the OS HTTP cache instead.

---

## 2. Expo SDK version and video options

| Question | Answer |
|---|---|
| Expo SDK | **54** — `expo: ^54.0.0` in `package.json`, resolved `54.0.33` in `node_modules`. `app.json` has no explicit `sdkVersion` key. React Native `0.81.5`, React `19.1.0`. |
| `expo-video` compatible with SDK 54? | Yes. |
| `expo-video` already installed? | **Yes — `~3.0.16`, resolved `3.0.16`.** Direct dependency (`package.json:58`). |
| `expo-video` config plugin registered? | **Yes** — `"expo-video"` is in `app.json` → `expo.plugins`. The native module is already in the build. |
| `expo-av` present? | **Yes — direct dependency**, `~16.0.8`. Not transitive. |
| `expo-audio` present? | **No.** Not in `package.json`, not in `node_modules`. |

### `expo-video` is not just installed — it is already used in production code

- `src/components/media/VideoPlayer.tsx` — a 43-line wrapper over `useVideoPlayer` + `VideoView`
  with `allowsFullscreen`, `allowsPictureInPicture`, `nativeControls`. Props: `uri`, `style`,
  `autoPlay`.
- `src/components/media/MediaItem.tsx:22` — renders it for `media.type === 'video'`.
- `src/components/community/PostCard.tsx:244` — renders it for video attachments in the community
  feed.
- Re-exported from `src/components/media/index.ts:5`.

So this is **"installed and used"**, not "installed but unused." Note the existing `VideoPlayer` is
an inline, `100% × 100%` surface with native controls — it is not a modal and has no loading state,
error state, or Reduce Motion handling.

### Expo's guidance on `expo-av` vs `expo-video` / `expo-audio`

Determinable from installed package docs:

- `node_modules/expo-av/CHANGELOG.md`, entry for **15.1.1 — 2025-04-09**:
  *"Expo AV has now been deprecated."*
- `node_modules/expo-av/CHANGELOG.md`, entry for **15.0.1 — 2024-10-24**:
  *"Added deprecation warning to the `Video` component."*
- The installed `expo-av` README carries **no** deprecation banner and still links to the live SDK
  docs; the deprecation is only visible in the CHANGELOG.
- `expo-video`'s README describes it as *"A cross-platform, performant video component for React
  Native and Expo with Web support."*

Net: `expo-av` is formally deprecated upstream (since 15.1.1; this project is on 16.0.8, i.e.
post-deprecation), with `expo-video` and `expo-audio` as the replacements. The `expo-av` **Video**
component specifically has carried a deprecation warning since SDK 52-era. This project has already
completed the video half of that migration and has **not** started the audio half.

---

## 3. Firebase Storage access pattern

### How a streamable URL is obtained

One pattern, three implementations — all `getDownloadURL(ref(storage, path))` from
`firebase/storage`, with a module-level in-memory URL cache:

| Function | File | Root path |
|---|---|---|
| `resolveUrl()` (private) → `loadProtocolAudio()` / `prefetchProtocolAudio()` | `src/services/audio/protocolAudioLoader.ts` | `protocolAudio/` |
| `getSleepAudioUrl()` (private) → `getSleepSoundsWithUrls()` | `src/services/firebase/library.service.ts:269` | `sleep-audio/` |
| `uploadImage` / `deleteFile` helpers | `src/services/firebase/storage.service.ts` | user-supplied |

`src/config/firebase.ts` exports the initialized `storage` instance that all of these consume.

There is **no generic `getMediaUrl(path)` helper** — each media family has hand-rolled its own
resolver with its own cache. Video would be the third such resolver unless one is generalized.

### Storage security rules

**Location:** `storage.rules` at the **repo root** (not under `mobile/`). Deployed via
`firebase deploy --only storage` from the root project.

Relevant blocks:

```
match /sleep-audio/{allPaths=**} {
  allow read:  if isSignedIn();
  allow write: if isAdmin() && isAudioType() && underAudioSizeLimit();
}

match /protocolAudio/{allPaths=**} {
  allow read:  if isSignedIn();
  allow write: if isAdmin() && isAudioType() && underAudioSizeLimit();
}

match /{allPaths=**} {           // default deny
  allow read, write: if false;
}
```

Helpers defined: `isSignedIn()`, `isAdmin()` (custom claim `request.auth.token.admin == true`),
`isImageType()`, `isAudioType()` (`audio/.*`), `underImageSizeLimit()` (5 MB),
`underAudioSizeLimit()` (50 MB).

**Would video under a new path be covered?** **No.** Three separate gaps:

1. The last block is an explicit **default deny** on `/{allPaths=**}`. A new
   `focusVideo/` (or similar) prefix would be denied read for every signed-in user until a
   matching `match` block is added.
2. There is **no `isVideoType()` helper** — content-type validation for `video/.*` does not exist.
3. There is **no video size limit helper.** The audio ceiling is 50 MB; an explainer video will
   plausibly exceed that, so a new `underVideoSizeLimit()` constant is a decision to make, not a
   reuse.

Note the write rules are admin-only for both media families, and the `protocolAudio` comment states
production audio lands via Firebase Console / CLI, not the client SDK. Video should follow that same
posture (admin-upload only) unless there's a reason to diverge.

### Storage organization convention

Observed convention, in order of how the codebase does it:

- **Top-level prefix per media family**, camelCase or kebab-case (inconsistent between the two):
  `protocolAudio/`, `sleep-audio/`, plus user-content prefixes `avatars/{userId}/`,
  `users/{userId}/`, `posts/{userId}/`, `groupPosts/{groupId}/{userId}/`,
  `communityPosts/{userId}/`.
- **Sub-folder per content family** under the root: `protocolAudio/nsdr/…`.
- **Versioned filenames for cache invalidation** — `nsdr/nsdr_10min_v1.mp3`. This is the explicit
  invalidation mechanism (`protocolAudioLoader.ts` header comment lines 4–7): URLs are cached
  in-memory forever, so re-recorded media must get a new filename, never an overwrite.
- Sleep audio does **not** follow the versioning convention — it uses human titles with spaces
  (`sleep-audio/The Warmth.wav`) and hardcoded id→path mapping. This is the older pattern.

**Recommendation implicit in the code:** video should follow the `protocolAudio/` precedent
(camelCase root, sub-folder per family, `_v1` versioned filenames), not the `sleep-audio/` one.

---

## 4. Modal / bottom-sheet patterns

### What exists and is actively used

Everything is built on React Native's core `<Modal>`. **There is no `@gorhom/bottom-sheet` or any
third-party sheet library installed.**

| Component | File | Presentation | Height |
|---|---|---|---|
| `EnhancedModal` | `components/shared/EnhancedModal.tsx` | `transparent`, `animationType="fade"`, **centered** card with horizontal margins | `maxHeightPercent` prop, **default 0.92**; `'auto'` = screen − insets − 40; `minHeight: 480` |
| `HabitCompletionSheet` | `components/HabitCompletionSheet/index.tsx` | wraps `EnhancedModal` with `maxHeightPercent="auto"` | dynamic |
| `StandardSheet`, `ConnectionSheet` | `components/HabitCompletionSheet/` | **presentational only** — no `Modal` of their own; rendered as children of `HabitCompletionSheet` | n/a |
| `HabitNoteSheet` | `components/habits/HabitNoteSheet.tsx` | `transparent`, `animationType` **Reduce-Motion aware**, bottom-anchored, `PanResponder` swipe-to-dismiss | content-sized (input `minHeight: 88`) |
| `FeaturePreviewBottomSheet` | `components/discovery/FeaturePreviewBottomSheet.tsx` | `transparent`, Reduce-Motion-aware `animationType`, bottom-anchored | `maxHeight: '80%'` |
| `FocusAreaBottomSheet` | `components/onboarding/FocusAreaBottomSheet.tsx` | `transparent`, `animationType="slide"` | `maxHeight: '85%'` |
| `PostOverflowSheet` | `components/community/PostOverflowSheet.tsx` | `transparent`, `animationType="slide"` | content-sized |
| `EventCodeSheet` | `components/events/EventCodeSheet.tsx` | `transparent`, `animationType="slide"` | content-sized |
| `IntentionEditSheet` | `components/habits/IntentionEditSheet.tsx` | wraps `EnhancedModal`, `maxHeightPercent={0.85}` | 85% |
| `AIChatModal` | `components/ai/AIChatModal.tsx` | **`animationType="slide"`, `presentationStyle="pageSheet"`** (non-transparent, native page sheet) | near-full-screen |
| `ImageViewer` | `components/media/ImageViewer.tsx` | `transparent`, `animationType="fade"`, `StatusBar hidden` | **true full-screen**: `Dimensions.get('window').width/height`, 95%-opaque black backdrop |

### Precedent for a full-screen / near-full-screen media modal

**Yes — two distinct precedents exist, and they are the closest analogues to a video modal.**

1. **`ImageViewer` (`components/media/ImageViewer.tsx`) is the strongest precedent.** It is a
   genuine full-bleed media viewer: `Modal transparent` + `StatusBar hidden` + near-black backdrop +
   image sized to full `Dimensions.get('window')`, with a floating absolutely-positioned header
   (counter + 48×48 close button at `top: 40`) and gesture handling via
   `react-native-gesture-handler` + `react-native-reanimated`. It already takes a
   `{ url, type: 'image' | 'video' }[]` array — **and explicitly filters videos out**
   (`const imageOnly = images.filter(m => m.type === 'image')`, line 46). The shape for video is
   half-anticipated but not implemented.

2. **`AIChatModal` is the near-full-screen precedent** using the native
   `presentationStyle="pageSheet"` route. It is the **only** place in the codebase that uses
   `presentationStyle` at all.

3. **`EnhancedModal` at `maxHeightPercent={0.92}` / `'auto'`** is the app's generic tall-modal
   workhorse, but it is a **centered card with horizontal margins and rounded corners**, not
   edge-to-edge — and it is built around a `KeyboardAwareScrollView` + sticky footer for *forms*.
   It is the wrong chassis for video.

So: partial-height sheets dominate (80%/85%/0.92 card), but full-bleed is not a new pattern —
`ImageViewer` already does it. What is genuinely new is a **full-bleed modal containing a video
surface with its own transport, loading, and error states**.

### Reduce Motion handling in sheets

Handled via a single hook: **`src/hooks/useReducedMotion.ts`** — reads
`AccessibilityInfo.isReduceMotionEnabled()` on mount and subscribes to `reduceMotionChanged`.
Consumed by 54 files.

Two established idioms:

1. **Swap the modal's entrance animation:**
   `animationType={reduceMotion ? 'fade' : 'slide'}` — used by `HabitNoteSheet:126` and
   `FeaturePreviewBottomSheet:83`.
2. **Skip or zero the interaction animation:**
   - `HabitNoteSheet` drag: under Reduce Motion the sheet does not track the finger
     (`if (gesture.dy > 0 && !reduceMotion) dragY.setValue(gesture.dy)`, line 99) but the gesture
     **still dismisses**; the snap-back timing becomes `duration: reduceMotion ? 0 : 200` (line 111).
   - `ImageViewer` uses a `springOrInstant(value)` helper (line 55) that returns the raw value
     instead of `withSpring(value)` under Reduce Motion.

**Gap:** `ImageViewer.resetZoom()` (line 125) still calls `withTiming()` unconditionally,
bypassing its own `springOrInstant` helper — an existing inconsistency, noted for awareness, not
something to fix here. Also, **`FocusAreaBottomSheet`, `PostOverflowSheet`, `EventCodeSheet`, and
`EnhancedModal` do not consult `useReducedMotion` at all** — they hardcode
`animationType="slide"` / `"fade"`. So the convention exists but is not universally applied.

---

## 5. The Focus tab today

### What `PillarFocus` renders

The Focus tab root is **`FocusHubScreen`** (`src/screens/Focus/FocusHubScreen.tsx`, registered at
`AppNavigator.tsx:496` as `ROUTES.PillarFocus`). It is a single `ScrollView`
(`testID="focus-hub"`) with, **in order**:

1. **Title row** — `Focus` (h1, evergreen teal) + a right-aligned `GuidePill`
   (`context={{ screen: 'focus' }}`), deliberately off the artwork.
2. **Intro line** — "Protected time for one thing at a time."
3. **Watercolor header band** — `ScreenHeader` in `mode="band"` with
   `scrimLocations={BAND_STRONG_SCRIM}`, asset `assets/images/focusHeader.webp`, full-bleed via
   `marginHorizontal: -Spacing.lg`.
4. **Primary card** (`testID="focus-hub-card-primary"`) — whole-card tappable, overlaps the header's
   bottom seam by `Spacing.xl`. Eyebrow "Deep work" / heading "Set a focus" / body copy.
   → `navigation.navigate(ROUTES.FocusTimer, { fromHub: true })`.
5. **Secondary list-item card** (`testID="focus-hub-card-rhythms"`) — "Focus rhythms / Notice when
   focus comes easiest for you." + chevron. → `navigation.navigate(ROUTES.FocusRhythms)`.

That is the entire screen. **No streaks, no counts, no stats** — the header comment is explicit that
"the only outcome is a felt one, surfaced by the post-timer reflection, never a metric on this page."
Any new card must respect that constraint.

### Where the focus timer lives

- **`src/screens/Focus/FocusScreen.tsx`** — registered as a **root `AppStack` screen** named
  `FocusTimer` (`AppNavigator.tsx:571`), *not* a tab. `routes.ts:52` notes the deliberate naming:
  the session route is `FocusTimer`, not `Focus`, to avoid colliding with the `BrainPillar` literal.
- Launched from the hub's primary card with `{ fromHub: true }`. Also accepts `fromCheckIn`,
  `durationMinutes` (**intentionally not consumed** — the timer always defaults to 25 min), and
  `completedSessionId` (cold-launch deep link from a completion notification).
- The actual timer UI is `./PomodoroTab`. `FocusScreen` wraps it with the **Center-first**
  affordance: an opt-in, remembered row that runs a fixed 2-min box-breathing practice
  (`CENTER_FIRST_PROTOCOL_ID = 'box-breathing-2'`) via `GuidedSessionPlayer` *hub-locally* before
  auto-starting the timer.
- Per-block focus reflection is **inline on the completion surface**, not a separate screen.
- Preferences persist via `services/firebase/focusPreferences.service.ts`.

Note: `GuidedSessionPlayer` (`components/protocol/GuidedSessionPlayer.tsx`) is **not** a modal — it
is a `flex: 1` full-screen component rendered inline in place of the timer. It contains
`AudioStepView` (expo-av), `BreathPacer`, `PlayerTransport`, and an `EndEarlyConfirmModal`. **This
is the app's existing "full-screen media session" architecture, and it is screen-based, not
modal-based.**

### Existing "Learn" / explainer / educational surfaces

Yes — several, none on Focus:

| Surface | File | State |
|---|---|---|
| **Masterclass** ("Learn library") | `screens/discover/MasterclassScreen.tsx`, `MasterclassDetailScreen.tsx` | Firestore-backed (`Masterclass` type in `library.service.ts:63`: title, description, instructor, duration, topics, difficulty, thumbnail). **Reached from the Energy hub** (`EnergyHubScreen.tsx:86`, route `Masterclass`). Progress model `MasterclassProgress` has `progress: 0-1` and **`lastWatchedAt`** — i.e. it was modelled for video from the start. |
| **Podcast** ("The Resilient Brain") | `hooks/usePodcastFeed.ts`, `screens/discover/PodcastEpisodeScreen.tsx` | RSS-fed audio, plays through `AudioPlayerContext.playTrack()`. Rendered on the Masterclass screen. |
| `BrainPillarInfoModal` | `components/shared/BrainPillarInfoModal.tsx` | Small explanatory modal |
| `constants/lapseEducation.ts`, `brainInsightsCopy.ts` | — | Static copy |

**The single most important finding in this section:** `MasterclassDetailScreen.tsx:40` contains

```js
// Content player not yet available — button is shown in disabled state
const contentPlayerAvailable = false;
```

and lines 155–173 render a locked **"Available Soon"** pill instead of the
"Start Masterclass" / "Continue Learning" CTA. There is a **pre-existing, deliberately stubbed
content-player slot** already wired to progress tracking, awaiting exactly the player being
speccced. The `Masterclass` model, however, carries **no `videoUrl` / `contentUrl` / lesson-list
field** — the content locator does not exist yet.

---

## 6. Scheduling (for the deferred reminders question)

### User-scheduled focus time / focus intention

**No.** There is no scheduled focus time, no focus intention with a time, and no calendar concept.
Searched for `timeOfDay`, `scheduledTime`, `reminderTime`, `preferredTime`, `anchorTime`,
`startTime` across `mobile/src` — nothing focus-scheduled surfaced.

The nearest thing is **Focus Rhythms** (`FocusRhythmsScreen.tsx` +
`constants/focusRhythms.ts` + `services/firebase/focusRhythms.service.ts`): a multi-select of
coarse time-of-day *keys* — `early_morning`, `mid_morning`, `afternoon`, `evening`, `late_night`,
`varies` — persisted on the user doc. These are **preferences, not schedule entries**: no clock
time, no day, no notification. Both the screen header comment (lines 3–4) and the constants file
(lines 3–4) state explicitly that *"Downstream use (nudge / anchor timing) is intentionally out of
scope."* Nothing reads these values back today.

### Do routines carry times of day?

**Partially — yes, and this is the only real clock-time data in the model.**

- `services/firebase/routines.service.ts:33` — `interface Routine` has
  **`reminderTime: string | null`** and `type: 'morning' | 'evening' | 'custom'`.
- It is displayed: `screens/Time/RoutinesTab.tsx:302` renders a bell badge with
  `{routine.reminderTime}` when present.
- It is created as `reminderTime: null` by default (`RoutinesTab.tsx:421`); editable via
  `components/routines/RoutineEditor.tsx`.
- Separately, `Habit.timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'anytime'`
  (`types/models.ts:140`) — coarse buckets, not clock times.
- Separately, notification prefs carry `dailyRhythm.reminderTime: ReminderTime | null`
  (`types/models.ts:607`), consumed by `notificationScheduler.service.ts` /
  `reminderScheduler.service.ts`.

**Could a focus-relevant scheduled item be surfaced on the Focus hub from existing data?**
Only weakly. Routines with a `reminderTime` are the one source of real clock times, but routines are
Time-pillar objects with no focus association — a routine has `activities[]` with names/durations,
nothing tagging it as focus work. You could surface "your next routine is at 7:00 AM," but you
cannot surface "your focus block is at 10:00 AM" because no such record exists. The honest position
is: **a reminders card on the Focus hub has no focus-specific data to display today, and would need
either a new scheduled-focus record or a repurposing of Focus Rhythms from preference to schedule.**

---

## Summary of gaps a video build would have to close

1. **No video Storage rules.** Default-deny catches any new prefix; no `isVideoType()`; no video
   size limit.
2. **No generic Storage URL resolver.** Three hand-rolled caches exist; video makes a fourth.
3. **No modal video precedent.** `expo-video` is used inline in feed cards only; the existing
   `VideoPlayer` has no loading/error/Reduce-Motion handling.
4. **`ImageViewer` explicitly excludes videos** despite accepting a `type: 'video'` union member.
5. **`Masterclass` model has no content URL field**, and its player is stubbed behind
   `contentPlayerAvailable = false`.
6. **Two media libraries will coexist** — `expo-av` (deprecated, all audio) and `expo-video` (all
   video) — until an audio migration to `expo-audio` is scoped separately.
7. **No scheduled-focus data model** for a future reminders card.

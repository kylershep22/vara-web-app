# LEARN-REHOUSE — device walk

**Branch:** `feat/learn-rehouse` · **Commit:** `3148b4b` · **Base:** `main` @ `7233bac`
**Written:** 2026-09-21 · **Owner of the walk:** Kyle

The build is committed, so the walk has a fixed reference. Every step below has a
pass condition. Record a result per step; a step that is not run is recorded as
NOT RUN, never as passed.

**Device matrix per §18(d):** smallest iPhone SE (3rd gen), 375×667 @2x; largest
iPhone 16 Pro Max, 430×932 @3x. **The SE half is NOT WALKABLE IN THIS SETUP** and
carries forward, as it has since R1b-i. Steps that name the SE say so and are
expected to come back NOT RUN. The 14 Plus stands in for the large end.

---

## Before you start

1. Build from `feat/learn-rehouse` at `3148b4b`.
2. Open the app once **online** and visit **Learn**, so the feed populates the
   cache. Several steps below depend on a warm cache existing.
3. Note the episode count and the top episode's title. Steps 9 and 10 compare
   against them.

---

## Section A — geometry

### A1. Bottom inset, 14 Plus, scrolled fully down
Open **Learn**. Scroll to the very bottom of the episode list.

**Pass:** the last episode card is fully visible and fully tappable, clear of the
floating tab bar, with visible breathing room between the card and the capsule.
Nothing is trapped under the bar.

**Why this step exists:** the body came from a pushed screen carrying a hardcoded
`paddingBottom: 100`. On a tab root the clearance is not a constant — it is 110
on this device and 88 on an SE. The literal stayed behind in `MasterclassScreen`
and the tab root uses `useTabBarInset()`. This step is the only thing that proves
the right one is in the right place.

### A2. Bottom inset, SE
Same as A1 on the SE, where `insets.bottom` is 0 and the inset resolves to 88.

**Expected result: NOT RUN.** Recorded as outstanding, not passed.

### A3. Top inset
On **Learn**, look at the title "Learn" and the content directly under it.

**Pass:** the title clears the status bar and the Dynamic Island. Nothing is
clipped or tucked under system UI. The title scrolls with the content.

### A4. No band
**Pass:** there is **no watercolor hero band** on Learn. §2.8 and §11F both bar a
band on a tab root. If you see one, that is a failure, not a nice surprise.

### A5. The title survives every state
Trigger each of the states in Section C. In every one of them:

**Pass:** the word "Learn" stays on screen. The state block appears **below** it.
If any state blanks the title, the loading early return has come back.

---

## Section B — content and interaction

### B1. Real episodes from the live feed
Open **Learn** online.

**Pass:** real episode titles, durations and dates render — the actual Resilient
Brain back catalogue, not placeholders. The show header reads "The Resilient
Brain", the host line reads "Jen Shepard", and the episode count matches the
number of rows.

### B2. The play button swaps to pause and takes the active fill
Tap **play** on any episode. Watch that row's button.

**Pass:** the button changes from the play glyph on a pale sage fill to the
**pause glyph on a solid teal fill**, and audio starts. Tap a second episode's
play: the fill moves to the second row and leaves the first.

**Why this step exists, and it is the one I most want eyes on.** This is the
`isEpisodePlaying` fix, and it is **observed here rather than type-checked**. The
old expression compared an object to a string and was always false, so the button
never changed state at all — audio played and the row said nothing. The unit
tests pin the label, not the pixels. If the fill does not move, the fix did not
land on screen.

### B3. Episode details
Tap the **info** button on an episode.

**Pass:** the Podcast Episode screen pushes in from the right, over the tab bar,
with a working back path to Learn.

### B4. Masterclass absence reads as absence
Scroll the whole Learn tab.

**Pass:** the tab **ends after the episode list**. There is no "MASTERCLASS"
heading over nothing, no empty card, no dangling section, nothing that reads as
broken. The masterclass collection is empty and the section is meant to be
invisible.

### B5. Energy's Journal row
Open **Journey → Energy**.

**Pass:** below the three category cards there is **one** quiet row, Journal, and
it reads as a deliberate single row rather than the leftover of a deleted pair.
There is no "Learn" row. Tap Journal: it opens the Journal screen.

**Judgement call, and it is yours:** if the single row reads as orphaned, say so
— that is the finding, and it is not something a test can return.

---

## Section C — the six states

Run as many as are reachable by hand. Name the ones you could not reach.

### C1. State 1 — online, feed loads
Online, warm or cold.

**Pass:** episodes render with **no informational line** above them.

### C2. State 3 — offline with a warm cache · **THIS IS THE ONE THAT PROVES THE CACHE FIX**
With the cache warm from the setup step, turn on **airplane mode**. Force-quit
the app. Reopen and go to **Learn**.

**Pass:** **the episodes are still there**, with the line *"You're offline.
Showing episodes saved earlier."* above them.

**Do this twice.** The second time, wait so the cache is more than an hour old,
or change the device clock forward by two hours before reopening.

**Pass, second run:** identical. The episodes are still there. Age must make no
difference to whether they display.

**Why this is the headline step:** before this slice, a cache older than one hour
was discarded, so this exact scenario rendered an empty screen on a device with
every episode saved on it. If the second run shows an empty state, the fix has
not landed.

### C3. State 5 — feed failed with a cache
Harder to force by hand. If you can point the device at a network that resolves
but cannot reach `feeds.captivate.fm` (a captive-portal wifi is the usual way),
open Learn with a warm cache.

**Pass:** episodes render with the line *"Showing saved episodes. We couldn't
refresh the feed."* — and **no** full error block. Available content is never
replaced by an error.

**If you cannot reach this state, record it as NOT RUN.** It is covered by unit
tests; that is not the same as being seen.

### C4. State 2 — offline with a genuinely cold cache
**This needs a reinstall.** Delete the app (which clears AsyncStorage), reinstall,
turn on airplane mode **before first opening Learn**, then open Learn.

**Pass:** a centred empty state — a teal glyph in a pale sage circle, the headline
*"Episodes aren't available"*, the body *"You're offline, so we can't load them
right now."* — and **no "Try again" button**, because a tap cannot fix being
offline.

**If you do not want to reinstall, record this as NOT RUN rather than claiming it
was walked.** Airplane mode on its own gives you C2, not C4, and the two look
different for exactly the reason this slice exists.

### C5. State 4 — feed failed, no cache
Reachable in the same reinstalled state as C4, but **online** with the feed
unreachable. Hardest to force.

**Pass:** an inline block with a **Soft Coral** border and icon, the headline
*"Episodes didn't load"*, the body *"We couldn't reach the feed right now."*, and
a **"Try again"** button. Tap it: it should actually attempt a refetch, not sit
there.

### C6. State 6 — connectivity unknown
**Not reachable by hand.** It requires `getNetworkStateAsync` to reject, which
does not happen on a healthy device. Recorded as NOT RUN and covered by unit
tests only.

---

## Section D — the chips, and the open URL question

### D1. Apple, app installed
On **Learn**, tap the **Apple** chip.

**Pass: the Apple Podcasts app opens on THE RESILIENT BRAIN.**

**Read that pass condition literally.** It is not "a link opens" and it is not
"Apple Podcasts opens". **The URL pair is in doubt.** Two different pairs exist —
the ones in the tree, which this slice uses, and a second pair with different show
IDs. The repo cannot say which is current, so this step is the thing that settles
it. Record the **show name and artwork you actually land on.**

### D2. Apple, app NOT installed
Delete Apple Podcasts (or use a device without it) and tap the chip.

**Pass:** Safari opens on the Resilient Brain podcast page. Again: **confirm the
show, not the fact that something opened.**

### D3. Spotify, app installed
**Pass: the Spotify app opens on THE RESILIENT BRAIN.** Same instruction — name
the show you land on.

### D4. Spotify, app NOT installed
**Pass:** Safari opens on the correct Spotify show page.

**If D1–D4 land on the wrong show or a dead page:** that is **four dead links
across two screens** (this tab and the Podcast Episode screen, which has carried
the same URLs unwired-to-anything-verified for some time) and a follow-up slice.
**It is not a failure of the re-housing** — the move, the states and the cache fix
are independent of which pair is right.

### D5. VoiceOver on both chips
Turn on VoiceOver. Swipe to each chip.

**Pass:** Apple announces *"Listen on Apple Podcasts. Opens outside the app.
Button."* Spotify announces *"Listen on Spotify. Opens outside the app. Button."*
Both must say **button** and both must say they leave the app.

**Note the wording is drafted, not approved.** It is Kyle's to sign off as UI
owner; it carries a sentinel until he does. If it reads wrong out loud, that is a
finding worth having now.

### D6. Chip touch targets — LOOK, do not fix
The chips are roughly 24pt tall against §16's 48pt floor. **This is pre-existing
and explicitly out of scope**, carried unchanged from before the move.

**Record only:** how hard they are to hit in practice on the large device. That
observation is what a future slice will be scoped against.

---

## What this walk CANNOT show

Stated plainly so the record is not read as broader than it is.

1. **The SE half of the matrix.** Not walkable in this setup. A2 is expected NOT
   RUN, and the bottom-inset defect class is worst on exactly that device,
   because its `insets.bottom` is 0. This has been outstanding since R1b-i and
   this slice does not close it.
2. **State 6, connectivity unknown.** Cannot be produced on a healthy device.
   Unit tests only.
3. **State 4 and state 5** are reachable only with a cooperative broken network
   and, for state 4, a reinstall. Expect at least one of them NOT RUN.
4. **That the URLs are correct** — only that *these* URLs open *some* show. D1–D4
   tell you which show; they cannot tell you which show was intended.
5. **The masterclass section rendering.** The Firestore collection is empty, so
   B4 confirms its absence and nothing confirms its presence. `MasterclassDetail`
   remains unreachable, and R1d's outstanding `Spacing['4xl']` fix on it is
   still unwalked. Unchanged by this slice.
6. **`MasterclassScreen` itself.** The route stays registered and still renders
   the same shared component, but **nothing links to it any more** — the Energy
   row was its only live caller. It is now registered-but-unreached, which is the
   DARK shape §2.8 defines. **It cannot be walked because it cannot be opened.**
7. **Whether the twelve strings that moved house are good copy.** They were never
   reviewed; the move did not review them; and two of them are the all-caps label
   shape §5.4 bans.

---

## Two things for Kyle that are not walk steps

**§2.8 owes the `Masterclass` row a DARK marker.** This slice creates the
condition — registered, correct, and unreachable — and §2.8's own rule is that
"the row that next edits either one owes this note." **I did not edit the
standards document**, because it is a rank-5 source of truth that R0 owns and
amending it was not authorised here. It is a one-line change and it is yours to
approve. The fact is recorded in `MasterclassScreen.tsx`'s header so it is
discoverable either way.

**The lint warning count moved by one**, 1362 → 1363. Errors are flat at the 994
baseline. The single new warning is `max-lines` on the new `LearnLibrary` test
file, which is 306 lines against a 300 limit. I left it rather than deleting a
test or splitting a coherent suite to get under the number.

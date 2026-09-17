# NEW-MESSAGE-SHEET — device walk

**Branch:** `fix/new-message-sheet`
**Row:** `NEW-MESSAGE-SHEET`, `docs/Vara_Journey_Architecture_Roadmap_v3.md` §5. Not an R-series row. Own slice, before beta (Kyle, 2026-09-14).
**Backlog entry:** `docs/TECH_DEBT_BACKLOG.md`, "The new-message sheet opens unusable: keyboard up, header off-screen, no way out".
**Surface:** the new-message `Modal` inside `mobile/src/screens/ConversationsScreen.tsx`. There is no route and no screen file — grepping the navigator for a "new message" screen finds nothing.

---

## Why this walk carries more than usual

The defect was **geometric**: the sheet's handle, title, subtitle and close control all rendered roughly 132pt **above the top of the screen**, and every one of them was in the component tree the entire time. RNTL has no layout engine, so **no jest test can see the difference between the broken build and the fixed one.** The two suites added in this slice say so in their own headers.

**The geometry's only proof is this walk.** If the walk does not run, the fix is unverified regardless of what CI says.

---

## Before you start

### 1. The before-state capture is STEP 0 AND IT IS NOT OPTIONAL — ✅ DONE, all three passed

> **RUN AND CLOSED on `main` at `1cc0746`, iPhone 14 Plus (Kyle). Steps 0, 0b and 0c all
> PASSED; results and the screenshot are recorded under the on-`main` table below. The
> mechanism is confirmed on hardware and Step 0's diagnosis holds — no re-derivation.**
> Nothing here needs running again, and after the merge nothing here *can* be run again.
> The rest of this subsection is kept as the reason it had to go first.

Steps 0, 0b and 0c run **on `main` at `1cc0746`**, not on the branch. They are a before/after comparison, and per R1a's step 10 a before/after step run after the after has shipped compares nothing. **`main` is the only place the defect still exists.** Once the branch merges, these steps become unrunnable forever.

```
git checkout main            # must be at 1cc0746
```

Run 0, 0b, 0c. **Then** `git checkout fix/new-message-sheet` and run the rest.

### 2. Step 7 needs a seeded connection, and Kyle's accounts have none

Step 7 is the only step that exercises the connections **list**. It needs **at least one accepted connection**: a second account, a connection request sent, and that request accepted. `useConnections` reads accepted connection docs only, so a sent-but-unaccepted request does not count.

**Arrange this before the sitting starts.** Without it, step 7 cannot run, and step 7 is the step that proves the fix's central choice — shrinking the sheet so the list scrolls inside it, rather than deleting the KeyboardAvoidingView and leaving ~336pt of list behind the keyboard. **If the seeding does not happen, the attestation says step 7 was not run. It does not say the walk passed.**

Zero connections is itself a state to walk (step 9) — it is the state a real beta user lands in — but it renders an empty block where the list would be, so it proves nothing about the list.

### 3. Device matrix

- **iPhone 14 Plus, dev client, portrait.** Covers the large end (within 2pt of the 16 Pro Max).
- **iPhone SE: NOT WALKABLE IN THIS SETUP.** There is no SE device and no SE simulator here; the toolchain is Windows and an iOS simulator needs a Mac. This is the fourth consecutive row in that position (R1b-i, R1d, R2, and now this one). §18(d) carries the condition and the mitigation: small-end risk is monitored through beta and support feedback until an SE exists.

  **What the SE would have bound, so it is not lost:** its `insets.top` is 20pt against the 14 Plus's 47, and its screen is 667pt against 926, so `SHEET_HEIGHT` is 520 and the keyboard leaves about 407pt. The shrink is proportionally **deeper** and the 20pt inset is the only thing holding the header clear of the status bar. The geometry suite pins the paddingTop at **both** insets (47 and 20) precisely because the 20 end cannot be walked.

- **Dynamic Type:** default throughout, then **step 10 repeats the load-bearing steps at 1.3x** (`Typography.maxFontScale`). 1.3x is the binding case — the header and search block grow while `SHEET_HEIGHT` does not, so the shrink has less room to work in.

- **Android: not walkable and not owed.** The displacement mechanism is iOS-only (`behavior` is `undefined` on Android, which takes the KAV's no-padding branch). There is no Android build and the `ANDROID` row is NOT SCHEDULED.

---

## The walk

### On `main` at `1cc0746` — before-state capture

> **RUN AND PASSED, all three steps, iPhone 14 Plus, on `main` at `1cc0746` (Kyle,
> attested 2026-09-14 per the report; the script these steps are numbered against was
> committed 2026-09-16, so if the sitting was actually that day the date moves — flagged
> rather than silently corrected, because an attestation is the walker's words).
> **Results are recorded in full below the table. Steps 0, 0b and 0c are CLOSED and are
> not re-runnable: `main` is the only place the defect exists.**

| # | Step | Pass condition |
|---|---|---|
| **0** ✅ | Open Conversations → tap the FAB. **Screenshot.** | The defect is captured as shipped: no header, no close control, search field under the status bar. **This is the only chance to record it.** |
| **0b** ✅ | With the sheet open, attempt all four dismissals in order: (i) tap where the close control should be; (ii) tap anywhere outside the sheet; (iii) swipe down from the top edge; (iv) swipe down from the sheet body. | **All four fail.** Confirms the surface has no working dismissal, affordance by affordance. Background the app to escape. |
| **0c** ✅ | With the sheet open, press the keyboard's **Search** key. | **THE FALSIFIER FOR THE WHOLE DIAGNOSIS.** If the sheet snaps down and the header appears, the KeyboardAvoidingView mechanism is confirmed on hardware. **If the header stays off-screen, STOP AND REPORT — Step 0's diagnosis is wrong and the fix must be re-derived.** Also confirms the undesigned escape path: an unlabelled keypress was the only way out. |

#### Results — steps 0, 0b, 0c, iPhone 14 Plus, `main` at `1cc0746`

**STEP 0 — PASS. Defect captured, screenshot taken.** The sheet opens with the keyboard
already up and **no handle, no title, no subtitle and no close control** on screen. The
search field is **clipped at the top under the status bar**.

This is the predicted state item for item. Step 0's arithmetic put the handle at screen
y = -132 to -112, the entire header at -112 to -36, and the search field straddling y = 0
underneath the 47pt status bar. **Every one of those elements was in the component tree
the whole time** — which is the reason no jest test could have caught this and the reason
the two suites on the branch say so in their own headers.

**STEP 0b — PASS. All four exits dead.** Confirmed one at a time rather than inferred:

- **Close control** — off-screen and untappable.
- **Tap outside** — **no exposed backdrop anywhere on screen to tap.** This is the
  non-obvious one and it is now confirmed on hardware: the overlay was
  `absoluteFillObject` *inside* the `KeyboardAvoidingView`, and Yoga resolves absolute
  insets against the parent's **padding** box, so the keyboard's padding shrank the
  backdrop to exactly the region the sheet already covered. Not one pixel left over.
- **Swipe from the top edge** — nothing. The `PanResponder` is spread on the handle strip
  only, and the handle is off-screen, so the responder can never be set.
- **Swipe from the sheet body** — nothing. No other element accepts the gesture.

**Escaped by backgrounding the app.** Kyle's original "cannot be dismissed without
backgrounding the app" is now confirmed affordance by affordance rather than taken on
report.

**STEP 0c — PASS. THE MECHANISM IS CONFIRMED AND STEP 0'S DIAGNOSIS HOLDS. No
re-derivation needed.** Pressing the keyboard's Search key drops the sheet to its correct
position with the handle, "New Message", "Select a connection to message", the close X and
the search field **all fully visible and clear of the status bar**.

**And the second half of the falsifier passed too, which is the part that rules out a
rival explanation.** Tapping the search field raises the keyboard and returns the sheet to
the broken state. **The displacement therefore TRACKS THE KEYBOARD rather than being a
one-time layout error** — it is reversible, repeatable, and driven by the keyboard's
presence, which is exactly what `behavior: 'padding'` recomputing `paddingBottom` on every
keyboard event predicts and what a static mis-layout cannot produce.

#### The undesigned escape path is NOT a usable exit, and 0c is what proves it

Step 0 flagged the Search key as an unverified recovery path derived from the shared
`TextInput` setting no `blurOnSubmit` (so RN's single-line default of `true` applies). It
is real. **It is also not an exit.**

**The Search key restores the header — and touching the search field, which is the sheet's
entire purpose, returns it to the broken state immediately.** So the "escape" only holds
for as long as the user does not do the one thing the surface exists for. A user who
presses Search, sees the close X appear, and then reaches for the search box to actually
search their connections is back where they started, with the X gone again.

**This makes the before-state worse than "hard to dismiss": it is a trap loop.** The
recovery and the primary interaction are mutually exclusive, and the only affordance that
survives touching the search field is one that is off-screen. It also means the Search key
was never a mitigation worth weighing against the fix — recording it was about falsifying
the diagnosis, not about softening the defect.

### On `fix/new-message-sheet`

| # | Step | Pass condition |
|---|---|---|
| **1** | Zero-conversation account: Conversations → tap the empty state's **"New Message"**. Default type. | Sheet opens. **Handle, "New Message", "Select a connection to message" and the close control all fully visible and clear of the status bar.** Search field fully visible and focused, keyboard up. |
| **2** | Same, opened from **the FAB**. | **Identical to step 1.** Both controls call the same `openSheet`; this is that claim on hardware. |
| **3** | From step 2's state, tap the close control. | Sheet dismisses. Returns to Conversations. No visual residue. |
| **4** | Reopen. Dismiss the keyboard (Search key). | Sheet drops to its full 78% height, header still visible, **nothing clipped at the top.** Compare against step 0's screenshot for the no-keyboard case — this state must be **unchanged from `main`**. |
| **5** | From step 4, tap the search field to raise the keyboard again. **Raise and lower twice more.** | Sheet shrinks and grows smoothly, header stays put and visible throughout. No drift, no accumulation, no flicker. |
| **6** | From step 5 with the **keyboard down**, tap the exposed backdrop above the sheet. | Sheet dismisses. *(This already worked on `main`; it must not regress.)* |
| **6b** | Reopen, **keyboard UP**, tap the exposed backdrop above the sheet. | **RULING 2's STEP.** Sheet dismisses. **Step 0 wrote this as an expected FAIL** — the overlay was inside the KeyboardAvoidingView, so the keyboard shrank it to exactly the region the sheet already covered and there was no backdrop to tap. Ruling 2 moved it out, so it now passes. **READ THE NOTE BELOW BEFORE JUDGING THIS STEP.** |
| **7** | **Seeded account, ≥1 connection.** Open from the FAB. Type a matching query. | Results render. **Scroll the list to its last row with the keyboard up — every row reachable, nothing trapped behind the keyboard.** Tap a row → Chat opens for the right person. **This is the step that proves the fix's choice over deleting the KAV.** |
| **8** | Same account, type a query matching nobody. | `No connections found` and `No one matching "…"`. Header and close control still visible. Clear the field → results return. |
| **9** | **Zero-connection account** (Kyle's default): open and observe the empty block. | `No connections yet` and `Connect with people first to start messaging`. **Header and close control visible** — the state a real beta user lands in. |
| **10** | **Repeat steps 1, 5, 7 and 9 at 1.3x Dynamic Type.** | Header and close control fully visible and the control still tappable in every state. **THE BINDING CASE.** If the header clips here, the shrink needs a floor and the fix is not finished. |
| **11** | Reduce Motion on. Open and close from both entry points. | Opens and dismisses cleanly. **RECORD WHAT IT DOES; DO NOT FIX IT HERE.** This sheet's hand-rolled `Animated.timing` respects no Reduce Motion flag, where `HabitNoteSheet` swaps to `fade`. Booked to TECH_DEBT. |
| **12** | Sheet open, keyboard up → background the app → foreground it. | Returns to a usable sheet, header visible. Nothing stuck. |
| **13** | Sheet dismissed: confirm the Conversations FAB still clears the floating capsule and is tappable. | **R2's A5b, re-run.** This slice edits the same file; A5b's pass must survive it. |

---

## Read this before judging step 6b

**Ruling 2 is expected to pass the step and still leave a small target, and that is a finding for Kyle rather than a defect to fix on the day.**

With the keyboard **down**, the backdrop above the sheet is about 204pt on a 14 Plus. Large, obvious, fine.

With the keyboard **up**, the sheet shrinks to exactly fill the space between `insets.top` and the keyboard. So the exposed backdrop is the **47pt strip under the status bar and nothing else** — the sheet's top edge sits at the bottom of the inset by construction.

So step 6b should pass: there is a real, tappable backdrop where before there was none. But **47pt under the status bar is a technically-correct target, not a comfortable one.** The close control is the dismissal affordance that matters with the keyboard up, and steps 1-3 are what prove it.

**Record what 6b actually feels like.** If Kyle wants a genuine backdrop gap with the keyboard raised, the lever is more top padding on the wrapper than `insets.top` alone — and that is a **design change** on a surface §2.8 freezes until R6+, so it is his call and not a walk improvisation. R2's precedent for walk-tuned geometry applies: the value can move at the walk if Kyle says so, in its own commit, named as a tuning.

---

## Gate

**Steps 0, 0b, 0c, 1-6, 6b, 8-13 must pass.**

**Step 7 must pass, or the attestation names it unrun and says the seeding did not happen.** It does not pass by assumption.

**One step can still send the slice back to Step 0: step 10.** If 1.3x Dynamic Type clips the header, the fix is incomplete — the header and search block grow while `SHEET_HEIGHT` does not, so the shrink has least room there.

**The other one is spent. 0c PASSED**, so the KeyboardAvoidingView mechanism is confirmed on hardware and the diagnosis is no longer a hypothesis. Anything that fails from here is a fault in the fix, not in the reading of the defect.

**Not run and not owed:** every SE step (not walkable in this setup, see above), and Android (no build; mechanism does not apply).

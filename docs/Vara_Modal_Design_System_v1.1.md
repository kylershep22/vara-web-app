# Vara — Modal Design System (Update)
**Version 1.1 | April 2026 | Revisions Based on Review**

---

## What changed from v1.0

Two substantive updates based on founder review. Both reverse or refine decisions made in v1.0.

### Revision 1: Group privacy and invite controls — restored
v1.0 removed the public/private toggle and the "who can invite" radio from the group creation modal, arguing for launch simplicity and moderation risk. That argument was wrong in the context of *private* groups, which are self-moderating by definition.

Both controls are restored. The refinement is to set defaults that guide users toward the safer, more common choice while keeping the full flexibility available.

### Revision 2: Journal modal no longer asks "How's your brain feeling?"
v1.0 replaced the Journal mood picker with the 5-state vocabulary but kept the question in place. Review surfaced that this is redundant — users have typically already checked in today. Two mood-declarations per day creates conflicting data and friction.

The Journal modal now inherits the user's most recent check-in state as a read-only display (tappable to update), and devotes the primary modal space to the text entry itself.

---

## Group Creation Modal — Updated Specification

### Structure (top to bottom)

1. **Top bar.** Cancel text link top-left. "Start a new group" title centered.
2. **Group name field.** Floating label: "What do you want to call it?"
3. **Description field.** Floating label: "What is this group about?"
4. **Category picker.** Hybrid structure — Recovery, Sleep, Focus, Habits as primary. Optional life-context filter below.
5. **Privacy toggle (restored).** Public / Private, with descriptive sub-copy for each.
6. **Who can invite? (restored).** Two radio options: Only the creator (default) / All members can invite.
7. **Sticky footer.** Create button + "You can edit your group anytime" reassurance.

### Privacy toggle — specification

Two options, presented as a segmented control rather than a toggle (clearer affordance, better for a binary choice where both options need explanation).

**Public** (default)
Description: "Anyone in the Vara community can discover and join this group."
Visual: Open circle or globe icon.

**Private**
Description: "Invite-only. Not visible in search or discovery."
Visual: Lock icon.

The default is Public because most users benefit from discoverability, and because private groups still accumulate moderation overhead if they grow — keeping the default on the Vara-community-visible path means users actively choose privacy when they have a reason.

### Who can invite? — specification

Only surfaces when the group is Public. (Private groups are invite-only by definition — "who can invite" is a sub-question of discoverability.) When Public is selected, this radio appears below:

**Only I can invite** (default)
Sub-copy: "You control who joins this group."
Icon: Person with a lock.

**All members can invite**
Sub-copy: "Anyone in the group can invite others. Grows faster, less curated."
Icon: Two people with a plus sign.

The default is creator-invite-only. This is the lower-risk path for community formation — groups that grow faster via member invitation can become harder to keep on-topic, and at Vara's current scale, curation matters more than growth velocity. Users who want open-invite can still choose it, but the system nudges toward controlled growth.

### Copy notes

All sub-copy on these options is descriptive, not prescriptive. Vara doesn't lecture users about which option is better. It gives them accurate information about what each option does, and sets sensible defaults, and trusts them to choose.

---

## Journal Modal — Updated Specification

### The core insight

Users have already told Vara how they're feeling via the daily check-in. Asking again in the Journal modal is redundant and can generate conflicting state data (morning Wired + afternoon Journal entry tagged Clear — which is "today"?). The Journal modal inherits the user's current state and focuses on the reflection itself.

### Structure (top to bottom)

1. **Top bar.** Cancel text link top-left. "Add a reflection" title centered.
2. **State indicator (read-only, tappable).** A subtle card at the top showing the user's current state with timestamp. Example: "You're Wired · checked in 2 hours ago." Small chevron indicates tappability. Tapping opens a compact state-update picker.
3. **Text entry.** Large, generous textarea with floating label "What's on your mind?" Placeholder: "Write or use voice input." Prompt chip in the top-right corner.
4. **More options (collapsed).** Tags, if the user wants them. Behind progressive disclosure.
5. **Sticky footer.** Save reflection button + "Saved to Patterns → Journal" reassurance.

### State indicator — the detail that matters

The top card reads: **"You're Wired · checked in 2 hours ago"** (with the state's color dot next to "Wired").

It's styled as a quiet card — light sage background, no shadow, chevron on the right to signal tap-to-update. On tap, a compact state picker appears in place (the same 5-option pattern from the daily check-in modal), the user picks a new state if they want, and it collapses back to the inherited display. The updated state becomes their new "current state" — both the journal entry and the Today screen reflect it.

### Edge case — no check-in yet today

If the user opens the Journal modal without having checked in yet (rare), the state indicator shows a slightly different prompt: **"Quick check-in before you reflect?"** with the state picker opened by default. Once they pick, the picker collapses and the text entry is ready. This keeps state data clean (every journal entry has a state) without making the check-in feel like a tax.

### Why this is better than a separate mood picker

The old mood picker forced a second declaration every time the user journaled. The new approach:

1. **Respects the user's time.** They already answered this question today.
2. **Keeps state data clean.** One state per user per point in time. No conflicting declarations.
3. **Makes the modal focus on reflection.** The text area is the star of the screen, not a mood picker competing for attention.
4. **Surfaces a useful re-check-in opportunity.** If the user's state has shifted, tapping to update is a lightweight way to recognize and capture that — which is actually a form of brain-awareness work the app should encourage.
5. **Creates a natural connection to Today.** Updating state from the Journal modal also updates Today, threading the two surfaces together.

### What this means for the Patterns tab

Journal entries are still state-tagged — that doesn't change. The state-filtered journal view in Patterns ("Show me all my Wired entries") still works. The only difference is how the state gets attached: inherited from check-in rather than re-declared.

---

## What's Still Unchanged

Both modals still follow all the Modal Design System rules from v1.0:

- One primary CTA, full-width, bottom-pinned
- Cancel/close in the top-left as a text link
- CTA state reflects form validity
- Keyboard never covers the primary CTA
- Floating V button hides when modal is open
- No asterisks on required fields
- Floating label or placeholder, never both
- Active, warm titles
- Reassurance line on object-creation modals

The five checks from v1.0 still apply unchanged. These revisions adjust *what* the modals contain, not *how* modals are structured.

---

## Journal Modal — Edge Case Matrix

For completeness, here are the user scenarios the updated Journal modal handles:

| Scenario | What the user sees | What happens |
|---|---|---|
| User checked in this morning, journaling in the afternoon | "You're Wired · checked in 4 hours ago" card at top | Entry tagged with Wired. No friction. |
| User's state has shifted since check-in | Same card, but user taps to update | Updating the state here also updates Today. Entry tagged with new state. |
| User hasn't checked in today | "Quick check-in before you reflect?" with state picker expanded | Inline state selection, collapses to inherited display, entry tagged with selected state. |
| User is journaling at the start of the day (before morning check-in) | Same "Quick check-in" prompt | Same flow. The journal entry itself becomes the start of their day. |
| User has checked in 5+ times today (active user, state shifting) | Card shows the most recent check-in | Always reflects the latest state. |
| User disables state-tagging preference (future feature, not v1) | Card is hidden | Entry is untagged. Not recommended as default but available for users who prefer pure freeform journaling. |

---

## Updated Group Modal — Field Summary

For completeness, here's what the full group modal looks like now:

```
Top bar: Cancel (left) · Start a new group (title) · — (right spacer)

─────────

[Floating label: What do you want to call it?]
[Group name input]

[Floating label: What is this group about?]
[Description textarea]

Category
[Recovery]  [Sleep]  [Focus]
[Habits]    [Optional: life context ›]

Privacy
┌─ Public ────────────── (selected) ───┐
│ Anyone in the Vara community can     │
│ discover and join this group.         │
└───────────────────────────────────────┘
┌─ Private ─────────────────────────────┐
│ Invite-only. Not visible in search.   │
└───────────────────────────────────────┘

Who can invite? (only visible when Public)
◉ Only I can invite
  You control who joins this group.
○ All members can invite
  Anyone in the group can invite others.

─────────

[Create group]
"You can edit your group anytime"
```

The full modal fits comfortably without excessive scroll because the privacy and invite controls are compact (single-line descriptions, clear visual hierarchy).

---

*Version 1.1 | April 2026 | Next revision as needed based on implementation feedback*

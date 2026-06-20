# Vara — Dashboard (Home) Spec
**Version 1.0 | For review | Scope: the Home surface only (the four-pillar tab/IA switch is a separate build)**

This specifies the rework of the Home dashboard. It assumes the check-in loop work (entry fix, plan presentation, flow polish) as the layer underneath, and reworks the surface that wraps it.

---

## 1. The one job

The dashboard reflects where you are and points at one action, then gets out of the way. It is a calm "today" surface, not a content store.

That distinction is the whole design. Calm, Headspace, and Mindvalley all answer "what do you need?" with "here's a store" — carousels of locked, rated, popular content built to maximize consumption, wrapped in streaks, offers, and popularity counts. Vara's edge is that its home isn't that. The restraint is the position: if a reasonable person could mistake this screen for a meditation-content store, it has drifted.

---

## 2. Principles for this surface

- One bright priority element; everything else is calm and quiet. Three cards maximum.
- "Create capacity" (headroom, not optimization) is the organizing idea. It is a framing, never a meter or a score.
- Premium is handled by surfacing what the user *can* do (their check-in, their plan, their routine), never a wall of locked, dangled content.
- Outcomes are felt and reflective, never a readout.
- Aesthetic: Mist White ground, muted sage and teal, nature-inspired, accents at 10–15% maximum, generous whitespace. One bright card; the rest recede.

**Explicitly forbidden on this surface** (the competitive traps, by brand decision): the blur-gate, any stats/metrics/scores/capacity meter, streaks, urgency or discount banners or countdowns, pervasive locks, popularity or listener counts, star ratings, the retired "Alive" (or any five-state) label, competing carousels, profile-completion nags, and "optimizer" language. Conditional claims only.

---

## 3. Two states

The dashboard changes based on whether you've checked in today.

### 3a. Pre-check-in (also the first-run state)

Top to bottom:
1. **Greeting** — "Good [morning/afternoon/evening], [name]." plus the date. Warm, plain.
2. **Priority: the check-in invite** — the single bright, inviting card. "How are you right now?" with a calm sub-line; tapping it opens the loop (situation → state → time → plan). This *is* today's suggested action before you've checked in, which is why there is no separate suggested-action card in this state.
3. **The 2-minute reset** — a slim, quiet escape-hatch affordance (see §4), reachable without scrolling.
4. **Two calm cards:** Insight, then Routine.

### 3b. Post-check-in (reflects your day)

Top to bottom:
1. **Greeting** (same).
2. **Priority: a calm state acknowledgment** — "Right now: [state]" in felt, plain language, visibly quieter than the pre-check-in invite. Once you've engaged, the surface gets *calmer*, it does not escalate demands. Re-checkable via a de-emphasized affordance.
3. **The 2-minute reset** (same slim affordance).
4. **Three calm cards:** Suggested action, Insight, Routine.

The shift between states is the heart of "reflects your day": the bright "do something" invite is replaced by a quiet "here's where you are," and a tailored suggestion appears. No stats, no activity log, no legacy state name.

---

## 4. Components

**Greeting.** Time-of-day greeting + name + date. No offers, no notifications dangled here.

**Priority — pre-check-in (Check-in invite).** The one bright card on the surface. Copy invites the loop; one tap target (the whole card). This is the only element allowed real color prominence; everything below stays muted.

**Priority — post-check-in (State acknowledgment).** A quiet "Right now: [state]" line, adapted from the persistent "you're feeling" pattern Calm uses, but in Vara's voice and the new model's language, derived from the situation and quadrant in plain felt words (not a five-state label, not a number). A small, de-emphasized "check in again" affordance sits with it. (Exact phrasings are a copy deliverable; see §8.1.)

**Card — Suggested action (post-check-in only).** One gentle suggestion framed as creating capacity, offered as "when you're ready," never "do this now." Carries a time-to-complete label and one CTA. No score, no streak, no urgency.

**Card — Insight / education.** A small daily brain-health insight, the "why" behind the practice, rotating daily. Conditional claims only ("can help," "designed to support"). This is education, not content to buy: no lock, no premium framing, no rating.

**Card — Routine / next thing.** Your routine for today, drawn from the Time pillar, with a contextual CTA (continue routine → begin routine → check habits → create one). Time-to-complete label. Warm empty state when there is no routine ("When you set a routine, it'll show up here."). This is your own routine, not merchandised content.

**The 2-minute reset (escape hatch).** A slim, quiet, always-present affordance, visually lighter than the three cards and reachable without scrolling, because acute moments can't scroll-hunt. Copy is a calm "Need a reset right now?" leading to the 2-minute practice. It is deliberately distinct from the suggested action: this is the safety net for an overwhelmed moment, not a content recommendation.

---

## 5. States & edge cases

- **First-run** (no history, no routine): the pre-check-in layout; the routine card shows its warm empty state; the insight card is always populated; the check-in invite is the natural first action. Every empty state is growth-framed and warm — never "nothing here yet."
- **Returning the same day after checking in:** the post-check-in state persists for the day and stays re-checkable.
- **Multiple check-ins in a day:** each re-check updates the acknowledgment and the suggested action. No "you already did this today" framing.
- **Evening / late day:** greeting and the suggested action adapt to time of day (wind-down framing in the evening). No nagging about what wasn't done.
- **Loading / offline:** skeleton states per the UI Standards; no harsh cutoffs or error-coded color.

---

## 6. What's removed from the current dashboard

- **The blur-gate** ("Your dashboard responds after you check in" over a blurred surface) — it directly contradicts the no-blur-gate decision in the refactor plan and walls an over-capacity user out of their own home.
- **The blurred weekly-habits grid** — the dashboard is not a stats page.
- **The post-check-in "Alive" card** — replaced by the calm acknowledgment in the new model's language.
- **The "Feed your curiosity / Browse Masterclasses" upsell card** — merchandising on a calm surface. Masterclasses, if they remain a feature, live in their own section, not here. (Confirm; see §8.4.)
- **Any locks, popularity counts, or ratings** — none appear on this surface.

---

## 7. The five lenses, applied (why this holds up)

- **Brand fit:** one bright priority, calm everything else, no pressure mechanics, premium surfaced as capability not as a wall. The removed list above is all brand-decision, not oversight.
- **Usability:** one primary action per state; three cards respects the home-as-doorway limit and Miller/Hick load; the state change gives clear system status without a dashboard of numbers.
- **iOS:** standard vertical scroll, safe areas respected, the priority card is a single large tap target in the thumb zone, the reset affordance stays reachable one-handed.
- **Accessibility:** the state acknowledgment must not rely on color alone; all cards carry text labels and 48px+ targets; Dynamic Type and Reduce Motion respected; the reset affordance has a clear screen-reader label.
- **Wellness ethics:** the surface gets calmer after engagement rather than pushing more; the 2-minute reset is an always-available distress net; no streaks/guilt/urgency for someone opening the app overwhelmed.

---

## 8. Open decisions (for your review)

1. **State-acknowledgment language.** How "Right now: [state]" reads post-check-in — felt, plain-language phrases derived from situation + quadrant (e.g. "a bit wound up," "running low but steady"), not a label or a number. I'll write the full phrasing set once you confirm the approach. *Recommendation: reflective phrase, no label, no number.*
2. **Suggested-action card placement.** It appears post-check-in only; pre-check-in the invite carries that role (so pre has two cards, post has three). *Recommendation: keep it post-only — a pre-check-in "suggested action" is just the check-in restated.* Confirm, or you want it in both states.
3. **The 2-minute reset as a slim affordance, not a card.** *Recommendation: a quiet line/pill under the priority element, lighter than the cards.* Confirm placement.
4. **Masterclasses off the dashboard.** *Recommendation: remove; they live in their own section if they remain a feature.* Confirm they aren't meant to be a dashboard feature.
5. **What "reflects your day" includes.** *Recommendation: current state + a forward suggestion only — no log of what you did earlier, since an activity readout drifts toward the stats page we're removing.* Confirm, or you want a light "you took a moment earlier" acknowledgment.

---

## 9. Out of scope (separate builds)

- The bottom-tab switch to the four-pillar IA (needs the Focus/Energy/Time pillar screens wired as tab destinations first).
- The pillar screens themselves.
- Skip/defer/remind-later, onboarding migration, BrowseRunFlow reconciliation.

---

*Source of truth for tokens, components, motion, and copy: Vara_Mobile_UI_Standards and the brand docs. This spec defers to them on all visual specifics.*

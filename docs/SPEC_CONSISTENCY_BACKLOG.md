# Vara Spec Consistency Backlog

Doc-level inconsistencies surfaced during implementation. The codebase
resolution is captured in CLAUDE Code's working session; this file
tracks the corresponding doc updates so they can land as a single
docs-only commit after Phase 1 wraps. Founder edits the docs.

---

## Bellows Breath excluded at v1

**Codebase resolution:** Phase 1 ships 11 protocols. Bellows Breath /
Kapalabhati is excluded — contraindication list (anxiety, pregnancy,
cardiac, hypertension, hernia) is too broad for an unsupervised consumer
launch without the user-profile contraindication-flag system.
Re-evaluate post-launch if/when that system exists.

**Docs to update:**
- `docs/Vara_Brain_State_Model_v2.2.md` — protocol table currently lists
  12 protocols including Bellows Breath as #11. Update to 11 protocols.
  Update Part 4 (Explicit Exclusions) to mention Bellows Breath as a
  v1 exclusion with the contraindication-flag rationale.
- `docs/Vara_Protocol_Detail_Content.md` — does not contain Bellows
  Breath content. Confirms the exclusion. No update required unless
  the file is renumbered.

## Focused Work Window: 45/90, not 45/60/90 or 25/45/90

**Codebase resolution:** Two variants ship — `focused-work-45` and
`focused-work-90`. Founder reasoning: three variants of the same
protocol is decision fatigue without meaningful differentiation.
Two variants give a clean "one block vs. two blocks" mental model.
The 25-minute Pomodoro-style use case doesn't fit Vara's positioning;
the 20-min time window should surface Brief Movement or short breath
protocols, not a truncated deep-work session.

**Docs to update:**
- `docs/Vara_Implementation_Plan.md` Phase 1 section — currently lists
  "Focused Work Window (45 min, 60 min, 90 min)". Update to
  "Focused Work Window (45 min, 90 min)".
- `docs/Vara_Brain_State_Model_v2.2.md` — Protocol #10 detail
  references "25, 45, or 90 minutes". Update to "45 or 90 minutes".
- `docs/Vara_Protocol_Detail_Content.md` — Protocol 10 metadata and
  body reference "25–90 min" and "25, 45, or 90". Update to
  "45–90 min" and "45 or 90".

## NSDR audio file format: ship MP3, not AAC m4a

**Codebase resolution:** NSDR audio ships as MP3 (`.mp3`). Founder
uploaded the stub clips to Firebase Storage at:
- `protocolAudio/nsdr/nsdr_10min_v1.mp3`
- `protocolAudio/nsdr/nsdr_20min_v1.mp3`

The original spec called for AAC inside an `.m4a` container. Switching
to MP3 simplifies content production (broader tooling support, no
container-vs-codec confusion) and expo-av plays both formats equally
well. The versioned filename scheme is unchanged — `_v1`, `_v2`, etc. —
only the extension differs.

**Docs to update:**
- `docs/Vara_NSDR_Audio_Scripts.md` line 29 — "Format: WAV master at
  48kHz / 24-bit, deliver compressed AAC at 128kbps for app use" should
  read "deliver compressed MP3 at 192kbps for app use" (or the rate the
  founder lands on after listening tests; AAC's 128kbps target doesn't
  carry over directly to MP3).
- `docs/Vara_NSDR_Audio_Scripts.md` line 512 — "Launch with two files:
  `nsdr_10min_v1.m4a` and `nsdr_20min_v1.m4a`" should reference `.mp3`
  filenames.

## Step transition fade duration: 250ms, not 200ms

**Codebase resolution:** `GuidedSessionPlayer.tsx` step transitions
use `FadeIn.duration(250)`, aligned to the Build Guide's transition
range (250–300ms).

**Why:** Build Guide §UI motion (lines 188-191) defines the canonical
ranges: 100–150ms feedback, 250–300ms transitions, 400–500ms content
fills. A step-view crossfade is a transition by that taxonomy. The
original Phase 1 implementation shipped 200ms (also fine perceptually,
slightly below the Build Guide's lower bound) and was lifted to 250ms
during Phase 2 prep so the codebase doesn't ship two fade constants.

**Doc to update:**
- `docs/Vara_Core_Loop_v2.md` line 81 — currently says "200ms fade
  transition." Update to 250ms or refer to the Build Guide range
  rather than pinning a specific value.

## Re-check copy shortened to "How are you now?" alone

**Codebase resolution:** Phase 2's `PostProtocolReCheck` screen uses
"How are you now?" as the title with no subtitle referencing the
just-completed protocol. The protocol identity is carried visually
elsewhere on the screen (header, breadcrumb, or top card —
implementer's choice during sub-step build) so a user re-mounting to
the re-check after an interruption isn't confused about which
protocol they're re-checking against. The protocol name does NOT
appear in the question copy.

**Why:** "How are you now? Your state after [Protocol Name]" reads
slightly clinical and pushes the protocol name into the question text
where it doesn't belong. "How are you now?" alone matches the
five-state vocabulary's directness.

**Docs to update:**
- `docs/Vara_Implementation_Plan.md` Phase 2 section — currently
  describes the re-check copy as "How are you now? Your state after
  [Protocol Name]." Drop the subtitle clause.
- `docs/Vara_Core_Loop_v2.md` line 181 — same subtitle should be
  removed. The screen description should note that the protocol
  identity is preserved visually on the screen but not in the
  question copy.

## Variant duration alignment with shipped time-window buckets

**Codebase resolution:** Several protocols had spec ranges that don't
align with shipped time-window buckets (`ProtocolTimeWindow = 2 | 5 |
10 | 20 | 45`). Founder resolution #3 from the schema-lock review:
defer to plan for time-window bucketing, defer to spec for actual
practice duration. Specifically:

- **Cold Water Reset** ships as 5-min total (1–2 min cold contact +
  prep + recovery), not 1–2 min.
- **Bright Light Exposure** ships as 10-min and 20-min variants. The
  spec's "5-10 min" lower bound is dropped.
- **Brief Movement** ships as 5-min and 10-min variants. The spec's
  1-20 min range was descriptive of the literature, not what we ship.

**Docs to update:**
- `docs/Vara_Brain_State_Model_v2.2.md` — Protocol table durations
  for Cold Water Reset, Bright Light Exposure, Brief Movement
  (Physical Activity).
- `docs/Vara_Protocol_Detail_Content.md` — same three protocols'
  Metadata strips.

## Outcome classifier: upward green-to-green = 'shifted'

**Codebase resolution:** `services/outcomeClassifier.ts` (Phase 2 sub-
step 2.2) classifies upward green-zone transitions (steady→clear,
steady→alive, clear→alive) as `'shifted'`, not `'maintenance'`.
Same-state green and downward green-zone transitions remain
`'maintenance'`. Inferred rule, not in `Vara_Core_Loop_v2.md`.

**Why:** Core Loop v2's "shifted vs not shifted" framing addresses
movement toward the green zone and the Wired→Foggy edge case but
doesn't disambiguate green-to-green direction. The "user remains
functional" rationale fits same-state and downward green moves
(protocol held the line against drift) but underclaims upward moves
(the user actively lifted within the working zone — steady morning
vs alive morning is a felt difference). Compressing this into the
outcome enum keeps Patterns queries fast without per-row trajectory
reconstruction.

**Phase 5 escape hatch:** if Patterns analysis surfaces a need to
distinguish "lift from baseline" (steady→clear) from "lift from
negative state" (wired→clear) without reconstructing the
(stateBefore, stateAfter) pair on read, consider adding a fifth
outcome value or a separate metadata column. Current rule is the
simpler default; revisit only if data shows it.

**Doc to update:**
- `docs/Vara_Core_Loop_v2.md` §"Defining 'shifted' vs 'not shifted'"
  (lines 198–209) — current text leaves green-to-green ambiguous.
  Add: "Upward shifts within the green zone (steady→clear,
  steady→alive, clear→alive) classify as 'shifted'. Same-state and
  downward green-zone shifts classify as 'maintenance'."

## Overwhelm Safety Card protocol selection

**Codebase resolution:** Sub-step 2.6 locks Sensory Reset (`sensory-
reset-2`) as the Overwhelm Safety Card's protocol via the named
constant `OVERWHELM_DEFAULT_PROTOCOL_ID` in
`mobile/src/constants/overwhelmDefaults.ts`.

**Why Sensory Reset over Cyclic Sighing:**

Two of three explicit specs name Sensory Reset specifically:
- `Vara_Brain_State_Model_v2.2.md:234` — "Sensory Reset (auto-
  offered on 'Need something now?' card)"
- `Vara_Persona_Validation.md:108` — "2-minute Sensory Reset, no
  state selection required"

Plus the rationale baked into the protocol catalog
(`brainStateProtocols.ts:455`) fits the Overwhelm context: "any
moment when you need something immediate and can't pause to breathe
deliberately." The Overwhelm user may not have access to the
deliberate inhale/double-exhale Cyclic Sighing requires.

**Doc to update:**
- `docs/Vara_Implementation_Plan.md` line 294 — currently reads "go
  directly to a Cyclic Sighing or Sensory Reset". Update to "go
  directly to a Sensory Reset" (drop the "Cyclic Sighing or"
  alternative).

---

## Case 4 routing target after re-check

**Codebase resolution:** Sub-step 2.5's BrowseRunFlow routes the
user back to the Practices index after the re-check completes,
NOT to Today as Core Loop v2 §Case 4 (lines 309-310) specifies.

**Why:**
- The user came from Practices (exploratory mode). Auto-routing to
  Today breaks the exploration loop and removes a navigation choice
  they didn't ask for.
- The standard flow's response screen has `'rest_later'` that
  explicitly routes to Today. The browse flow has no response
  screen and no opportunity for the user to express "I'm done now."
  Auto-routing to Today makes that choice for them.
- Today is the right destination after a goal-directed check-in
  completes. Practices is the right destination after browsing —
  the user is still in exploration mode.

**Phase 5 escape hatch:** if Patterns analysis surfaces evidence
that browse-launched users actually want to land on Today after a
re-check (e.g., "users who route back to Practices then leave the
app within 30s"), revisit. Trivial code change — single
`navigation.navigate(...)` call in BrowseRunFlow's onComplete
handler.

**Doc to update:**
- `docs/Vara_Core_Loop_v2.md` §Case 4 line 309-310 — currently
  reads "...capture the data, route to Today." Update to "...
  capture the data, route back to Practices index" (or the
  user's pre-flow location).

---

## Notes for the docs-only commit

- Land all of these together in one commit after Phase 1 wraps (after
  static data is populated and the player is built — at that point the
  shipped variant set is observable in code and can be cross-checked
  against the doc updates).
- Build Guide stays the source of truth for "11 protocols." It
  currently says 11 — no change needed there.

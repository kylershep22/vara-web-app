# Vara Voice Audit Backlog

Running list of brand-voice issues surfaced during Phase 0+ implementation work.
**Not fixed in the phase they were found.** Addressed in Phase 6 as a single coordinated copy audit pass.

Format per entry: file, line number, current text, principle violated, suggested direction.

---

## Open items

### `mobile/src/components/dashboard/DashboardAnchor/brainStateBriefs.ts`

- **Line 87** (wired state, variant 0)
  - Current: *"Logging sleep and stress helps you spot what triggers wired days."*
  - Principle violated: Build Guide #2 — *"Recovery and adjustment are normal and healthy, not failures."* The word "triggers" frames wired days as problems to eliminate rather than as normal states to understand.
  - Suggested direction: Replace "triggers" with observational language (e.g., "precedes," "shows up before," or restructure around "patterns around your wired time").
  - Surfaced: Phase 0, during state rename.

- **Line 91** (alive state, variant 2 — post-rename)
  - Current: *"Capturing what fuels your best days builds a personal playbook."*
  - Principle violated: Build Guide #3 — *"No grading, no evaluation."* "Best days" explicitly ranks days against each other.
  - Suggested direction: Drop "best days"; replace with neutral framing (e.g., "Capturing what fuels days like this one builds a personal playbook.").
  - Surfaced: Phase 0, during state rename.

---

## Closed items

_None yet._

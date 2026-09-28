/**
 * Chrome strings for the protocol sheet (slice 9.1b), the first surface that
 * renders a protocol's `whyItWorks`.
 *
 * THE PROTOCOL'S OWN CONTENT IS NOT HERE. Its name, daily action and why it
 * works are Jen's authored content in protocolEngine/protocolMatrix.ts, a
 * different pipeline with its own gate. What lives here is only the frame
 * around that content, and every string in it is DRAFTED: written against the
 * guidelines rather than lifted from them.
 *
 * OWNERS, PER KYLE'S RULING. Kyle owns the UI strings. The heading over
 * `whyItWorks` is JEN'S, because it frames a clinical rationale: a heading
 * there tells the reader what kind of claim follows, which is efficacy-
 * adjacent copy whatever its length.
 *
 * The completion strings are NOT here either. They are TodayCompletion's,
 * shared with the hero card so one sign-off covers both surfaces.
 *
 * Copy rule (product principle 8): no em dashes in user-facing strings.
 */
export const PROTOCOL_SHEET_COPY = {
  // COPY: draft, not from guidelines doc - pending Kyle
  title: "Today's action",
  // COPY: draft, not from guidelines doc - pending Kyle
  actionHeading: 'What to do',
  // COPY: draft, not from guidelines doc - pending Jen
  whyHeading: 'Why it can help',
  // COPY: draft, not from guidelines doc - pending Kyle
  dismiss: 'Back to Today',
  // COPY: draft, not from guidelines doc - pending Kyle
  // Shown IN PLACE OF the completion control once this device knows the day's
  // plan has moved on from the protocol the sheet is showing. Says what
  // happened and where to go, and nothing about why: the reason is a phase
  // change, a capture or an adjustment, and the sheet cannot name which
  // without a string per cause.
  diverged: "Your plan for today has updated. Head back to Today to see what's next.",
} as const;

/**
 * The journey document's read boundary: is this row renderable, and how do we
 * name its owner in a log line (slices 7e and 7f).
 *
 * A LEAF MODULE WITH NOTHING BEHIND IT. It imports the two vocabulary arrays
 * and a type, and nothing else - no Firestore, no logger, no React. That is
 * what lets the resolver, the service accessor and their tests all reach the
 * same predicate without any of them dragging the others' dependencies along.
 * The same argument that moved `destinationBridge` out of `resolveJourney` in
 * slice 4: a check this small should cost nothing to import.
 *
 * WHY IT EXISTS AT ALL. Slice 7e put this predicate inline in `resolveJourney`,
 * which covered Today. Slice 7f needs the identical check on the journey map,
 * which reads `journeyStates` directly and never passes through the resolver.
 * Two call sites means one definition or two copies, and the vocabulary already
 * has two legitimate homes it must agree with - `PHASE_ORDER`/`DESTINATION_KEYS`
 * here and `validJourney` in firestore.rules. A third and fourth copy in
 * TypeScript is how they drift.
 */
import { DESTINATION_KEYS, PHASE_ORDER } from '../constants/journey';
import type { JourneyState } from '../types/models';

/**
 * Are the two keys this document is INDEXED BY both inside their unions?
 *
 * THE TYPES SAY YES AND THE TYPES ARE NOT LOAD BEARING HERE. `phaseKey` and
 * `destination` are declared `PhaseKey` and `DestinationKey` on JourneyState,
 * so the compiler treats both as closed unions from the moment the document is
 * read. Nothing checks that at the boundary: the service hands back whatever
 * Firestore holds under those names, and a document written outside the app
 * carries whatever was typed into it.
 *
 * WHY IT MATTERS MORE THAN A WRONG STRING USUALLY DOES. Both keys are used to
 * INDEX rather than to compare, and both indexes are evaluated during a render:
 * `PHASE_DISPLAY[phaseKey][destination].short` in `JourneyLine` and
 * `PHASE_DISPLAY[phase][destination]` in `PhasePath`. A key outside its union
 * makes the outer lookup `undefined` and the inner access throws mid-render,
 * which the app's single ErrorBoundary (App.tsx:114, above the navigator)
 * answers by replacing the WHOLE APP with its fallback - not the screen, and
 * not the tab. Reproduced on `main` with a console-typed "remove " (a trailing
 * space) during slice 7b's walk.
 *
 * A CLIENT CANNOT PRODUCE SUCH A DOCUMENT. `validJourney` in firestore.rules
 * gates both keys on create AND update, and every in-app writer goes through
 * `createJourneyState`. Admin SDK writes bypass rules, so the producers are the
 * Firebase console and rows predating the rule. That is why this is a boundary
 * guard and not a hunt for a bad writer.
 *
 * READS FROM PHASE_ORDER AND DESTINATION_KEYS, never from a local list. Those
 * two arrays are already the one definition of both vocabularies, and a copy
 * here would admit a fifth phase the display table would then refuse, which is
 * this defect again wearing a new coat.
 *
 * `history` IS DELIBERATELY NOT CHECKED HERE. It is not an index and it is not
 * read by every consumer: `derivePhaseStates` is the only render-path reader,
 * and it guards its own input (see `phaseStates.ts`). Folding it in would make
 * a whole journey unrenderable over a field two of the three surfaces never
 * touch.
 */
export function hasRenderableKeys(state: JourneyState): boolean {
  return (
    PHASE_ORDER.includes(state.phaseKey) &&
    DESTINATION_KEYS.includes(state.destination)
  );
}

/**
 * A non-reversible short digest of a uid, for logs.
 *
 * THE UID ITSELF MUST NEVER REACH A LOG LINE. A warning about a document that
 * could not be rendered is an operational signal; a warning that names the user
 * is personal data sitting in a crash reporter. This is a djb2 hash rendered
 * hex, which is enough to tell two users apart in a log and not enough to
 * identify either.
 *
 * MOVED HERE FROM resolveJourney IN SLICE 7f, and the move is the point rather
 * than tidying. The service's read accessor needs this function, and the
 * service cannot import `resolveJourney` - `resolveJourney` imports the
 * service, and that is a cycle Metro 0.83 does not forgive. The alternative was
 * a second djb2 implementation, which is the same duplication this file exists
 * to prevent, one identifier over.
 */
export function uidDigest(uid: string): string {
  let h = 5381;
  for (let i = 0; i < uid.length; i += 1) {
    h = ((h << 5) + h + uid.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

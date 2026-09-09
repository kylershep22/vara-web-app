/**
 * The route strip: the four phases of a destination, in order, as one line
 * each.
 *
 * WHAT IT IS FOR. A1 asks the user what they want; the app then starts
 * somewhere that is not obviously that. The strip is the evidence that the
 * detour is a route rather than a diversion, so it shows all four steps at
 * once, with the first marked as where they are about to begin.
 *
 * NOW A THIN CALL ON PhasePath (slice 5a). Everything the strip used to draw
 * itself, it now shares with the journey map: same four rows, same order, same
 * markers, same emphasis on the row the user is standing on. What survives here
 * is only what A2 does differently, which is three things: it renders `short`,
 * it draws no state words, and its current row says "Starting here" rather than
 * "Where you are", because A2 is spoken to someone who has not started.
 *
 * A2 LOOKS DIFFERENT AFTER THIS SLICE, AND THAT IS THE POINT (slice 4a's known
 * gap 2). The four rows used to be bullets, which undersold the sequence on the
 * one screen whose job is to make the detour read as a route. They are now
 * joined by a rail and read as a path. No copy changed.
 *
 * RENDERS `short` AND ONLY `short`. PHASE_DISPLAY carries three lengths per
 * cell; `title` and `gloss` belong to the map card. Reaching for either here
 * would put map copy on an onboarding screen and make two surfaces that must
 * stay independently editable share a string by accident.
 *
 * THE FRAMEWORK WORDS NEVER APPEAR. `remove | recover | rewire | refocus` are
 * keys used to look copy up; what renders is Jen's. Roadmap section 8, and
 * brandCopyGuard enforces it.
 *
 * NO COUNTERS, NO PROGRESS SEMANTICS. The strip is not a progress bar and must
 * not grow one: nothing here says "1 of 4", nothing fills in as phases
 * complete, and the current phase is marked by emphasis rather than by a
 * number. Phases advance on an offer the user accepts, never on a countdown,
 * and a strip that implied otherwise would promise a schedule the model does
 * not keep.
 */
import React from 'react';

import { phaseStatesForRoute } from '../../journey/phaseStates';
import type { DestinationKey, PhaseKey } from '../../types/models';
import { PhasePath } from './PhasePath';

/**
 * Spoken on the current row, never drawn.
 *
 * NOT A `COPY: draft` STRING AND NOT IN journeyCopy.ts. It is an accessibility
 * phrase that exists to make the spoken strip match the seen one, it has been
 * in place since slice 4a, and it is the only line the strip owns. The four
 * words the MAP shows are copy, are drafted, and live in constants/journeyCopy.
 */
const STARTING_HERE = 'Starting here.';

interface RouteStripProps {
  destination: DestinationKey;
  /**
   * The phase the user is about to start. Always 'remove' today, since every
   * journey opens there, but passed rather than assumed so the migration
   * branch can render a strip for a user whose phase came from elsewhere.
   */
  currentPhase?: PhaseKey;
  testID?: string;
}

export const RouteStrip: React.FC<RouteStripProps> = ({
  destination,
  currentPhase = 'remove',
  testID = 'journey-route-strip',
}) => (
  <PhasePath
    destination={destination}
    states={phaseStatesForRoute(currentPhase)}
    copy="short"
    stateLabels={{ current: STARTING_HERE }}
    showStateLabels={false}
    testID={testID}
  />
);

export default RouteStrip;

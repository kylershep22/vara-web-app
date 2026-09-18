/**
 * moments — persistence for Good moments (journey slice 8).
 *
 * WRITE-ONLY BY DESIGN, AND THAT IS THE WHOLE SERVICE. There is no read
 * function here and there is not meant to be one. Row 8 says the feature
 * "feeds nothing until Insights ships", and Insights is on the post-beta list.
 * A read path built now would have no caller, and the first caller it acquired
 * would be one nobody designed the surface for. When Insights lands, it adds
 * the read in its own slice and gets to decide what it reads back.
 *
 * OWNERSHIP LIVES IN THE `userId` FIELD, NEVER IN THE DOCUMENT ID. This is the
 * capturedTasks and dayBlocks shape, and the reason is the one spelled out in
 * capturedTasks.service.ts's header: a list query evaluates the rule per
 * candidate document, so checking the FIELD is what makes
 * `where userId == uid` legal for the caller's own rows and illegal for
 * everyone else's. The deleteAccount sweep is that same field query, so a
 * collection owned through its document ID would need a one-off delete by path
 * instead of sweeping with its siblings.
 *
 * THIS DEVIATES FROM ROW 8's LITERAL TEXT, WHICH SPECIFIES `moments/{uid}_{ts}`,
 * and the deviation is decided rather than accidental. Three reasons, recorded
 * here and in the roadmap amendment: the sweep is a field query; the two most
 * recent collections in the app (dayBlocks, capturedTasks) both went this way
 * deliberately; and firestore.rules records the exposure a guessable composite
 * ID carries, since a get on a non-existent document is allowed to any
 * authenticated caller and presence therefore becomes observable to anyone who
 * can guess an ID.
 *
 * `serverTimestamp()` RATHER THAN A CLIENT CLOCK. The only consumer this
 * collection will ever have is a data view, and a device with a wrong clock
 * would file a moment under the wrong day forever. Nothing reads it back today,
 * which is exactly why it has to be right on the way in: there is no surface
 * that would ever show a user a date wrong enough to report.
 *
 * Uses requireDb() rather than a raw `if (!db)` guard, for the reason
 * capturedTasks.service.ts gives: a write that silently no-ops because Firebase
 * failed to initialize is worse than one that surfaces. Here it is worse still,
 * because the sheet's failure copy is the only thing that tells the user their
 * moment did not land.
 */

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import { requireDb } from './ensureDb';

const MOMENTS = 'moments';

/**
 * Record one good moment.
 *
 * `text` is written exactly as handed in. Trimming belongs to the caller, which
 * is also the thing that decides whether the save is allowed at all, so doing
 * it in both places would mean two definitions of "empty" that could drift.
 *
 * @returns the new document id.
 */
export async function createMoment(
  userId: string,
  text: string
): Promise<string> {
  const ref = await addDoc(collection(requireDb(), MOMENTS), {
    userId,
    text,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

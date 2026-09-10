/**
 * Start here: which explainer video each surface plays, and what the row is
 * called (Journey Architecture Roadmap v3, sections 1, 6 item 9 and 8; slice 5c
 * decisions 3 and 4, Kyle 2026-09-09).
 *
 * KEYED BY SURFACE FROM THE FIRST COMMIT, and that is the point of the file.
 * Slice 5c mounts the Practices instance; slice 7 mounts Today on this same
 * mechanism. A Practices-only build means slice 7 writes a second one, and the
 * second build is the one that never happens. Same reasoning that put PhasePath
 * in front of two surfaces in slice 5a.
 *
 * BOTH PATHS ARE NULL TODAY, AND THAT IS THE SHIPPED STATE RATHER THAN A GAP.
 * Neither video exists: they are Jen's, section 6 item 9, and they arrive as
 * data. Slice 5c decision 1 says no video means no row, so a null path renders
 * nothing at all and this slice has no user-visible effect on merge. The day a
 * file lands in the bucket, the only change here is the string.
 *
 * WHY NULL RATHER THAN A DEAD PLACEHOLDER PATH. Section 6 item 9 says the
 * containers ship "with a placeholder path", and a path naming an object that
 * does not exist would also render nothing, because resolution fails and
 * decision 1 treats failure and absence identically. What it would ALSO do is
 * fire a Storage round trip and a `logger.error` on every mount of the Practices
 * tab, for every user, until the file exists. A recurring error line about a
 * file nobody has uploaded yet reads as a defect to the next person in the
 * device logs, and logger.error is not `__DEV__`-gated. The intended paths are
 * recorded below so the swap stays a one-line data change either way.
 *
 * THE PREFIX IS `focus-video/` ON PURPOSE (decision 4). `storage.rules:137-141`
 * already allows read on that prefix to any signed-in user, so nothing here
 * needs a rules change or a deploy. The folder is named for the slice that
 * created it rather than for what it holds, which is naming debt: recorded,
 * queued, not paid here. Renaming the bucket folder without renaming the rules
 * block silently 403s every playback, which is the trap `coaching-auido` in the
 * same file is still sitting in.
 *
 * Precedent for a media path as a source constant: `audioPath` on the protocol
 * steps in `constants/brainStateProtocols.ts:395`, and `SLEEP_AUDIO_PATHS` read
 * at `services/firebase/library.service.ts:275`. Not Firestore-hosted: a new
 * collection needs rules before its first write plus a deploy, which is
 * disproportionate for two values that change roughly never.
 */

/**
 * The surfaces that carry a Start here row.
 *
 * A UNION, NOT A STRING. It is what keys the path table and what scopes the
 * collapse marker, so the two can never drift apart or be keyed by a typo.
 */
export type StartHereSurface = 'practices' | 'today';

/**
 * Full Firebase Storage path of each surface's explainer, or null when there is
 * no video for that surface yet.
 *
 * FULL PATHS, INCLUDING THE FOLDER. `VideoPlayerModal` and `useVideoSource` bake
 * in no root prefix and know nothing about any media family, so a bare filename
 * would resolve against the bucket root and 403.
 *
 * Intended paths when the videos land, per section 6 item 9:
 *   practices — how the map works
 *               `focus-video/start_here_practices_v1.mp4`
 *   today     — what drives results and why the order
 *               `focus-video/start_here_today_v1.mp4`
 *
 * VERSIONED FILENAMES ARE HOW CONTENT INVALIDATES THE CACHE. `resolveStorageUrl`
 * memoises by path for the JS bundle lifetime and Firebase download URLs carry a
 * token that rotates on re-upload, so a replacement video ships as `_v2`, never
 * as the same name uploaded twice.
 */
export const START_HERE_PATHS: Record<StartHereSurface, string | null> = {
  practices: null,
  today: null,
};

/**
 * What the row calls itself, and what the player's header says once it opens.
 *
 * ONE STRING FOR BOTH SURFACES, and it lives here rather than at either mount
 * because both surfaces say the same word. Sections 1 and 8 both name the
 * element "Start here" on Today and on the map; a second copy at the second
 * mount is how one gets revised and the other does not, which is the reasoning
 * in the `constants/journeyCopy.ts` header applied to a shorter string.
 *
 * THE GLOSS IS NOT HERE, and that is deliberate. Each surface's video explains a
 * different thing (section 6 item 9: the map on Practices, what drives results
 * on Today), so the one-line gloss is a prop supplied by the mount. Drafting
 * Today's line in this slice would put a string nobody will walk in front of
 * slice 7 as though it had been decided.
 */
// COPY: draft, not from guidelines doc - pending Kyle
export const START_HERE_LABEL = 'Start here';

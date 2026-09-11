/**
 * Release gate for unapproved copy.
 *
 * WHY THIS EXISTS. Draft strings used to announce themselves: they rendered a
 * "[COPY GAP] " or "[Jen] " prefix on screen, so no build could be mistaken for
 * finished product and a couple of tests could assert the marker was there.
 * That convention is retired because no marker text may reach the UI, and what
 * replaced it is a comment sentinel sitting above each drafted string. A comment
 * is visible to whoever opens the file and to nobody else, so on its own it
 * enforces nothing. This suite is the enforcement.
 *
 * THE CONTRACT, and it is the whole point of pinning a number:
 *
 *   - The count goes DOWN when THE COPY OWNER SIGNS OFF. Jen owns efficacy-
 *     adjacent and check-in copy; Kyle owns UI strings. Remove that string's
 *     sentinel and decrement EXPECTED_SENTINELS in the same commit, naming the
 *     OWNER as well as the strings. Two owners is not a loophole: which one
 *     applies is a property of the copy, not of who is available, and a UI
 *     string Kyle clears carries a weaker warrant than a Jen review of the same
 *     length of text. Say which in the commit so a later reader can tell.
 *   - The count goes UP when new drafted copy lands. Add the sentinel and
 *     increment EXPECTED_SENTINELS in the same commit.
 *   - EITHER DIRECTION MUST BE NAMED IN THE COMMIT MESSAGE that makes it, with
 *     the strings and the owner involved. A silent edit to this number is the
 *     failure mode this test exists to prevent: it is the difference between
 *     "the owner signed off on nine strings" and "someone deleted nine
 *     inconvenient comments".
 *
 * A red build here is not a bug in the test. It means the set of unapproved
 * strings changed and the change has not been accounted for.
 *
 * OUT OF SCOPE: protocolEngine's `PLACEHOLDER [Jen]` annotations. That is a
 * different convention on a different pipeline (protocol content, "why this
 * works" education and efficacy claims, all authored and reviewed by Jen rather
 * than written against the brand guidelines), and it is excluded here so the two
 * never get conflated or traded off against each other.
 */
import * as fs from 'fs';
import * as path from 'path';

/**
 * The pinned number of drafted strings in mobile/src.
 *
 * Read the contract in this file's header before changing it.
 */
// 173 since journey slice 3b: -13, and this decrement is neither an approval
// nor a new draft. The weekly open was deleted outright and took its copy with
// it. Ten from OPEN_COPY in screens/weekly/copy.ts (the outcome and capacity
// questions, the week-start question and its help line, the confirm, back,
// per-day, why-heading, confirm-heading and save-failure lines) and three from
// OpenYourWeekCard's local COPY ('Start your week', its body line, and 'Open
// your week').
//
// NO OWNER IS NAMED BECAUSE NOBODY SIGNED THESE OFF. The contract above covers
// approval and new drafts; this is the third case, deletion, where the surface
// a string lived on stopped existing. Say so plainly rather than borrowing the
// word approved, which would misreport thirteen unreviewed strings as reviewed.
//
// 186 since the TIME_LABELS approval: -3. Owner Kyle, 2026-09-04, for
// '5 minutes or less', '10 to 15 minutes', '15 minutes or more' in
// dailyPicker.copy.ts. Reviewed in the form users meet them: the 2026-09-03
// VoiceOver walk heard the spoken "[window]. [gloss]" on device and passed it.
// These are the accessibility half of the chip control whose visible half was
// approved at 189; the pair must be revised together from here.
//
// 189 since the copy-approvals close-out: -6, owner Kyle, 2026-09-04, for the
// three TIME_CHIP_LABELS in dailyPicker.copy.ts ('5 min or less', '10 to 15
// min', '15 min or more') and the three FIRST_MOVE_BY_FAMILY in
// screens/journey/removeCapture/copy.ts (behavioral, mental, interpersonal).
// The first decrement made on Kyle's authority rather than Jen's, which is what
// prompted the owner rule now written into the contract above.
//
// 195 since the daily-picker time-chips slice: +3 for TIME_CHIP_LABELS.
//
// 192 since journey slice 3c-i: +3 for FIRST_MOVE_BY_FAMILY in the Remove
// capture flow. Those three are sourced from "the v3 pack Section 4", which was
// not supplied with the slice brief the way Section 6 (the protocols) was, so
// they are marked drafted and counted rather than shipped as approved content.
// Everything else the slice added is either Jen-approved (the six protocols,
// the capture chips) or placeholder-marked safety copy, which carries its own
// marker and its own merge gate.
// 174 since journey slice 3c-ii: +1 for REPLACEMENT_COPY.confirmedPrimary
// ('Got it') in screens/journey/removeCapture/copy.ts. Owner Kyle: it is a UI
// button label, not efficacy-adjacent copy. Everything else the slice added is
// Jen-authored and approved on delivery (Content Pack v1 §replacement-menus and
// §decisions-3: the menu title, the eighteen option labels and the three neutral
// confirmations), which per the pack header enters WITHOUT markers and does not
// move this number. The one gap is the label on the control that dismisses the
// confirmation: in Jen's original the deferred reminder step owned that position
// and it went to slice 9 with the rest, so the pack supplies no word for it.
//
// 173 since the 3c-ii follow-up: -1, AN APPROVAL. Owner Kyle, 2026-09-06, for
// REPLACEMENT_COPY.confirmedPrimary ('Got it') -- the same string the +1 above
// added, signed off on device during the 3c-ii walk and the marker cleared in
// the follow-up commit rather than on the branch. Reviewed in place, in the
// confirmed state it dismisses, which is the form the user meets it in.
//
// THE NUMBER RETURNS TO 173 BUT THE SET IS NOT THE 3b SET. Two unrelated
// changes have parked on this value now, and a reader diffing pins alone would
// see no movement across the whole of slice 3c-ii. The draft landed and was
// cleared one commit later; the flat pin is the sum of those two, not evidence
// that neither happened.
//
// 165 since journey slice 4a: -8, and this is A FOURTH CASE the contract above
// does not cover. Not an approval, not a new draft, and not slice 3b's
// deletion-with-surface. These strings were SUPERSEDED BY APPROVED PACK
// CONTENT: the screens they lived on still exist, the questions are still
// asked, and Jen's copy now answers them.
//
// The eight, all in screens/onboarding/v3/copy.ts:
//   - OUTCOME_COPY title, subtitle and primary (3), replaced by
//     Content Pack v1 section A1. The subtitle has no replacement and was
//     dropped outright by Kyle on 2026-09-06: it said the user could switch
//     outcomes any week, which is false under the journey model.
//   - OUTCOME_BLURBS focus / stress / routines / energy (4), replaced by
//     section A1's four first-person lines, rekeyed onto DestinationKey.
//   - CAPACITY_COPY.title (1). NOT a supersession but a CONSOLIDATION: the
//     onboarding capacity step now asks the daily picker's question, which
//     already existed, so one of the two strings stopped existing rather than
//     either being approved.
//
// NO OWNER IS NAMED FOR THE DECREMENT, deliberately, and for the same reason
// the 3b entry names none: nobody signed these off. Calling this an approval
// would report eight unreviewed strings as reviewed. What happened is that Jen
// wrote better ones.
//
// TWO THINGS THAT LOOK LIKE MOVEMENT AND ARE NOT:
//   - CAPACITY_COPY.subtitle was redrafted (its old line ended "you can change
//     it mid-week", wrong twice) and its owner moved from Jen to Kyle. A
//     drafted string replaced by a drafted string is a SUBSTITUTION, not a +1.
//     The count does not move for it; the owner comment does.
//   - PICKER_COPY.capacityQuestion moved to constants/capacityCopy.ts so the
//     onboarding screen could read it without importing from components/. One
//     marker out, the same marker in, net zero.
//
// The 22 strings slice 4a added are all Jen's, from Content Pack v1 sections
// A1, A2 and short-labels, and enter WITHOUT markers per the pack header.
//
// 168 since journey slice 4b: +3 for DESTINATION_SUMMARY_LABELS in
// constants/journeyCopy.ts -- 'Focus', 'Calm' and 'Energy'. Owner Kyle: they
// are one-word UI labels, not efficacy-adjacent copy.
//
// WHY THREE AND NOT FOUR. The map has four entries; `routines` reads 'Steadier
// days', which is APPROVED (Content Pack v1 part one section 3, decision 2,
// resolving roadmap section 9 item 9) and therefore carries no marker and does
// not count. A partially-approved map is unusual enough to say out loud rather
// than leave to be rediscovered.
//
// WHY NEW STRINGS AT ALL, when OUTCOME_LABELS already spells 'Focus' and
// 'Energy' identically. The two maps are keyed on DIFFERENT UNIONS:
// OUTCOME_LABELS on `focus | stress | routines | energy`, this one on
// `focus | calm | routines | energy`. Three keys coincide and one does not,
// which is exactly the shape that makes reusing the first map look safe. A
// cycle written before slice 4b is labelled from its stored outcome; one
// written after is labelled from the journey's destination; neither map is ever
// indexed with the other's key. Sharing them to save three strings would trade
// a sentinel count for the seam this whole slice exists to keep straight.
//
// 165 since the 4b follow-up: -3, AN APPROVAL. Owner Kyle, 2026-09-07, for
// 'Focus', 'Calm' and 'Energy' in DESTINATION_SUMMARY_LABELS -- the same three
// the +3 above added. Signed off on device during the 4b walk, read in the
// summary line they occupy rather than off a list, and the markers cleared in
// the follow-up commit rather than on the branch.
//
// THE PARTIAL-APPROVAL ODDITY IS CLOSED, not merely reduced. That map is now
// fully approved: three by Kyle here, 'Steadier days' flat from the pack. The
// note above explaining why only three of four counted is history rather than
// a live caveat, and the map's own doc comment says so.
//
// THE NUMBER RETURNS TO 165 AND THE SET IS THE SAME SET. Unlike the 3b/3c-ii
// pair that both parked on 173, this is a +3 and a -3 on the same three
// strings one commit apart. A reader diffing pins alone would see no movement
// across slice 4b; the flat pin is the sum of those two, not evidence that
// neither happened.
// 169 since journey slice 5a: +4, A NEW DRAFT. Owner Kyle, 2026-09-09, for
// 'Done', 'Where you are', 'Ahead' and 'Skipped' in PHASE_STATE_LABELS
// (constants/journeyCopy.ts) -- the four row states on the journey map.
//
// NOT PACK CONTENT, WHICH IS WHY THEY COUNT. Content Pack v1 delivers 16
// titles, 16 glosses and 16 shorts and NO state vocabulary at all; roadmap
// section 1 writes these four in capitals as prose describing what the map
// shows, which is a specification of the concept and not approved copy. Kyle
// owns them because they are UI labels rather than efficacy-adjacent text, and
// they are reviewed in place on the map rather than off a list.
//
// THE NINE THAT MOVED HOUSE AND DID NOT COUNT. The same slice deleted
// PracticesHubScreen and carried its nine drafted strings into
// JourneyMapScreen unchanged: four card labels, four descriptors and the
// 'Pick a place to start.' line. Nobody approved them, nobody redrafted them,
// and their surface did not stop existing -- it was replaced by one that still
// renders them. So this is neither 3b's deletion-with-surface nor 4a's
// supersession-by-pack: it is a MOVE, and a move is sentinel-neutral by
// definition. The file path in the per-file listing changes and the number does
// not. Do not read the 9 appearing under a new path as nine new drafts.
//
// 165 since the 5a rider: -4, AN APPROVAL. Owner Kyle, 2026-09-09, for the same
// four strings the +4 above added -- 'Where you are', 'Done', 'Ahead' and
// 'Skipped' in PHASE_STATE_LABELS. Signed off on device during the 5a walk,
// read on the map rows they occupy rather than off a list, and the markers
// cleared on the branch before the merge rather than in a follow-up on main.
//
// THE PIN RETURNS TO 165 AND THE SET IS NOT THE SAME SET, which is the opposite
// of the 4b case one entry above and the reason both notes stay. 4b was a +3
// and a -3 on three identical strings. Here the number that left (165, the 4a
// close) and the number that returned (165, this rider) bracket a slice that
// ALSO moved nine strings between files without changing the count. A reader
// diffing 5a's start against its end sees no movement and would be wrong three
// times: four drafted, four approved, nine relocated. Read the notes, not the
// number.
//
// STILL DRAFTED AND UNTOUCHED BY THIS RIDER: the nine carried strings in
// screens/journey/JourneyMapScreen.tsx. Four card labels, four descriptors and
// 'Pick a place to start.', all pending Jen, none of them Kyle's to clear.
//
// 170 since journey slice 5b-i: +5, A NEW DRAFT. Owner Kyle, 2026-09-09, for
// the four phase-page bodies in PHASE_PAGE_BODIES and the one lead-in line in
// PHASE_PAGE_COPY (constants/journeyCopy.ts). Not pack content: Content Pack v1
// delivers 16 titles, 16 glosses and 16 shorts, and neither it nor the roadmap
// specifies what a phase detail page says in its own voice.
//
// FIVE, AND FIVE IS THE FLOOR RATHER THAN A BUDGET. One body per phase because
// each of the four pages has to say what its stretch is doing, and one lead-in
// because a curated replacement label rendered with no line above it is a
// sentence fragment. The bodies are per PHASE, not per (phase, destination):
// sixteen would say a third time what Jen's title and gloss already say twice.
// They are also state-agnostic, so an unreached phase needs no second version
// and no empty state, which is another four strings not written.
//
// 'Done' BECAME 'Complete' IN THE SAME SLICE AND THE SENTINEL DID NOT MOVE FOR
// IT. Both strings are Kyle's and both were approved; a substitution of an
// approved string by another approved string is neither a new draft nor an
// approval, so it has no arithmetic. Recorded because the pin moving 165 -> 170
// in a commit that also changed a state label invites exactly the wrong
// reconstruction: the +5 is the five new strings and nothing else.
//
// THE NINE ON THE MAP DID NOT MOVE EITHER, AND THIS TIME THAT IS A REVERSAL.
// The 5a entry above predicted the card block would be re-housed onto the phase
// pages, taking its nine drafted strings with it for a -9. Decision 3 of
// 2026-09-09 superseded that: a phase page is an explanation, not a second
// launcher, so the cards stay on the map and the nine stay where they are. The
// prediction is deferred, not executed. Do not go looking for the -9 in this
// slice.
//
// 165 since the 5b-i rider: -5. Owner Kyle, 2026-09-09, for the four phase-page
// bodies and the replacement lead-in.
//
// A REPLACEMENT OF THE DRAFTED TEXT BY ITS OWNER, NOT AN APPROVAL OF IT, and the
// distinction is the whole reason this note is longer than the arithmetic. Kyle
// did not sign off the strings that were on the branch; he REWROTE all five on
// device during the walk, reading each on the page it occupies, and what ships
// is his wording. THE STRINGS ON DEVICE AT MERGE 8cc461c ARE NOT THE STRINGS
// THAT SHIP. Anyone reconstructing this slice's copy from the merge commit will
// read four bodies and a lead-in that were replaced hours later.
//
// This is a fifth case for the contract at the top of this file, which covers
// approval, new drafts, 3b's deletion-with-surface and 4a's supersession-by-pack.
// Arithmetically it behaves exactly like an approval, -1 per string, which is
// precisely why it needs saying: the number cannot tell the two apart, and
// "Kyle approved five strings" and "Kyle wrote five strings after rejecting five"
// are different facts about how much review the copy has had.
//
// 'Complete' IS NOT PART OF THIS -5. It was already approved-for-approved at the
// merge and carried no marker to clear.
//
// 167 since journey slice 5c: +2, NEW DRAFTED COPY. Owner Kyle (UI strings), the
// ordinary up-direction case. The Start here row is net-new surface and no
// string for it existed anywhere in src/ before this slice.
//
// The two, and why the set is not larger:
//   - `START_HERE_LABEL` in constants/startHere.ts — the row's own name, and the
//     player header's title when it opens. ONE string for both surfaces and both
//     positions. Roadmap sections 1 and 8 both call the element "Start here" on
//     Today and on the map, so a second copy at slice 7's mount is how one gets
//     revised and the other does not.
//   - the row's one-line gloss at its mount in JourneyMapScreen.tsx. A PROP, not
//     a shared constant, because each surface's video explains a different thing
//     (section 6 item 9: how the map works here, what drives results on Today).
//     Slice 7 drafts its own; drafting Today's here would put a string nobody
//     will walk in front of that slice as though it had been decided.
//
// NEITHER STRING IS ON SCREEN FOR ANY USER TODAY, and that is worth saying at
// the pin rather than only at the row. Slice 5c decision 1: no video means no
// row, and both entries in START_HERE_PATHS are null because neither explainer
// has been authored. The strings are drafted, counted and unreachable until a
// file lands in the bucket. THE USUAL DISPOSITION ROUTE DOES NOT WORK ON THEM:
// the 5b-i rider cleared five markers because Kyle read each string on the page
// it occupies during the walk, and these two cannot be read that way until there
// is a video to hang them on. Expect them to sit at draft across more than one
// slice; that is the mechanism working, not a stalled approval.
//
// 152 since journey slice 6: -15, DELETION WITH SURFACE. The 3b case, and no
// owner is named because nobody signed these off: the questions they asked
// stopped being asked. Fourteen in screens/weekly/copy.ts and one in
// components/dashboard/dailyPicker.copy.ts.
//
//   - CLOSE_COPY's seven rating keys: ratingsHeading, ratingHint, ratingFocus,
//     ratingRecovery, ratingEnergy, ratingLow, ratingHigh. The three 1-to-5
//     rows went with them. Slice 3b had already stopped STORING the answers and
//     left the questions on screen for one slice, documented as a real gap;
//     this is the slice that stopped asking.
//   - CLOSE_COPY's five floor keys: floorHeading, floorQuestion, floorYes,
//     floorNo, floorNoReassurance. floorMet was the only input to the
//     continuity count and the count is retired (roadmap section 9 R4).
//   - CLOSE_COPY's two adjustment keys: adjustmentHeading, adjustmentHint.
//   - TODAY_COPY's continuityHeading marker in dailyPicker.copy.ts, which
//     covered all three continuity strings; continuityCount and
//     continuityCountOne carried none of their own, so three strings left for
//     one decrement.
//
// ADJUSTMENT_LABELS' FOUR ENTRIES ALSO WENT AND COST NOTHING. They never
// carried markers, so four user-facing strings left the app without moving this
// number. Worth saying because the arithmetic otherwise implies the adjustment
// menu was two strings.
//
// THE EIGHT C1 STRINGS THE SLICE ADDED DO NOT COUNT: four destination
// questions, three answers and the confirmation, all Jen's from Content Pack v1
// section C1, entering flat per the pack header. The screen's whole content is
// now approved copy; what is left marked is the chrome around it.
//
// THIS ENTRY WAS WRITTEN AT THE RIDER, NOT AT THE PIN CHANGE, and that is a
// contract miss worth recording rather than quietly backfilling. The slice-6
// commit moved 167 -> 152 and named the fifteen strings and the case in its
// COMMIT MESSAGE, which the contract above requires, but did not add the note
// here, which every prior pin change has. Both halves are the mechanism; a
// commit message is found only by someone who already knows to look.
//
// 148 since the slice 6 rider: -4. Owner Kyle, 2026-09-10, in
// screens/weekly/copy.ts.
//
// THE 5b-i CASE, A REPLACEMENT BY THE OWNER RATHER THAN AN APPROVAL. Kyle did
// not sign off the four strings on the branch; he WROTE the words that ship,
// after rejecting all four. Arithmetically identical to an approval at -1 each,
// which is exactly why it is named: "Kyle approved four strings" and "Kyle
// rewrote four strings he had rejected" are different facts about how much
// review the copy has had, and the number cannot tell them apart.
//
//   - heading: 'Your week' -> 'Check in on your week'.
//   - save: 'Save and close the week' -> 'Finish'.
//   - noteQuestion: -> 'Anything from this week you want to remember?'
//   - required: -> 'Choose how this feels to continue.'
//
// noteQuestion AND required WERE REWRITTEN TWICE IN TWO COMMITS and only the
// second rewrite is in this decrement. The slice itself replaced both drafts
// with different drafts (a substitution, no arithmetic, per the 4a note on
// CAPACITY_COPY.subtitle) because the originals referred to the retired floor
// question. Anyone reconstructing this from the slice commit will read two
// strings that were replaced the same day.
//
// A FIFTH STRING MOVED AND COST NOTHING, and it is the one worth reading twice.
// The weekly reset's NAVIGATOR TITLE was a hardcoded literal in
// AppNavigator.tsx from the day the close shipped ('Close your week'); it now
// lives in CLOSE_COPY as `screenTitle` and reads 'Weekly reset'. Unmarked
// before, unmarked after, so the pin does not move.
//
// BUT THE TWO ABSENCES MEAN OPPOSITE THINGS. Before, it was unmarked because it
// sat in the navigator where nobody had ever looked -- a hole in this gate's
// coverage, not an approval. After, it is unmarked because Kyle wrote and
// approved it. The warrant improved by a whole category and the number did not
// move at all, which is the clearest example so far of why these notes exist.
// It is a MOVE by the 5a definition and sentinel-neutral by it; it is also the
// gate's own coverage growing by one string.
//
// STILL DRAFTED IN screens/weekly/copy.ts: notePlaceholder, noteSkip and
// saveFailed on the reset, plus the whole of FLOOR_COPY and ENTRY_COPY. Thirteen
// in the file. None of them Kyle's to clear; the floor and entry sets are Jen's.
//
// 151 since journey slice 7a: +3. Owner Kyle, 2026-09-10, all three new drafts,
// none of them an approval or a deletion. Two were approved as drafts BEFORE
// the slice was written (Kyle, in the slice 7a brief); the third was not, and
// it is named as a deviation below rather than folded in with them.
//
//   - JOURNEY_LINE_LABEL in constants/journeyCopy.ts: 'Where you are'. The
//     eyebrow above Today's journey line. Required, not decorative: several of
//     Jen's sixteen approved `short` strings are imperative-shaped ("Clear the
//     distractions"), and standing alone above the hero an imperative reads as
//     TODAY'S INSTRUCTION rather than as journey context.
//   - TODAY_START_HERE_GLOSS in constants/journeyCopy.ts: the one line under
//     Today's Start here row. A gloss per surface is slice 5c's shape, because
//     the two videos explain different things (roadmap section 6 item 9).
//   - ADVANCE_PREVIEW_COPY.failed: 'That did not go through. Try again.' The
//     advancement preview's write-failure line.
//
// THE THIRD ONE WAS NOT IN THE APPROVED SET, AND SAYING SO IS THE POINT.
// Step 0 listed the copy this slice needed and Kyle approved two new drafts at
// 148 -> 150. The commit control then needed an error state to satisfy UI
// Standards 18, and there was no honest way to get one for free: the nearest
// existing string is TodayHeroCard's local `saveFailed`, which is JEN'S and
// drafted, so reusing it would have meant either importing a dashboard card's
// private copy into a journey screen or duplicating a string under the wrong
// owner. Shipping no error state was the other option and it fails section 18
// outright. A named deviation at +1 is the cheapest honest answer; it is
// flagged in the slice report and in the commit message rather than absorbed.
//
// JEN'S PACK STRINGS LANDED IN THIS SLICE AND COST NOTHING, which is the pack
// rule working as designed rather than an omission here. ADVANCEMENT_COPY's two
// titles, two bodies and its primary are Content Pack v1 section B2, approved on
// delivery, and carry no markers.
//
// THREE MORE OF KYLE'S OWN STRINGS ALSO LANDED FLAT, on the PHASE_PAGE_BODIES
// precedent (authored by the owner, not a sign-off on someone else's draft):
// ADVANCEMENT_COPY.secondary 'Keep going here', and ADVANCE_PREVIEW_COPY's
// 'Start this' and 'Not yet'.
//
// AND ONE OF THEM RETIRED THREE WORDINGS WITHOUT MOVING THE NUMBER. 'Keep going
// here' replaces the pack's "Keep working here" (B2 variant one) and "Stay here"
// (B2 variant two), and supersedes roadmap section 8's third wording for the
// same action, "stay a while longer". None of the three carried a marker - two
// were pack strings and one was in a document, not in src - so the pin does not
// move. Recorded so nobody re-derives the retired pair from the pack later and
// reads the divergence as a transcription error.
//
// THE COLLAPSE QUESTION IS ANSWERED AND THE ANSWER IS NO (Kyle, 2026-09-10).
// The line that stood here left it queued for the walk and noted that
// collapsing JOURNEY_LINE_LABEL into PHASE_STATE_LABELS.current would decrement
// this pin by one. It will not: the two stay separate, deliberately, and the
// reasoning is written at BOTH declarations in constants/journeyCopy.ts. They
// answer different questions on different surfaces, and collapsing them would
// let a revision to the map's four-label state vocabulary silently change the
// Today line. No arithmetic follows from this; it is recorded so the -1 is not
// looked for again.
//
// 150 since the slice 7a rider: -1. Owner Kyle, 2026-09-10, for
// ADVANCE_PREVIEW_COPY.failed, 'That did not go through. Try again.' in
// constants/journeyCopy.ts.
//
// A GENUINE APPROVAL, AND THE SECOND HALF OF A DEVIATION THIS FILE ALREADY
// NAMED. The +3 entry above records that this string was NOT in the set Kyle
// approved at Step 0: it was added mid-slice because the advancement preview's
// commit control needs an error state for UI Standards 18, and the nearest
// existing candidate was TodayHeroCard's local `saveFailed`, which is Jen's and
// drafted. It shipped marked, at a declared +1, flagged in the slice report
// rather than absorbed. This is that deviation closing.
//
// READ IN THE STATE IT OCCUPIES, which is why it is an approval and not a
// clearance. Kyle read it on device during walk section I - airplane mode,
// "Start this", the line under the two controls - rather than off a list. The
// 5a definition distinguishes that from a desk sign-off, and this is the
// stronger case.
//
// NOT the 5b-i replacement case. Kyle did not rewrite the words; the string that
// shipped on the branch is the string that ships. "Kyle approved a string
// someone drafted" and "Kyle wrote the string that ships" are different facts
// about how much review the copy has had, and this is the first.
//
// STILL DRAFTED FROM SLICE 7a: JOURNEY_LINE_LABEL and TODAY_START_HERE_GLOSS,
// both in constants/journeyCopy.ts, both Kyle's to clear. Neither was walked in
// a state that would settle it - the journey line reads correctly on device but
// its label was not read against the alternatives, and the Start here gloss sat
// under a test clip rather than under Jen's video.
//
// 150 THROUGH JOURNEY SLICE 7b: NO CHANGE, AND THE ZERO IS THE ENTRY. The slice
// landed THIRTY-TWO new strings on the C2 adjustment surfaces and not one of
// them is drafted, so the number is unmoved. Recorded here anyway, because a
// slice that adds this much copy and moves the count by nothing is exactly the
// shape that looks like an omission to whoever audits this file next. It is
// not.
//
// THE TOTAL WAS FIRST WRITTEN AS TWENTY-NINE AND WAS WRONG (corrected
// 2026-09-11, Kyle). It was also partitioned into three groups that summed to
// thirty-one, so the headline and its own breakdown disagreed. Counted off the
// declarations: ADJUST_COPY has EIGHT keys, and ADJUST_ALTERNATIVES has four
// phases of three options carrying a label and a body each, which is
// TWENTY-FOUR. Eight plus twenty-four is thirty-two. The partition below sums
// to that, and it is five ways rather than three because ownership and ROUTE
// TO ZERO are different questions: two of Kyle's five reach flat by different
// routes and a ledger that merges them loses the distinction it exists to keep.
//
//   - TWENTY-SIX ARE JEN'S, FROM `Content Pack v1 section 5`, LANDING FLAT
//     under the pack's own rule: the C2 title, the C2 confirmation, and the
//     twelve alternative labels with their twelve bodies from the adjustment
//     sets. Pack strings carry no marker and this suite does not count them.
//   - ONE IS JEN'S FROM `decisions section 4`: ADJUST_COPY.bodyFirst, the final
//     C2 body, verbatim. Also pack, also flat. The body in section 5's own
//     delivery is SUPERSEDED and was not built.
//   - THREE ARE KYLE'S, AUTHORED AND FLAT on the PHASE_PAGE_BODIES precedent:
//     ADJUST_COPY.primary, ADJUST_COPY.alternativesIntro and ADJUST_COPY.failed.
//     Written by the owner, not signed off on someone else's draft, which is
//     the distinction that precedent exists to mark. `primary` is the
//     prose-to-copy promotion described at the foot of this entry.
//   - ONE IS KYLE'S BY REPLACEMENT: ADJUST_COPY.decline.
//   - ONE IS KYLE'S AS A NEW DRAFT CLEARED BY OWNER SIGN-OFF:
//     ADJUST_COPY.bodySecond.
//
// The last two are the cases this ledger is actually for, and they are set out
// in full below.
//
// ONE IS A REPLACEMENT BY OWNER, logged on the precedent PHASE_STATE_LABELS.done
// set when "Done" became "Complete": a string of Kyle's superseding a wording
// that already existed moves this count in NEITHER direction, because it is not
// a new draft and it is not an approval.
//
//   - ADJUST_COPY.decline, 'Keep going for now', RETIRES the "keep going as is"
//     gloss that roadmap sections 3.1 and 8 both use for this control. That
//     gloss was the roadmap describing a control in passing, never copy, and
//     shipping it would have put a description where a label belongs.
//
// ADJUST_COPY.bodySecond IS A NEW IN-HOUSE DRAFT, NOT A REPLACEMENT, and this
// entry was CORRECTED on 2026-09-11 (Kyle) from the reading it shipped with.
// The distinction is the whole contract of this file and it was got wrong:
// "replacement by owner" requires a wording that ALREADY EXISTED to supersede,
// and the pack has no second-offer body at all. Superseding an absence is not
// superseding anything. It is a new string on a C2 surface, and C2 is Jen's.
//
// SO IT COUNTS AS +1 AND THEN -1 ON OWNER SIGN-OFF IN THE SAME COMMIT, which
// nets to zero by a route that is materially different from the replacement
// route above, and the difference is what a later reader needs:
//
//   - The +1 is real. A new drafted string landed on an efficacy-adjacent
//     surface, and this file's job is to know that.
//   - The -1 is KYLE SIGNING IT OFF AS OWNER, 2026-09-11. Per the contract at
//     the top of this file, two owners is not a loophole and which one applies
//     is a property of the copy: C2 body copy is Jen's, so Kyle's sign-off here
//     carries a WEAKER WARRANT than a Jen review of the same text would, and
//     the contract requires saying which. This is the weaker one.
//   - **IT IS PENDING JEN REVIEW** and that is an open item, not a formality.
//     It is one word from her approved first body, which is the strongest thing
//     that can be said for it and is not the same as her having written it. If
//     she revises §decisions-4's body, this string moves with it.
//
// ADJUST_COPY.primary, 'Try a different approach', is Kyle's too and is flat as
// a prose-to-copy promotion: roadmap section 9 R5 writes those words as prose
// about what stays available, and PHASE_STATE_LABELS took exactly that reading
// of section 1's prose.
const EXPECTED_SENTINELS = 150;

const mobileRoot = path.resolve(__dirname, '../..');
const srcRoot = path.join(mobileRoot, 'src');

// Built by concatenation so the needles never appear literally in this file.
// Without that, the suite would count and flag itself.
const SENTINEL = 'COPY: draft,' + ' not from guidelines doc';
const RENDERED_MARKERS = [
  '[' + 'COPY GAP]',
  '[' + 'Jen]',
  '[' + 'Jen review]',
];

// The protocol content pipeline, excluded per the header.
const OUT_OF_SCOPE = ['src/protocolEngine/protocolMatrix.ts', 'src/protocolEngine/types.ts'];

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    // Tests are not a copy surface. Skipping them also keeps this file, and any
    // future test that quotes a marker while documenting one, out of the counts.
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === '__mocks__') continue;
      sourceFiles(full, acc);
      continue;
    }
    if (/\.tsx?$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

function relative(file: string): string {
  return path.relative(mobileRoot, file).split(path.sep).join('/');
}

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/** Blank out block comments, preserving newlines so line numbers stay true. */
function stripBlockComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

function stripLineComment(line: string): string {
  const idx = line.indexOf('//');
  return idx === -1 ? line : line.slice(0, idx);
}

const files = sourceFiles(srcRoot);
const inScope = files.filter((f) => !OUT_OF_SCOPE.includes(relative(f)));

describe('Copy draft sentinel - release gate', () => {
  test('the source tree is readable and non-trivial', () => {
    // Guards against the walker silently returning nothing, which would make
    // every assertion below vacuously true.
    expect(files.length).toBeGreaterThan(100);
  });

  test(`exactly ${EXPECTED_SENTINELS} drafted strings remain`, () => {
    const perFile: Array<[string, number]> = [];
    let total = 0;

    for (const file of inScope) {
      const n = occurrences(fs.readFileSync(file, 'utf8'), SENTINEL);
      if (n > 0) perFile.push([relative(file), n]);
      total += n;
    }

    // Sorted, so the failure message reads as a diffable inventory rather than
    // in filesystem order.
    perFile.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const inventory = perFile.map(([f, n]) => `  ${String(n).padStart(4)}  ${f}`).join('\n');

    if (total !== EXPECTED_SENTINELS) {
      const direction = total < EXPECTED_SENTINELS ? 'FEWER' : 'MORE';
      throw new Error(
        `Expected ${EXPECTED_SENTINELS} drafted strings, found ${total} (${direction}).\n\n` +
          (total < EXPECTED_SENTINELS
            ? 'Strings were approved, or sentinels were dropped without approval.\n'
            : 'New drafted copy landed.\n') +
          'Either way: update EXPECTED_SENTINELS in this file AND name the change,\n' +
          'with the strings involved, in the commit that makes it. See the header.\n\n' +
          `Current inventory:\n${inventory}`
      );
    }

    expect(total).toBe(EXPECTED_SENTINELS);
  });

  test('no marker text reaches the UI', () => {
    // The enforcement the on-screen markers used to provide, kept as an
    // assertion rather than as text a user can see. Comments are stripped
    // first: this file, and several headers, discuss the retired markers by
    // name and must stay free to do so.
    const offenders: string[] = [];

    for (const file of inScope) {
      const src = stripBlockComments(fs.readFileSync(file, 'utf8'));
      src.split('\n').forEach((rawLine, i) => {
        const line = stripLineComment(rawLine);
        for (const marker of RENDERED_MARKERS) {
          if (line.includes(marker)) {
            offenders.push(`${relative(file)}:${i + 1}  ${line.trim()}`);
          }
        }
      });
    }

    expect(offenders).toEqual([]);
  });

  test('the protocol content pipeline is excluded, not accidentally clean', () => {
    // If protocolMatrix ever stops using its own annotation convention, this
    // fails and the exclusion above should be revisited rather than left
    // pointing at a file that no longer needs it.
    const matrix = fs.readFileSync(
      path.join(mobileRoot, 'src/protocolEngine/protocolMatrix.ts'),
      'utf8'
    );

    expect(matrix).toContain('PLACEHOLDER ' + '[Jen]');
    expect(occurrences(matrix, SENTINEL)).toBe(0);
  });
});

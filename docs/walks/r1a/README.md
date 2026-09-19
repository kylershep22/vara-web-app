# R1a walk assets — pre-change screenshots for step 10

**Status: THREE TO CAPTURE, THREE A STANDING GAP** (amended 2026-09-19, Kyle's large-end-only ruling). The three captures are a human action and CC cannot do them.

Walk step 10 compares vertical rhythm before and after the text primitive lands,
because Inter's metrics are not the system font's and every screen's rhythm
moves at once. The comparison needs a *before*, and a before cannot be
reconstructed from a description.

## What is needed

**Three screenshots**, captured from a build at **`main` at `0091ce5`**, the commit
before the `design/slice-r1a-text-primitive` branch starts. **Three further screenshots
named below are NOT CAPTURED and are a standing gap, not an outstanding action:** there is
no iPhone SE device or simulator in this setup (standards §18(d)).

| File | Screen | Device | Status |
|---|---|---|---|
| `before-today-14plus.png` | Today (`Home`) | iPhone 14 Plus | To capture |
| `before-pillarfocus-14plus.png` | `PillarFocus` (Focus hub) | iPhone 14 Plus | To capture |
| `before-pillarenergy-14plus.png` | `PillarEnergy` (Energy hub) | iPhone 14 Plus | To capture |
| `before-today-se.png` | Today (`Home`) | iPhone SE, 3rd generation | Standing gap, not walkable in this setup |
| `before-pillarfocus-se.png` | `PillarFocus` (Focus hub) | iPhone SE, 3rd generation | Standing gap, not walkable in this setup |
| `before-pillarenergy-se.png` | `PillarEnergy` (Energy hub) | iPhone SE, 3rd generation | Standing gap, not walkable in this setup |

**Why the large-end files are named `14plus` and not `16promax`.** They are taken on an
iPhone 14 Plus. A file named for a device it was not taken on is a false record, and the
filename is the only label that cannot be separated from the image. Step 10 compares
vertical rhythm, which turns on viewport height, and the two devices differ by 6pt there;
an after-shot taken on a 16 Pro Max compared against a before named `16promax` but taken
on a 14 Plus would attribute 6pt of device difference to Inter. §18(d) names the 14 Plus as
itself and then says what it covers; it never calls it a 16 Pro Max, and neither does this
table. The SE three keep their names because a name describing a device nobody has is the
correct name for a gap.

Capture at **default Dynamic Type**, scrolled to the top.

**Today is in the set because step 10's three-card check needs it** (11E: at most
three cards above the fold). That check is a comparison, not an absolute: the
question is whether a card grew enough under Inter to push another one below the
fold, and only a before-and-after can answer it.

For the two hubs, the seam between the hero band and the first card is the
specific thing to keep in frame, along with whether any card's growth pushes a
later one out of view.

## Why the capture point is `0091ce5` and not a branch commit

`0091ce5` is `main` before R1a starts, so nothing on the branch is in the frame.
An earlier draft of this file named `0115d90` (R1a step 2, the last commit before
the codemod); that is a worse baseline, because step 2 had already changed the
Paper theme and the PricingSelector weight. The hub and Today layouts are
identical at both commits, so nothing is lost by using the cleaner one.

## The before state is still reachable

`git checkout 0091ce5` reproduces the pre-change build exactly. Nothing is lost
by capturing these late; step 10 just cannot run until they exist.

## Why this file exists rather than a line in the walk script

A walk step whose pass condition is "compare against a screenshot nobody took"
is not a gate. Recording the gap as a file is what stops step 10 being reported
as passed on a comparison that never happened.

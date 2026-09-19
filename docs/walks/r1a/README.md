# R1a walk assets — pre-change screenshots for step 10

**Status: THREE CAPTURED 2026-09-19, THREE A STANDING GAP.** The three large-end captures are in this directory. The three SE captures are not walkable in this setup (standards §18(d)).

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
| `before-today-14plus.png` | Today (`Home`) | iPhone 14 Plus | Captured 2026-09-19 |
| `before-pillarfocus-14plus.png` | `PillarFocus` (Focus hub) | iPhone 14 Plus | Captured 2026-09-19 |
| `before-pillarenergy-14plus.png` | `PillarEnergy` (Energy hub) | iPhone 14 Plus | Captured 2026-09-19 |
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

**Captured 2026-09-19.** The three large-end files were taken by Kyle on an iPhone 14
Plus at `0091ce5`, default Dynamic Type, scrolled to the top, on a dev client started with
`--clear`. The capture was verified as a genuine before-state by absence rather than by
inspecting letterforms: the floating navigation (R2, `2467f6b`), the Journey rename (7n,
`8f76b99`) and the Good moments row (slice 8, `8621ec9`) are all absent, and all three merged
after R1a, so a stale bundle from main would have shown them. The Focus hub was reachable at
this commit.

**Two supplementary captures, not part of the required set.** `before-today-scrolled-14plus.png`
is Today scrolled past the fold; `before-practices-14plus.png` is the Practices hub, which at
this commit still carries its pre-7n name. Neither is referenced by step 10. They were taken in
the same sitting and are kept because a second checkout to `0091ce5` costs more than the disk
space.

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

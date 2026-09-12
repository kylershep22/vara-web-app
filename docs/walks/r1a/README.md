# R1a walk assets — pre-change screenshots for step 10

**Status: NOT CAPTURED. This is a human action and CC cannot do it.**

Walk step 10 compares vertical rhythm before and after the text primitive lands,
because Inter's metrics are not the system font's and every screen's rhythm
moves at once. The comparison needs a *before*, and a before cannot be
reconstructed from a description.

## What is needed

**Six screenshots**, captured from a build at **`main` at `0091ce5`**, the commit
before the `design/slice-r1a-text-primitive` branch starts.

| File | Screen | Device |
|---|---|---|
| `before-today-se.png` | Today (`Home`) | iPhone SE, 3rd generation |
| `before-today-16promax.png` | Today (`Home`) | iPhone 16 Pro Max |
| `before-pillarfocus-se.png` | `PillarFocus` (Focus hub) | iPhone SE, 3rd generation |
| `before-pillarfocus-16promax.png` | `PillarFocus` | iPhone 16 Pro Max |
| `before-pillarenergy-se.png` | `PillarEnergy` (Energy hub) | iPhone SE, 3rd generation |
| `before-pillarenergy-16promax.png` | `PillarEnergy` | iPhone 16 Pro Max |

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

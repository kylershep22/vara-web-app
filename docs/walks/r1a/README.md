# R1a walk assets — pre-change screenshots for step 10

**Status: NOT CAPTURED. This is a human action and CC cannot do it.**

Walk step 10 compares the two hub screens' vertical rhythm before and after the
text primitive lands, because Inter's metrics are not the system font's and
every screen's rhythm moves at once. The comparison needs a *before*, and a
before cannot be reconstructed from a description.

## What is needed

Four screenshots, captured from a build at commit **`0115d90`** (R1a step 2,
the last commit before the codemod) or any commit before it:

| File | Screen | Device |
|---|---|---|
| `before-pillarfocus-se.png` | `PillarFocus` (Focus hub) | iPhone SE, 3rd generation |
| `before-pillarfocus-16promax.png` | `PillarFocus` | iPhone 16 Pro Max |
| `before-pillarenergy-se.png` | `PillarEnergy` (Energy hub) | iPhone SE, 3rd generation |
| `before-pillarenergy-16promax.png` | `PillarEnergy` | iPhone 16 Pro Max |

Capture at **default Dynamic Type**, scrolled to the top, with the hero band and
the first card both in frame. The seam between the band and the first card is
the specific thing step 10 checks, along with whether any card grows enough to
push another below the fold.

## The before state is still reachable

The codemod landed after `0115d90`, so `git checkout 0115d90` reproduces the
pre-change build exactly. Nothing is lost by capturing these late; step 10 just
cannot run until they exist.

## Why it is here rather than in the walk script

A walk step whose pass condition is "compare against a screenshot nobody took"
is not a gate. Recording the gap as a file is what stops step 10 being reported
as passed on a comparison that never happened.

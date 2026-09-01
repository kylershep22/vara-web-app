/**
 * deleteAccount's cleanup list, asserted against the deployed source.
 *
 * WHY A SOURCE READ RATHER THAN A REQUIRE. deleteAccount lives in
 * functions/index.js as an onCall handler, and `personalCollections` is a local
 * inside it. Requiring index.js would boot the whole Functions module graph
 * (firebase-admin, every trigger) to reach one array; extracting the array into
 * a module purely to test it would refactor production code this slice has no
 * other reason to touch. Reading the source is the honest middle: it asserts
 * against exactly the text that deploys.
 *
 * WHAT IT IS REALLY GUARDING. A collection added to the app but not to this
 * list survives account deletion silently - no error, no log, just orphaned
 * personal data. Nothing else in the repo notices. The regex is paired with a
 * vacuity guard below so a parse that stopped matching cannot pass as a clean
 * sweep.
 */

const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(
    path.join(__dirname, "..", "..", "index.js"),
    "utf8",
);

/** The collection names inside `const personalCollections = [...]`. */
function personalCollections() {
  const match = source.match(/const personalCollections = \[(.*?)\];/s);
  if (!match) {
    throw new Error(
        "Could not find `const personalCollections = [...]` in functions/index.js. " +
      "It was renamed or restructured; repoint this test rather than deleting it.",
    );
  }
  // Comment lines inside the array would otherwise contribute stray quoted
  // words, so they are stripped before the names are read.
  const body = match[1].replace(/\/\/[^\n]*/g, "");
  return [...body.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

describe("deleteAccount cleanup list", () => {
  it("parses a non-trivial list (guards against a vacuous pass)", () => {
    // Without this, a regex that silently stopped matching would return [] and
    // every containment assertion below would fail loudly rather than pass
    // quietly - but a future change to a `.includes` style assertion would
    // not. Pin the shape here so the guard survives that rewrite.
    const cols = personalCollections();
    expect(Array.isArray(cols)).toBe(true);
    expect(cols.length).toBeGreaterThan(30);
  });

  it("sweeps journeyStates, so a journey does not outlive the account", () => {
    // journeyStates carries phase history and the destination the user chose.
    // It is keyed by uid as its document ID and also carries a userId field,
    // which is what makes this `where userId ==` sweep reach it.
    expect(personalCollections()).toContain("journeyStates");
  });

  it("still sweeps the collections it swept before", () => {
    // A spot check, not the full list: the point is that adding an entry did
    // not disturb the existing ones.
    const cols = personalCollections();
    for (const expected of ["goals", "habits", "tasks", "journalEntries", "focusSessions"]) {
      expect(cols).toContain(expected);
    }
  });

  it("lists every collection exactly once", () => {
    const cols = personalCollections();
    expect(new Set(cols).size).toBe(cols.length);
  });
});

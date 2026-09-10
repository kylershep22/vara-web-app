// The Start here path table (slice 5c).
//
// TWO CLAIMS THIS SLICE MAKES OUT LOUD, PINNED HERE SO NEITHER CAN BE UNDONE BY
// ACCIDENT. First, that the slice has no user-visible effect on merge, which is
// only true while both paths are null. Second, that it needs no storage.rules
// change and no deploy, which is only true while every path it names sits under
// a prefix the rules already open to signed-in readers.

import { START_HERE_LABEL, START_HERE_PATHS } from '../startHere';
import type { StartHereSurface } from '../startHere';

const SURFACES: StartHereSurface[] = ['practices', 'today'];

// storage.rules:137-141 opens read on this prefix to any signed-in user. A path
// outside it resolves to a 403 at playback, silently, on device only.
const ALLOWED_PREFIX = 'focus-video/';

describe('START_HERE_PATHS', () => {
  it('has an entry for every surface', () => {
    // A missing key would read as `undefined`, which the row treats exactly like
    // null, so the row would go quiet without anything failing.
    for (const surface of SURFACES) {
      expect(Object.prototype.hasOwnProperty.call(START_HERE_PATHS, surface)).toBe(
        true
      );
    }
    expect(Object.keys(START_HERE_PATHS).sort()).toEqual([...SURFACES].sort());
  });

  it('ships with no video on either surface', () => {
    // THE "NO USER-VISIBLE CHANGE ON MERGE" CLAIM, WITH TEETH. Neither explainer
    // has been authored (roadmap section 6 item 9), and slice 5c decision 1 says
    // no video means no row. If this test fails, a path was added: that is the
    // moment the row becomes visible to every user, so it wants a walk and a
    // real file in the bucket, not a green suite.
    for (const surface of SURFACES) {
      expect(START_HERE_PATHS[surface]).toBeNull();
    }
  });

  it('keeps every path it does name under the prefix the rules already allow', () => {
    // Vacuous today by design, and it stops being vacuous the moment a path
    // lands. Slice 5c decision 4: staying under focus-video/ is what makes this
    // slice need no rules change and no deploy. A path under a new prefix needs
    // a new match block in storage.rules FIRST, and deploy state is Kyle's
    // checklist, never inferred from the repo.
    for (const surface of SURFACES) {
      const path = START_HERE_PATHS[surface];
      if (path === null) continue;
      expect(path.startsWith(ALLOWED_PREFIX)).toBe(true);
    }
  });
});

describe('START_HERE_LABEL', () => {
  it('names the row without a count, a duration or a framework word', () => {
    // Roadmap section 8: no counter anywhere, and remove / recover / rewire /
    // refocus never reach the UI.
    expect(START_HERE_LABEL).not.toMatch(/\d/);
    expect(START_HERE_LABEL).not.toMatch(/remove|recover|rewire|refocus/i);
    expect(START_HERE_LABEL).not.toContain('—');
  });
});

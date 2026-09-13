/**
 * `allowlistIntegrity` does what both guard suites depend on it doing.
 *
 * WHY THIS SUITE EXISTS AT ALL, WHICH IS THE WHOLE POINT (R1d). The function
 * is the engine behind two assertions in two tree-walking guards, and at the
 * moment it was lifted, NEITHER CALLER HAD ANYTHING TO REPORT: every entry in
 * both allowlists still exists and still violates. A check whose live inputs
 * are all healthy is green whether or not it works. Installing it in
 * `brandCompliance` and watching the suite stay green would have proved
 * nothing at all.
 *
 * So the behaviour is pinned here against fixtures written for the purpose, in
 * a temp directory, covering all three states an entry can be in:
 *
 *   missing                  -> reported in `missing`
 *   exists and still violates -> reported in neither: a healthy waiver
 *   exists and stopped        -> reported in `clean`: the waiver is spent
 *
 * The fixtures are synthetic rather than real repo files on purpose. A test
 * that points at a real path passes for as long as that path happens to exist,
 * which makes it a test of the tree rather than of the function.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { allowlistIntegrity } from './allowlistIntegrity';

describe('allowlistIntegrity', () => {
  let root: string;

  beforeAll(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'vara-allowlist-'));
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
    fs.writeFileSync(path.join(root, 'src', 'violating.ts'), "const a = 'streak';\n");
    fs.writeFileSync(path.join(root, 'src', 'fixed.ts'), 'const a = 1;\n');
  });

  afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  /** Stands in for a caller's detector: "fixed.ts" is the one that stopped. */
  const stillViolates = (relPath: string) => !relPath.endsWith('fixed.ts');

  it('reports an allowlisted path that no longer exists', () => {
    const { missing, clean } = allowlistIntegrity(
      { 'src/deleted.ts': 'renamed away three slices ago' },
      root,
      stillViolates
    );
    expect(missing).toEqual(['src/deleted.ts']);
    expect(clean).toEqual([]);
  });

  it('reports nothing for a path that exists and still violates', () => {
    const { missing, clean } = allowlistIntegrity(
      { 'src/violating.ts': 'genuinely waived, the violation is still there' },
      root,
      stillViolates
    );
    expect(missing).toEqual([]);
    expect(clean).toEqual([]);
  });

  it('reports an allowlisted path that exists but has stopped violating', () => {
    // THE HALF brandCompliance LACKED BEFORE R1d. The fix landed, the waiver
    // did not leave with it, and existence alone can never see that.
    const { missing, clean } = allowlistIntegrity(
      { 'src/fixed.ts': 'waived pending a content prune that has since happened' },
      root,
      stillViolates
    );
    expect(missing).toEqual([]);
    expect(clean).toEqual(['src/fixed.ts']);
  });

  it('separates all three states in one allowlist', () => {
    const { missing, clean } = allowlistIntegrity(
      {
        'src/violating.ts': 'healthy waiver',
        'src/fixed.ts': 'spent waiver',
        'src/deleted.ts': 'dangling waiver',
      },
      root,
      stillViolates
    );
    expect(missing).toEqual(['src/deleted.ts']);
    expect(clean).toEqual(['src/fixed.ts']);
  });

  it('an empty allowlist reports nothing rather than throwing', () => {
    expect(allowlistIntegrity({}, root, stillViolates)).toEqual({ missing: [], clean: [] });
  });

  it('does not call the detector for a path that is missing', () => {
    // A detector that reads the file would throw on a path that is not there,
    // so the existence branch has to come first. This pins the order.
    const detector = jest.fn(() => {
      throw new Error('detector must not run on a missing path');
    });
    expect(() => allowlistIntegrity({ 'src/deleted.ts': 'gone' }, root, detector)).not.toThrow();
    expect(detector).not.toHaveBeenCalled();
  });
});

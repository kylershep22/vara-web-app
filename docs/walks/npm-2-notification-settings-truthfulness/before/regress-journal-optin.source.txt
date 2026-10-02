/**
 * NPM-2 BEFORE-STATE REGRESSION TEST, written at b8c4c67 (Build A evidence).
 * Shows on unchanged code that saving the first Journal entry still routes to
 * the notification opt-in (D9: remove the reachable Journal opt-in).
 *
 * A SOURCE SCAN, not a render: the trigger sits inside JournalScreen's save
 * handler, behind the entry modal. Kyle's ruling replaces the reinstall
 * before-shot with this failing test. The fix lands in Build B, which restores
 * this file from before/.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '../..');

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : walk(p);
    return /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
}

describe('regress: the Journal still opens the notification opt-in', () => {
  test('JournalScreen does not use the opt-in hook or navigate to the opt-in', () => {
    const journal = fs.readFileSync(path.join(SRC, 'screens/JournalScreen.tsx'), 'utf8');
    expect(journal).not.toMatch(/useNotificationOptIn/);
    expect(journal).not.toMatch(/navigate\(\s*['"]NotificationOptIn['"]/);
  });

  test('nothing in src/ navigates to NotificationOptIn', () => {
    const offenders = walk(SRC).filter((f) =>
      /navigate\(\s*['"]NotificationOptIn['"]/.test(fs.readFileSync(f, 'utf8'))
    );
    expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
  });
});

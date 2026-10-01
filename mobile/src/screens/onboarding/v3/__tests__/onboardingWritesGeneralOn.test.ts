/**
 * Kyle's ruling D3 (2026-10-01): no never-on versus deliberately-off distinction
 * for V1, PROVIDED every current onboarding path writes the General preference
 * ON. This file is that proviso, as a test, from source.
 *
 * Structure pinned here; behaviour pinned in OnboardingV3ReminderScreen.test.tsx
 * (both the granted and the denied branch write allNotificationsEnabled: true).
 *
 *   1. V3 is the only mounted arc (ONBOARDING_V3 is true).
 *   2. The arc's terminal, Done, is reached ONLY from the Reminder step: no
 *      other screen navigates to it, so no completing path skips Reminder.
 *   3. The Reminder step's one preference write sets allNotificationsEnabled
 *      true, unconditionally, and nothing in onboarding writes it false.
 *
 * Out of scope by definition (they do not complete an onboarding path), and
 * ledgered as DAILY-RHYTHM-ONBOARDING-WRITE-FAILURE: a write that still fails
 * after its one retry, and the navigator's fail-open paths that skip onboarding.
 */
import * as fs from 'fs';
import * as path from 'path';

import { ONBOARDING_V3 } from '../../../../constants/dashboardConfig';
import { V3_ROUTES } from '../routes';

const V3_DIR = path.resolve(__dirname, '..');
const ONBOARDING_DIR = path.resolve(__dirname, '../..');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

describe('D3: every completing onboarding path writes General ON', () => {
  test('V3 is the mounted arc', () => {
    expect(ONBOARDING_V3).toBe(true);
    expect(V3_ROUTES.Done).toBeTruthy();
  });

  test('Done is reached only from the Reminder step', () => {
    // Mutation caught: any other V3 screen gaining a route to Done (a skip).
    const navigatesToDone = sourceFiles(V3_DIR)
      .filter((file) => /navigat\w*\(\s*V3_ROUTES\.Done\b/.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.basename(file));

    expect(navigatesToDone).toEqual(['OnboardingV3ReminderScreen.tsx']);
  });

  test('the Reminder step writes allNotificationsEnabled true, and nothing in onboarding writes it false', () => {
    // Mutation caught: writing General off, or conditionally, on any branch.
    const reminder = fs.readFileSync(path.join(V3_DIR, 'OnboardingV3ReminderScreen.tsx'), 'utf8');
    const writes = reminder.match(/allNotificationsEnabled:\s*[^,\n}]+/g) ?? [];
    expect(writes).toEqual(['allNotificationsEnabled: true']);

    for (const file of sourceFiles(ONBOARDING_DIR)) {
      expect(fs.readFileSync(file, 'utf8')).not.toMatch(/allNotificationsEnabled:\s*(false|!)/);
    }
  });
});

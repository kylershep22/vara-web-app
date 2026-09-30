/**
 * Habits stay out of V1 (V1-HABITS-RETIREMENT, ruling A of the V1 SCOPE
 * REVISION block, and Kyle's acceptance invariant of 2026-09-29):
 *
 *   after V1-HABITS-RETIREMENT, the V1 mobile experience neither exposes,
 *   creates, advertises, navigates to, nor continues scheduling Habits.
 *   Existing stored Habit data remains preserved but dormant.
 *
 * SOURCE-LEVEL, in the style of the structure suite's contract (c): a habit
 * surface is kept out by construction, not by a render that happened not to
 * reach it. Each guard reads the source with comments stripped, so a comment
 * that names a retired thing (and several do, on purpose) cannot trip it, and a
 * comment cannot satisfy it either.
 *
 * What these guards do NOT prove: that a device never shows a habit. The
 * runtime halves live beside the code they pin (PlanScreen.tabParam.test.tsx,
 * NotificationContext.test.tsx), and the rest is the device walk's.
 */
import * as fs from 'fs';
import * as path from 'path';
import { ROUTES } from '../navigation/routes';

const SRC = path.join(__dirname, '..');

/** Block and line comments out; string contents are left alone. */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
}

function source(rel: string): string {
  return stripComments(fs.readFileSync(path.join(SRC, rel), 'utf8'));
}

/** Every non-test .ts/.tsx under src/, as [absolute path, comment-stripped text]. */
function liveSources(): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '__tests__') continue;
        walk(full);
      } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) {
        out.push([full, stripComments(fs.readFileSync(full, 'utf8'))]);
      }
    }
  };
  walk(SRC);
  return out;
}

const rel = (full: string) => path.relative(SRC, full).split(path.sep).join('/');

describe('habits stay out of V1', () => {
  test('the walker sees the tree (guards against a vacuous pass)', () => {
    const files = liveSources().map(([full]) => rel(full));
    expect(files.length).toBeGreaterThan(300);
    expect(files).toContain('screens/PlanScreen.tsx');
    expect(files).toContain('hooks/useDashboard.ts');
  });

  test('no HabitDetail registration or route', () => {
    const nav = source('navigation/AppNavigator.tsx');
    expect(nav).not.toMatch(/name=\{?\s*['"]HabitDetail['"]/);
    expect(nav).not.toMatch(/HabitDetailScreen/);
    expect(nav).not.toMatch(/ROUTES\.HabitDetail\b/);
    expect(Object.keys(ROUTES)).not.toContain('HabitDetail');
    expect(Object.values(ROUTES)).not.toContain('HabitDetail');
  });

  test('PlanScreen imports no HabitsScreen and renders no Habits label or tab switch', () => {
    const plan = source('screens/PlanScreen.tsx');
    expect(plan).not.toMatch(/HabitsScreen/);
    expect(plan).not.toMatch(/['"`]Habits['"`]|>\s*Habits\s*</);
    expect(plan).not.toMatch(/PrimaryTabGroup|TabType|activeTab|onTabChange/);
    expect(plan).not.toMatch(/Add a habit/);
    // The routines list is still what it renders.
    expect(plan).toMatch(/<RoutinesTab\b/);
  });

  test('nothing calls queueUnlockToasts', () => {
    const callers = liveSources()
      .filter(([, text]) => /\bqueueUnlockToasts\s*\(/.test(text))
      .map(([full]) => rel(full));
    expect(callers).toEqual([]);
  });

  test('useDashboard calls neither useHabits nor useJournal', () => {
    const dash = source('hooks/useDashboard.ts');
    expect(dash).not.toMatch(/\buseHabits\b/);
    expect(dash).not.toMatch(/\buseJournal\b/);
  });

  test('syncAllReminders schedules no habit reminder but still cancels them', () => {
    const scheduler = source('services/reminderScheduler.service.ts');
    const start = scheduler.indexOf('export async function syncAllReminders');
    expect(start).toBeGreaterThanOrEqual(0);
    const body = scheduler.slice(start);

    // Still cancels: the habit-reminder prefix is in the cancellation filter.
    expect(body).toMatch(/startsWith\(\s*['"]habit-reminder-['"]\s*\)/);
    expect(body).toMatch(/cancelScheduledNotificationAsync/);

    // Never schedules: no habit scheduler call, no habits read to feed one.
    expect(body).not.toMatch(/scheduleHabitReminder/);
    expect(body).not.toMatch(/collection\(\s*[^,]+,\s*['"]habits['"]/);

    // And nothing anywhere in src/ writes a habit-reminder payload.
    const writers = liveSources()
      .filter(([, text]) => /type:\s*['"]habit-reminder['"]/.test(text))
      .map(([full]) => rel(full));
    expect(writers).toEqual([]);
  });

  test('the habit-reminder tap does not navigate to the plan target', () => {
    const ctx = source('context/NotificationContext.tsx');
    const branch = ctx.match(/if\s*\(\s*data\.type\s*===\s*['"]habit-reminder['"]\s*\)\s*\{([\s\S]*?)\}/);
    expect(branch).not.toBeNull();
    const tap = branch![1];
    expect(tap).not.toMatch(/NAV_TARGETS\.plan|PillarTime|Rhythms/);
    expect(tap).toMatch(/ROUTES\.Home/);
  });

  test('no live source file imports from components/habits', () => {
    const habitsDir = path.join(SRC, 'components', 'habits');
    const spec = /(?:from|import\(|require\()\s*['"]([^'"]+)['"]/g;
    const importers: string[] = [];
    for (const [full, text] of liveSources()) {
      for (const m of text.matchAll(spec)) {
        const s = m[1];
        const hit = s.startsWith('.')
          ? path.resolve(path.dirname(full), s).startsWith(habitsDir)
          : /(^|\/)components\/habits(\/|$)/.test(s);
        if (hit) importers.push(`${rel(full)} -> ${s}`);
      }
    }
    expect(importers).toEqual([]);
  });
});

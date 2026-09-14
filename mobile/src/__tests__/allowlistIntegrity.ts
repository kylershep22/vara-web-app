/**
 * Generic allowlist integrity, shared by the tree-walking guard suites.
 *
 * WHAT IT IS FOR. Every guard suite in `src/__tests__/` holds a
 * `Record<path, reason>` allowlist of waived files. Two things can go wrong
 * with such a list, and only one of them is obvious:
 *
 *   1. The allowlisted file is renamed or deleted. The waiver then names
 *      nothing. `fs.existsSync` catches this.
 *   2. The allowlisted file still exists but has STOPPED VIOLATING - the fix
 *      the waiver was written to wait for has landed. Nothing catches this on
 *      its own, so the entry stays, and the list stops shrinking. That is the
 *      failure that makes an allowlist grow forever.
 *
 * `legacyIcons.test.ts` carried both halves; `brandCompliance.test.ts` carried
 * only the first. This function was written inside `legacyIcons.test.ts` to be
 * lifted, and R1d lifted it here so both suites run the same engine.
 *
 * WHY IT LIVES IN A PLAIN MODULE AND NOT IN A SUITE. Importing it from
 * `legacyIcons.test.ts` would execute that file's module body - including its
 * `describe` blocks - inside the importing suite, running the whole legacy-icon
 * guard a second time under another suite's name. This file has no `describe`,
 * and `jest.config.js` `testMatch` requires `.test.` or `.spec.`, so it is not
 * collected as a suite. Both tree walks skip `__tests__` directories, so it is
 * invisible to the guards themselves too.
 *
 * Its own behaviour is pinned by `allowlistIntegrity.test.ts`, against
 * synthetic fixtures rather than against whichever real allowlist happens to be
 * in the tree that week - a live allowlist with nothing to report proves the
 * caller is clean, never that the check works.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface AllowlistIntegrityResult {
  /** Allowlisted paths that no longer exist on disk. */
  missing: string[];
  /** Allowlisted paths that exist but no longer violate: the waiver is spent. */
  clean: string[];
}

/**
 * Partition an allowlist into entries that have gone missing and entries that
 * have stopped violating.
 *
 * Pass `stillViolates` as the calling suite's own detector:
 *   legacyIcons     -> (p) => legacyIconSetsIn(readRel(p)).length > 0
 *   brandCompliance -> (p) => scan(p).length > 0
 *
 * An entry that exists AND still violates is a healthy waiver and appears in
 * neither list.
 */
export function allowlistIntegrity(
  allowlist: Record<string, string>,
  root: string,
  stillViolates: (relPath: string) => boolean
): AllowlistIntegrityResult {
  const missing: string[] = [];
  const clean: string[] = [];
  for (const relPath of Object.keys(allowlist)) {
    if (!fs.existsSync(path.join(root, relPath))) {
      missing.push(relPath);
    } else if (!stillViolates(relPath)) {
      clean.push(relPath);
    }
  }
  return { missing, clean };
}

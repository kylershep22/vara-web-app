# Vara Test Infrastructure Backlog

Running list of test environment / Jest config issues surfaced during phased
implementation work. **Not fixed in the phase they were found** unless actively
blocking. Phase 6 sweeps this list during the launch-prep test pass.

Format per entry: file/area, what fails, what blocks, suggested fix.

---

## Open items

### `firebase/storage` not mocked in `jest.setup.js`

- **Symptom:** Test suites that transitively import `src/config/firebase.ts`
  fail to load with `SyntaxError: Unexpected token 'export'` from
  `firebase/storage/dist/esm/index.esm.js`.
- **Confirmed blocked:** `src/hooks/__tests__/useBrainStateWeekTrend.test.ts`
  (chain: test → `useBrainStateWeekTrend.ts` → `brainStateCheckIn.service.ts`
  → `config/firebase.ts:12`).
- **Likely also blocks:** any future test that imports a service from
  `src/services/firebase/*`.
- **Suggested fix:** Add `jest.mock('firebase/storage', () => ({ getStorage: jest.fn() }))`
  to `jest.setup.js` alongside the existing `firebase/auth` and
  `firebase/firestore` mocks.
- **Surfaced:** Phase 0, during normalizer wiring verification.

### No test asserts that a written document is FOUND by the query that reads it

- **Symptom:** a seeded `weeklyCycles` row with the correct document id but no
  `userId` **field** is invisible to `getWeeklyCyclesSince`
  (`weeklyCycle.service.ts:642` filters on the FIELD, not the path). The
  adjustment offer then silently never fires, with every unit test green.
- **Why the suites miss it:** every `deriveAdjustDue` test hands the derivation
  an array, and `useAdjustOffer.test.ts` mocks the service. The assertions are
  real; the thing they assert is not the thing that breaks. Same vacuous-green
  shape the rules-test harness note already warns about, one layer up.
- **Not confined to this query.** Any `where('<field>', '==', …)` read has the
  same gap: the write path and the read path agree only by convention, and
  nothing fails when they stop agreeing.
- **Suggested fix:** a round-trip case in the emulator-backed rules harness —
  write through the real service helper, read back through the real query,
  assert the row is found. The harness already seeds via the `withAdminDb` shim
  and can do both halves.
- **Surfaced:** journey slice 7b walk, 2026-09-11. Logged, not fixed: this is a
  harness capability, not a slice.

---

---

## Closed items

_None yet._

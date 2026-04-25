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

---

## Closed items

_None yet._

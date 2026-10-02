/**
 * isValidReminderTime: the one validity check for a stored daily time (NPM-2).
 * The scheduler's activation rule and the preferences service's salvage both
 * use it; the service re-exports it.
 */
import { isValidReminderTime } from '../reminderTime';
import { isValidReminderTime as reExported } from '../../services/firebase/notificationPreferences.service';

jest.mock('../../config/firebase', () => ({ db: null }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteField: jest.fn(),
  serverTimestamp: jest.fn(),
}));

describe('V1: the validity truth table', () => {
  test.each([
    [{ hour: 0, minute: 0 }],
    [{ hour: 23, minute: 59 }],
    [{ hour: 20, minute: 0 }],
    [{ hour: 7, minute: 5, extra: 'kept by the caller, ignored here' }],
  ])('valid: %j', (t) => {
    // Mutation caught: tightening a bound (for example hour < 23).
    expect(isValidReminderTime(t)).toBe(true);
  });

  test.each([
    [null],
    [undefined],
    ['20:00'],
    [{}],
    [{ hour: 20 }],
    [{ minute: 0 }],
    [{ hour: null, minute: null }],
    [{ hour: 20, minute: null }],
    [{ hour: null, minute: 0 }],
    [{ hour: 24, minute: 0 }],
    [{ hour: -1, minute: 0 }],
    [{ hour: 20, minute: 60 }],
    [{ hour: 20, minute: -1 }],
    [{ hour: 7.5, minute: 0 }],
    [{ hour: 20, minute: 0.5 }],
    [{ hour: '20', minute: '0' }],
    [{ hour: NaN, minute: 0 }],
  ])('invalid: %p', (t) => {
    // Mutation caught: loosening any bound, or accepting null or numeric strings.
    expect(isValidReminderTime(t)).toBe(false);
  });

  test('the preferences service exports the same function, not a copy', () => {
    // Mutation caught: a second validity check defined in the service.
    expect(reExported).toBe(isValidReminderTime);
  });
});

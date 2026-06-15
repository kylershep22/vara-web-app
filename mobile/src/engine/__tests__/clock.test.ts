import { EVENING_START_HOUR, isEvening } from '../clock';

describe('clock (§8)', () => {
  it('EVENING_START_HOUR is 20', () => {
    expect(EVENING_START_HOUR).toBe(20);
  });
  it('is not evening before 20:00', () => {
    expect(isEvening({ hour: 8 })).toBe(false);
    expect(isEvening({ hour: 19 })).toBe(false);
  });
  it('is evening from 20:00 onward', () => {
    expect(isEvening({ hour: 20 })).toBe(true);
    expect(isEvening({ hour: 23 })).toBe(true);
  });
});

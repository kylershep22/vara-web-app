import { resolvePlayAction } from '../centerFirst';

describe('resolvePlayAction — what the timer Begin/play tap should do', () => {
  it('idle + Center-first ON + centering available -> center', () => {
    expect(
      resolvePlayAction('idle', { centerFirst: true, canCenter: true })
    ).toBe('center');
  });

  it('idle + Center-first OFF -> start the timer directly', () => {
    expect(
      resolvePlayAction('idle', { centerFirst: false, canCenter: true })
    ).toBe('start');
  });

  it('idle + Center-first ON but already centered (no centering available) -> start', () => {
    expect(
      resolvePlayAction('idle', { centerFirst: true, canCenter: false })
    ).toBe('start');
  });

  it('running -> pause', () => {
    expect(resolvePlayAction('running', { centerFirst: true, canCenter: true })).toBe('pause');
  });

  it('break_running -> pause', () => {
    expect(resolvePlayAction('break_running', { centerFirst: false, canCenter: false })).toBe('pause');
  });

  it('paused -> resume', () => {
    expect(resolvePlayAction('paused', { centerFirst: true, canCenter: true })).toBe('resume');
  });
});

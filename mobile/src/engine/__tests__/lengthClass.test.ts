import {
  lengthClassOrder,
  lengthClassWithinBudget,
  timeWindowToLengthClass,
} from '../lengthClass';

describe('timeWindowToLengthClass (§5)', () => {
  it('2 and 5 are short', () => {
    expect(timeWindowToLengthClass(2)).toBe('short');
    expect(timeWindowToLengthClass(5)).toBe('short');
  });
  it('10 is medium', () => {
    expect(timeWindowToLengthClass(10)).toBe('medium');
  });
  it('20 and 45 are long', () => {
    expect(timeWindowToLengthClass(20)).toBe('long');
    expect(timeWindowToLengthClass(45)).toBe('long');
  });
});

describe('length class ordering + budget cap', () => {
  it('orders short < medium < long', () => {
    expect(lengthClassOrder('short')).toBeLessThan(lengthClassOrder('medium'));
    expect(lengthClassOrder('medium')).toBeLessThan(lengthClassOrder('long'));
  });
  it('a class fits a budget only when no longer than it', () => {
    expect(lengthClassWithinBudget('short', 'short')).toBe(true);
    expect(lengthClassWithinBudget('short', 'long')).toBe(true);
    expect(lengthClassWithinBudget('medium', 'short')).toBe(false);
    expect(lengthClassWithinBudget('long', 'medium')).toBe(false);
  });
});

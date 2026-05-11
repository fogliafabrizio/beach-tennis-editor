import { formatDuration } from './format-duration';

describe('formatDuration', () => {
  it('formats sub-minute durations', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(1500)).toBe('0:01');
    expect(formatDuration(59_999)).toBe('0:59');
  });

  it('formats minute-scale durations', () => {
    expect(formatDuration(60_000)).toBe('1:00');
    expect(formatDuration(125_500)).toBe('2:05');
  });

  it('formats hour-scale durations with zero-padded minutes', () => {
    expect(formatDuration(3_600_000)).toBe('1:00:00');
    expect(formatDuration(3_725_000)).toBe('1:02:05');
  });

  it('handles invalid input safely', () => {
    expect(formatDuration(-1)).toBe('0:00');
    expect(formatDuration(NaN)).toBe('0:00');
  });
});

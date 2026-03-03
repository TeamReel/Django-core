import { formatTimestamp } from './formatTimestamp';
import { subHours, subDays } from 'date-fns';

describe('formatTimestamp', () => {
  it('should format recent timestamp as relative', () => {
    const fiveMinutesAgo = subHours(new Date(), 0.083).toISOString();
    const result = formatTimestamp(fiveMinutesAgo, 'relative');
    expect(result).toMatch(/minutes? ago/);
  });

  it('should format one hour ago as relative', () => {
    const oneHourAgo = subHours(new Date(), 1).toISOString();
    const result = formatTimestamp(oneHourAgo, 'relative');
    expect(result).toMatch(/about 1 hour ago|1 hour ago/);
  });

  it('should format today timestamp as absolute', () => {
    const twoHoursAgo = subHours(new Date(), 2).toISOString();
    const result = formatTimestamp(twoHoursAgo, 'absolute');
    expect(result).toMatch(/^Today at \d{1,2}:\d{2} [AP]M$/);
  });

  it('should format yesterday timestamp', () => {
    const yesterday = subDays(new Date(), 1).toISOString();
    const result = formatTimestamp(yesterday, 'absolute');
    expect(result).toMatch(/^Yesterday at \d{1,2}:\d{2} [AP]M$/);
  });

  it('should format older dates with full date', () => {
    const twoDaysAgo = subDays(new Date(), 2).toISOString();
    const result = formatTimestamp(twoDaysAgo, 'absolute');
    expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4} at \d{1,2}:\d{2} [AP]M$/);
  });

  it('should handle invalid timestamp', () => {
    const result = formatTimestamp('invalid');
    expect(result).toBe('Invalid date');
  });

  it('should default to relative mode', () => {
    const fiveMinutesAgo = subHours(new Date(), 0.083).toISOString();
    const result = formatTimestamp(fiveMinutesAgo);
    expect(result).toMatch(/minutes? ago/);
  });

  it('should handle empty string', () => {
    const result = formatTimestamp('');
    expect(result).toBe('Invalid date');
  });

  it('should handle exceptions gracefully', () => {
    // Pass something that will throw during date parsing
    const result = formatTimestamp('2025-13-45T99:99:99Z');
    expect(result).toBe('Invalid date');
  });
});

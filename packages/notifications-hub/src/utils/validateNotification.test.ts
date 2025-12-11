import { validateNotification } from './validateNotification';

describe('validateNotification', () => {
  const validNotification = {
    id: '123',
    type: 'job.completed',
    severity: 'SUCCESS',
    title: 'Job completed',
    message: 'Your job finished successfully',
    timestamp: '2025-12-11T14:30:00Z',
    read: false,
    org_id: 'org-123',
  };

  it('should validate a valid notification', () => {
    const result = validateNotification(validNotification);
    expect(result).toEqual(validNotification);
  });

  it('should return null for missing id', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, ...invalid } = validNotification;
    expect(validateNotification(invalid)).toBeNull();
  });

  it('should return null for non-string id', () => {
    expect(validateNotification({ ...validNotification, id: 123 })).toBeNull();
  });

  it('should return null for missing type', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { type: _type, ...invalid } = validNotification;
    expect(validateNotification(invalid)).toBeNull();
  });

  it('should return null for missing title', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { title: _title, ...invalid } = validNotification;
    expect(validateNotification(invalid)).toBeNull();
  });

  it('should return null for missing message', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { message: _message, ...invalid } = validNotification;
    expect(validateNotification(invalid)).toBeNull();
  });

  it('should return null for missing timestamp', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { timestamp: _timestamp, ...invalid } = validNotification;
    expect(validateNotification(invalid)).toBeNull();
  });

  it('should default severity to INFO if invalid', () => {
    const result = validateNotification({ ...validNotification, severity: 'INVALID' });
    expect(result?.severity).toBe('INFO');
  });

  it('should accept valid severity values', () => {
    expect(validateNotification({ ...validNotification, severity: 'INFO' })?.severity).toBe('INFO');
    expect(validateNotification({ ...validNotification, severity: 'SUCCESS' })?.severity).toBe('SUCCESS');
    expect(validateNotification({ ...validNotification, severity: 'WARNING' })?.severity).toBe('WARNING');
    expect(validateNotification({ ...validNotification, severity: 'ERROR' })?.severity).toBe('ERROR');
    expect(validateNotification({ ...validNotification, severity: 'CRITICAL' })?.severity).toBe('CRITICAL');
  });

  it('should truncate long titles', () => {
    const longTitle = 'a'.repeat(250);
    const result = validateNotification({ ...validNotification, title: longTitle });
    expect(result?.title).toHaveLength(200);
    expect(result?.title).toMatch(/\.\.\.$/);
  });

  it('should truncate long messages', () => {
    const longMessage = 'a'.repeat(1100);
    const result = validateNotification({ ...validNotification, message: longMessage });
    expect(result?.message).toHaveLength(1000);
    expect(result?.message).toMatch(/\.\.\.$/);
  });

  it('should return null for invalid timestamp', () => {
    const result = validateNotification({ ...validNotification, timestamp: 'invalid' });
    expect(result).toBeNull();
  });

  it('should accept valid ISO 8601 timestamps', () => {
    const result = validateNotification({ ...validNotification, timestamp: '2025-12-11T14:30:00.000Z' });
    expect(result).not.toBeNull();
  });

  it('should handle exceptions gracefully', () => {
    // Pass something that will throw during processing
    const circular: any = {};
    circular.self = circular;
    expect(validateNotification(circular)).toBeNull();
  });
});

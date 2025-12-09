import { version } from '../src/index';

describe('@django-core/auth-ui', () => {
  it('exports version', () => {
    expect(version).toBe('1.0.0');
  });
});

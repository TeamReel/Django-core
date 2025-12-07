// Test the built dist output since vanilla-extract contracts
// are processed at build time
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const distPath = join(__dirname, '..', 'dist', 'index.js');
const distExists = existsSync(distPath);

// Skip these tests if dist doesn't exist (e.g., during test:coverage without build)
(distExists ? describe : describe.skip)('Design Token System', () => {
  let builtCode: string;

  beforeAll(() => {
    // Read the built output
    builtCode = readFileSync(distPath, 'utf-8');
  });

  describe('Build Output', () => {
    it('exports all token categories', () => {
      expect(builtCode).toContain('colorVars');
      expect(builtCode).toContain('typographyVars');
      expect(builtCode).toContain('spacingVars');
      expect(builtCode).toContain('radiusVars');
      expect(builtCode).toContain('shadowVars');
      expect(builtCode).toContain('zIndexVars');
      expect(builtCode).toContain('motionVars');
      expect(builtCode).toContain('breakpoints');
      expect(builtCode).toContain('themeVars');
    });

    it('generates CSS custom properties for all tokens', () => {
      // Should contain var(--xxx) references
      expect(builtCode).toMatch(/var\(--[a-z0-9]+\)/);
    });

    it('includes semantic color tokens', () => {
      expect(builtCode).toContain('text');
      expect(builtCode).toContain('background');
      expect(builtCode).toContain('border');
      expect(builtCode).toContain('interactive');
      expect(builtCode).toContain('palette');
    });

    it('includes typography tokens', () => {
      expect(builtCode).toContain('fontFamily');
      expect(builtCode).toContain('fontSize');
      expect(builtCode).toContain('fontWeight');
      expect(builtCode).toContain('lineHeight');
    });

    it('includes spacing scale', () => {
      expect(builtCode).toContain('spacing');
    });

    it('includes radius scale', () => {
      expect(builtCode).toContain('radius');
    });

    it('includes shadow scale', () => {
      expect(builtCode).toContain('shadow');
    });

    it('includes z-index layers', () => {
      expect(builtCode).toContain('zIndex');
      expect(builtCode).toContain('modal');
      expect(builtCode).toContain('tooltip');
    });

    it('includes motion tokens', () => {
      expect(builtCode).toContain('motion');
      expect(builtCode).toContain('duration');
      expect(builtCode).toContain('easing');
    });

    it('includes breakpoints as raw values', () => {
      expect(builtCode).toContain('breakpoints');
      expect(builtCode).toContain('640px');
      expect(builtCode).toContain('768px');
      expect(builtCode).toContain('1024px');
      expect(builtCode).toContain('1280px');
      expect(builtCode).toContain('1536px');
    });
  });

  describe('Type Safety', () => {
    it('includes TypeScript exports in built output', () => {
      // Verify exports are present
      expect(builtCode).toMatch(/export\s*\{/);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { checkContrast, validateColorPair } from '../../../src/validation/contrast';

describe('checkContrast', () => {
  it('should pass for black text on white bg (21:1)', () => {
    const result = checkContrast('#000000', '#ffffff');
    expect(result.passes).toBe(true);
    expect(result.ratio).toBeGreaterThan(20);
  });

  it('should fail for light gray text on white bg (<4.5:1)', () => {
    const result = checkContrast('#cccccc', '#ffffff');
    expect(result.passes).toBe(false);
    expect(result.ratio).toBeLessThan(4.5);
  });

  it('should pass for large text at 3:1', () => {
    const result = checkContrast('#767676', '#ffffff', 'AA', 'large');
    expect(result.passes).toBe(true);
    expect(result.ratio).toBeGreaterThan(3);
  });

  it('should validate known WCAG pairs', () => {
    // Blue link on white (#0000EE on #FFFFFF) should pass AA
    const result = checkContrast('#0000EE', '#FFFFFF');
    expect(result.passes).toBe(true);
    expect(result.ratio).toBeGreaterThan(7); // At least 7:1 (colorjs.io may calculate slightly differently)
  });

  it('should handle AAA level requirements', () => {
    // Normal text needs 7:1 for AAA
    const result = checkContrast('#595959', '#ffffff', 'AAA', 'normal');
    expect(result.required).toBe(7);
    expect(result.passes).toBe(true);
    expect(result.ratio).toBeGreaterThan(7);
  });

  it('should handle large text AAA requirements', () => {
    // Large text needs 4.5:1 for AAA
    const result = checkContrast('#767676', '#ffffff', 'AAA', 'large');
    expect(result.required).toBe(4.5);
    expect(result.passes).toBe(true);
  });

  it('should return correct required ratio for normal text AA', () => {
    const result = checkContrast('#000000', '#ffffff', 'AA', 'normal');
    expect(result.required).toBe(4.5);
    expect(result.level).toBe('AA');
  });

  it('should return correct required ratio for large text AA', () => {
    const result = checkContrast('#000000', '#ffffff', 'AA', 'large');
    expect(result.required).toBe(3);
    expect(result.level).toBe('AA');
  });

  it('should handle RGB color format', () => {
    const result = checkContrast('rgb(0, 0, 0)', 'rgb(255, 255, 255)');
    expect(result.passes).toBe(true);
    expect(result.ratio).toBeGreaterThan(20);
  });

  it('should handle HSL color format', () => {
    const result = checkContrast('hsl(0, 0%, 0%)', 'hsl(0, 0%, 100%)');
    expect(result.passes).toBe(true);
    expect(result.ratio).toBeGreaterThan(20);
  });

  it('should fail for insufficient contrast', () => {
    // #aaaaaa on #ffffff = 2.32:1 (fails 4.5:1)
    const result = checkContrast('#aaaaaa', '#ffffff');
    expect(result.passes).toBe(false);
    expect(result.ratio).toBeLessThan(4.5);
  });
});

describe('validateColorPair', () => {
  it('should return successful validation result', () => {
    const { name, result, error } = validateColorPair('Test pair', '#000000', '#ffffff');
    expect(name).toBe('Test pair');
    expect(result.passes).toBe(true);
    expect(error).toBeUndefined();
  });

  it('should return failed validation result', () => {
    const { name, result, error } = validateColorPair('Failed pair', '#cccccc', '#ffffff');
    expect(name).toBe('Failed pair');
    expect(result.passes).toBe(false);
    expect(error).toBeUndefined();
  });

  it('should handle invalid color format gracefully', () => {
    const { name, result, error } = validateColorPair('Invalid pair', 'not-a-color', '#ffffff');
    expect(name).toBe('Invalid pair');
    expect(result.passes).toBe(false);
    expect(result.ratio).toBe(0);
    expect(error).toBeDefined();
  });
});

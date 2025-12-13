import Color from 'colorjs.io';

export interface ContrastResult {
  ratio: number;
  passes: boolean;
  level: 'AA' | 'AAA';
  required: number;
}

export function checkContrast(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  textSize: 'normal' | 'large' = 'normal'
): ContrastResult {
  const fg = new Color(foreground);
  const bg = new Color(background);

  const ratio = Math.abs(fg.contrast(bg, 'WCAG21'));

  const required =
    level === 'AAA'
      ? textSize === 'large'
        ? 4.5
        : 7
      : textSize === 'large'
        ? 3
        : 4.5;

  return {
    ratio,
    passes: ratio >= required,
    level,
    required
  };
}

export function validateColorPair(
  name: string,
  foreground: string,
  background: string
): { name: string; result: ContrastResult; error?: string } {
  try {
    const result = checkContrast(foreground, background);
    return { name, result };
  } catch (error) {
    return {
      name,
      result: { ratio: 0, passes: false, level: 'AA', required: 4.5 },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

# Contrast Fixing Guide

## WCAG 2.1 AA Requirements

- **Normal text (<18pt)**: Minimum 4.5:1 contrast ratio
- **Large text (≥18pt or ≥14pt bold)**: Minimum 3:1 contrast ratio
- **UI components**: Minimum 3:1 contrast ratio

## Common Violations & Fixes

### 1. Low Contrast Text

**Problem**: Light gray text on white background
```typescript
color: {
  text: { secondary: '#cccccc' }, // ❌ 1.6:1 on white
  background: { primary: '#ffffff' }
}
```

**Fix**: Use darker shade
```typescript
color: {
  text: { secondary: '#767676' }, // ✅ 4.5:1 on white
  background: { primary: '#ffffff' }
}
```

### 2. Blue Links on Dark Backgrounds

**Problem**: Standard blue too dark for black background
```typescript
color: {
  text: { link: '#0000EE' }, // ❌ 2.4:1 on black
  background: { primary: '#000000' }
}
```

**Fix**: Use lighter blue
```typescript
color: {
  text: { link: '#6699ff' }, // ✅ 8.2:1 on black
  background: { primary: '#000000' }
}
```

### 3. Border Visibility

**Problem**: Light border on white background
```typescript
color: {
  border: { primary: '#f0f0f0' }, // ❌ 1.2:1 on white
  background: { primary: '#ffffff' }
}
```

**Fix**: Use medium gray
```typescript
color: {
  border: { primary: '#999999' }, // ✅ 3.2:1 on white
  background: { primary: '#ffffff' }
}
```

### 4. State Colors (Error, Warning, Success)

**Problem**: Pastel error colors
```typescript
color: {
  state: {
    error: { text: '#ffcccc' } // ❌ 1.4:1 on white
  },
  background: { primary: '#ffffff' }
}
```

**Fix**: Use darker, more saturated colors
```typescript
color: {
  state: {
    error: { text: '#cc0000' } // ✅ 5.5:1 on white
  },
  background: { primary: '#ffffff' }
}
```

## Tools

- **Online checker**: https://webaim.org/resources/contrastchecker/
- **CLI validator**: `pnpm validate-theme theme.json`
- **Browser extension**: WAVE or axe DevTools

## Testing

Run validation before committing:
```bash
# Validate a specific theme file
pnpm validate-theme packages/theme-system/src/themes/light.json

# Run all theme validation tests
pnpm test validation
```

## Example: Complete Theme Validation

```typescript
// Valid theme with proper contrast ratios
const theme = {
  color: {
    text: {
      primary: '#000000',   // 21:1 on white
      secondary: '#555555', // 7.0:1 on white
      link: '#0066cc'       // 7.7:1 on white
    },
    background: {
      primary: '#ffffff',
      secondary: '#f5f5f5'
    },
    border: {
      primary: '#cccccc'    // 3.0:1 on white
    },
    state: {
      error: { text: '#cc0000' },   // 5.5:1 on white
      success: { text: '#008000' }, // 4.7:1 on white
      warning: { text: '#ff8c00' }  // 3.4:1 on white (large text OK)
    }
  }
};
```

## Quick Reference: Safe Color Pairs

### Light Theme (White Background #ffffff)

| Text Color | Ratio | Status | Use Case |
|------------|-------|--------|----------|
| #000000 | 21:1 | ✅ AAA | Primary text |
| #555555 | 7.0:1 | ✅ AAA | Secondary text |
| #767676 | 4.5:1 | ✅ AA | Tertiary text |
| #999999 | 2.8:1 | ❌ Fail | Too light |
| #0066cc | 7.7:1 | ✅ AAA | Links |
| #cc0000 | 5.5:1 | ✅ AAA | Error |
| #008000 | 4.7:1 | ✅ AA | Success |

### Dark Theme (Black Background #000000)

| Text Color | Ratio | Status | Use Case |
|------------|-------|--------|----------|
| #ffffff | 21:1 | ✅ AAA | Primary text |
| #aaaaaa | 7.0:1 | ✅ AAA | Secondary text |
| #999999 | 5.7:1 | ✅ AAA | Tertiary text |
| #666666 | 3.3:1 | ❌ Fail | Too dark |
| #6699ff | 8.2:1 | ✅ AAA | Links |
| #ff6666 | 5.1:1 | ✅ AAA | Error |
| #66ff66 | 10.4:1 | ✅ AAA | Success |

## Troubleshooting

### "Ratio too low" error

1. Check the actual colors in your theme file
2. Use WebAIM contrast checker to find minimum passing color
3. Adjust lightness (L in HSL) while keeping hue/saturation
4. Test with real users if possible

### "Missing color token" warning

1. Ensure all required color pairs are defined:
   - `color.text.primary` and `color.background.primary`
   - `color.text.secondary` and `color.background.primary`
   - `color.text.link` and `color.background.primary`
   - `color.border.primary` and `color.background.primary`
   - State colors (error, success, warning)

### False positives

If the validator reports an error but the color pair is correct:
1. Verify the color values are valid CSS colors
2. Check for typos in hex codes
3. Ensure colors are in RGB/sRGB color space

## Further Reading

- [WCAG 2.1 Success Criterion 1.4.3](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Accessible Color Palette Builder](https://toolness.github.io/accessible-color-matrix/)

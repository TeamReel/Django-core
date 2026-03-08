/**
 * Stylelint Plugin: 8pt Grid Enforcement
 *
 * Two rules:
 * 1. `teamreel/spatial-4px-grid` — All spatial px values must be multiples of 4
 *    (with 1px exception for borders)
 * 2. `teamreel/no-hardcoded-hex` — No hex colors in component CSS; use tokens
 *
 * Install: referenced via `plugins` in .stylelintrc.json
 */

const stylelint = require('stylelint');

const { createPlugin, utils } = stylelint;

// ─────────────────────────────────────────────────────────────
// Rule 1: Spatial 4px Grid
// ─────────────────────────────────────────────────────────────

const SPATIAL_PROPS = new Set([
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'padding-inline', 'padding-block', 'padding-inline-start', 'padding-inline-end',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'margin-inline', 'margin-block',
  'gap', 'row-gap', 'column-gap',
  'border-radius', 'border-top-left-radius', 'border-top-right-radius',
  'border-bottom-left-radius', 'border-bottom-right-radius',
  'width', 'min-width', 'max-width',
  'height', 'min-height', 'max-height',
  'top', 'right', 'bottom', 'left',
  'inset',
]);

const SKIP_PROPS = new Set([
  'font-size', 'line-height', 'letter-spacing', 'word-spacing',
  'box-shadow', 'text-shadow', 'transform', 'translate',
  'border-width', 'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
  'outline', 'outline-width', 'outline-offset',
  'background-position', 'background-size',
  'stroke-width', 'stroke-dasharray',
]);

const spatialRuleName = 'teamreel/spatial-4px-grid';
const spatialMessages = utils.ruleMessages(spatialRuleName, {
  rejected: (value, prop) =>
    `Off-grid value "${value}" in "${prop}". Spatial values must be multiples of 4px (exception: 1px for borders).`,
});

const spatialRule = createPlugin(spatialRuleName, (primary) => {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, spatialRuleName, {
      actual: primary,
    });
    if (!validOptions) return;

    root.walkDecls((decl) => {
      const prop = decl.prop.toLowerCase();

      // Skip non-spatial
      if (SKIP_PROPS.has(prop)) return;

      // Check if spatial (exact match or starts with known prefix)
      let isSpatial = SPATIAL_PROPS.has(prop);
      if (!isSpatial) {
        for (const sp of SPATIAL_PROPS) {
          if (prop.startsWith(sp + '-')) {
            isSpatial = true;
            break;
          }
        }
      }
      if (!isSpatial) return;

      // Find all px values
      const pxMatches = decl.value.matchAll(/(-?\d+)px/g);
      for (const match of pxMatches) {
        const num = parseInt(match[1], 10);
        const absNum = Math.abs(num);

        // Allow 0px, 1px (borders/hairlines)
        if (absNum <= 1) continue;

        // Must be multiple of 4
        if (absNum % 4 !== 0) {
          utils.report({
            message: spatialMessages.rejected(`${num}px`, prop),
            node: decl,
            result,
            ruleName: spatialRuleName,
          });
        }
      }
    });
  };
});

// ─────────────────────────────────────────────────────────────
// Rule 2: No Hardcoded Hex
// ─────────────────────────────────────────────────────────────

const hexRuleName = 'teamreel/no-hardcoded-hex';
const hexMessages = utils.ruleMessages(hexRuleName, {
  rejected: (value, prop) =>
    `Hardcoded hex "${value}" in "${prop}". Use a design token: var(--color-*) or var(--app-*).`,
});

const hexRule = createPlugin(hexRuleName, (primary) => {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, hexRuleName, {
      actual: primary,
    });
    if (!validOptions) return;

    root.walkDecls((decl) => {
      const prop = decl.prop.toLowerCase();

      // Skip custom property definitions (token definitions are allowed)
      if (prop.startsWith('--')) return;

      // Skip properties where hex in value is inside var() fallback
      // We allow hex as fallback: var(--token, #hex)
      const value = decl.value;

      // Find hex values NOT inside var()
      // Simple approach: remove var(...) contents, then check remaining
      const withoutVar = value.replace(/var\([^)]*\)/g, '');

      const hexMatches = withoutVar.matchAll(/#[0-9a-fA-F]{3,8}\b/g);
      for (const match of hexMatches) {
        utils.report({
          message: hexMessages.rejected(match[0], prop),
          node: decl,
          result,
          ruleName: hexRuleName,
        });
      }
    });
  };
});

// Export both plugins
module.exports = [spatialRule, hexRule];

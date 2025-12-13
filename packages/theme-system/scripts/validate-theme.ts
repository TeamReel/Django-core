#!/usr/bin/env node
import { readFileSync } from 'fs';
import { resolve } from 'path';
import chalk from 'chalk';
import { validateTheme } from '../src/validation/themeValidator';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error(chalk.red('Usage: validate-theme <theme-file.json>'));
  process.exit(1);
}

const themePath = resolve(args[0]);
let theme: any;

try {
  theme = JSON.parse(readFileSync(themePath, 'utf-8'));
} catch (error) {
  console.error(chalk.red(`Failed to read theme file: ${themePath}`));
  console.error(error instanceof Error ? error.message : 'Unknown error');
  process.exit(1);
}

console.log(chalk.blue('🔍 Validating theme contrast ratios...\n'));

const report = validateTheme(theme);

if (report.errors.length > 0) {
  console.error(chalk.red.bold(`❌ ${report.errors.length} contrast violations found:\n`));

  report.errors.forEach((error) => {
    console.error(chalk.red(`  • ${error.pair}`));
    console.error(chalk.gray(`    FG: ${error.foreground} / BG: ${error.background}`));
    console.error(chalk.gray(`    Ratio: ${error.ratio.toFixed(2)} (required: ${error.required})\n`));
  });

  process.exit(1);
}

if (report.warnings.length > 0) {
  console.warn(chalk.yellow(`⚠️  ${report.warnings.length} warnings:\n`));
  report.warnings.forEach((w) => console.warn(chalk.yellow(`  • ${w.pair}`)));
  console.log();
}

console.log(chalk.green(`✅ All ${report.totalChecks} contrast checks passed!`));
process.exit(0);

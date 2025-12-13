#!/usr/bin/env node

/**
 * Bundle size report script
 * Analyzes the built package and validates size constraints
 */

import { readFileSync, statSync } from 'fs';
import { gzipSync } from 'zlib';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MAX_SIZE_KB = 15;
const MAX_SIZE_BYTES = MAX_SIZE_KB * 1024;

const distPath = join(__dirname, '..', 'dist');

function formatBytes(bytes) {
  return (bytes / 1024).toFixed(2) + ' KB';
}

function analyzeFile(filename) {
  const filePath = join(distPath, filename);
  try {
    const content = readFileSync(filePath);
    const size = statSync(filePath).size;
    const gzipped = gzipSync(content);
    const gzipSize = gzipped.length;

    return {
      filename,
      size,
      gzipSize,
      sizeFormatted: formatBytes(size),
      gzipFormatted: formatBytes(gzipSize)
    };
  } catch (err) {
    console.warn(`⚠️  Could not analyze ${filename}: ${err.message}`);
    return null;
  }
}

console.log('\n📦 Bundle Size Report\n');
console.log('─'.repeat(60));

const esm = analyzeFile('index.js');
const cjs = analyzeFile('index.cjs');

if (esm) {
  console.log(`\n📄 ESM Bundle (index.js)`);
  console.log(`   Raw size:     ${esm.sizeFormatted}`);
  console.log(`   Gzipped size: ${esm.gzipFormatted}`);
}

if (cjs) {
  console.log(`\n📄 CommonJS Bundle (index.cjs)`);
  console.log(`   Raw size:     ${cjs.sizeFormatted}`);
  console.log(`   Gzipped size: ${cjs.gzipFormatted}`);
}

console.log('\n' + '─'.repeat(60));

// Validate ESM bundle size (primary)
if (esm) {
  const percentUsed = ((esm.gzipSize / MAX_SIZE_BYTES) * 100).toFixed(1);
  const remaining = MAX_SIZE_BYTES - esm.gzipSize;

  console.log(`\n📊 Size Budget Analysis (ESM)`);
  console.log(`   Max allowed:  ${formatBytes(MAX_SIZE_BYTES)}`);
  console.log(`   Current size: ${esm.gzipFormatted} (${percentUsed}% used)`);
  console.log(`   Remaining:    ${formatBytes(remaining)}`);

  if (esm.gzipSize > MAX_SIZE_BYTES) {
    console.log(`\n❌ BUNDLE SIZE EXCEEDED!`);
    console.log(`   Bundle is ${formatBytes(esm.gzipSize - MAX_SIZE_BYTES)} over the ${MAX_SIZE_KB}KB limit.`);
    console.log(`\n   Optimization suggestions:`);
    console.log(`   • Review dependencies and tree-shaking`);
    console.log(`   • Check for duplicate code or large inline assets`);
    console.log(`   • Consider code splitting or lazy loading`);
    process.exit(1);
  } else {
    console.log(`\n✅ Bundle size is within the ${MAX_SIZE_KB}KB gzipped limit!`);
  }
}

console.log('\n' + '─'.repeat(60) + '\n');

// Package composition info
console.log('📝 Package Contents:');
console.log('   • 4 page templates (Dashboard, ListDetail, Wizard, Settings)');
console.log('   • Default state renderers (Loading, Error, Empty, PermissionDenied)');
console.log('   • TypeScript type definitions');
console.log('   • React 18.x peer dependency (not included in bundle)');
console.log('\n');

process.exit(0);

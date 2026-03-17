#!/usr/bin/env node
/**
 * Token Migration Script — Roadmap #22 H5
 * Replaces all hardcoded hex colors and rgba() values in CSS modules
 * with design tokens from tokens.css and theme.css.
 *
 * Usage: node demo/scripts/migrate-tokens.mjs [--dry-run]
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT = resolve(__dirname, '..');
const dryRun = process.argv.includes('--dry-run');

// ============================================================================
// HEX → TOKEN MAPPING (case-insensitive lookup)
// ============================================================================
const hexMap = new Map([
  // ---- Exact primitive matches (tokens.css) ----
  // Primary (Ocean Teal)
  ['#e6f4f7', 'var(--color-primary-50)'],
  ['#b3dfe8', 'var(--color-primary-100)'],
  ['#80c9d9', 'var(--color-primary-200)'],
  ['#4db3ca', 'var(--color-primary-300)'],
  ['#3b8ea5', 'var(--color-primary-400)'],
  ['#2e7a8f', 'var(--color-primary-500)'],
  ['#266879', 'var(--color-primary-600)'],
  ['#1e5563', 'var(--color-primary-700)'],
  ['#16424d', 'var(--color-primary-800)'],
  ['#0e2f37', 'var(--color-primary-900)'],

  // Neutrals
  ['#edf6ff', 'var(--color-neutral-50)'],
  ['#d6eaff', 'var(--color-neutral-100)'],
  ['#b8d4f0', 'var(--color-neutral-200)'],
  ['#94a3b8', 'var(--color-neutral-300)'],
  ['#6b7280', 'var(--color-neutral-400)'],
  ['#475569', 'var(--color-neutral-500)'],
  ['#334155', 'var(--color-neutral-600)'],
  ['#2e4a6d', 'var(--color-neutral-700)'],
  ['#1c355e', 'var(--color-neutral-800)'],
  ['#0a192f', 'var(--color-neutral-900)'],

  // Green (Success)
  ['#e6fbf4', 'var(--color-green-50)'],
  ['#b3f3de', 'var(--color-green-100)'],
  ['#80ebc8', 'var(--color-green-200)'],
  ['#4de3b2', 'var(--color-green-300)'],
  ['#10b981', 'var(--color-green-400)'],
  ['#06d6a0', 'var(--color-green-500)'],
  ['#059c75', 'var(--color-green-600)'],
  ['#04785a', 'var(--color-green-700)'],
  ['#035540', 'var(--color-green-800)'],
  ['#023226', 'var(--color-green-900)'],

  // Red (Error)
  ['#fde8ea', 'var(--color-red-50)'],
  ['#f9bcc2', 'var(--color-red-100)'],
  ['#f4909a', 'var(--color-red-200)'],
  ['#ef6472', 'var(--color-red-300)'],
  ['#e63946', 'var(--color-red-400)'],
  ['#dc2626', 'var(--color-red-500)'],
  ['#b91c1c', 'var(--color-red-600)'],
  ['#991b1b', 'var(--color-red-700)'],
  ['#7f1d1d', 'var(--color-red-800)'],
  ['#651a1a', 'var(--color-red-900)'],

  // Amber (Warning)
  ['#fffbeb', 'var(--color-amber-50)'],
  ['#fef3c7', 'var(--color-amber-100)'],
  ['#fde68a', 'var(--color-amber-200)'],
  ['#ffd166', 'var(--color-amber-300)'],
  ['#f59e0b', 'var(--color-amber-400)'],
  ['#d97706', 'var(--color-amber-500)'],
  ['#b45309', 'var(--color-amber-600)'],
  ['#92400e', 'var(--color-amber-700)'],
  ['#78350f', 'var(--color-amber-800)'],
  ['#5c2c06', 'var(--color-amber-900)'],

  // Blue (Info)
  ['#eff6ff', 'var(--color-blue-50)'],
  ['#dbeafe', 'var(--color-blue-100)'],
  ['#bfdbfe', 'var(--color-blue-200)'],
  ['#93c5fd', 'var(--color-blue-300)'],
  ['#60a5fa', 'var(--color-blue-400)'],
  ['#3b82f6', 'var(--color-blue-500)'],
  ['#2563eb', 'var(--color-blue-600)'],
  ['#1d4ed8', 'var(--color-blue-700)'],
  ['#1e40af', 'var(--color-blue-800)'],
  ['#1e3a8a', 'var(--color-blue-900)'],

  // Indigo (AI)
  ['#a5b4fc', 'var(--color-indigo-300)'],
  ['#818cf8', 'var(--color-indigo-400)'],
  ['#6366f1', 'var(--color-indigo-500)'],

  // Violet
  ['#a855f7', 'var(--color-violet-400)'],
  ['#8b5cf6', 'var(--color-violet-500)'],

  // Orange
  ['#fb923c', 'var(--color-orange-400)'],
  ['#f97316', 'var(--color-orange-500)'],

  // ---- Semantic theme matches ----
  ['#ffffff', 'var(--color-white)'],
  ['#fff',    'var(--color-white)'],
  ['#f0f4f8', 'var(--app-surface-2)'],
  ['#f8f9fa', 'var(--app-surface-secondary)'],
  ['#e5e5e5', 'var(--app-border)'],
  ['#d1d5db', 'var(--app-input-border)'],
  ['#4ca1ff', 'var(--app-focus-ring)'],
  ['#f8fafc', 'var(--app-surface-alt)'],
  ['#e2e8f0', 'var(--sidebar-a-border)'],

  // ---- Tailwind / Bootstrap equivalents → nearest token ----
  // Grays → semantic
  ['#1e293b', 'var(--app-text)'],           // Tailwind slate-800
  ['#e5e7eb', 'var(--app-border)'],          // Tailwind gray-200
  ['#0f172a', 'var(--color-neutral-900)'],   // Tailwind slate-900
  ['#9ca3af', 'var(--color-neutral-300)'],   // Tailwind gray-400
  ['#f3f4f6', 'var(--app-surface-2)'],       // Tailwind gray-100
  ['#f9fafb', 'var(--color-neutral-50)'],    // Tailwind gray-50
  ['#1f2937', 'var(--color-neutral-800)'],   // Tailwind gray-800
  ['#374151', 'var(--color-neutral-600)'],   // Tailwind gray-700
  ['#111827', 'var(--color-neutral-900)'],   // Tailwind gray-900
  ['#4b5563', 'var(--color-neutral-500)'],   // Tailwind gray-600
  ['#64748b', 'var(--color-neutral-400)'],   // Tailwind slate-500
  ['#667085', 'var(--color-neutral-400)'],   // Custom gray
  ['#cbd5e1', 'var(--color-neutral-200)'],   // Tailwind slate-300
  ['#f1f5f9', 'var(--color-neutral-50)'],    // Tailwind slate-100

  // Status colors → semantic tokens
  ['#ef4444', 'var(--app-error)'],           // Tailwind red-500
  ['#22c55e', 'var(--app-success)'],         // Tailwind green-500

  // Shorthand grays → semantic tokens
  ['#000',    'var(--color-neutral-900)'],
  ['#000000', 'var(--color-neutral-900)'],
  ['#111',    'var(--app-text)'],
  ['#222',    'var(--app-text)'],
  ['#333',    'var(--app-text)'],
  ['#444',    'var(--color-neutral-500)'],
  ['#555',    'var(--color-neutral-500)'],
  ['#555555', 'var(--color-neutral-500)'],
  ['#666',    'var(--color-neutral-400)'],
  ['#888',    'var(--app-muted-text)'],
  ['#999',    'var(--app-muted-text)'],
  ['#ccc',    'var(--app-border)'],
  ['#cccccc', 'var(--app-border)'],
  ['#ddd',    'var(--app-border)'],
  ['#eee',    'var(--app-border)'],
  ['#f5f5f5', 'var(--app-surface-2)'],
  ['#f3f3f3', 'var(--app-surface-2)'],
  ['#f8f8f8', 'var(--app-surface-secondary)'],

  // Blue variants → nearest blue primitive
  ['#007bff', 'var(--color-blue-500)'],      // Bootstrap primary
  ['#0078d4', 'var(--color-blue-600)'],      // Office blue
  ['#007fd4', 'var(--color-blue-600)'],
  ['#0066cc', 'var(--color-blue-600)'],
  ['#1976d2', 'var(--color-blue-700)'],      // Material blue
  ['#0b5ed7', 'var(--color-blue-700)'],
  ['#2196f3', 'var(--color-blue-500)'],      // Material light blue
  ['#3498db', 'var(--color-blue-500)'],      // Bootstrap info
  ['#17a2b8', 'var(--color-primary-400)'],   // Bootstrap info (teal)
  ['#0891b2', 'var(--color-primary-400)'],   // Tailwind cyan-600
  ['#1565c0', 'var(--color-blue-700)'],      // Material blue dark
  ['#094771', 'var(--color-primary-700)'],   // Dark teal
  ['#1e5aa5', 'var(--color-blue-700)'],

  // Red variants
  ['#d32f2f', 'var(--color-red-500)'],       // Material red
  ['#dc3545', 'var(--color-red-500)'],       // Bootstrap danger
  ['#c62828', 'var(--color-red-600)'],
  ['#e11d48', 'var(--color-red-400)'],       // Tailwind rose-600
  ['#bd2130', 'var(--color-red-600)'],       // Bootstrap dark danger
  ['#f44',    'var(--app-error)'],           // Shorthand red
  ['#c00',    'var(--color-red-600)'],
  ['#cc0000', 'var(--color-red-600)'],

  // Green variants
  ['#16a34a', 'var(--color-green-400)'],     // Tailwind green-600
  ['#059669', 'var(--color-green-600)'],     // Tailwind emerald-600
  ['#4ade80', 'var(--color-green-300)'],     // Tailwind green-400
  ['#15803d', 'var(--color-green-700)'],     // Tailwind green-700
  ['#1e7e34', 'var(--color-green-700)'],     // Bootstrap success dark
  ['#14532d', 'var(--color-green-800)'],
  ['#166534', 'var(--color-green-800)'],     // Tailwind green-800

  // Amber/Orange variants
  ['#fbbf24', 'var(--color-amber-200)'],     // Tailwind amber-400
  ['#ffc107', 'var(--color-amber-300)'],     // Bootstrap warning
  ['#fd7e14', 'var(--color-orange-400)'],    // Bootstrap orange
  ['#e65100', 'var(--color-orange-500)'],    // Material orange dark

  // Purple variants
  ['#6f42c1', 'var(--color-violet-500)'],    // Bootstrap purple
  ['#9333ea', 'var(--color-violet-400)'],    // Tailwind purple-600
  ['#a78bfa', 'var(--color-indigo-300)'],    // Tailwind violet-400
  ['#d946ef', 'var(--color-violet-400)'],    // Tailwind fuchsia
  ['#ec4899', 'var(--color-violet-400)'],    // Tailwind pink → closest

  // Background tints
  ['#fef2f2', 'var(--color-red-50)'],        // Tailwind red-50
  ['#fee2e2', 'var(--color-red-50)'],
  ['#fecaca', 'var(--color-red-100)'],       // Tailwind red-200
  ['#fca5a5', 'var(--color-red-200)'],       // Tailwind red-300
  ['#f87171', 'var(--color-red-300)'],       // Tailwind red-400
  ['#ffebee', 'var(--color-red-50)'],        // Material red-50
  ['#fee',    'var(--color-red-50)'],
  ['#fcc',    'var(--color-red-100)'],
  ['#ffcccc', 'var(--color-red-100)'],
  ['#ffeeee', 'var(--color-red-50)'],
  ['#fff5f5', 'var(--color-red-50)'],
  ['#f0fdf4', 'var(--color-green-50)'],      // Tailwind green-50
  ['#d1fae5', 'var(--color-green-100)'],     // Tailwind green-100
  ['#c6f0d4', 'var(--color-green-100)'],
  ['#e3f2fd', 'var(--color-blue-50)'],       // Material blue-50
  ['#fff3e0', 'var(--color-amber-50)'],      // Material orange-50

  // Dark mode specific
  ['#1e1e1e', 'var(--color-neutral-900)'],
  ['#2a2a2a', 'var(--color-neutral-800)'],
  ['#1a1a1a', 'var(--color-neutral-900)'],
  ['#3c3c3c', 'var(--color-neutral-700)'],
  ['#252526', 'var(--color-neutral-900)'],
  ['#2a2a3e', 'var(--color-neutral-800)'],
  ['#1a1a2e', 'var(--color-neutral-900)'],
  ['#1e1e30', 'var(--color-neutral-900)'],
  ['#252540', 'var(--color-neutral-800)'],
  ['#16213e', 'var(--color-neutral-900)'],
  ['#0f0f23', 'var(--color-neutral-900)'],
  ['#0f0f0f', 'var(--color-neutral-900)'],
  ['#d4d4d4', 'var(--color-neutral-200)'],

  // Other borders/surfaces
  ['#e0e0e0', 'var(--app-border)'],          // Material gray
  ['#d0d5dd', 'var(--app-input-border)'],
  ['#e1e5e9', 'var(--app-border)'],
  ['#e9eef5', 'var(--color-neutral-100)'],
  ['#6c757d', 'var(--color-neutral-400)'],   // Bootstrap secondary

  // Custom brand/dark
  ['#327d91', 'var(--color-primary-500)'],

  // Hex with alpha
  ['#28a74520', 'var(--app-success-bg)'],
  ['#dc354520', 'var(--app-error-bg)'],

  // Other misc
  ['#4ec',    'var(--color-green-300)'],
  ['#856d00', 'var(--color-amber-700)'],
  ['#5a4000', 'var(--color-amber-800)'],
]);

// ============================================================================
// RGBA → TOKEN MAPPING
// Keys are normalized: lowercase, single spaces, no trailing spaces inside parens
// ============================================================================
const rgbaMap = new Map([
  // ---- Already existing semantic tokens ----
  ['rgba(0, 0, 0, 0.5)',         'var(--app-overlay)'],
  ['rgba(0, 0, 0, 0.6)',         'var(--app-overlay-backdrop)'],
  ['rgba(0, 0, 0, 0.72)',        'var(--app-overlay-heavy)'],
  ['rgba(0, 0, 0, 0.04)',        'var(--app-hover)'],
  ['rgba(0, 0, 0, 0.14)',        'var(--nav-icon-border)'],
  ['rgba(59, 142, 165, 0.08)',   'var(--app-primary-light)'],
  ['rgba(59, 142, 165, 0.04)',   'var(--app-primary-subtle)'],
  ['rgba(59, 142, 165, 0.15)',   'var(--app-primary-ring)'],
  ['rgba(59, 142, 165, 0.1)',    'var(--app-primary-light)'],
  ['rgba(59, 142, 165, 0.12)',   'var(--app-primary-ring)'],
  ['rgba(59, 142, 165, 0.06)',   'var(--app-primary-subtle)'],
  ['rgba(59, 142, 165, 0.2)',    'var(--app-primary-ring)'],
  ['rgba(59, 142, 165, 0.22)',   'var(--app-primary-ring)'],
  ['rgba(239, 68, 68, 0.08)',    'var(--app-error-bg)'],
  ['rgba(245, 158, 11, 0.08)',   'var(--app-warning-bg)'],
  ['rgba(245, 158, 11, 0.04)',   'var(--app-warning-subtle)'],
  ['rgba(245, 158, 11, 0.12)',   'var(--app-warning-ring)'],
  ['rgba(255, 255, 255, 0.06)',  'var(--app-surface-glass)'],
  ['rgba(255, 255, 255, 0.08)',  'var(--app-surface-glass-hover)'],

  // ---- New semantic tokens ----
  // Error tints
  ['rgba(239, 68, 68, 0.04)',    'var(--app-error-bg)'],
  ['rgba(239, 68, 68, 0.06)',    'var(--app-error-bg)'],
  ['rgba(239, 68, 68, 0.1)',     'var(--app-error-bg)'],
  ['rgba(239, 68, 68, 0.12)',    'var(--app-error-ring)'],
  ['rgba(239, 68, 68, 0.15)',    'var(--app-error-ring)'],
  ['rgba(239, 68, 68, 0.2)',     'var(--app-error-ring)'],
  ['rgba(239, 68, 68, 0.25)',    'var(--app-error-ring)'],
  ['rgba(239, 68, 68, 0.27)',    'var(--app-error-ring)'],
  ['rgba(239, 68, 68, 0.3)',     'var(--app-error-ring)'],

  // Bootstrap red tints (220, 53, 69 = #dc3545)
  ['rgba(220, 53, 69, 0.1)',     'var(--app-error-bg)'],
  ['rgba(220, 53, 69, 0.2)',     'var(--app-error-ring)'],
  ['rgba(220, 53, 69, 0.3)',     'var(--app-error-ring)'],

  // Success tints
  ['rgba(34, 197, 94, 0.04)',    'var(--app-success-bg)'],
  ['rgba(34, 197, 94, 0.08)',    'var(--app-success-bg)'],
  ['rgba(34, 197, 94, 0.1)',     'var(--app-success-bg)'],
  ['rgba(34, 197, 94, 0.10)',    'var(--app-success-bg)'],
  ['rgba(34, 197, 94, 0.12)',    'var(--app-success-ring)'],
  ['rgba(34, 197, 94, 0.15)',    'var(--app-success-ring)'],
  ['rgba(34, 197, 94, 0.2)',     'var(--app-success-ring)'],
  ['rgba(34, 197, 94, 0.20)',    'var(--app-success-ring)'],
  ['rgba(34, 197, 94, 0.25)',    'var(--app-success-ring)'],
  ['rgba(34, 197, 94, 0.3)',     'var(--app-success-ring)'],

  // Other green tints (16, 185, 129 = Tailwind emerald-500)
  ['rgba(16, 185, 129, 0.2)',    'var(--app-success-ring)'],
  // (22, 163, 74 = Tailwind green-600)
  ['rgba(22, 163, 74, 0.15)',    'var(--app-success-ring)'],
  ['rgba(22, 163, 74, 0.3)',     'var(--app-success-ring)'],
  ['rgba(22, 163, 74, 0.6)',     'var(--color-green-400)'],

  // Info / blue tints (59, 130, 246 = Tailwind blue-500)
  ['rgba(59, 130, 246, 0.04)',   'var(--app-info-subtle)'],
  ['rgba(59, 130, 246, 0.06)',   'var(--app-info-subtle)'],
  ['rgba(59, 130, 246, 0.08)',   'var(--app-info-bg)'],
  ['rgba(59, 130, 246, 0.1)',    'var(--app-info-bg)'],
  ['rgba(59, 130, 246, 0.12)',   'var(--app-info-ring)'],
  ['rgba(59, 130, 246, 0.15)',   'var(--app-info-ring)'],
  ['rgba(59, 130, 246, 0.2)',    'var(--app-info-ring)'],
  ['rgba(59, 130, 246, 0.25)',   'var(--app-info-ring)'],
  ['rgba(59, 130, 246, 0.27)',   'var(--app-info-ring)'],
  ['rgba(59, 130, 246, 0.3)',    'var(--app-info-ring)'],
  ['rgba(59, 130, 246, 0.4)',    'var(--color-blue-400)'],

  // Blue-600 tints (37, 99, 235 = #2563eb)
  ['rgba(37, 99, 235, 0.15)',    'var(--app-info-ring)'],
  ['rgba(37, 99, 235, 0.25)',    'var(--app-info-ring)'],

  // Warning tints
  ['rgba(245, 158, 11, 0.1)',    'var(--app-warning-bg)'],
  ['rgba(245, 158, 11, 0.15)',   'var(--app-warning-ring)'],
  ['rgba(245, 158, 11, 0.2)',    'var(--app-warning-ring)'],
  ['rgba(245, 158, 11, 0.25)',   'var(--app-warning-ring)'],
  ['rgba(245, 158, 11, 0.3)',    'var(--app-warning-ring)'],
  ['rgba(245, 158, 11, 0.5)',    'var(--color-amber-400)'],

  // Other amber tints (234, 179, 8 = #eab308 / 251, 191, 36 = #fbbf24 / 217, 119, 6 = #d97706)
  ['rgba(234, 179, 8, 0.12)',    'var(--app-warning-ring)'],
  ['rgba(234, 179, 8, 0.15)',    'var(--app-warning-ring)'],
  ['rgba(234, 179, 8, 0.5)',     'var(--color-amber-300)'],
  ['rgba(251, 191, 36, 0.15)',   'var(--app-warning-ring)'],
  ['rgba(251, 191, 36, 0.25)',   'var(--app-warning-ring)'],
  ['rgba(217, 119, 6, 0.1)',     'var(--app-warning-bg)'],
  ['rgba(217, 119, 6, 0.7)',     'var(--color-amber-500)'],
  ['rgba(217, 119, 6, 0.85)',    'var(--color-amber-500)'],

  // AI / Indigo tints (99, 102, 241 = #6366f1)
  ['rgba(99, 102, 241, 0.04)',   'var(--app-ai-bg)'],
  ['rgba(99, 102, 241, 0.06)',   'var(--app-ai-bg)'],
  ['rgba(99, 102, 241, 0.1)',    'var(--app-ai-bg)'],
  ['rgba(99, 102, 241, 0.15)',   'var(--app-ai-bg)'],
  ['rgba(99, 102, 241, 0.7)',    'var(--color-indigo-500)'],
  ['rgba(99, 102, 241, 0.8)',    'var(--color-indigo-500)'],
  ['rgba(99, 102, 241, 0.85)',   'var(--color-indigo-500)'],

  // Indigo-400 tints (129, 140, 248 = #818cf8)
  ['rgba(129, 140, 248, 0.08)',  'var(--app-ai-bg)'],
  ['rgba(129, 140, 248, 0.1)',   'var(--app-ai-bg)'],
  ['rgba(129, 140, 248, 0.15)',  'var(--app-ai-bg)'],
  ['rgba(129, 140, 248, 0.25)',  'var(--app-ai-bg)'],
  ['rgba(129, 140, 248, 0.3)',   'var(--color-indigo-400)'],

  // Violet tints (167, 139, 250 = #a78bfa / 139, 92, 246 = #8b5cf6)
  ['rgba(167, 139, 250, 0.04)',  'var(--app-ai-bg)'],
  ['rgba(167, 139, 250, 0.06)',  'var(--app-ai-bg)'],
  ['rgba(139, 92, 246, 0.1)',    'var(--app-ai-bg)'],

  // Pink (236, 72, 153 = #ec4899)
  ['rgba(236, 72, 153, 0.1)',    'var(--app-ai-bg)'],

  // Teal tints (13, 148, 136 = #0d9488)
  ['rgba(13, 148, 136, 0.1)',    'var(--app-primary-light)'],
  ['rgba(13, 148, 136, 0.7)',    'var(--color-primary-400)'],
  ['rgba(13, 148, 136, 0.85)',   'var(--color-primary-400)'],

  // Gray alpha (120, 120, 128)
  ['rgba(120, 120, 128, 0.32)',  'var(--alpha-black-30)'],

  // ---- Alpha primitives (black) ----
  ['rgba(0, 0, 0, 0)',           'transparent'],
  ['rgba(0, 0, 0, 0.02)',       'var(--alpha-black-2)'],
  ['rgba(0, 0, 0, 0.03)',       'var(--alpha-black-3)'],
  ['rgba(0, 0, 0, 0.05)',       'var(--alpha-black-5)'],
  ['rgba(0, 0, 0, 0.06)',       'var(--alpha-black-6)'],
  ['rgba(0, 0, 0, 0.08)',       'var(--alpha-black-8)'],
  ['rgba(0, 0, 0, 0.1)',        'var(--alpha-black-10)'],
  ['rgba(0, 0, 0, 0.12)',       'var(--alpha-black-12)'],
  ['rgba(0, 0, 0, 0.15)',       'var(--alpha-black-15)'],
  ['rgba(0, 0, 0, 0.16)',       'var(--alpha-black-15)'],
  ['rgba(0, 0, 0, 0.18)',       'var(--alpha-black-18)'],
  ['rgba(0, 0, 0, 0.2)',        'var(--alpha-black-20)'],
  ['rgba(0, 0, 0, 0.25)',       'var(--alpha-black-25)'],
  ['rgba(0, 0, 0, 0.3)',        'var(--alpha-black-30)'],
  ['rgba(0, 0, 0, 0.35)',       'var(--alpha-black-35)'],
  ['rgba(0, 0, 0, 0.4)',        'var(--alpha-black-40)'],
  ['rgba(0, 0, 0, 0.45)',       'var(--alpha-black-45)'],
  ['rgba(0, 0, 0, 0.55)',       'var(--alpha-black-55)'],
  ['rgba(0, 0, 0, 0.7)',        'var(--alpha-black-70)'],
  ['rgba(0, 0, 0, 0.75)',       'var(--alpha-black-75)'],
  ['rgba(0, 0, 0, 0.8)',        'var(--alpha-black-80)'],
  ['rgba(0, 0, 0, 0.85)',       'var(--alpha-black-85)'],

  // ---- Alpha primitives (white) ----
  ['rgba(255, 255, 255, 0.02)', 'var(--alpha-white-2)'],
  ['rgba(255, 255, 255, 0.03)', 'var(--alpha-white-3)'],
  ['rgba(255, 255, 255, 0.04)', 'var(--alpha-white-4)'],  // NOTE: use alpha-white, not app-surface-alt
  ['rgba(255, 255, 255, 0.05)', 'var(--alpha-white-5)'],
  ['rgba(255, 255, 255, 0.1)',  'var(--alpha-white-10)'],
  ['rgba(255, 255, 255, 0.10)', 'var(--alpha-white-10)'],
  ['rgba(255, 255, 255, 0.12)', 'var(--alpha-white-12)'],
  ['rgba(255, 255, 255, 0.14)', 'var(--alpha-white-14)'],
  ['rgba(255, 255, 255, 0.15)', 'var(--alpha-white-15)'],
  ['rgba(255, 255, 255, 0.18)', 'var(--alpha-white-18)'],
  ['rgba(255, 255, 255, 0.2)',  'var(--alpha-white-20)'],
  ['rgba(255, 255, 255, 0.3)',  'var(--alpha-white-30)'],
  ['rgba(255, 255, 255, 0.35)', 'var(--alpha-white-35)'],
  ['rgba(255, 255, 255, 0.4)',  'var(--alpha-white-40)'],
  ['rgba(255, 255, 255, 0.5)',  'var(--alpha-white-50)'],
  ['rgba(255, 255, 255, 0.6)',  'var(--alpha-white-60)'],
  ['rgba(255, 255, 255, 0.7)',  'var(--alpha-white-70)'],
  ['rgba(255, 255, 255, 0.75)', 'var(--alpha-white-75)'],
  ['rgba(255, 255, 255, 0.8)',  'var(--alpha-white-80)'],
  ['rgba(255, 255, 255, 0.85)', 'var(--alpha-white-85)'],
  ['rgba(255, 255, 255, 0.9)',  'var(--alpha-white-90)'],

  // Handle alternate spacing (no space after commas)
  ['rgba(255,255,255,0.06)',    'var(--app-surface-glass)'],
  ['rgba(255,255,255,0.08)',    'var(--app-surface-glass-hover)'],
  ['rgba(255,255,255,0.5)',     'var(--alpha-white-50)'],
  ['rgba(255,255,255,0.6)',     'var(--alpha-white-60)'],
  ['rgba(0,0,0,0.05)',          'var(--alpha-black-5)'],

  // Tailwind brand teal with dark mode (76, 161, 255 = #4CA1FF)
  ['rgba(76, 161, 255, 0.04)',  'var(--app-primary-subtle)'],
  ['rgba(76, 161, 255, 0.12)',  'var(--app-primary-light)'],
  ['rgba(76, 161, 255, 0.15)',  'var(--app-primary-ring)'],

  // Sidebar dark specific (148, 163, 184)
  ['rgba(148, 163, 184, 0.22)', 'var(--alpha-white-20)'],
]);

// ============================================================================
// FILE DISCOVERY
// ============================================================================
function findCSSModules() {
  const srcDir = resolve(ROOT, 'src');
  const results = [];

  function walkDir(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(full);
      } else if (entry.name.endsWith('.module.css')) {
        // Skip token/theme files
        if (entry.name === 'tokens.css' || entry.name === 'theme.css') continue;
        results.push(full);
      }
    }
  }

  walkDir(srcDir);
  return results;
}

// ============================================================================
// NORMALIZATION
// ============================================================================
function normalizeRgba(raw) {
  // Normalize: lowercase, single spaces after commas, trim inside parens
  return raw
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/,\s*/g, ', ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim();
}

// ============================================================================
// REPLACEMENT ENGINE
// ============================================================================
function processFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let changed = false;
  let hexCount = 0;
  let rgbaCount = 0;
  const unmapped = [];

  const processedLines = lines.map((line, lineNum) => {
    // Skip lines that are comments or already have var()
    if (line.trim().startsWith('/*') || line.trim().startsWith('//')) return line;

    let result = line;

    // 1. Replace rgba() values FIRST (before hex, since rgba contains numbers)
    result = result.replace(/rgba?\([^)]+\)/gi, (match) => {
      // Don't replace if inside a var() already
      const before = result.substring(0, result.indexOf(match));
      if (before.includes('var(') && !before.includes(')')) return match;

      const normalized = normalizeRgba(match);
      const token = rgbaMap.get(normalized);
      if (token) {
        rgbaCount++;
        changed = true;
        return token;
      }

      // Try without trailing zero precision: rgba(0, 0, 0, 0.50) → rgba(0, 0, 0, 0.5)
      const simplified = normalized.replace(/(\.\d)0+\)/, '$1)');
      const token2 = rgbaMap.get(simplified);
      if (token2) {
        rgbaCount++;
        changed = true;
        return token2;
      }

      unmapped.push({ line: lineNum + 1, value: match, type: 'rgba' });
      return match;
    });

    // 2. Replace hex values
    result = result.replace(/#[0-9a-fA-F]{3,8}\b/gi, (match) => {
      const lower = match.toLowerCase();
      const token = hexMap.get(lower);
      if (token) {
        hexCount++;
        changed = true;
        return token;
      }

      unmapped.push({ line: lineNum + 1, value: match, type: 'hex' });
      return match;
    });

    return result;
  });

  return {
    content: processedLines.join('\n'),
    changed,
    hexCount,
    rgbaCount,
    unmapped,
    filePath,
  };
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
  console.log(`\n🎨 Token Migration Script — Roadmap #22 H5`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN (no files written)' : 'LIVE'}\n`);

  const files = findCSSModules();
  console.log(`   Found ${files.length} CSS modules to process\n`);

  let totalHex = 0;
  let totalRgba = 0;
  let totalFiles = 0;
  const allUnmapped = [];

  for (const filePath of files) {
    const result = processFile(filePath);

    if (result.changed) {
      totalFiles++;
      totalHex += result.hexCount;
      totalRgba += result.rgbaCount;

      const rel = relative(ROOT, filePath).replace(/\\/g, '/');
      console.log(`   ✅ ${rel}: ${result.hexCount} hex + ${result.rgbaCount} rgba`);

      if (!dryRun) {
        writeFileSync(filePath, result.content, 'utf-8');
      }
    }

    if (result.unmapped.length > 0) {
      for (const u of result.unmapped) {
        allUnmapped.push({
          file: relative(ROOT, filePath).replace(/\\/g, '/'),
          ...u,
        });
      }
    }
  }

  console.log(`\n   ────────────────────────────────────────`);
  console.log(`   Total: ${totalHex} hex + ${totalRgba} rgba = ${totalHex + totalRgba} replacements in ${totalFiles} files`);

  if (allUnmapped.length > 0) {
    console.log(`\n   ⚠️  ${allUnmapped.length} unmapped values:`);
    // Group by value
    const grouped = {};
    for (const u of allUnmapped) {
      const key = u.value.toLowerCase().replace(/\s+/g, ' ');
      if (!grouped[key]) grouped[key] = { count: 0, files: new Set() };
      grouped[key].count++;
      grouped[key].files.add(u.file);
    }
    const sorted = Object.entries(grouped).sort((a, b) => b[1].count - a[1].count);
    for (const [value, info] of sorted.slice(0, 20)) {
      console.log(`      ${info.count}× ${value} (${[...info.files].slice(0, 2).join(', ')}${info.files.size > 2 ? ` +${info.files.size - 2}` : ''})`);
    }
    if (sorted.length > 20) {
      console.log(`      ... and ${sorted.length - 20} more unique values`);
    }
  }

  console.log('');
}

main().catch(console.error);

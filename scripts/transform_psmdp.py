"""
Phase 4: Transform ProjectSeasonMemberDetailPage.tsx
- Remove extracted utility section (L30-792)
- Replace 10 tab blocks with component calls
- Update imports
- Add tabCommonProps object
"""
import re

filepath = r'demo/src/pages/periods/ProjectSeasonMemberDetailPage.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.read().split('\n')

print(f'Original: {len(lines)} lines')

# ── Helpers ──

def find_line(text, start=0):
    for i in range(start, len(lines)):
        if text in lines[i]:
            return i
    return None

def find_jsx_block_end(start_line):
    depth = 0
    for i in range(start_line, len(lines)):
        for ch in lines[i]:
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
        if depth <= 0 and i > start_line:
            return i
    return None

# ── Step 1: Find all section boundaries BEFORE any mutations ──

util_start = find_line('const UUID_RE = ')
export_default = find_line('export default function ProjectSeasonMemberDetailPage()')

# Tab blocks: (tab_name, comment_marker)
tab_defs = [
    ('overview',          'Overview Tab'),
    ('input',             'Input Photos tab'),
    ('intro',             'Short Intro Tab'),
    ('celebration',       'Goal Celebration Tab'),
    ('then_vs_now',       'Then vs Now Tab'),
    ('photo_composite',   'photo_composite'),
    ('walking_composite', 'Walking Composite Tab'),
    ('action_photo',      'Action Photo Tab'),
    ('assets',            'Assets Tab - Grouped'),
    ('identity',          'Identity Tab'),
]

tab_ranges = {}  # tab_name -> (start_line, end_line) inclusive
prev_end = 0
for tab_name, marker in tab_defs:
    comment_line = find_line(marker, prev_end)
    if comment_line is None:
        raise RuntimeError(f'{tab_name}: marker not found: {marker}')
    at_line = find_line(f"activeTab === '{tab_name}'", comment_line)
    if at_line is None:
        raise RuntimeError(f'{tab_name}: activeTab line not found')
    block_end = find_jsx_block_end(at_line)
    if block_end is None:
        raise RuntimeError(f'{tab_name}: block end not found')
    # Include any blank lines / comment lines above the activeTab line
    tab_ranges[tab_name] = (comment_line, block_end)
    prev_end = block_end

# Main return line
main_return = find_line('  return (', export_default)
# Make sure it's the one with indent=2
while main_return and (len(lines[main_return]) - len(lines[main_return].lstrip()) != 2):
    main_return = find_line('  return (', main_return + 1)

print(f'Util section: L{util_start+1}-L{export_default}')
print(f'Main return: L{main_return+1}')
for name, (s, e) in tab_ranges.items():
    print(f'  {name}: L{s+1}-L{e+1} ({e-s+1} lines)')

# ── Step 2: Build replacement content for each tab ──

indent = '                '  # 16 spaces

tab_replacements = {
    'overview': f"""{indent}{{activeTab === 'overview' && (
{indent}  <MemberOverviewTab {{...tabCommonProps}} navigateToTab={{navigateToTab}} />
{indent})}}\n""",

    'input': f"""{indent}{{activeTab === 'input' && (
{indent}  <MemberInputTab
{indent}    {{...tabCommonProps}}
{indent}    profilePreview={{profilePreview}}
{indent}    profileUploading={{profileUploading}}
{indent}    profileInputRef={{profileInputRef}}
{indent}    handleProfilePhotoUpload={{handleProfilePhotoUpload}}
{indent}    legacyPhotoPreview={{legacyPhotoPreview}}
{indent}    legacyPhotoUploading={{legacyPhotoUploading}}
{indent}    legacyPhotoInputRef={{legacyPhotoInputRef}}
{indent}    handleLegacyPhotoUpload={{handleLegacyPhotoUpload}}
{indent}  />
{indent})}}\n""",

    'intro': f"""{indent}{{activeTab === 'intro' && (
{indent}  <MemberIntroTab {{...tabCommonProps}} />
{indent})}}\n""",

    'celebration': f"""{indent}{{activeTab === 'celebration' && (
{indent}  <MemberCelebrationTab {{...tabCommonProps}} />
{indent})}}\n""",

    'then_vs_now': f"""{indent}{{activeTab === 'then_vs_now' && (
{indent}  <MemberThenVsNowTab {{...tabCommonProps}} />
{indent})}}\n""",

    'photo_composite': f"""{indent}{{activeTab === 'photo_composite' && (
{indent}  <MemberPhotoCompositeTab {{...tabCommonProps}} />
{indent})}}\n""",

    'walking_composite': f"""{indent}{{activeTab === 'walking_composite' && (
{indent}  <MemberWalkingCompositeTab {{...tabCommonProps}} />
{indent})}}\n""",

    'action_photo': f"""{indent}{{activeTab === 'action_photo' && (
{indent}  <MemberActionPhotoTab {{...tabCommonProps}} />
{indent})}}\n""",

    'assets': f"""{indent}{{activeTab === 'assets' && (
{indent}  <MemberAssetsTab
{indent}    {{...tabCommonProps}}
{indent}    croppingCloseup={{croppingCloseup}}
{indent}    cropCloseupFromFullbody={{cropCloseupFromFullbody}}
{indent}    croppingHalfbody={{croppingHalfbody}}
{indent}    cropHalfbodyFromFullbody={{cropHalfbodyFromFullbody}}
{indent}    org={{org}}
{indent}    club={{club}}
{indent}  />
{indent})}}\n""",

    'identity': f"""{indent}{{activeTab === 'identity' && (
{indent}  <MemberIdentityTab
{indent}    membership={{membership}}
{indent}    project={{project}}
{indent}    apiBaseUrl={{apiBaseUrl}}
{indent}    onMembershipUpdate={{(updated) => setMembership(updated)}}
{indent}  />
{indent})}}\n""",
}

# ── Step 3: Apply replacements bottom-to-top (so line numbers don't shift) ──

# Sort tab blocks by start line, DESCENDING
sorted_tabs = sorted(tab_ranges.items(), key=lambda x: x[1][0], reverse=True)

for tab_name, (start, end) in sorted_tabs:
    # Also consume blank lines above the comment
    while start > 0 and lines[start - 1].strip() == '':
        start -= 1
    replacement = tab_replacements[tab_name]
    replacement_lines = replacement.split('\n')
    # Remove trailing empty string from split
    if replacement_lines and replacement_lines[-1] == '':
        replacement_lines = replacement_lines[:-1]
    lines[start:end+1] = [''] + replacement_lines  # blank line before each component
    print(f'  Replaced {tab_name}: {end-start+1} lines -> {len(replacement_lines)+1} lines')

# ── Step 4: Remove utility section ──
# Recalculate positions after tab replacements
util_start = find_line('const UUID_RE = ')
export_default = find_line('export default function ProjectSeasonMemberDetailPage()')

if util_start is not None and export_default is not None:
    lines[util_start:export_default] = ['']
    print(f'  Removed utility section: {export_default - util_start} lines')

# ── Step 5: Insert tabCommonProps before main return ──
main_return = find_line('  return (')
while main_return and (len(lines[main_return]) - len(lines[main_return].lstrip()) != 2):
    main_return = find_line('  return (', main_return + 1)

if main_return:
    tab_common_block = """
  const tabCommonProps = {
    membership,
    form,
    videoVariants,
    setVideoVariants,
    setForm,
    userCanEditProject,
    apiBaseUrl,
    membershipId,
    project,
    resolveDisplayUrl,
    openAiModal,
    handleMetadataUpdate,
    startProcessingPoll,
    setVideoPreviewUrl: setVideoPreviewUrl,
    setMembership,
    effectiveKits,
  };
"""
    insert_lines = tab_common_block.split('\n')
    lines[main_return:main_return] = insert_lines
    print(f'  Inserted tabCommonProps ({len(insert_lines)} lines) before main return')

# ── Step 6: Update imports ──

# Find and replace the import block (lines 0-29 approximately)
new_imports = """import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import { PageContent, PageHeader } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';
import LoadingState from '../../components/LoadingState';
import { useAuth } from '@django-core/auth-ui';
import { ACTIVE_CONTEXT_CHANGED_EVENT, getActiveContext, setActiveContext } from '../../utils/activeContext';
import type { MemberMediaForm } from '../../constants/mediaSlots';
import { getBestUrl } from '../../constants/assetProcessingSpecs';
import { AssetGenerationModal, type SavedAssetInfo } from '../../components/AssetGenerationModal';
import { getAssetUrl, resolvePresignedUrls } from '../../hooks/useBrandProfile';
import { useGenerationJobs } from '../../hooks/useGenerationJobs';
import MobileTabBar from '../../components/MobileTabBar';
import { WorkflowPanel } from '../../components/Workflows';
import { useSeasonContext } from '../../providers/SeasonProvider';
import type { Period, SeasonProject as Project, SeasonOrganisation as Organisation } from '../../types/season';
import { getCsrfToken, unwrapEnvelope as unwrap } from '../../types/season';
import {
  UUID_RE,
  getUserDisplayName,
  createEmptyMediaForm,
  createEmptyVideoVariants,
  readAssetsFromMembership,
  readVideoVariantsFromMembership,
  mergeAssetsIntoMetadata,
  pollProcessingResult,
} from './memberDetailUtils';
import type { AssetVariantsMap } from './memberDetailUtils';
import { MemberOverviewTab } from './MemberOverviewTab';
import { MemberInputTab } from './MemberInputTab';
import { MemberIntroTab } from './MemberIntroTab';
import { MemberCelebrationTab } from './MemberCelebrationTab';
import { MemberThenVsNowTab } from './MemberThenVsNowTab';
import { MemberPhotoCompositeTab } from './MemberPhotoCompositeTab';
import { MemberWalkingCompositeTab } from './MemberWalkingCompositeTab';
import { MemberActionPhotoTab } from './MemberActionPhotoTab';
import { MemberAssetsTab } from './MemberAssetsTab';
import { MemberIdentityTab } from './MemberIdentityTab';
import s from './ProjectSeasonMemberDetailPage.module.css';"""

# Find the end of the original import block (the CSS module import line)
css_import = find_line("import s from './ProjectSeasonMemberDetailPage.module.css'")
if css_import is not None:
    lines[0:css_import+1] = new_imports.split('\n')
    print(f'  Replaced imports (original {css_import+1} lines -> {len(new_imports.split(chr(10)))} lines)')

# ── Step 7: Clean up duplicate blank lines ──

cleaned = []
prev_blank = False
for line in lines:
    is_blank = line.strip() == ''
    if is_blank and prev_blank:
        continue
    cleaned.append(line)
    prev_blank = is_blank

lines = cleaned

# ── Step 8: Write output ──

with open(filepath, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print(f'\nResult: {len(lines)} lines (was 3998)')
print('Done!')

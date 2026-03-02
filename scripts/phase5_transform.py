"""Phase 5: Transform ProjectCompetitionDetailPage.tsx — replace extracted blocks with imports."""
import pathlib, re

FILE = pathlib.Path(r"demo/src/pages/periods/ProjectCompetitionDetailPage.tsx")
src = FILE.read_text(encoding="utf-8")
lines = src.split("\n")
print(f"Original: {len(lines)} lines")

# ── 1. Remove helper functions and 4 modal components (L33-843) ──
# These are lines between the last import and the main component export
# Find the line "const combineDateTime" (first helper)
start_idx = None
for i, line in enumerate(lines):
    if line.startswith("const combineDateTime"):
        start_idx = i
        break

# Find "export const ProjectCompetitionDetailPage" (main component)
end_idx = None
for i, line in enumerate(lines):
    if "export const ProjectCompetitionDetailPage" in line:
        end_idx = i
        break

if start_idx is not None and end_idx is not None:
    print(f"Removing helpers+modals: lines {start_idx+1}–{end_idx} (0-based {start_idx}–{end_idx-1})")
    lines = lines[:start_idx] + lines[end_idx:]
    print(f"After removal: {len(lines)} lines")
else:
    print(f"ERROR: Could not find boundaries (start={start_idx}, end={end_idx})")
    exit(1)

# ── 2. Add new imports after existing import block ──
new_imports = [
    "import { combineDateTime, addHoursToIsoLike, getUserDisplayName, roleLabel } from './competitionDetailUtils';",
    "import { CompetitionMembershipDetailModal as MembershipDetailModal } from './CompetitionMembershipDetailModal';",
    "import { CompetitionMembershipEditModal as MembershipEditModal } from './CompetitionMembershipEditModal';",
    "import { CompetitionCreateUserHelpModal as CreateUserHelpModal } from './CompetitionCreateUserHelpModal';",
    "import { CompetitionLegacyMatchCreateModal } from './CompetitionLegacyMatchCreateModal';",
    "import { CompetitionHierarchyTab } from './CompetitionHierarchyTab';",
    "import { CompetitionContentTab } from './CompetitionContentTab';",
]

# Find last import line
last_import_idx = 0
for i, line in enumerate(lines):
    stripped = line.strip()
    if stripped.startswith("import ") or stripped.startswith("} from "):
        last_import_idx = i

# Insert after last import
for j, imp in enumerate(new_imports):
    lines.insert(last_import_idx + 1 + j, imp)

print(f"After adding imports: {len(lines)} lines")

# ── 3. Remove unused imports that were only used by extracted code ──
# fetchAllPages is still used in the main component; CONTENT_TYPES used in CompetitionContentTab (extracted)

# Check if CONTENT_TYPES is still referenced in main component (after our removals)
joined = "\n".join(lines)
# CONTENT_TYPES is now only used in CompetitionContentTab (extracted), so remove from parent
if "CONTENT_TYPES" not in joined.replace("import { CONTENT_TYPES }", "").replace("import { CompetitionContentTab }", ""):
    # Actually let's check more carefully
    pass

# ── 4. Replace hierarchy tab block with component call ──
# Find the hierarchy tab JSX block: {activeTab === 'hierarchy' && (
# Must be the JSX conditional (stripped == "{activeTab === 'hierarchy' && ("),
# not the useEffect check on L1248.
hierarchy_start = None
hierarchy_end = None
for i, line in enumerate(lines):
    if line.strip() == "{activeTab === 'hierarchy' && (":
        hierarchy_start = i
        break

if hierarchy_start is not None:
    # Find actual closing by looking for the next activeTab check starting at the same indent level
    # The hierarchy tab line is like "              {activeTab === 'hierarchy' && ("
    # The closing will be "              )}" at the same indent level, before the next tab
    hierarchy_indent = len(lines[hierarchy_start]) - len(lines[hierarchy_start].lstrip())

    # Find the closing )} at the same indent level
    actual_end = None
    brace_depth = 0
    for i in range(hierarchy_start, len(lines)):
        line = lines[i]
        # Count opening/closing braces (JSX expression containers)
        brace_depth += line.count('{') - line.count('}')
        if brace_depth <= 0 and i > hierarchy_start:
            actual_end = i + 1  # exclusive
            break

    if actual_end is None:
        print("ERROR: Could not find hierarchy tab end")
        exit(1)

    print(f"Hierarchy tab: lines {hierarchy_start+1}–{actual_end} ({actual_end - hierarchy_start} lines)")

    indent = "              "
    replacement = [
        "",
        indent + "{activeTab === 'hierarchy' && (",
        indent + "  <CompetitionHierarchyTab",
        indent + "    hierarchySearch={hierarchySearch}",
        indent + "    setHierarchySearch={setHierarchySearch}",
        indent + "    matchesLoading={matchesLoading}",
        indent + "    filteredMatches={filteredMatches}",
        indent + "    navigate={navigate}",
        indent + "    matchDetailPath={matchDetailPath}",
        indent + "    matchDisplayTitle={matchDisplayTitle}",
        indent + "    competition={competition}",
        indent + "    season={season}",
        indent + "    seasonsBasePath={seasonsBasePath}",
        indent + "    seasonKeyOrId={seasonKeyOrId}",
        indent + "    setIsMatchCreateModalOpen={setIsMatchCreateModalOpen}",
        indent + "    setSelectedDetailMatch={setSelectedDetailMatch}",
        indent + "    setIsMatchDetailModalOpen={setIsMatchDetailModalOpen}",
        indent + "    setSelectedEditMatch={setSelectedEditMatch}",
        indent + "    setIsMatchEditModalOpen={setIsMatchEditModalOpen}",
        indent + "    setMatches={setMatches}",
        indent + "    apiBaseUrl={apiBaseUrl}",
        indent + "    getCsrfToken={getCsrfToken}",
        indent + "  />",
        indent + ")}",
    ]

    lines = lines[:hierarchy_start] + replacement + lines[actual_end:]
    print(f"Replaced hierarchy tab block: lines {hierarchy_start+1}–{actual_end}")
    print(f"After hierarchy replacement: {len(lines)} lines")

# ── 5. Replace content tab block with component call ──
# Find the content tab JSX block: {activeTab === 'content' && (() => {
content_start = None
for i, line in enumerate(lines):
    if line.strip().startswith("{activeTab === 'content'"):
        content_start = i
        break

if content_start is not None:
    # Use brace counting to find the end of the content conditional block
    brace_depth = 0
    content_end = None
    for i in range(content_start, len(lines)):
        brace_depth += lines[i].count('{') - lines[i].count('}')
        if brace_depth <= 0 and i > content_start:
            content_end = i + 1  # exclusive
            break

    if content_end is None:
        print("ERROR: Could not find content tab end")
        exit(1)

    print(f"Content tab: lines {content_start+1}–{content_end} ({content_end - content_start} lines)")

    indent = "              "
    replacement = [
        "",
        indent + "{activeTab === 'content' && (",
        indent + "  <CompetitionContentTab",
        indent + "    matches={matches}",
        indent + "    matchMediaMap={matchMediaMap}",
        indent + "    matchMediaLoading={matchMediaLoading}",
        indent + "    matchDisplayTitle={matchDisplayTitle}",
        indent + "    isTeamRoute={isTeamRoute}",
        indent + "    orgSlugOrId={orgSlugOrId}",
        indent + "    clubSlugOrId={clubSlugOrId}",
        indent + "    projectSlugOrId={projectSlugOrId}",
        indent + "    seasonKeyOrId={seasonKeyOrId}",
        indent + "  />",
        indent + ")}",
        "",
    ]

    lines = lines[:content_start] + replacement + lines[content_end:]
    print(f"Replaced content tab block")
    print(f"After content replacement: {len(lines)} lines")

# ── 6. Remove CONTENT_TYPES import if no longer used in parent ──
remaining = "\n".join(lines)
# Check if CONTENT_TYPES is used outside of import lines
content_types_uses = [i for i, line in enumerate(lines)
                       if "CONTENT_TYPES" in line and not line.strip().startswith("import")]
if not content_types_uses:
    # Remove the CONTENT_TYPES import line
    lines = [line for line in lines if "import { CONTENT_TYPES }" not in line]
    print("Removed unused CONTENT_TYPES import")

# ── 7. Clean up: remove duplicate blank lines ──
cleaned = []
prev_blank = False
for line in lines:
    is_blank = line.strip() == ""
    if is_blank and prev_blank:
        continue
    cleaned.append(line)
    prev_blank = is_blank

lines = cleaned

print(f"Final: {len(lines)} lines")
FILE.write_text("\n".join(lines), encoding="utf-8")
print("✅ Done!")

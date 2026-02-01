#!/usr/bin/env python3
"""Fix the Squad tab and add Team tab to ProjectSeasonDetailPage.tsx"""

import re

# Read the file
with open('src/pages/periods/ProjectSeasonDetailPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add 'team' to allowed tabs
content = content.replace(
    "const allowed = new Set(['overview', 'content', 'hierarchy', 'competitions', 'matches', 'squad', 'media', 'transactions']);",
    "const allowed = new Set(['overview', 'content', 'hierarchy', 'competitions', 'matches', 'squad', 'team', 'media', 'transactions']);"
)

# 2. Update fetch condition for team roster
content = content.replace(
    "if (activeTab !== 'squad') return;",
    "if (activeTab !== 'squad' && activeTab !== 'team') return;"
)

# 3. Remove debug console.log statements
content = re.sub(
    r"console\.log\('\[SeasonDetail\][^']*',.*?\);\n\n?",
    "",
    content,
    flags=re.DOTALL
)

# Write the file
with open('src/pages/periods/ProjectSeasonDetailPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done with basic changes')

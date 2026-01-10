import re
import os

backup_file_path = (
    r"c:\Users\brian\Documents\django-core\demo\src\pages\identity\ProjectDetailPage.tsx.bak"
)
target_file_path = (
    r"c:\Users\brian\Documents\django-core\demo\src\pages\identity\ProjectDetailPage.tsx"
)

with open(backup_file_path, "r", encoding="utf-8") as f:
    backup_content = f.read()

# 1. Imports and Component Start
component_start_match = re.search(r"export const ProjectDetailPage", backup_content)
if not component_start_match:
    print("Could not find component start")
    exit(1)

component_start_index = component_start_match.start()
preamble = backup_content[:component_start_index]

# Fix AppShell Import
if "import AppShell from '../../components/AppShell';" not in preamble:
    if "import AppShell" in preamble:
        preamble = re.sub(r"import AppShell.*?;", "", preamble)

    last_import = [m.end() for m in re.finditer(r"import .*?;", preamble)]
    if last_import:
        insert_pos = last_import[-1]
        preamble = (
            preamble[:insert_pos]
            + "\nimport AppShell from '../../components/AppShell';"
            + preamble[insert_pos:]
        )
    else:
        preamble = "import AppShell from '../../components/AppShell';\n" + preamble

# Add fetchAllPages helper
fetch_helper_code = """
const fetchAllPages = async <T,>(url: string, options: RequestInit = {}): Promise<T[]> => {
  let allResults: T[] = [];
  let nextUrl: string | null = url;

  while (nextUrl) {
    const res = await fetch(nextUrl, options);
    if (!res.ok) break;
    const json = await res.json();
    const data = json.data || json;
    const results = data.results || [];
    allResults = [...allResults, ...results];
    nextUrl = data.next;
  }
  return allResults;
};
"""

if "const compactTableStyle" in preamble:
    parts = preamble.split("const compactTableStyle")
    preamble = parts[0] + fetch_helper_code + "\nconst compactTableStyle" + parts[1]
else:
    preamble = preamble + "\n" + fetch_helper_code + "\n"

# 2. Logic Part
back_path_match = re.search(r"const backPath =", backup_content)
if not back_path_match:
    print("Could not find 'const backPath'")
    exit(1)

# Search for the next 'return ('
return_match_after_backpath = re.search(
    r"return \(\s*<AppShell>", backup_content[back_path_match.start() :]
)
if not return_match_after_backpath:
    print("Could not find return after backPath")
    exit(1)
return_index = back_path_match.start() + return_match_after_backpath.start()

logic_part = backup_content[component_start_index:return_index]

# 3. New Return - Minimal for Testing
new_return = """
  return (
    <AppShell>
      <div>
        <PageHeader
            title="Project Details"
            breadcrumbs={[]}
            actions={null}
        />
        <PageContent>
            <div>Minimal Content</div>
        </PageContent>
      </div>
    </AppShell>
  );
};

export default ProjectDetailPage;
"""

final_content = preamble + logic_part + new_return

with open(target_file_path, "w", encoding="utf-8") as f:
    f.write(final_content)

print("Successfully rebuilt ProjectDetailPage.tsx (Minimal)")

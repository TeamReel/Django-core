import re
from pathlib import Path

filepath = "demo/src/pages/identity/UserDetailMembershipTabs.tsx"
content = Path(filepath).read_text(encoding='utf-8')

import_statement = "import styles from './UserDetailMembershipTabs.module.css';\n"
if import_statement.strip() not in content:
    imports = [line for line in content.split('\n') if line.startswith('import ')]
    if imports:
        last_import = imports[-1]
        content = content.replace(last_import, f"{last_import}\n{import_statement}")

# Replace the specific instances
content = content.replace(
    '''className="border-none bg-transparent p-0 fw-700" style={{ color: orgSlugOrId ? 'var(--app-primary)' : 'var(--app-muted-text)', cursor: orgSlugOrId ? 'pointer' : 'not-allowed', textDecoration: orgSlugOrId ? 'underline' : 'none' }}''',
    '''className={`border-none bg-transparent p-0 fw-700 ${orgSlugOrId ? styles.roleButton : styles.roleButtonDisabled}`}'''
)

content = content.replace(
    '''className="border-none bg-transparent p-0 fw-700" style={{ color: projectId ? 'var(--app-primary)' : 'var(--app-muted-text)', cursor: projectId ? 'pointer' : 'not-allowed', textDecoration: projectId ? 'underline' : 'none' }}''',
    '''className={`border-none bg-transparent p-0 fw-700 ${projectId ? styles.roleButton : styles.roleButtonDisabled}`}'''
)

Path(filepath).write_text(content, encoding='utf-8')
print("Replaced.")
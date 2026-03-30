file = "src/pages/identity/directory/UsersDesktopTable.tsx"
original = open(file, encoding="utf8").read()
import re
new_content = re.sub(r'return \(\s*\{\/\*', 'return (\n    <>\n      {/*', original)
new_content = re.sub(r'<\/div>\s*\);\s*\}', '    </div>\n    </>\n  );\n}', new_content)
open(file, "w", encoding="utf8").write(new_content)

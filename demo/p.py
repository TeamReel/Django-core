text = open("src/pages/identity/directory/UsersListTable.tsx", encoding="utf8").read()
import re
d_start = text.find("{/* ── Desktop")
d_end = text.find("    </div>\n  );\n};", d_start)
if d_start != -1 and d_end != -1:
    d_code = text[d_start:d_end]
    open("extracted_desktop.txt", "w", encoding="utf8").write(d_code)
    print("D extracted")

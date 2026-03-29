import os
import re

file_path = "C:/Users/brian/Documents/django-core/documents/02-roadmap/modules/quick/doing/Q035-any-types-opschonen-production-code.md"

with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace("Status | 📋 TODO", "Status | 🔍 REVIEW")
text = text.replace("[ ] Type `response.data`", "[x] Type `response.data`")
text = text.replace("[ ] Type css.d.ts", "[x] Type css.d.ts")
text = text.replace("[ ] Vervang `as any`", "[x] Vervang `as any`")
text = text.replace("[ ] Type `theme` in", "[x] Type `theme` in")
text = text.replace("[ ] Tests", "[x] Tests")
text = text.replace("[ ] Verify", "[x] Verify")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)

print("Done")
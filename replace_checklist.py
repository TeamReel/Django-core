import re
from pathlib import Path

filepath = "documents/02-roadmap/modules/quick/doing/Q034-css-hardcoded-waarden-opschonen.md"
content = Path(filepath).read_text(encoding='utf-8')

content = content.replace("[ ] Definieer z-index tokens", "[x] Definieer z-index tokens")
content = content.replace("[ ] Vervang alle losse z-index waarden", "[x] Vervang alle losse z-index waarden")
content = content.replace("[ ] Vervang hardcoded rgba() in `utility.css`", "[x] Vervang hardcoded rgba() in `utility.css`")
content = content.replace("[ ] Vervang hardcoded box-shadow", "[x] Vervang hardcoded box-shadow")
content = content.replace("[ ] Verplaats inline styles in", "[x] Verplaats inline styles in")
content = content.replace("[ ] Tests", "[x] Tests")
content = content.replace("[ ] Verify", "[x] Verify")
content = content.replace("🚧 DOING", "🔍 REVIEW")

Path(filepath).write_text(content, encoding='utf-8')
print("Replaced.")
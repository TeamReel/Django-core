"""
Fix garbled characters in ApprovalsPage.tsx caused by PowerShell Set-Content
re-encoding UTF-8 emoji as Windows-1252 byte sequences.

The file is currently valid UTF-8 but contains mojibake: UTF-8 sequences that
were read as cp1252 and re-encoded as UTF-8. We fix by decoding those sequences
back through cp1252 then utf-8.
"""
import re

path = "demo/src/pages/ApprovalsPage.tsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Table of garbled sequences -> correct characters
# Each garbled string is what you get when UTF-8 bytes are decoded as cp1252
# then stored in UTF-8.
replacements = {
    # Emoji (4-byte UTF-8 decoded as cp1252 then re-encoded)
    "ðŸ"‹": "📋",   # U+1F4CB clipboard
    "ðŸ'€": "👀",   # U+1F440 eyes
    "ðŸ"„": "🔄",   # U+1F504 arrows
    "âœ…": "✅",    # U+2705 check mark
    "âŒ": "❌",     # U+274C cross
    "ðŸ¤–": "🤖",  # U+1F916 robot
    "ðŸ–¼ï¸": "🖼️", # U+1F5BC framed picture
    "ðŸŽ‰": "🎉",  # U+1F389 party popper
    "ðŸ"­": "🔭",  # U+1F52D telescope
    "ðŸš«": "🚫",  # U+1F6AB no entry
    # 3-byte sequences
    "â€"": "—",    # U+2014 em dash
    "â€¦": "…",    # U+2026 horizontal ellipsis
    "â€¹": "‹",    # U+2039 single left angle quotation
    "â€º": "›",    # U+203A single right angle quotation
    "âœ•": "✕",    # U+2715 multiplication x
    "â–¶": "▶",    # U+25B6 play
    "â†»": "↻",    # U+21BB clockwise open circle arrow
    "â†'": "→",    # U+2192 rightwards arrow
    "â"€": "─",    # U+2500 box drawing light horizontal
    # 2-byte sequences
    "Â·": "·",     # U+00B7 middle dot
    "Â©": "©",     # U+00A9 copyright
    "Â»": "»",     # U+00BB double right angle quotation
    "Â«": "«",     # U+00AB double left angle quotation
}

original = content
fixed = content
for garbled, correct in replacements.items():
    count = fixed.count(garbled)
    if count:
        print(f"  {repr(garbled)} -> {repr(correct)}  ({count}x)")
        fixed = fixed.replace(garbled, correct)

if fixed == original:
    print("No garbled characters found — file may already be clean.")
else:
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(fixed)
    print(f"\nSaved clean file ({len(original)} -> {len(fixed)} chars).")

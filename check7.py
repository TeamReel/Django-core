import re

with open('demo/src/pages/periods/MemberAssetsTab.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's extract the Legacy rendering block
leg_start = text.find('{legacyPhotoUrl && (() => {')
if leg_start != -1:
    leg_end = text.find('      })()}', leg_start) + 11
    
    # Extract Legacy block
    # Actually wait, extracting the kits.map will save more lines. And I can pass props in an object or just individual.
    kits_start = text.find('{kits.map((kit) => {')
    kits_end = text.find('                </div>\n              )}\n            </div>\n          );\n        })}', kits_start)
    if kits_end != -1:
        kits_end += len('                </div>\n              )}\n            </div>\n          );\n        })}')
        kits_block = text[kits_start:kits_end]
        print("Found kits block, length:", len(kits_block))


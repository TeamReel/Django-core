with open('demo/src/pages/periods/MemberAssetsTab.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

st = text.find('{effectiveKits.map((kit) => {')
en = text.find('        })}', st) + 11

print(text[st:st+100])
print("-----")
print(len(text[st:en]))

leg_st = text.find('{legacyPhotoUrl && (() => {')
leg_en = text.find('      })()}', leg_st) + 11
print("Legacy:", len(text[leg_st:leg_en]))


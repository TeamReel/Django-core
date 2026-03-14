import os, shutil

src = r'c:\Users\brian\Documents\django-core\documents\02-roadmap\frontend-ux-debt\phases\todo'
dst = r'c:\Users\brian\Documents\django-core\documents\02-roadmap\frontend-ux-debt\phases\done'

files = [
    'Q1-remove-old-appshell.md',
    'Q2-register-debug-cleanup.md',
    'Q3-error-page-back-nav.md',
    'Q4-dashboard-route-centralisation.md',
    'U1-auth-guards-403.md',
]

for f in files:
    s = os.path.join(src, f)
    d = os.path.join(dst, f)
    if os.path.exists(s):
        shutil.move(s, d)
        print(f'Moved: {f}')
    else:
        print(f'NOT FOUND: {s}')

print('Done dir:', os.listdir(dst))
print('Todo dir:', os.listdir(src))

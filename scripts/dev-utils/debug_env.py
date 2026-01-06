import os

for key in os.environ:
    if "DATABASE" in key or "URL" in key:
        print(key)

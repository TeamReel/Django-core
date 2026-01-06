import os

for key in os.environ:
    # Print all keys, but mask values for security except port/host
    val = os.environ[key]
    if "KEY" in key or "SECRET" in key or "PASSWORD" in key or "TOKEN" in key:
        val = "***"
    print(f"{key}={val}")

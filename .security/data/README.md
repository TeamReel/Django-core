# Breached Passwords Bloom Filter Data

This directory contains the bloom filter for fast password breach detection.

## Generation

The bloom filter is generated from the HIBP Pwned Passwords dataset using:

```bash
python .security/scripts/generate_bloom_filter.py \
    --input pwned-passwords-sha1-ordered-by-hash-v8.txt \
    --output .security/data/breached-passwords.bloom
```

## Characteristics

- **Size**: ~50MB
- **Passwords**: 600M+ breached passwords
- **False positive rate**: <0.1%
- **Lookup performance**: <5ms (99th percentile)

## Update Frequency

Recommended: Quarterly (when HIBP releases new dataset)
Critical: After major breach announcements

## Download Dataset

https://haveibeenpwned.com/Passwords

## Security Note

The bloom filter does NOT contain actual passwords, only SHA1 hashes.
The file can be safely committed to version control if desired.

However, for repository size reasons, it's recommended to:
1. Generate locally
2. Store in `.security/data/` (gitignored)
3. Document generation process in README

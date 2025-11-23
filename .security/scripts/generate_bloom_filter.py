#!/usr/bin/env python3
"""
Bloom Filter Generation Script for Password Breach Detection

Downloads HIBP Pwned Passwords dataset and generates a bloom filter for fast local checks.
This is a one-time/periodic operation, NOT run in CI/CD.

Purpose:
    Creates a ~50MB bloom filter from 600M+ breached passwords for <5ms lookup performance.
    The bloom filter provides probabilistic breach detection with <0.1% false positive rate.

Usage:
    1. Download HIBP dataset from: https://haveibeenpwned.com/Passwords
       (pwned-passwords-sha1-ordered-by-hash-v8.txt.7z)

    2. Extract the dataset (warning: 20+GB uncompressed)

    3. Generate bloom filter:
       python .security/scripts/generate_bloom_filter.py \\
           --input pwned-passwords-sha1-ordered-by-hash-v8.txt \\
           --output .security/data/breached-passwords.bloom

    4. Verify output:
       - File size should be ~50MB
       - False positive rate <0.1%
       - 600M+ passwords indexed

Dataset Format:
    HIBP format: HASH:COUNT (one per line)
    Example: 000000005AD76BD555C1D6D771DE417A4B87E4B4:10

Performance:
    - Processing time: ~15-30 minutes for 600M passwords
    - Memory: ~200MB during generation
    - Output: ~50MB bloom filter file

Update Frequency:
    Recommended: Quarterly (when HIBP releases new dataset)
    Critical: After major breach announcements

See Also:
    - HIBP API: https://haveibeenpwned.com/API/v3
    - Bloom filter: https://github.com/joseph-fox/python-bloomfilter
    - OWASP ASVS V2.1.8: Password breach detection
"""

import argparse
import sys
from pathlib import Path

from pybloom_live import BloomFilter


def main():
    """Generate bloom filter from HIBP Pwned Passwords dataset."""
    parser = argparse.ArgumentParser(
        description="Generate bloom filter from HIBP dataset",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--input",
        required=True,
        help="Path to HIBP dataset (pwned-passwords-sha1-ordered-by-hash-v8.txt)",
    )
    parser.add_argument(
        "--output",
        required=True,
        help="Output bloom filter path (.security/data/breached-passwords.bloom)",
    )
    parser.add_argument(
        "--capacity", type=int, default=600_000_000, help="Expected number of items (default: 600M)"
    )
    parser.add_argument(
        "--error-rate",
        type=float,
        default=0.001,
        help="False positive rate (default: 0.001 = 0.1%%)",
    )
    args = parser.parse_args()

    # Validate input file exists
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: Input file not found: {args.input}")
        return 1

    print(f"Creating bloom filter with capacity {args.capacity:,} and error rate {args.error_rate}")
    print(f"Expected memory: ~{(args.capacity * 10) / 1024 / 1024:.0f}MB during generation")
    print(f"Expected output size: ~{(args.capacity * 10 / 8) / 1024 / 1024:.0f}MB")

    bloom = BloomFilter(capacity=args.capacity, error_rate=args.error_rate)

    print(f"\nReading HIBP dataset from {args.input}")
    print("This will take 15-30 minutes for 600M passwords...")

    try:
        with open(args.input, "r", encoding="utf-8") as f:
            for i, line in enumerate(f):
                if i % 1_000_000 == 0 and i > 0:
                    print(f"Processed {i:,} passwords... ({i / args.capacity * 100:.1f}%)")

                # HIBP format: HASH:COUNT
                password_hash = line.split(":")[0].strip()
                if password_hash:  # Skip empty lines
                    bloom.add(password_hash)

            print(f"Processed {i+1:,} passwords total")

    except KeyboardInterrupt:
        print("\nInterrupted by user")
        return 130
    except Exception as e:
        print(f"\nError reading dataset: {e}")
        return 1

    print(f"\nWriting bloom filter to {args.output}")
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        with open(args.output, "wb") as f:
            bloom.tofile(f)
    except Exception as e:
        print(f"Error writing bloom filter: {e}")
        return 1

    file_size_mb = output_path.stat().st_size / 1024 / 1024
    print("\n✓ Done!")
    print(f"  Bloom filter size: {file_size_mb:.2f} MB")
    print(f"  Passwords indexed: {i+1:,}")
    print(f"  False positive rate: {args.error_rate * 100:.3f}%")
    print("\nTo use this bloom filter:")
    print(f"  1. Move {args.output} to project root/.security/data/")
    print("  2. Restart Django server")
    print("  3. Verify with: pytest tests/security_baseline/validators/test_breach_detector.py")

    return 0


if __name__ == "__main__":
    sys.exit(main())

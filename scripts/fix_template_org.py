#!/usr/bin/env python
"""Fix templates with NULL organisation - link to KNVB."""
import os

import psycopg2

db_url = os.environ.get("DATABASE_URL")
if not db_url:
    raise RuntimeError(
        "DATABASE_URL env var is required (e.g. postgresql://postgres:<PASSWORD>@<HOST>:<PORT>/railway)"
    )

conn = psycopg2.connect(db_url)
cur = conn.cursor()

# Get KNVB organisation id
cur.execute("SELECT id, name FROM organisations_organisation WHERE slug = 'knvb'")
knvb = cur.fetchone()
if knvb:
    print(f'KNVB found: id={knvb[0]}, name={knvb[1]}')

    # Check current state
    cur.execute('SELECT COUNT(*) FROM content_generation_contenttemplate WHERE organisation_id IS NULL')
    null_count = cur.fetchone()[0]
    print(f'Templates with NULL organisation: {null_count}')

    if null_count > 0:
        # Update all NULL organisation templates to KNVB
        cur.execute('''
            UPDATE content_generation_contenttemplate
            SET organisation_id = %s
            WHERE organisation_id IS NULL
        ''', (knvb[0],))

        print(f'Updated {cur.rowcount} templates to KNVB')
        conn.commit()
    else:
        print('No templates to update')
else:
    print('KNVB not found!')

conn.close()

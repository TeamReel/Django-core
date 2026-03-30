import psycopg2
import os

conn_string = os.environ.get('DATABASE_URL')
conn = psycopg2.connect(conn_string)
cur = conn.cursor()

membership_id = '2449d8ab-212d-48da-9671-cf2f4a24abcb'

cur.execute('''
    SELECT id, project_id, user_id, role 
    FROM projects_membership 
    WHERE id = %s
''', (membership_id,))

result = cur.fetchone()

if result:
    print(f'Found membership: {result[0]}')
    print(f'Project ID: {result[1]}')
    print(f'User ID: {result[2]}')
    print(f'Role: {result[3]}')
else:
    print('NOT FOUND')

# Also check project 93
cur.execute('''
    SELECT COUNT(*) 
    FROM projects_membership 
    WHERE project_id = 93
''')
count = cur.fetchone()[0]
print(f'\nTotal members in project 93: {count}')

cur.close()
conn.close()

-- Check table names first
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%period%'
ORDER BY table_name;

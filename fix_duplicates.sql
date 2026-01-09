-- Find and delete duplicate project memberships
-- Keep only the oldest membership for each (project_id, user_id) pair

WITH duplicates AS (
    SELECT 
        project_id, 
        user_id,
        MIN(id) as keep_id,
        COUNT(*) as duplicate_count
    FROM projects_membership
    GROUP BY project_id, user_id
    HAVING COUNT(*) > 1
)
SELECT 
    d.project_id,
    d.user_id,
    d.duplicate_count,
    d.keep_id
FROM duplicates d
ORDER BY d.duplicate_count DESC
LIMIT 20;

-- DELETE statement (uncomment after review):
-- DELETE FROM projects_membership pm
-- WHERE pm.id IN (
--     SELECT pm2.id
--     FROM projects_membership pm2
--     INNER JOIN (
--         SELECT project_id, user_id, MIN(id) as keep_id
--         FROM projects_membership
--         GROUP BY project_id, user_id
--         HAVING COUNT(*) > 1
--     ) dups ON pm2.project_id = dups.project_id 
--           AND pm2.user_id = dups.user_id
--           AND pm2.id != dups.keep_id
-- );

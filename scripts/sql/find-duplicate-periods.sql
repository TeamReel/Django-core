-- Find periods with duplicate names within the same project
-- Helps identify data cleanup opportunities

WITH period_counts AS (
    SELECT
        project_id,
        name,
        COUNT(*) as count
    FROM activities_period
    GROUP BY project_id, name
    HAVING COUNT(*) > 1
)
SELECT
    p.id,
    p.name,
    p.project_id,
    proj.name as project_name,
    proj.slug as project_slug,
    p.start_date,
    p.end_date,
    pc.count as duplicate_count,
    (SELECT COUNT(*) FROM activities_activity WHERE period_id = p.id) as activities_count
FROM activities_period p
JOIN period_counts pc ON p.project_id = pc.project_id AND p.name = pc.name
JOIN projects_project proj ON p.project_id = proj.id
ORDER BY pc.count DESC, p.project_id, p.name, p.start_date;

-- Show which periods have activities and which don't
SELECT
    p.name as period_name,
    p.project_id,
    proj.name as project_name,
    COUNT(p.id) as total_with_this_name,
    SUM(CASE WHEN (SELECT COUNT(*) FROM activities_activity WHERE period_id = p.id) > 0 THEN 1 ELSE 0 END) as with_activities,
    SUM(CASE WHEN (SELECT COUNT(*) FROM activities_activity WHERE period_id = p.id) = 0 THEN 1 ELSE 0 END) as without_activities
FROM activities_period p
JOIN projects_project proj ON p.project_id = proj.id
WHERE p.name IN (
    SELECT name
    FROM activities_period
    GROUP BY project_id, name
    HAVING COUNT(*) > 1
)
GROUP BY p.name, p.project_id, proj.name
ORDER BY total_with_this_name DESC;

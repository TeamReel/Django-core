-- Find activities that reference non-existent periods (data integrity check)
-- This identifies orphaned foreign key references

SELECT
    a.id,
    a.title,
    a.activity_type,
    a.period_id as orphaned_period_id,
    a.project_id,
    proj.name as project_name,
    a.start_time::date as activity_date
FROM activities_activity a
LEFT JOIN activities_period p ON a.period_id = p.id
LEFT JOIN projects_project proj ON a.project_id = proj.id
WHERE a.period_id IS NOT NULL
  AND p.id IS NULL
ORDER BY a.start_time DESC
LIMIT 100;

-- Count by project
SELECT
    proj.id as project_id,
    proj.name as project_name,
    COUNT(*) as orphaned_activities
FROM activities_activity a
LEFT JOIN activities_period p ON a.period_id = p.id
LEFT JOIN projects_project proj ON a.project_id = proj.id
WHERE a.period_id IS NOT NULL
  AND p.id IS NULL
GROUP BY proj.id, proj.name
ORDER BY orphaned_activities DESC;

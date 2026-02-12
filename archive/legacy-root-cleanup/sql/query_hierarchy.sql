-- Check KNVB and Ajax hierarchy
SELECT o.id, o.name, o.slug, o.parent_organisation_id, o.sport_id
FROM organisations_organisation o
WHERE o.slug IN ('knvb', 'ajax') OR o.name ILIKE '%ajax%'
ORDER BY o.id;

-- Check what org the match belongs to
SELECT
    a.id as activity_id,
    a.name as activity_name,
    p.id as project_id,
    p.name as project_name,
    o.id as org_id,
    o.name as org_name,
    o.sport_id
FROM activities_activity a
JOIN projects_project p ON a.project_id = p.id
JOIN organisations_organisation o ON p.organisation_id = o.id
WHERE a.id = (
    SELECT id FROM activities_activity
    WHERE name ILIKE '%ajax%pec%zwolle%'
    LIMIT 1
);

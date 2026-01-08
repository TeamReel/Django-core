-- Find KNVB organisation
SELECT name, id FROM organisations_organisation WHERE name ILIKE '%knvb%';

-- Count projects by organisation
SELECT
    o.name as org_name,
    COUNT(CASE WHEN p.parent_project_id IS NULL THEN 1 END) as clubs,
    COUNT(CASE WHEN p.parent_project_id IS NOT NULL THEN 1 END) as teams,
    COUNT(*) as total
FROM projects_project p
JOIN organisations_organisation o ON p.organisation_id = o.id
GROUP BY o.name
ORDER BY o.name;

-- Check for KNVB projects specifically
SELECT COUNT(*) as knvb_clubs
FROM projects_project p
JOIN organisations_organisation o ON p.organisation_id = o.id
WHERE o.name ILIKE '%knvb%' AND p.parent_project_id IS NULL;

SELECT COUNT(*) as knvb_teams
FROM projects_project p
JOIN organisations_organisation o ON p.organisation_id = o.id
WHERE o.name ILIKE '%knvb%' AND p.parent_project_id IS NOT NULL;

-- Check role distribution
SELECT r.name, COUNT(*) as count
FROM permissions_roleassignment ra
JOIN permissions_role r ON ra.role_id = r.id
GROUP BY r.name
ORDER BY count DESC;

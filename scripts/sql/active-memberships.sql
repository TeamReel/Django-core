-- Show active team memberships per organisation
-- Useful for understanding roster sizes and player distribution

SELECT
    org.name as organisation,
    proj.name as team_name,
    proj.slug as team_slug,
    period.name as season,
    COUNT(DISTINCT m.user_id) as members,
    COUNT(CASE WHEN m.role = 'player' THEN 1 END) as players,
    COUNT(CASE WHEN m.role = 'coach' THEN 1 END) as coaches,
    COUNT(CASE WHEN m.role = 'staff' THEN 1 END) as staff
FROM projects_membership m
JOIN projects_project proj ON m.project_id = proj.id
JOIN organisations_organisation org ON proj.organisation_id = org.id
LEFT JOIN activities_period period ON m.period_id = period.id
WHERE proj.parent_project_id IS NOT NULL  -- Teams only (not clubs)
GROUP BY org.name, proj.name, proj.slug, period.name, proj.id
ORDER BY org.name, proj.name, period.name;

-- Summary by organisation
SELECT
    org.name as organisation,
    COUNT(DISTINCT proj.id) as teams,
    COUNT(DISTINCT m.user_id) as unique_users,
    COUNT(*) as total_memberships,
    COUNT(CASE WHEN m.role = 'player' THEN 1 END) as player_memberships,
    COUNT(CASE WHEN m.role = 'coach' THEN 1 END) as coach_memberships
FROM projects_membership m
JOIN projects_project proj ON m.project_id = proj.id
JOIN organisations_organisation org ON proj.organisation_id = org.id
WHERE proj.parent_project_id IS NOT NULL
GROUP BY org.name
ORDER BY unique_users DESC;

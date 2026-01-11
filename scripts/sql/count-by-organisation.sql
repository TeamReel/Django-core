-- Count data volume per federation/organisation
-- Shows how many clubs, teams, periods, and activities each federation has

SELECT
    org.id,
    org.name as organisation,
    org.slug,
    -- Clubs (root projects)
    COUNT(DISTINCT CASE WHEN proj.parent_project_id IS NULL THEN proj.id END) as clubs,
    -- Teams (child projects)
    COUNT(DISTINCT CASE WHEN proj.parent_project_id IS NOT NULL THEN proj.id END) as teams,
    -- Periods
    (SELECT COUNT(*) FROM activities_period WHERE organisation_id = org.id) as periods,
    -- Activities
    (SELECT COUNT(*) FROM activities_activity a
     JOIN projects_project p ON a.project_id = p.id
     WHERE p.organisation_id = org.id) as activities,
    -- Memberships
    (SELECT COUNT(*) FROM projects_membership m
     JOIN projects_project p ON m.project_id = p.id
     WHERE p.organisation_id = org.id) as memberships,
    -- Users (distinct)
    (SELECT COUNT(DISTINCT user_id) FROM projects_membership m
     JOIN projects_project p ON m.project_id = p.id
     WHERE p.organisation_id = org.id) as unique_users
FROM organisations_organisation org
LEFT JOIN projects_project proj ON proj.organisation_id = org.id
GROUP BY org.id, org.name, org.slug
ORDER BY activities DESC;

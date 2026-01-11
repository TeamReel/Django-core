-- Check if a specific period exists with full details
-- Usage: Replace $PERIOD_ID with actual UUID
-- Example: SELECT ... WHERE p.id = '973f8b1e-b8cf-4ee9-96b4-80983c5ca0cf'

SELECT
    p.id,
    p.name,
    p.project_id,
    proj.name as project_name,
    proj.slug as project_slug,
    proj.parent_project_id,
    parent.name as club_name,
    p.organisation_id,
    org.name as organisation_name,
    p.start_date,
    p.end_date,
    p.parent_period_id,
    parent_period.name as parent_period_name,
    (SELECT COUNT(*) FROM activities_activity WHERE period_id = p.id) as activities_count
FROM activities_period p
LEFT JOIN projects_project proj ON p.project_id = proj.id
LEFT JOIN projects_project parent ON proj.parent_project_id = parent.id
LEFT JOIN organisations_organisation org ON p.organisation_id = org.id
LEFT JOIN activities_period parent_period ON p.parent_period_id = parent_period.id
WHERE p.id = $PERIOD_ID;

-- Example with psycopg2:
-- cur.execute(query.replace('$PERIOD_ID', '%s'), (period_id,))

-- Investigation query for the "mystery period" issue (2026-01-11)
-- Problem: Activities reference period that API doesn't return
-- This query helped identify orphaned activities pointing to old duplicate periods

-- 1. Check if the mystery period exists
SELECT
    p.id,
    p.name,
    p.project_id,
    proj.name as project_name,
    proj.slug as project_slug,
    proj.parent_project_id,
    parent.name as club_name,
    p.organisation_id,
    org.name as organisation_name
FROM activities_period p
LEFT JOIN projects_project proj ON p.project_id = proj.id
LEFT JOIN projects_project parent ON proj.parent_project_id = parent.id
LEFT JOIN organisations_organisation org ON p.organisation_id = org.id
WHERE p.id = '973f8b1e-b8cf-4ee9-96b4-80983c5ca0cf';

-- 2. Count activities referencing it
SELECT COUNT(*) as activities_count
FROM activities_activity
WHERE period_id = '973f8b1e-b8cf-4ee9-96b4-80983c5ca0cf';

-- 3. Show sample activities
SELECT
    id,
    title,
    activity_type,
    start_time::date as date,
    project_id
FROM activities_activity
WHERE period_id = '973f8b1e-b8cf-4ee9-96b4-80983c5ca0cf'
ORDER BY start_time
LIMIT 10;

-- 4. Find all periods with same name for this project
SELECT
    p.id,
    p.name,
    p.project_id,
    p.start_date,
    p.end_date,
    (SELECT COUNT(*) FROM activities_activity WHERE period_id = p.id) as activities_count
FROM activities_period p
WHERE p.project_id = 93  -- Ajax 1
  AND p.name = 'League'
ORDER BY p.start_date NULLS LAST;

-- 5. Recommended: Show the correct period to use (Eredivisie)
SELECT
    id,
    name,
    project_id,
    start_date,
    end_date,
    (SELECT COUNT(*) FROM activities_activity WHERE period_id = id) as current_activities
FROM activities_period
WHERE project_id = 93
  AND name = 'Eredivisie';

-- Fix query (run separately with confirmation):
-- UPDATE activities_activity
-- SET period_id = 'b0fec978-d537-4eef-8421-59fda7b6db21'  -- Eredivisie
-- WHERE period_id = '973f8b1e-b8cf-4ee9-96b4-80983c5ca0cf';  -- Old League

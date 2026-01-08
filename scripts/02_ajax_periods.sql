-- Stap 2: Create Periods for Ajax Amsterdam

-- Get IDs we need
WITH ajax_data AS (
  SELECT
    p.id as project_id,
    o.id as org_id
  FROM projects_project p
  JOIN organisations_organisation o ON p.organisation_id = o.id
  WHERE p.name = 'Ajax Amsterdam'
)

-- Insert Root Period (Season)
INSERT INTO activities_period (id, name, description, start_date, end_date, parent_period_id, organisation_id, project_id, metadata, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Season 25/26 - Ajax Amsterdam',
  'Ajax Amsterdam season 2025/2026',
  '2025-08-01'::date,
  '2026-05-31'::date,
  NULL,
  org_id,
  project_id,
  '{"type": "season", "season": "2025/2026"}'::jsonb,
  NOW(),
  NOW()
FROM ajax_data;

-- Insert League Period (Child)
WITH ajax_data AS (
  SELECT
    p.id as project_id,
    o.id as org_id,
    (SELECT id FROM activities_period WHERE name = 'Season 25/26 - Ajax Amsterdam') as root_period_id
  FROM projects_project p
  JOIN organisations_organisation o ON p.organisation_id = o.id
  WHERE p.name = 'Ajax Amsterdam'
)
INSERT INTO activities_period (id, name, description, start_date, end_date, parent_period_id, organisation_id, project_id, metadata, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'League Competition - Ajax Amsterdam',
  'Eredivisie league matches for Ajax Amsterdam',
  '2025-08-01'::date,
  '2026-05-31'::date,
  root_period_id,
  org_id,
  project_id,
  '{"type": "competition", "competition_name": "Eredivisie"}'::jsonb,
  NOW(),
  NOW()
FROM ajax_data;

-- Insert Cup Period (Child)
WITH ajax_data AS (
  SELECT
    p.id as project_id,
    o.id as org_id,
    (SELECT id FROM activities_period WHERE name = 'Season 25/26 - Ajax Amsterdam') as root_period_id
  FROM projects_project p
  JOIN organisations_organisation o ON p.organisation_id = o.id
  WHERE p.name = 'Ajax Amsterdam'
)
INSERT INTO activities_period (id, name, description, start_date, end_date, parent_period_id, organisation_id, project_id, metadata, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Cup Tournament - Ajax Amsterdam',
  'KNVB Cup matches for Ajax Amsterdam',
  '2025-09-01'::date,
  '2026-04-30'::date,
  root_period_id,
  org_id,
  project_id,
  '{"type": "competition", "competition_name": "KNVB Cup"}'::jsonb,
  NOW(),
  NOW()
FROM ajax_data;

-- Verify
SELECT 'Step 2 Complete - Periods Created' as status;
SELECT
  name,
  CASE WHEN parent_period_id IS NULL THEN 'Root' ELSE 'Child' END as type,
  metadata->>'type' as period_type,
  TO_CHAR(start_date, 'YYYY-MM-DD') as start_date,
  TO_CHAR(end_date, 'YYYY-MM-DD') as end_date
FROM activities_period
WHERE project_id = (SELECT id FROM projects_project WHERE name = 'Ajax Amsterdam')
ORDER BY parent_period_id NULLS FIRST, name;

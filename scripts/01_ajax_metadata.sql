-- Stap 1: Update Ajax metadata
UPDATE projects_project
SET metadata = '{"stadium": "Johan Cruijff Arena", "city": "Amsterdam", "founded": 1900, "colors": ["Red", "White"]}'::jsonb
WHERE name = 'Ajax Amsterdam';

-- Update Eredivisie metadata
UPDATE organisations_organisation
SET metadata = '{"federation": "KNVB", "country": "Netherlands", "level": 1, "type": "league"}'::jsonb
WHERE name = 'Eredivisie';

-- Verify
SELECT 'Step 1 Complete - Metadata Added' as status;
SELECT name, metadata FROM projects_project WHERE name = 'Ajax Amsterdam';
SELECT name, metadata FROM organisations_organisation WHERE name = 'Eredivisie';

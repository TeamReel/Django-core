-- Check if the API filter should work
-- Template has sport_id=15 (Football 11v11)
-- Competition has sport_id=15 (Football 11v11)
-- Should be exact match!

SELECT
    'Template' as source,
    t.id::text,
    t.name,
    t.sport_id,
    s.name as sport_name,
    s.parent_sport_id,
    t.template_subtype,
    t.is_active
FROM content_generation_contenttemplate t
LEFT JOIN sport_configuration_sport s ON t.sport_id = s.id
WHERE t.id = 5

UNION ALL

SELECT
    'Competition' as source,
    per.id::text,
    per.name,
    per.sport_id,
    s.name as sport_name,
    s.parent_sport_id,
    NULL,
    NULL
FROM activities_period per
LEFT JOIN sport_configuration_sport s ON per.sport_id = s.id
WHERE per.name = 'Eredivisie';

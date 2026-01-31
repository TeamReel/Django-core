-- Check template formation
SELECT
    'Template' as source,
    t.id,
    t.name,
    t.sport_id,
    t.formation_id,
    f.code as formation_code
FROM content_generation_contenttemplate t
LEFT JOIN sport_configuration_formation f ON t.formation_id = f.id
WHERE t.id = 5;

-- Check match formation
SELECT
    'Match' as source,
    a.id,
    a.title,
    a.metadata->>'formation' as formation_metadata
FROM activities_activity a
WHERE a.title ILIKE '%ajax%pec%zwolle%'
LIMIT 1;

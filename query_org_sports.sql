-- Check all organisations with their sport
SELECT o.id, o.name, o.slug, o.sport_id, s.name as sport_name, s.slug as sport_slug
FROM organisations_organisation o
LEFT JOIN sport_configuration_sport s ON o.sport_id = s.id
ORDER BY o.name;

-- Check which sport category is Football
SELECT id, name, slug, parent_sport_id
FROM sport_configuration_sport
WHERE name ILIKE '%football%'
ORDER BY id;

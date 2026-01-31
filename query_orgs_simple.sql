-- Check organisations with sport
SELECT o.id, o.name, o.slug, o.sport_id, s.name as sport_name
FROM organisations_organisation o
LEFT JOIN sport_configuration_sport s ON o.sport_id = s.id
WHERE o.name ILIKE '%ajax%' OR o.slug = 'knvb'
ORDER BY o.id;

-- Check Ajax organisation sport
SELECT o.id, o.name, o.sport_id, s.name as sport_name
FROM organisations_organisation o
LEFT JOIN sport_configuration_sport s ON o.sport_id = s.id
WHERE o.slug = 'ajax';

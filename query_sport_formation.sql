-- Check Sport and Formation details
SELECT s.id, s.name, s.slug
FROM sport_configuration_sport s
WHERE s.id = 15;

-- Check if formation exists
SELECT f.id, f.code, f.name, f.sport_config_id
FROM sport_configuration_formation f
JOIN sport_configuration_sportconfiguration sc ON f.sport_config_id = sc.id
WHERE sc.sport_id = 15 AND f.code = '4-3-3';

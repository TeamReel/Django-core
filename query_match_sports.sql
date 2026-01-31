-- Check the match and its sport sources
-- Activity -> Project -> Organisation (sport category)
-- Activity -> Period (Competition) -> sport variant

SELECT
    a.id as activity_id,
    a.title,
    -- Organisation sport (category)
    o.name as org_name,
    o.sport_id as org_sport_id,
    os.name as org_sport_name,
    os.slug as org_sport_slug,
    os.parent_sport_id as org_sport_parent,
    -- Competition sport (variant)
    per.name as competition_name,
    per.sport_id as comp_sport_id,
    cs.name as comp_sport_name,
    cs.slug as comp_sport_slug,
    cs.parent_sport_id as comp_sport_parent
FROM activities_activity a
JOIN projects_project p ON a.project_id = p.id
JOIN organisations_organisation o ON p.organisation_id = o.id
LEFT JOIN sport_configuration_sport os ON o.sport_id = os.id
LEFT JOIN activities_period per ON a.period_id = per.id
LEFT JOIN sport_configuration_sport cs ON per.sport_id = cs.id
WHERE a.title ILIKE '%ajax%pec%zwolle%'
LIMIT 5;

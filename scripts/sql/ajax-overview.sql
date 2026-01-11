-- Complete Ajax data structure overview
-- Shows: Club -> Teams -> Seasons -> Competitions -> Activities

-- 1. Ajax Projects (Club + Teams)
SELECT
    'PROJECT' as type,
    id,
    name,
    slug,
    parent_project_id,
    CASE
        WHEN parent_project_id IS NULL THEN 'CLUB'
        ELSE 'TEAM'
    END as level
FROM projects_project
WHERE organisation_id = '80941138-a06d-49a9-819c-12d05745841a'  -- KNVB
  AND (name ILIKE '%ajax%' OR slug ILIKE '%ajax%')
ORDER BY parent_project_id NULLS FIRST, id;

-- 2. Periods for Ajax Teams
SELECT
    'PERIOD' as type,
    p.id,
    p.name,
    p.project_id,
    proj.name as team_name,
    p.parent_period_id,
    CASE
        WHEN p.parent_period_id IS NULL THEN 'SEASON'
        ELSE 'COMPETITION'
    END as level,
    (SELECT COUNT(*) FROM activities_activity WHERE period_id = p.id) as activities_count
FROM activities_period p
JOIN projects_project proj ON p.project_id = proj.id
WHERE proj.organisation_id = '80941138-a06d-49a9-819c-12d05745841a'
  AND (proj.name ILIKE '%ajax%' OR proj.slug ILIKE '%ajax%')
ORDER BY p.project_id, p.parent_period_id NULLS FIRST, p.name
LIMIT 50;

-- 3. Activities for Ajax
SELECT
    'ACTIVITY' as type,
    a.id,
    a.title,
    a.activity_type,
    a.project_id,
    proj.name as team_name,
    a.period_id,
    period.name as period_name,
    a.start_time::date as activity_date
FROM activities_activity a
JOIN projects_project proj ON a.project_id = proj.id
LEFT JOIN activities_period period ON a.period_id = period.id
WHERE proj.organisation_id = '80941138-a06d-49a9-819c-12d05745841a'
  AND (proj.name ILIKE '%ajax%' OR proj.slug ILIKE '%ajax%')
ORDER BY a.start_time DESC
LIMIT 20;

-- 4. Summary counts
SELECT
    'SUMMARY' as section,
    COUNT(DISTINCT CASE WHEN parent_project_id IS NULL THEN id END) as clubs,
    COUNT(DISTINCT CASE WHEN parent_project_id IS NOT NULL THEN id END) as teams,
    (SELECT COUNT(*) FROM activities_period p
     JOIN projects_project proj ON p.project_id = proj.id
     WHERE proj.organisation_id = '80941138-a06d-49a9-819c-12d05745841a'
       AND (proj.name ILIKE '%ajax%' OR proj.slug ILIKE '%ajax%')) as periods,
    (SELECT COUNT(*) FROM activities_activity a
     JOIN projects_project proj ON a.project_id = proj.id
     WHERE proj.organisation_id = '80941138-a06d-49a9-819c-12d05745841a'
       AND (proj.name ILIKE '%ajax%' OR proj.slug ILIKE '%ajax%')) as activities
FROM projects_project
WHERE organisation_id = '80941138-a06d-49a9-819c-12d05745841a'
  AND (name ILIKE '%ajax%' OR slug ILIKE '%ajax%');

-- Query ContentTemplate table
SELECT
    id,
    name,
    template_type,
    template_subtype,
    sport_id,
    formation_id,
    style_variant,
    is_active,
    ai_workflow_id
FROM content_generation_contenttemplate
ORDER BY id;

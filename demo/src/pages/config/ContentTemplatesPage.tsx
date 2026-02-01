import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, Button, Badge, Input, Alert } from '@django-core/design-system';
import { PageHeader, PageContent } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';
import { getApiBaseUrl } from '../../utils/apiBase';
import { Table } from '../../shims/design-system';

function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

// Template type hierarchy for sidebar navigation
const TEMPLATE_CATEGORIES = [
  {
    id: 'all',
    label: 'All Templates',
    icon: '📋',
    types: null, // Show all
  },
  {
    id: 'season',
    label: 'Season',
    icon: '📅',
    types: ['season'],
    subtypes: ['transformation', 'season_recap'],
  },
  {
    id: 'pre_match',
    label: 'Pre-Match',
    icon: '🎬',
    types: ['pre_match'],
    subtypes: ['flyer', 'lineup', 'walkon', 'anthem'],
  },
  {
    id: 'during_match',
    label: 'During Match',
    icon: '⚽',
    types: ['during_match'],
    subtypes: ['goal', 'score_update'],
  },
  {
    id: 'post_match',
    label: 'Post-Match',
    icon: '🏆',
    types: ['post_match'],
    subtypes: ['end_score', 'match_summary', 'highlights'],
  },
  {
    id: 'member',
    label: 'Member',
    icon: '👤',
    types: ['member'],
    subtypes: ['member_intro', 'member_closeup', 'member_celebration', 'member_in_tenue', 'member_legacy_closeup', 'member_legacy_in_tenue'],
  },
  {
    id: 'custom',
    label: 'Custom',
    icon: '🎨',
    types: ['custom'],
    subtypes: ['custom_logo', 'custom_tenue', 'custom_tenue_logo', 'custom_tenue_logo_sponsor'],
  },
];

const SUBTYPE_LABELS: Record<string, string> = {
  // Pre-Match
  flyer: 'Match Flyer',
  lineup: 'Lineup Announcement',
  walkon: 'Walk-on Video',
  anthem: 'Anthem Video',
  // During-Match
  goal: 'Goal Celebration',
  score_update: 'Score Update',
  end_score: 'Final Score',
  // Post-Match
  match_summary: 'Match Summary',
  highlights: 'Highlights Reel',
  // Season
  transformation: 'Then vs Now',
  season_recap: 'Season Recap',
  // Member
  member_intro: 'Short Intro',
  member_closeup: 'Closeup Video',
  member_celebration: 'Personal Celebration',
  member_in_tenue: 'In Tenue',
  member_legacy_closeup: 'Legacy Closeup',
  member_legacy_in_tenue: 'Legacy In Tenue',
  // Custom
  custom_logo: 'Logo',
  custom_tenue: 'Tenue',
  custom_tenue_logo: 'Tenue + Logo',
  custom_tenue_logo_sponsor: 'Tenue + Logo + Sponsor',
};

const TYPE_LABELS: Record<string, string> = {
  pre_match: 'Pre-Match',
  during_match: 'During Match',
  post_match: 'Post-Match',
  season: 'Season',
  member: 'Member',
  custom: 'Custom',
};

interface InputRequirements {
  players?: {
    source?: string;
    formation?: string;
    count?: number;
    use_formation?: boolean;
    min_count?: number;
    max_count?: number;
    positions?: Array<{
      slot: number;
      position: string;
      functional_role: string;
      label: string;
    }>;
    member_fields?: string[];
    required_assets?: Array<{
      type: string;
      label: string;
      description: string;
    }>;
  };
  staff?: {
    source?: string;
    members?: Array<{
      role: string;
      functional_role: string;
      label: string;
      required: boolean;
    }>;
    member_fields?: string[];
    required_assets?: Array<{
      type: string;
      label: string;
      description: string;
    }>;
  } | Array<{
    role: string;
    required: boolean;
    count: number;
  }>;
  assets?: Array<{
    type: string;
    required: boolean;
  }>;
  organisation_assets?: {
    source?: string;
    required?: Array<{
      type: string;
      label: string;
      description: string;
    }>;
    optional?: Array<{
      type: string;
      label: string;
      description: string;
    }>;
  };
  match_data?: {
    source?: string;
    required?: string[];
    optional?: string[];
  };
  output?: {
    type: string;
    format: string;
    dimensions?: {
      width: number;
      height: number;
      aspect_ratio: string;
    };
    duration_seconds?: number;
    fps?: number;
  };
}

interface FormationDetail {
  id: number;
  code: string;
  name: string;
}

interface SportDetail {
  id: number;
  name: string;
  slug: string;
}

interface ContentTemplate {
  id: number;
  name: string;
  description: string | null;
  template_type: string;
  template_subtype: string | null;
  sport_type: string | null;
  sport: number | null;
  sport_detail: SportDetail | null;
  formation: number | null;
  formation_detail: FormationDetail | null;
  style_variant: string | null;
  input_requirements: InputRequirements;
  ai_workflow_id: string;
  template_settings: Record<string, any>;
  is_active: boolean;
  credits_required: number;
  organisation: number | null;  // NULL = global template
  project: number | null;
  created_at: string;
  updated_at: string;
}

interface Sport {
  id: number;
  name: string;
  slug: string;
  is_category: boolean;
  is_variant: boolean;
  parent_sport_id: number | null;
  category_name: string | null;
}

interface Formation {
  id: number;
  code: string;
  name: string;
  sport_config: number;
  sport_name: string;
  sport_id: number;
}

export default function ContentTemplatesPage() {
  const apiBaseUrl = getApiBaseUrl();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get selected category from URL query param
  const selectedCategory = searchParams.get('tab') || 'all';
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedFormation, setSelectedFormation] = useState<string>('all');
  const [selectedStyle, setSelectedStyle] = useState<string>('all');

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContentTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  // Modal tab state
  const [modalTab, setModalTab] = useState<'basic' | 'requirements'>('basic');

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    template_type: 'pre_match',
    template_subtype: '',
    sport: null as number | null,
    sport_category: null as number | null,
    formation_code: '',  // Free text field for formation code like "4-3-3"
    style_variant: '',
    ai_workflow_id: '',
    is_active: true,
    credits_required: 1,
    input_requirements: {} as Record<string, any>,
  });

  // Update form when editing template changes
  useEffect(() => {
    if (editingTemplate) {
      // Find sport category from sport
      const currentSport = sports.find(s => s.id === editingTemplate.sport);
      const categoryId = currentSport?.parent_sport_id || (currentSport?.is_category ? currentSport.id : null);

      setEditForm({
        name: editingTemplate.name,
        description: editingTemplate.description || '',
        template_type: editingTemplate.template_type,
        template_subtype: editingTemplate.template_subtype || '',
        sport: editingTemplate.sport,
        sport_category: categoryId,
        formation_code: editingTemplate.formation_detail?.code || '',
        style_variant: editingTemplate.style_variant || '',
        ai_workflow_id: editingTemplate.ai_workflow_id,
        is_active: editingTemplate.is_active,
        credits_required: editingTemplate.credits_required ?? 1,
        input_requirements: editingTemplate.input_requirements || {},
      });
      setModalTab('basic');
    } else {
      setEditForm({
        name: '',
        description: '',
        template_type: 'pre_match',
        template_subtype: '',
        sport: null,
        sport_category: null,
        formation_code: '',
        style_variant: '',
        ai_workflow_id: '',
        is_active: true,
        credits_required: 1,
        input_requirements: {},
      });
      setModalTab('basic');
    }
  }, [editingTemplate]);

  // Load templates, sports and formations (global templates, no organisation filter)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [templatesRes, sportsRes, formationsRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/content-generation/templates/`, {
            credentials: 'include',
          }),
          fetch(`${apiBaseUrl}/api/v1/sports/`, {
            credentials: 'include',
          }),
          fetch(`${apiBaseUrl}/api/v1/formations/`, {
            credentials: 'include',
          }),
        ]);

        if (templatesRes.ok) {
          const response = await templatesRes.json();
          // Handle API wrapper format: {status, data: {data: []}} or {results: []} or []
          let templateList: ContentTemplate[] = [];
          if (Array.isArray(response)) {
            templateList = response;
          } else if (response.data?.data && Array.isArray(response.data.data)) {
            // API wrapper format: {status: "success", data: {data: [...]}}
            templateList = response.data.data;
          } else if (response.results && Array.isArray(response.results)) {
            // DRF pagination format: {results: [...]}
            templateList = response.results;
          }
          setTemplates(templateList);
        } else {
          console.error('Templates fetch failed:', templatesRes.status, await templatesRes.text());
          setTemplates([]);
        }

        if (sportsRes.ok) {
          const response = await sportsRes.json();
          // Handle API wrapper format
          let sportList: Sport[] = [];
          if (Array.isArray(response)) {
            sportList = response;
          } else if (response.data?.data && Array.isArray(response.data.data)) {
            sportList = response.data.data;
          } else if (response.results && Array.isArray(response.results)) {
            sportList = response.results;
          }
          setSports(sportList);
        }

        if (formationsRes.ok) {
          const response = await formationsRes.json();
          let formationList: Formation[] = [];
          if (Array.isArray(response)) {
            formationList = response;
          } else if (response.data?.data && Array.isArray(response.data.data)) {
            formationList = response.data.data;
          } else if (response.results && Array.isArray(response.results)) {
            formationList = response.results;
          }
          setFormations(formationList);
        }
      } catch (e) {
        console.error('Failed to fetch data:', e);
        setError('Failed to load templates');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiBaseUrl]);

  // Group sports by category (parent) and variants (children)
  const sportCategories = useMemo(() => {
    const categories = sports.filter(s => s.is_category);
    const variants = sports.filter(s => s.is_variant);
    return { categories, variants };
  }, [sports]);

  // Get variants for a specific sport category
  const getVariantsForCategory = (categoryId: number | null) => {
    if (!categoryId) return [];
    return sportCategories.variants.filter(v => v.parent_sport_id === categoryId);
  };

  // Get subtypes for selected template type (cascading filter)
  const getSubtypesForType = (templateType: string): { value: string; label: string }[] => {
    const category = TEMPLATE_CATEGORIES.find(c => c.types?.includes(templateType));
    if (!category?.subtypes) return [];
    return category.subtypes.map(st => ({
      value: st,
      label: SUBTYPE_LABELS[st] || st,
    }));
  };

  // Get formations for selected sport (sport_id from Formation matches Sport id)
  const formationsForSelectedSport = useMemo(() => {
    if (!editForm.sport) return formations;
    return formations.filter(f => f.sport_id === editForm.sport);
  }, [formations, editForm.sport]);

  // Get unique formations and styles from templates for filter dropdowns
  const availableFormations = useMemo(() => {
    const formationMap = new Map<string, { code: string; name: string }>();
    templates.forEach(t => {
      if (t.formation_detail) {
        formationMap.set(t.formation_detail.code, t.formation_detail);
      }
    });
    return Array.from(formationMap.values());
  }, [templates]);

  const availableStyles = useMemo(() => {
    const styles = new Set<string>();
    templates.forEach(t => {
      if (t.style_variant) {
        styles.add(t.style_variant);
      }
    });
    return Array.from(styles);
  }, [templates]);

  // Filter templates based on selected category and search
  const filteredTemplates = useMemo(() => {
    let result = templates;

    // Filter by category
    const category = TEMPLATE_CATEGORIES.find(c => c.id === selectedCategory);
    if (category?.types) {
      result = result.filter(t => category.types!.includes(t.template_type));
    }

    // Filter by formation
    if (selectedFormation !== 'all') {
      result = result.filter(t => t.formation_detail?.code === selectedFormation);
    }

    // Filter by style variant
    if (selectedStyle !== 'all') {
      result = result.filter(t => t.style_variant === selectedStyle);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.template_subtype?.toLowerCase().includes(query)
      );
    }

    // Filter inactive
    if (!showInactive) {
      result = result.filter(t => t.is_active);
    }

    return result;
  }, [templates, selectedCategory, selectedFormation, selectedStyle, searchQuery, showInactive]);

  // Group templates by subtype for the detail panel
  const groupedBySubtype = useMemo(() => {
    const groups: Record<string, ContentTemplate[]> = {};
    filteredTemplates.forEach(t => {
      const key = t.template_subtype || 'other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [filteredTemplates]);

  const handleToggleActive = async (template: ContentTemplate) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/content-generation/templates/${template.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({ is_active: !template.is_active }),
      });

      if (res.ok) {
        setTemplates(prev => prev.map(t =>
          t.id === template.id ? { ...t, is_active: !t.is_active } : t
        ));
      }
    } catch (e) {
      console.error('Failed to toggle template:', e);
    }
  };

  const handleDelete = async (template: ContentTemplate) => {
    if (!window.confirm(`Are you sure you want to delete "${template.name}"?`)) return;

    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/content-generation/templates/${template.id}/`, {
        method: 'DELETE',
        headers: {
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
      });

      if (res.ok) {
        setTemplates(prev => prev.filter(t => t.id !== template.id));
      }
    } catch (e) {
      console.error('Failed to delete template:', e);
    }
  };

  // Save template (create or update)
  const handleSaveTemplate = async () => {
    setSaving(true);
    try {
      const isEditing = !!editingTemplate;
      const url = isEditing
        ? `${apiBaseUrl}/api/v1/content-generation/templates/${editingTemplate.id}/`
        : `${apiBaseUrl}/api/v1/content-generation/templates/`;

      // Find formation ID by code if provided
      let formationId: number | null = null;
      if (editForm.formation_code) {
        const matchingFormation = formationsForSelectedSport.find(
          f => f.code.toLowerCase() === editForm.formation_code.toLowerCase()
        );
        formationId = matchingFormation?.id || null;
      }

      const res = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description || null,
          template_type: editForm.template_type,
          template_subtype: editForm.template_subtype || null,
          sport: editForm.sport,
          formation: formationId,
          style_variant: editForm.style_variant || null,
          ai_workflow_id: editForm.ai_workflow_id || null,
          is_active: editForm.is_active,
          credits_required: editForm.credits_required,
          input_requirements: editForm.input_requirements,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Handle nested response format
        const saved = data?.data?.data || data?.data || data;

        if (isEditing) {
          setTemplates(prev => prev.map(t => t.id === saved.id ? saved : t));
        } else {
          setTemplates(prev => [...prev, saved]);
        }

        setIsCreateModalOpen(false);
        setEditingTemplate(null);
      } else {
        const errorData = await res.json();
        console.error('Failed to save template:', errorData);
        alert(`Failed to save: ${JSON.stringify(errorData)}`);
      }
    } catch (e) {
      console.error('Failed to save template:', e);
      alert('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  // Get current category label for title
  const currentCategory = TEMPLATE_CATEGORIES.find(c => c.id === selectedCategory);
  const pageTitle = currentCategory?.id === 'all' ? 'All Templates' : `${currentCategory?.label || 'Templates'} Templates`;

  return (
    <AppShell>
      <PageHeader
        title={pageTitle}
        subtitle="Manage AI content generation templates"
        actions={
          <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
            + New Template
          </Button>
        }
      />

      <PageContent>
        <Card>
          {/* Search & Filters */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Formation Filter */}
            {availableFormations.length > 0 && (
              <select
                value={selectedFormation}
                onChange={(e) => setSelectedFormation(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-bg)',
                  color: 'var(--app-text)',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Formations</option>
                {availableFormations.map(f => (
                  <option key={f.code} value={f.code}>{f.code} - {f.name}</option>
                ))}
              </select>
            )}

            {/* Style Variant Filter */}
            {availableStyles.length > 0 && (
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-bg)',
                  color: 'var(--app-text)',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Styles</option>
                {availableStyles.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Show inactive
            </label>
          </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--app-text-muted)' }}>
                  Loading templates...
                </div>
              ) : error ? (
                <Alert variant="error">{error}</Alert>
              ) : filteredTemplates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--app-text-muted)' }}>
                  No templates found
                  {selectedCategory !== 'all' && (
                    <div style={{ marginTop: '8px' }}>
                      <Button variant="secondary" size="sm" onClick={() => navigate('/content-templates?tab=all')}>
                        Show all templates
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <th style={{ width: '18%' }}>Name</th>
                      <th style={{ width: '10%' }}>Type</th>
                      <th style={{ width: '10%' }}>Subtype</th>
                      <th style={{ width: '10%' }}>Sport</th>
                      <th style={{ width: '8%' }}>Variant</th>
                      <th style={{ width: '8%' }}>Formation</th>
                      <th style={{ width: '6%' }}>Style</th>
                      <th style={{ width: '6%' }}>Credits</th>
                      <th style={{ width: '6%' }}>Status</th>
                      <th style={{ width: '18%', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTemplates.map(template => {
                      // Parse sport name into base sport and variant
                      const sportName = template.sport_detail?.name || '';
                      const sportParts = sportName.match(/^(\w+)\s+(.+)$/);
                      const baseSport = sportParts ? sportParts[1] : sportName;
                      const sportVariant = sportParts ? sportParts[2] : '';

                      return (
                      <tr key={template.id}>
                        <td>
                          <div>
                            <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {template.name}
                              {template.organisation === null && (
                                <Badge variant="warning" style={{ fontSize: '10px', padding: '2px 6px' }}>Global</Badge>
                              )}
                            </div>
                            {template.description && (
                              <div style={{ fontSize: '12px', color: 'var(--app-text-muted)', marginTop: '2px' }}>
                                {template.description.substring(0, 40)}
                                {template.description.length > 40 && '...'}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <Badge variant="info">
                            {TYPE_LABELS[template.template_type] || template.template_type}
                          </Badge>
                        </td>
                        <td>
                          {template.template_subtype ? (
                            <Badge variant="default">
                              {SUBTYPE_LABELS[template.template_subtype] || template.template_subtype}
                            </Badge>
                          ) : (
                            <span style={{ color: 'var(--app-text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>
                          {baseSport ? (
                            <span>⚽ {baseSport}</span>
                          ) : (
                            <span style={{ color: 'var(--app-text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>
                          {sportVariant ? (
                            <Badge variant="default">{sportVariant}</Badge>
                          ) : (
                            <span style={{ color: 'var(--app-text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>
                          {template.formation_detail ? (
                            <Badge variant="info">{template.formation_detail.code}</Badge>
                          ) : (
                            <span style={{ color: 'var(--app-text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>
                          {template.style_variant ? (
                            <Badge variant="success">{template.style_variant}</Badge>
                          ) : (
                            <span style={{ color: 'var(--app-text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontWeight: 500 }}>{template.credits_required ?? 1}</span>
                        </td>
                        <td>
                          <Badge variant={template.is_active ? 'success' : 'default'}>
                            {template.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setEditingTemplate(template)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleToggleActive(template)}
                            >
                              {template.is_active ? 'Disable' : 'Enable'}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleDelete(template)}
                              style={{ color: 'var(--app-error)' }}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );})}
                  </tbody>
                </Table>
              )}
            </Card>

            {/* Stats Card */}
            <Card style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', gap: '32px' }}>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 600 }}>{templates.length}</div>
                  <div style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>Total Templates</div>
                </div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 600 }}>{templates.filter(t => t.is_active).length}</div>
                  <div style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>Active</div>
                </div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 600 }}>{new Set(templates.map(t => t.template_type)).size}</div>
                  <div style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>Categories</div>
                </div>
              </div>
            </Card>
      </PageContent>

      {/* Create/Edit Modal */}
      {(isCreateModalOpen || editingTemplate) && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => {
            setIsCreateModalOpen(false);
            setEditingTemplate(null);
          }}
        >
          <Card
            style={{ width: '700px', maxHeight: '90vh', overflow: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: '16px' }}>
              {editingTemplate ? 'Edit Template' : 'Create Template'}
            </h2>

            {/* Modal Tabs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid var(--app-border)' }}>
              <button
                onClick={() => setModalTab('basic')}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  background: modalTab === 'basic' ? 'var(--app-primary)' : 'transparent',
                  color: modalTab === 'basic' ? 'white' : 'var(--app-text)',
                  borderRadius: '6px 6px 0 0',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                📝 Basic Info
              </button>
              <button
                onClick={() => setModalTab('requirements')}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  background: modalTab === 'requirements' ? 'var(--app-primary)' : 'transparent',
                  color: modalTab === 'requirements' ? 'white' : 'var(--app-text)',
                  borderRadius: '6px 6px 0 0',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                📋 Input Requirements
              </button>
            </div>

            {/* Basic Info Tab */}
            {modalTab === 'basic' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Name */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                    Name *
                  </label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="e.g., Lineup 4-3-3 - Modern"
                  />
                </div>

                {/* Description */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                    Description
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Template description..."
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--app-border)',
                      backgroundColor: 'var(--app-bg)',
                      color: 'var(--app-text)',
                      fontSize: '14px',
                      resize: 'vertical',
                    }}
                  />
                </div>

                {/* Template Type & Subtype - cascading */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                      Type *
                    </label>
                    <select
                      value={editForm.template_type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        const availableSubtypes = getSubtypesForType(newType);
                        // Reset subtype if not available in new type
                        const subtypeStillValid = availableSubtypes.some(st => st.value === editForm.template_subtype);
                        setEditForm({
                          ...editForm,
                          template_type: newType,
                          template_subtype: subtypeStillValid ? editForm.template_subtype : '',
                        });
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--app-border)',
                        backgroundColor: 'var(--app-bg)',
                        color: 'var(--app-text)',
                        fontSize: '14px',
                      }}
                    >
                      <option value="pre_match">Pre Match</option>
                      <option value="during_match">During Match</option>
                      <option value="post_match">Post Match</option>
                      <option value="season">Season</option>
                      <option value="member">Member</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                      Subtype
                    </label>
                    <select
                      value={editForm.template_subtype}
                      onChange={(e) => setEditForm({ ...editForm, template_subtype: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--app-border)',
                        backgroundColor: 'var(--app-bg)',
                        color: 'var(--app-text)',
                        fontSize: '14px',
                      }}
                    >
                      <option value="">-- None --</option>
                      {getSubtypesForType(editForm.template_type).map(st => (
                        <option key={st.value} value={st.value}>{st.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sport Category & Variant - cascading */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                      Sport Category
                    </label>
                    <select
                      value={editForm.sport_category || ''}
                      onChange={(e) => {
                        const categoryId = e.target.value ? Number(e.target.value) : null;
                        // When category changes, show variants but don't auto-select
                        setEditForm({
                          ...editForm,
                          sport_category: categoryId,
                          sport: null, // Reset variant
                          formation_code: '', // Reset formation
                        });
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--app-border)',
                        backgroundColor: 'var(--app-bg)',
                        color: 'var(--app-text)',
                        fontSize: '14px',
                      }}
                    >
                      <option value="">-- Select Sport --</option>
                      {sportCategories.categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                      Sport Variant
                    </label>
                    <select
                      value={editForm.sport || ''}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        sport: e.target.value ? Number(e.target.value) : null,
                        formation_code: '', // Reset formation when sport changes
                      })}
                      disabled={!editForm.sport_category}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--app-border)',
                        backgroundColor: !editForm.sport_category ? 'var(--app-bg-muted)' : 'var(--app-bg)',
                        color: 'var(--app-text)',
                        fontSize: '14px',
                        opacity: !editForm.sport_category ? 0.6 : 1,
                      }}
                    >
                      <option value="">-- Select Variant --</option>
                      {getVariantsForCategory(editForm.sport_category).map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Formation & Style - formation is now free text */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                      Formation Code
                    </label>
                    <Input
                      value={editForm.formation_code}
                      onChange={(e) => setEditForm({ ...editForm, formation_code: e.target.value })}
                      placeholder="e.g., 4-3-3, 4-4-2, 3-5-2"
                    />
                    {editForm.formation_code && formationsForSelectedSport.length > 0 && (
                      <div style={{ fontSize: '12px', color: 'var(--app-text-muted)', marginTop: '4px' }}>
                        {formationsForSelectedSport.some(f => f.code.toLowerCase() === editForm.formation_code.toLowerCase())
                          ? '✓ Matches existing formation'
                          : '⚠ New formation code (will be created)'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                      Style Variant
                    </label>
                    <Input
                      value={editForm.style_variant}
                      onChange={(e) => setEditForm({ ...editForm, style_variant: e.target.value })}
                      placeholder="e.g., Modern, Classic, Bold"
                    />
                  </div>
                </div>

                {/* AI Workflow ID */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                    AI Workflow ID
                  </label>
                  <Input
                    value={editForm.ai_workflow_id}
                    onChange={(e) => setEditForm({ ...editForm, ai_workflow_id: e.target.value })}
                    placeholder="e.g., wf_lineup_433_modern"
                  />
                </div>

                {/* Active Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={editForm.is_active}
                    onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="is_active" style={{ fontWeight: 500 }}>Active</label>
                </div>

                {/* Credits Required */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                    Credits Required
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={editForm.credits_required}
                    onChange={(e) => setEditForm({ ...editForm, credits_required: Math.max(1, parseInt(e.target.value) || 1) })}
                    placeholder="1"
                    style={{ width: '100px' }}
                  />
                  <p style={{ fontSize: '12px', color: 'var(--app-text-muted)', marginTop: '4px' }}>
                    Number of credits consumed per generation
                  </p>
                </div>
              </div>
            )}

            {/* Input Requirements Tab */}
            {modalTab === 'requirements' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ color: 'var(--app-text-muted)', margin: 0 }}>
                  Define what inputs are required for this template to generate content.
                </p>

                {/* Members Required Section */}
                <div style={{ border: '1px solid var(--app-border)', borderRadius: '8px', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 16px 0', fontWeight: 600, fontSize: '15px' }}>
                    👥 Members Required
                  </h4>

                  {/* Functional Roles Grid */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Keeper */}
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 80px 1fr', gap: '12px', alignItems: 'start' }}>
                      <label style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', paddingTop: '6px' }}>
                        🧤 Goalkeeper
                      </label>
                      <select
                        value={editForm.input_requirements?.members?.goalkeeper?.count ?? 0}
                        onChange={(e) => {
                          const newReqs = { ...editForm.input_requirements };
                          if (!newReqs.members) newReqs.members = {};
                          const count = parseInt(e.target.value);
                          if (count === 0) {
                            delete newReqs.members.goalkeeper;
                          } else {
                            newReqs.members.goalkeeper = {
                              ...newReqs.members.goalkeeper,
                              count,
                              asset_types: newReqs.members.goalkeeper?.asset_types || ['in_tenue'],
                            };
                          }
                          setEditForm({ ...editForm, input_requirements: newReqs });
                        }}
                        style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--app-border)', backgroundColor: 'var(--app-bg)', color: 'var(--app-text)' }}
                      >
                        {[0,1,2,3].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {['profile_photo', 'in_tenue', 'full_body', 'close_up', 'short_intro', 'celebration', 'legacy'].map(assetType => {
                          const isChecked = editForm.input_requirements?.members?.goalkeeper?.asset_types?.includes(assetType) ?? false;
                          const isDisabled = !editForm.input_requirements?.members?.goalkeeper?.count;
                          return (
                            <label
                              key={assetType}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: `1px solid ${isChecked ? 'var(--app-primary, #3b82f6)' : 'var(--app-border)'}`,
                                backgroundColor: isChecked ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                opacity: isDisabled ? 0.5 : 1,
                                fontSize: '13px',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isDisabled}
                                onChange={(e) => {
                                  const newReqs = { ...editForm.input_requirements };
                                  if (newReqs.members?.goalkeeper) {
                                    const currentTypes = newReqs.members.goalkeeper.asset_types || [];
                                    if (e.target.checked) {
                                      newReqs.members.goalkeeper.asset_types = [...currentTypes, assetType];
                                    } else {
                                      newReqs.members.goalkeeper.asset_types = currentTypes.filter((t: string) => t !== assetType);
                                    }
                                    setEditForm({ ...editForm, input_requirements: newReqs });
                                  }
                                }}
                                style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                              />
                              {assetType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Players */}
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 80px 1fr', gap: '12px', alignItems: 'start' }}>
                      <label style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', paddingTop: '6px' }}>
                        ⚽ Players
                      </label>
                      <select
                        value={editForm.input_requirements?.members?.player?.count ?? 0}
                        onChange={(e) => {
                          const newReqs = { ...editForm.input_requirements };
                          if (!newReqs.members) newReqs.members = {};
                          const count = parseInt(e.target.value);
                          if (count === 0) {
                            delete newReqs.members.player;
                          } else {
                            newReqs.members.player = {
                              ...newReqs.members.player,
                              count,
                              asset_types: newReqs.members.player?.asset_types || ['in_tenue'],
                            };
                          }
                          setEditForm({ ...editForm, input_requirements: newReqs });
                        }}
                        style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--app-border)', backgroundColor: 'var(--app-bg)', color: 'var(--app-text)' }}
                      >
                        {[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {['profile_photo', 'in_tenue', 'full_body', 'close_up', 'short_intro', 'celebration', 'legacy'].map(assetType => {
                          const isChecked = editForm.input_requirements?.members?.player?.asset_types?.includes(assetType) ?? false;
                          const isDisabled = !editForm.input_requirements?.members?.player?.count;
                          return (
                            <label
                              key={assetType}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: `1px solid ${isChecked ? 'var(--app-primary, #3b82f6)' : 'var(--app-border)'}`,
                                backgroundColor: isChecked ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                opacity: isDisabled ? 0.5 : 1,
                                fontSize: '13px',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isDisabled}
                                onChange={(e) => {
                                  const newReqs = { ...editForm.input_requirements };
                                  if (newReqs.members?.player) {
                                    const currentTypes = newReqs.members.player.asset_types || [];
                                    if (e.target.checked) {
                                      newReqs.members.player.asset_types = [...currentTypes, assetType];
                                    } else {
                                      newReqs.members.player.asset_types = currentTypes.filter((t: string) => t !== assetType);
                                    }
                                    setEditForm({ ...editForm, input_requirements: newReqs });
                                  }
                                }}
                                style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                              />
                              {assetType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Coach */}
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 80px 1fr', gap: '12px', alignItems: 'start' }}>
                      <label style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', paddingTop: '6px' }}>
                        👔 Coach
                      </label>
                      <select
                        value={editForm.input_requirements?.members?.coach?.count ?? 0}
                        onChange={(e) => {
                          const newReqs = { ...editForm.input_requirements };
                          if (!newReqs.members) newReqs.members = {};
                          const count = parseInt(e.target.value);
                          if (count === 0) {
                            delete newReqs.members.coach;
                          } else {
                            newReqs.members.coach = {
                              ...newReqs.members.coach,
                              count,
                              asset_types: newReqs.members.coach?.asset_types || ['profile_photo'],
                            };
                          }
                          setEditForm({ ...editForm, input_requirements: newReqs });
                        }}
                        style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--app-border)', backgroundColor: 'var(--app-bg)', color: 'var(--app-text)' }}
                      >
                        {[0,1,2,3].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {['profile_photo', 'in_tenue', 'full_body', 'close_up', 'short_intro', 'celebration', 'legacy'].map(assetType => {
                          const isChecked = editForm.input_requirements?.members?.coach?.asset_types?.includes(assetType) ?? false;
                          const isDisabled = !editForm.input_requirements?.members?.coach?.count;
                          return (
                            <label
                              key={assetType}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: `1px solid ${isChecked ? 'var(--app-primary, #3b82f6)' : 'var(--app-border)'}`,
                                backgroundColor: isChecked ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                opacity: isDisabled ? 0.5 : 1,
                                fontSize: '13px',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isDisabled}
                                onChange={(e) => {
                                  const newReqs = { ...editForm.input_requirements };
                                  if (newReqs.members?.coach) {
                                    const currentTypes = newReqs.members.coach.asset_types || [];
                                    if (e.target.checked) {
                                      newReqs.members.coach.asset_types = [...currentTypes, assetType];
                                    } else {
                                      newReqs.members.coach.asset_types = currentTypes.filter((t: string) => t !== assetType);
                                    }
                                    setEditForm({ ...editForm, input_requirements: newReqs });
                                  }
                                }}
                                style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                              />
                              {assetType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Assistant */}
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 80px 1fr', gap: '12px', alignItems: 'start' }}>
                      <label style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', paddingTop: '6px' }}>
                        📋 Assistant
                      </label>
                      <select
                        value={editForm.input_requirements?.members?.assistant?.count ?? 0}
                        onChange={(e) => {
                          const newReqs = { ...editForm.input_requirements };
                          if (!newReqs.members) newReqs.members = {};
                          const count = parseInt(e.target.value);
                          if (count === 0) {
                            delete newReqs.members.assistant;
                          } else {
                            newReqs.members.assistant = {
                              ...newReqs.members.assistant,
                              count,
                              asset_types: newReqs.members.assistant?.asset_types || ['profile_photo'],
                            };
                          }
                          setEditForm({ ...editForm, input_requirements: newReqs });
                        }}
                        style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--app-border)', backgroundColor: 'var(--app-bg)', color: 'var(--app-text)' }}
                      >
                        {[0,1,2,3].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {['profile_photo', 'in_tenue', 'full_body', 'close_up', 'short_intro', 'celebration', 'legacy'].map(assetType => {
                          const isChecked = editForm.input_requirements?.members?.assistant?.asset_types?.includes(assetType) ?? false;
                          const isDisabled = !editForm.input_requirements?.members?.assistant?.count;
                          return (
                            <label
                              key={assetType}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: `1px solid ${isChecked ? 'var(--app-primary, #3b82f6)' : 'var(--app-border)'}`,
                                backgroundColor: isChecked ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                opacity: isDisabled ? 0.5 : 1,
                                fontSize: '13px',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isDisabled}
                                onChange={(e) => {
                                  const newReqs = { ...editForm.input_requirements };
                                  if (newReqs.members?.assistant) {
                                    const currentTypes = newReqs.members.assistant.asset_types || [];
                                    if (e.target.checked) {
                                      newReqs.members.assistant.asset_types = [...currentTypes, assetType];
                                    } else {
                                      newReqs.members.assistant.asset_types = currentTypes.filter((t: string) => t !== assetType);
                                    }
                                    setEditForm({ ...editForm, input_requirements: newReqs });
                                  }
                                }}
                                style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                              />
                              {assetType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Use Formation Positions checkbox */}
                  <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--app-border)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editForm.input_requirements?.members?.use_formation ?? false}
                        onChange={(e) => {
                          const newReqs = { ...editForm.input_requirements };
                          if (!newReqs.members) newReqs.members = {};
                          newReqs.members.use_formation = e.target.checked;
                          setEditForm({ ...editForm, input_requirements: newReqs });
                        }}
                        style={{ width: '16px', height: '16px' }}
                      />
                      <span style={{ fontSize: '13px' }}>Use formation positions for players</span>
                    </label>
                  </div>
                </div>

                {/* Match Data Section */}
                <div style={{ border: '1px solid var(--app-border)', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <input
                      type="checkbox"
                      id="req_match"
                      checked={!!editForm.input_requirements?.match_data}
                      onChange={(e) => {
                        const newReqs = { ...editForm.input_requirements };
                        if (e.target.checked) {
                          newReqs.match_data = { required: ['opponent', 'date', 'time', 'venue'] };
                        } else {
                          delete newReqs.match_data;
                        }
                        setEditForm({ ...editForm, input_requirements: newReqs });
                      }}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <label htmlFor="req_match" style={{ fontWeight: 600, fontSize: '15px' }}>
                      ⚽ Match Data Required
                    </label>
                  </div>
                  {editForm.input_requirements?.match_data && (
                    <div style={{ marginLeft: '26px', color: 'var(--app-text-muted)', fontSize: '13px' }}>
                      Opponent, date, time, venue information
                    </div>
                  )}
                </div>

                {/* Organisation Assets Section */}
                <div style={{ border: '1px solid var(--app-border)', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <input
                      type="checkbox"
                      id="req_org_assets"
                      checked={!!editForm.input_requirements?.organisation_assets}
                      onChange={(e) => {
                        const newReqs = { ...editForm.input_requirements };
                        if (e.target.checked) {
                          newReqs.organisation_assets = {
                            required: [{ type: 'logo', label: 'Club Logo' }],
                          };
                        } else {
                          delete newReqs.organisation_assets;
                        }
                        setEditForm({ ...editForm, input_requirements: newReqs });
                      }}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <label htmlFor="req_org_assets" style={{ fontWeight: 600, fontSize: '15px' }}>
                      🏢 Organisation Assets Required
                    </label>
                  </div>
                  {editForm.input_requirements?.organisation_assets && (
                    <div style={{ marginLeft: '26px', color: 'var(--app-text-muted)', fontSize: '13px' }}>
                      Club logo and branding assets
                    </div>
                  )}
                </div>

                {/* Output Settings */}
                <div style={{ border: '1px solid var(--app-border)', borderRadius: '8px', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontWeight: 600, fontSize: '15px' }}>
                    📤 Output Format
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>Type</label>
                      <select
                        value={editForm.input_requirements?.output?.type || 'image'}
                        onChange={(e) => {
                          const newReqs = { ...editForm.input_requirements };
                          newReqs.output = { ...newReqs.output, type: e.target.value, format: e.target.value === 'image' ? 'png' : 'mp4' };
                          setEditForm({ ...editForm, input_requirements: newReqs });
                        }}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          borderRadius: '4px',
                          border: '1px solid var(--app-border)',
                          backgroundColor: 'var(--app-bg)',
                          color: 'var(--app-text)',
                        }}
                      >
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>Aspect Ratio</label>
                      <select
                        value={editForm.input_requirements?.output?.dimensions?.aspect_ratio || '9:16'}
                        onChange={(e) => {
                          const newReqs = { ...editForm.input_requirements };
                          const ratio = e.target.value;
                          let width = 1080, height = 1920;
                          if (ratio === '1:1') { width = 1080; height = 1080; }
                          else if (ratio === '16:9') { width = 1920; height = 1080; }
                          else if (ratio === '4:5') { width = 1080; height = 1350; }
                          newReqs.output = {
                            ...newReqs.output,
                            dimensions: { width, height, aspect_ratio: ratio },
                          };
                          setEditForm({ ...editForm, input_requirements: newReqs });
                        }}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          borderRadius: '4px',
                          border: '1px solid var(--app-border)',
                          backgroundColor: 'var(--app-bg)',
                          color: 'var(--app-text)',
                        }}
                      >
                        <option value="9:16">9:16 (Story/Reels)</option>
                        <option value="1:1">1:1 (Square)</option>
                        <option value="16:9">16:9 (Landscape)</option>
                        <option value="4:5">4:5 (Portrait)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingTemplate(null);
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveTemplate}
                disabled={saving || !editForm.name}
              >
                {saving ? 'Saving...' : (editingTemplate ? 'Save Changes' : 'Create Template')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

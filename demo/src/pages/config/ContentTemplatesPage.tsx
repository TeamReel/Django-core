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
    subtypes: ['goal', 'score_update', 'end_score'],
  },
  {
    id: 'post_match',
    label: 'Post-Match',
    icon: '🏆',
    types: ['post_match'],
    subtypes: ['match_summary', 'highlights'],
  },
  {
    id: 'member',
    label: 'Member',
    icon: '👤',
    types: ['member'],
    subtypes: ['member_intro', 'member_closeup', 'member_celebration'],
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
}

export default function ContentTemplatesPage() {
  const apiBaseUrl = getApiBaseUrl();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get selected category from URL query param
  const selectedCategory = searchParams.get('tab') || 'all';
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContentTemplate | null>(null);

  // Load templates and sports (global templates, no organisation filter)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [templatesRes, sportsRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/content-generation/templates/`, {
            credentials: 'include',
          }),
          fetch(`${apiBaseUrl}/api/v1/sports/`, {
            credentials: 'include',
          }),
        ]);

        if (templatesRes.ok) {
          const data = await templatesRes.json();
          // Handle both paginated ({results: []}) and non-paginated ([]) responses
          const templateList = Array.isArray(data) ? data : (data.results || []);
          setTemplates(templateList);
        } else {
          console.error('Templates fetch failed:', templatesRes.status, await templatesRes.text());
          setTemplates([]);
        }

        if (sportsRes.ok) {
          const data = await sportsRes.json();
          const sportList = Array.isArray(data) ? data : (data.results || []);
          setSports(sportList);
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

  // Filter templates based on selected category and search
  const filteredTemplates = useMemo(() => {
    let result = templates;

    // Filter by category
    const category = TEMPLATE_CATEGORIES.find(c => c.id === selectedCategory);
    if (category?.types) {
      result = result.filter(t => category.types!.includes(t.template_type));
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
  }, [templates, selectedCategory, searchQuery, showInactive]);

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
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
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
                      <th style={{ width: '25%' }}>Name</th>
                      <th style={{ width: '12%' }}>Type</th>
                      <th style={{ width: '12%' }}>Subtype</th>
                      <th style={{ width: '10%' }}>Formation</th>
                      <th style={{ width: '18%' }}>Requirements</th>
                      <th style={{ width: '8%' }}>Status</th>
                      <th style={{ width: '15%', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTemplates.map(template => (
                      <tr key={template.id}>
                        <td>
                          <div>
                            <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {template.name}
                              {template.organisation === null && (
                                <Badge variant="warning" style={{ fontSize: '10px', padding: '2px 6px' }}>Global</Badge>
                              )}
                            </div>
                            {template.sport_detail && (
                              <div style={{ fontSize: '12px', color: 'var(--app-text-muted)', marginTop: '2px' }}>
                                ⚽ {template.sport_detail.name}
                              </div>
                            )}
                            {template.style_variant && (
                              <div style={{ fontSize: '12px', color: 'var(--app-primary)', marginTop: '2px' }}>
                                Style: {template.style_variant}
                              </div>
                            )}
                            {template.description && (
                              <div style={{ fontSize: '12px', color: 'var(--app-text-muted)', marginTop: '2px' }}>
                                {template.description.substring(0, 50)}
                                {template.description.length > 50 && '...'}
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
                          {template.template_subtype && (
                            <Badge variant="default">
                              {SUBTYPE_LABELS[template.template_subtype] || template.template_subtype}
                            </Badge>
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
                          <div style={{ fontSize: '12px' }}>
                            {template.input_requirements?.players && (
                              <div>
                                👥 {template.input_requirements.players.count ||
                                    template.input_requirements.players.positions?.length ||
                                    template.input_requirements.players.min_count || '?'} players
                                {template.input_requirements.players.required_assets && (
                                  <span style={{ color: 'var(--app-text-muted)' }}> ({template.input_requirements.players.required_assets.length} assets/player)</span>
                                )}
                              </div>
                            )}
                            {template.input_requirements?.staff && (
                              <div>
                                🎯 {Array.isArray(template.input_requirements.staff)
                                  ? template.input_requirements.staff.filter((s: any) => s.required).map((s: any) => s.role).join(', ') || 'staff'
                                  : template.input_requirements.staff.members?.filter(m => m.required).map(m => m.label).join(', ') || 'staff'}
                              </div>
                            )}
                            {template.input_requirements?.assets && template.input_requirements.assets.filter(a => a.required).length > 0 && (
                              <div>📁 {template.input_requirements.assets.filter(a => a.required).length} assets</div>
                            )}
                            {template.input_requirements?.organisation_assets && (
                              <div>🏢 {(template.input_requirements.organisation_assets.required?.length || 0) + (template.input_requirements.organisation_assets.optional?.length || 0)} org assets</div>
                            )}
                            {template.input_requirements?.output && (
                              <div>🎬 {template.input_requirements.output.dimensions?.aspect_ratio || ''} {template.input_requirements.output.duration_seconds ? `${template.input_requirements.output.duration_seconds}s` : ''}</div>
                            )}
                            {(!template.input_requirements || Object.keys(template.input_requirements).length === 0) && (
                              <span style={{ color: 'var(--app-text-muted)' }}>—</span>
                            )}
                          </div>
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
                    ))}
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

      {/* TODO: Create/Edit Modal */}
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
            style={{ width: '500px', maxHeight: '80vh', overflow: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: '16px' }}>
              {editingTemplate ? 'Edit Template' : 'Create Template'}
            </h2>
            <p style={{ color: 'var(--app-text-muted)', marginBottom: '16px' }}>
              Template editor coming soon. For now, use the Django admin.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingTemplate(null);
                }}
              >
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  window.open('/admin/content_generation/contenttemplate/', '_blank');
                }}
              >
                Open Django Admin
              </Button>
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

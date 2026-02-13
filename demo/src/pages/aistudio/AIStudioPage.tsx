/**
 * AI Studio Page — Content Generation Hub
 *
 * Four sections:
 * 1. Content Library — browse generated content (flyers, lineups, etc.)
 * 2. Template Browser — browse available generation templates (asset + content)
 * 3. Recent Generations — history of past generations
 * 4. Quick Actions — links to generate content on entity detail pages
 *
 * Uses the same generation APIs as detail page modals:
 *   - /api/v1/generative/assets/templates/
 *   - /api/v1/generative/assets/history/
 *   - /api/v1/content-generation/templates/
 *   - /api/v1/media/items/ (for content library)
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Card, Badge, Alert, Stack, Text } from '@django-core/design-system';
import { useContextSwitcher } from '@django-core/context-switcher';
import {
  useGenerationHistory,
  getTemplateCategoryLabel,
  type TemplateCategory,
  type ContentTemplate,
  type AssetTemplate,
  type GenerationHistoryItem,
} from '../../hooks/useGenerationHistory';
import { ContentLibraryView, type ContentLibraryViewProps } from '../content/ContentLibraryPage';

type Tab = 'library' | 'templates' | 'history' | 'actions';

export default function AIStudioPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { context } = useContextSwitcher();
  const orgId = (context as any)?.organisation?.id as string | undefined;

  const { assetTemplates, contentTemplates, history, loading, error, fetchTemplates, fetchHistory } = useGenerationHistory();

  // Read tab from URL
  const params = new URLSearchParams(location.search);
  const activeTab: Tab = (params.get('tab') as Tab) || 'library';
  const [templateFilter, setTemplateFilter] = useState<TemplateCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const setActiveTab = (tab: Tab) => {
    navigate(`/studio?tab=${tab}`, { replace: true });
    setSearchQuery('');
  };

  useEffect(() => {
    fetchTemplates(orgId);
    fetchHistory();
  }, [orgId, fetchTemplates, fetchHistory]);

  // Merge and categorize all templates
  const allTemplates = useMemo(() => {
    const items: Array<{ source: 'asset' | 'content'; id: string; name: string; description?: string; category: TemplateCategory; credits: number; isActive: boolean }> = [];

    assetTemplates.forEach(t => {
      items.push({
        source: 'asset',
        id: t.id,
        name: t.name,
        description: t.description,
        category: 'asset',
        credits: t.credits_required || 0,
        isActive: t.is_active !== false,
      });
    });

    contentTemplates.forEach(t => {
      items.push({
        source: 'content',
        id: String(t.id),
        name: t.name,
        description: t.description,
        category: (t.template_type as TemplateCategory) || 'custom',
        credits: t.credits_required || 0,
        isActive: t.is_active,
      });
    });

    return items;
  }, [assetTemplates, contentTemplates]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let result = allTemplates;
    if (templateFilter !== 'all') {
      result = result.filter(t => t.category === templateFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allTemplates, templateFilter, searchQuery]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allTemplates.length };
    allTemplates.forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return counts;
  }, [allTemplates]);

  const iconForCategory = (cat: string): string => {
    const icons: Record<string, string> = {
      asset: '🖼️', pre_match: '📋', during_match: '⚡', post_match: '📊',
      season: '📅', member: '👤', custom: '✨',
    };
    return icons[cat] || '📄';
  };

  const quickActions = [
    { label: 'Generate Match Content', description: 'Go to a match to generate pre/during/post-match content', path: '/directory?tab=matches', icon: '⚽' },
    { label: 'Generate Member Photos', description: 'Go to a member to generate profile photos and portraits', path: '/directory?tab=members', icon: '👤' },
    { label: 'Process Video Queue', description: 'View and manage video generation jobs', path: '/studio/videos', icon: '🎬' },
    { label: 'Manage Templates', description: 'Create and edit content generation templates', path: '/content-templates', icon: '📝' },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--app-bg)' }}>
      {/* Header */}
      <div style={{ padding: '24px', borderBottom: '1px solid var(--app-border)', backgroundColor: 'var(--app-surface)' }}>
        <Stack direction="column" gap="1">
          <Text size="xl" weight="bold">AI Studio</Text>
          <Text size="md" color="secondary">
            {activeTab === 'library'
              ? 'Browse and manage your generated content.'
              : 'Browse templates, review generation history, and generate content.'}
          </Text>
        </Stack>
      </div>

      {/* Tab Bar */}
      <div style={{
        padding: '12px 24px',
        borderBottom: '1px solid var(--app-border)',
        backgroundColor: 'var(--app-surface-2, #f9fafb)',
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
      }}>
        {(['library', 'templates', 'history', 'actions'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === tab ? 'var(--color-primary, #3b82f6)' : 'transparent',
              color: activeTab === tab ? '#fff' : 'var(--app-text)',
              fontSize: '14px',
              fontWeight: activeTab === tab ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {tab === 'library' ? '📚 Library' :
             tab === 'templates' ? '📋 Templates' :
             tab === 'history' ? '📜 History' : '⚡ Quick Actions'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        <Stack direction="column" gap="4">

          {error && <Alert variant="error">{error}</Alert>}

          {/* LIBRARY TAB */}
          {activeTab === 'library' && (
            <>
              {/* Embedded Content Library - has its own content-type filter chips */}
              <ContentLibraryView embedded={true} />
            </>
          )}

          {/* TEMPLATES TAB */}
          {activeTab === 'templates' && (
            <>
              {/* Search + filter */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search templates..."
                  style={{
                    flex: 1, minWidth: '200px', padding: '8px 12px', borderRadius: '6px',
                    border: '1px solid var(--app-border)', backgroundColor: 'var(--app-surface)', fontSize: '13px',
                  }}
                />
              </div>

              {/* Category chips */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(['all', 'asset', 'pre_match', 'during_match', 'post_match', 'season', 'member', 'custom'] as TemplateCategory[])
                  .filter(cat => (categoryCounts[cat] || 0) > 0 || cat === 'all')
                  .map(cat => (
                    <button
                      key={cat}
                      onClick={() => setTemplateFilter(cat)}
                      style={{
                        padding: '6px 12px', borderRadius: '16px', border: '1px solid var(--app-border)',
                        fontSize: '12px', cursor: 'pointer', fontWeight: 500,
                        backgroundColor: templateFilter === cat ? 'var(--color-primary, #3b82f6)' : 'var(--app-surface)',
                        color: templateFilter === cat ? '#fff' : 'inherit',
                      }}
                    >
                      {getTemplateCategoryLabel(cat)} ({categoryCounts[cat] || 0})
                    </button>
                  ))}
              </div>

              {/* Template grid */}
              {loading ? (
                <div style={{ textAlign: 'center', padding: '48px' }}>
                  <Text color="secondary">Loading templates...</Text>
                </div>
              ) : filteredTemplates.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {filteredTemplates.map(template => (
                    <Card key={`${template.source}-${template.id}`} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: '28px' }}>{iconForCategory(template.category)}</div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <Badge size="sm" variant="primary">{getTemplateCategoryLabel(template.category)}</Badge>
                          {template.credits > 0 && (
                            <Badge size="sm" variant="default">{template.credits} credits</Badge>
                          )}
                        </div>
                      </div>
                      <Text weight="bold" size="md">{template.name}</Text>
                      {template.description && (
                        <Text size="sm" color="secondary" style={{ flex: 1 }}>
                          {template.description.length > 100 ? template.description.slice(0, 100) + '...' : template.description}
                        </Text>
                      )}
                      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                        <Badge size="sm" variant={template.isActive ? 'default' : 'default'}>
                          {template.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge size="sm" variant="default">
                          {template.source === 'asset' ? 'Asset Pipeline' : 'Content Pipeline'}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card style={{ textAlign: 'center', padding: '48px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.4 }}>📄</div>
                  <Text color="secondary">No templates found.</Text>
                  <Text size="sm" color="secondary" style={{ marginTop: '4px' }}>
                    {allTemplates.length > 0 ? 'Try adjusting your search or filter.' : 'Create templates in Settings > Templates.'}
                  </Text>
                  <Button variant="secondary" onClick={() => navigate('/content-templates')} style={{ marginTop: '12px' }}>
                    Manage Templates
                  </Button>
                </Card>
              )}
            </>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '48px' }}>
                  <Text color="secondary">Loading history...</Text>
                </div>
              ) : history.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {history.map((item: GenerationHistoryItem) => (
                    <Card key={item.id} style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <Text weight="bold" size="sm">{item.template_name || `Template ${item.template_id}`}</Text>
                          <Text size="xs" color="secondary">
                            {item.created_at ? new Date(item.created_at).toLocaleString() : 'Unknown date'}
                            {item.variant_count && ` • ${item.variant_count} variant(s)`}
                          </Text>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {item.status && (
                            <Badge size="sm" variant={item.status === 'completed' ? 'primary' : 'default'}>
                              {item.status}
                            </Badge>
                          )}
                          {item.output_type && (
                            <Badge size="sm" variant="default">{item.output_type}</Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card style={{ textAlign: 'center', padding: '48px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.4 }}>📜</div>
                  <Text color="secondary">No generation history yet.</Text>
                  <Text size="sm" color="secondary" style={{ marginTop: '4px' }}>
                    Generate content from match, member, or season detail pages to see it here.
                  </Text>
                </Card>
              )}
            </>
          )}

          {/* QUICK ACTIONS TAB */}
          {activeTab === 'actions' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
              {quickActions.map(action => (
                <Card
                  key={action.path}
                  style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px' }}
                  onClick={() => navigate(action.path)}
                >
                  <div style={{ fontSize: '32px' }}>{action.icon}</div>
                  <Text weight="bold" size="md">{action.label}</Text>
                  <Text size="sm" color="secondary">{action.description}</Text>
                  <Button variant="secondary" size="sm" style={{ alignSelf: 'flex-start', marginTop: 'auto' }}>
                    Go
                  </Button>
                </Card>
              ))}
            </div>
          )}

        </Stack>
      </div>
    </div>
  );
}

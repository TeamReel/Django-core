/**
 * WorkflowTemplatesPage — Admin page for viewing workflow template definitions.
 * Shows available templates with their states and transitions in a visual way.
 *
 * Route: /workflow-templates
 * Sidebar: SETTINGS section (staff only)
 */
import { useState } from 'react';
import { PageContent, PageHeader } from '@django-core/page-templates';
import { useWorkflowTemplates, type WorkflowTemplate, getStateDisplay, getActionDisplay } from '../../hooks/useWorkflows';
import { WorkflowStatusBadge } from '../../components/Workflows/WorkflowStatusBadge';

export default function WorkflowTemplatesPage() {
  const { templates, loading, error } = useWorkflowTemplates();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <>
      <PageHeader
        title="Workflow Templates"
        subtitle="Manage approval workflow definitions — states, transitions, and permissions."
      />

      <PageContent>
        {error && (
          <div style={{ padding: '10px 14px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--app-text-secondary, #6b7280)', fontSize: 13 }}>
            Loading templates...
          </div>
        )}

        {!loading && templates.length === 0 && (
          <div
            style={{
              padding: 48,
              textAlign: 'center',
              color: 'var(--app-text-secondary, #9ca3af)',
              backgroundColor: 'var(--app-surface-2, #f9fafb)',
              borderRadius: 12,
              border: '1px dashed var(--app-border, #e5e7eb)',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No workflow templates</div>
            <div style={{ fontSize: 12 }}>Create workflow templates via the API to define approval flows.</div>
          </div>
        )}

        {!loading && templates.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {templates.map(template => {
              const isExpanded = expandedId === template.id;
              const states = template.definition?.states || [];
              const transitions = template.definition?.transitions || [];

              return (
                <div
                  key={template.id}
                  style={{
                    backgroundColor: 'var(--app-surface, #fff)',
                    borderRadius: 10,
                    border: '1px solid var(--app-border, #e5e7eb)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Header — clickable to expand */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : template.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 16,
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--app-text, #111)' }}>
                          {template.name}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: '#6b7280',
                            backgroundColor: '#f3f4f6',
                            borderRadius: 4,
                            padding: '2px 6px',
                          }}
                        >
                          v{template.version}
                        </span>
                        {template.is_active && (
                          <span style={{ fontSize: 10, fontWeight: 600, color: '#059669', backgroundColor: '#d1fae5', borderRadius: 4, padding: '2px 6px' }}>
                            Active
                          </span>
                        )}
                      </div>
                      {template.description && (
                        <div style={{ fontSize: 12, color: 'var(--app-text-secondary, #9ca3af)', marginTop: 2 }}>
                          {template.description}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>
                        {states.length} states · {transitions.length} transitions
                      </span>
                      <span style={{ fontSize: 16, color: '#9ca3af', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>▾</span>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: '0 16px 16px',
                        borderTop: '1px solid var(--app-border, #e5e7eb)',
                      }}
                    >
                      {/* States */}
                      <div style={{ marginTop: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--app-text-secondary, #6b7280)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          States
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {states.map(state => (
                            <div key={state.name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <WorkflowStatusBadge state={state.name} size="sm" />
                              {state.is_initial && (
                                <span style={{ fontSize: 9, color: '#6b7280' }}>(initial)</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Transitions */}
                      <div style={{ marginTop: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--app-text-secondary, #6b7280)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Transitions
                        </div>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: 8,
                          }}
                        >
                          {transitions.map((t, idx) => {
                            const actionStyle = getActionDisplay(t.action);
                            const fromStyle = getStateDisplay(t.from_state);
                            const toStyle = getStateDisplay(t.to_state);

                            return (
                              <div
                                key={idx}
                                style={{
                                  padding: 10,
                                  backgroundColor: 'var(--app-surface-2, #f9fafb)',
                                  borderRadius: 6,
                                  fontSize: 12,
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                  <span
                                    style={{
                                      fontWeight: 600,
                                      color: actionStyle.bgColor,
                                      fontSize: 11,
                                    }}
                                  >
                                    {actionStyle.icon} {t.action.replace(/_/g, ' ').toUpperCase()}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    backgroundColor: fromStyle.bgColor,
                                    color: fromStyle.color,
                                    fontSize: 10,
                                    fontWeight: 600,
                                  }}>
                                    {t.from_state}
                                  </span>
                                  <span style={{ color: '#9ca3af' }}>→</span>
                                  <span style={{
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    backgroundColor: toStyle.bgColor,
                                    color: toStyle.color,
                                    fontSize: 10,
                                    fontWeight: 600,
                                  }}>
                                    {t.to_state}
                                  </span>
                                </div>
                                {t.required_permission && (
                                  <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>
                                    🔒 Requires: {t.required_permission}
                                  </div>
                                )}
                                {t.validators && t.validators.length > 0 && (
                                  <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                                    ✓ Validators: {t.validators.join(', ')}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Metadata */}
                      <div style={{ marginTop: 12, fontSize: 11, color: '#9ca3af' }}>
                        Created {new Date(template.created_at).toLocaleDateString()} · Last updated {new Date(template.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </PageContent>
    </>
  );
}

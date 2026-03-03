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
          <div className="rounded-8 fs-13 mb-16" style={{ padding: '10px 14px', backgroundColor: '#fee2e2', color: '#dc2626' }}>
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center text-secondary fs-13" style={{ padding: 40 }}>
            Loading templates...
          </div>
        )}

        {!loading && templates.length === 0 && (
          <div
            className="text-center text-secondary bg-surface-2 rounded-12"
            style={{ padding: 48, border: '1px dashed var(--app-border, #e5e7eb)' }}
          >
            <div className="mb-8" style={{ fontSize: 32 }}>📋</div>
                        <div className="fw-600 mb-4 fs-15">No workflow templates</div>
            <div className="fs-12">Create workflow templates via the API to define approval flows.</div>
          </div>
        )}

        {!loading && templates.length > 0 && (
          <div className="flex-col gap-12">
            {templates.map(template => {
              const isExpanded = expandedId === template.id;
              const states = template.definition?.states || [];
              const transitions = template.definition?.transitions || [];

              return (
                <div
                  key={template.id}
                  className="bg-surface border rounded-10 overflow-hidden"
                >
                  {/* Header — clickable to expand */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : template.id)}
                    className="w-full flex-between p-16 bg-transparent border-none cursor-pointer text-left"
                  >
                    <div>
                        <div className="flex-row gap-8">
                        <span className="fw-600 fs-15" style={{ color: 'var(--app-text, #111)' }}>
                          {template.name}
                        </span>
                        <span className="fs-11 fw-600 text-muted rounded-4" style={{
                            backgroundColor: '#f3f4f6',
                            padding: '2px 6px',
                          }}
                        >
                          v{template.version}
                        </span>
                        {template.is_active && (
                          <span className="fs-11 fw-600 rounded-4" style={{ color: '#059669', backgroundColor: '#d1fae5', padding: '2px 6px' }}>
                            Active
                          </span>
                        )}
                      </div>
                      {template.description && (
                        <div className="fs-12 text-secondary mt-4">
                          {template.description}
                        </div>
                      )}
                    </div>
                    <div className="flex-row gap-12">
                      <span className="fs-11 text-muted">
                        {states.length} states · {transitions.length} transitions
                      </span>
                      <span className="fs-16 text-muted transition" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}>▾</span>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div
                      className="border-top pt-0 px-16 pb-16"
                    >
                      {/* States */}
                      <div className="mt-16">
                        <div className="fs-12 fw-600 text-secondary mb-8 uppercase tracking-wide">
                          States
                        </div>
                        <div className="flex-row gap-8 flex-wrap">
                          {states.map(state => (
                            <div key={state.name} className="flex-row gap-4">
                              <WorkflowStatusBadge state={state.name} size="sm" />
                              {state.is_initial && (
                                <span className="fs-11 text-muted">(initial)</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Transitions */}
                      <div className="mt-16">
                        <div className="fs-12 fw-600 text-secondary mb-8 uppercase tracking-wide">
                          Transitions
                        </div>
                        <div
                          className="grid gap-8"
                          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
                        >
                          {transitions.map((t, idx) => {
                            const actionStyle = getActionDisplay(t.action);
                            const fromStyle = getStateDisplay(t.from_state);
                            const toStyle = getStateDisplay(t.to_state);

                            return (
                              <div
                                key={idx}
                                className="p-10 bg-surface-2 rounded-6 fs-12"
                              >
                                <div className="flex-row gap-6 mb-6">
                                  <span
                                    className="fw-600 fs-11"
                                    style={{
                                      color: actionStyle.bgColor,
                                    }}
                                  >
                                    {actionStyle.icon} {t.action.replace(/_/g, ' ').toUpperCase()}
                                  </span>
                                </div>
                                <div className="flex-row gap-6">
                                  <span className="rounded-4 fw-600" style={{
                                    padding: '1px 6px',
                                    backgroundColor: fromStyle.bgColor,
                                    color: fromStyle.color,
                                    fontSize: 10,
                                  }}>
                                    {t.from_state}
                                  </span>
                                  <span className="text-muted">→</span>
                                  <span className="rounded-4 fw-600" style={{
                                    padding: '1px 6px',
                                    backgroundColor: toStyle.bgColor,
                                    color: toStyle.color,
                                    fontSize: 10,
                                  }}>
                                    {t.to_state}
                                  </span>
                                </div>
                                {t.required_permission && (
                                  <div className="mt-4 fs-11 text-muted">
                                    🔒 Requires: {t.required_permission}
                                  </div>
                                )}
                                {t.validators && t.validators.length > 0 && (
                                  <div className="fs-11 mt-4 text-muted">
                                    ✓ Validators: {t.validators.join(', ')}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="mt-12 fs-11 text-muted">
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

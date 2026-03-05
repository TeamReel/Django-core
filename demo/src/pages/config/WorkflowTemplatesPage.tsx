/**
 * WorkflowTemplatesPage — Admin page for viewing workflow template definitions.
 * Shows available templates with their states and transitions in a visual way.
 *
 * Route: /workflow-templates
 * Sidebar: SETTINGS section (staff only)
 */
import { useState, type CSSProperties } from 'react';
import { PageContent, PageHeader } from '@django-core/page-templates';
import SlotIcon from '../../components/SlotIcon';
import styles from './WorkflowTemplatesPage.module.css';
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
          <div className={`rounded-8 fs-13 mb-16 ${styles.errorBanner}`}>
            {error}
          </div>
        )}

        {loading && (
          <div className={`text-center text-secondary fs-13 ${styles.loadingText}`}>
            Loading templates...
          </div>
        )}

        {!loading && templates.length === 0 && (
          <div
            className={`text-center text-secondary bg-surface-2 rounded-12 ${styles.emptyState}`}
          >
            <div className={`mb-8 ${styles.emptyStateIcon}`}>📋</div>
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
                        <span className={`fw-600 fs-15 ${styles.templateName}`}>
                          {template.name}
                        </span>
                        <span className={`fs-11 fw-600 text-muted rounded-4 ${styles.versionBadge}`}>
                          v{template.version}
                        </span>
                        {template.is_active && (
                          <span className={`fs-11 fw-600 rounded-4 ${styles.activeBadge}`}>
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
                      <span className={`fs-16 text-muted transition ${styles.chevron}`} data-expanded={isExpanded || undefined}>▾</span>
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
                          className={`grid gap-8 ${styles.transitionsGrid}`}
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
                                    className={`fw-600 fs-11 ${styles.actionLabel}`}
                                    style={{ '--action-color': actionStyle.bgColor } as CSSProperties}
                                  >
                                    <SlotIcon name={actionStyle.icon} size={12} /> {t.action.replace(/_/g, ' ').toUpperCase()}
                                  </span>
                                </div>
                                <div className="flex-row gap-6">
                                  <span className={`rounded-4 fw-600 ${styles.stateBadge}`} style={{ '--state-bg': fromStyle.bgColor, '--state-color': fromStyle.color } as CSSProperties}>
                                    {t.from_state}
                                  </span>
                                  <span className="text-muted">→</span>
                                  <span className={`rounded-4 fw-600 ${styles.stateBadge}`} style={{ '--state-bg': toStyle.bgColor, '--state-color': toStyle.color } as CSSProperties}>
                                    {t.to_state}
                                  </span>
                                </div>
                                {t.required_permission && (
                                  <div className="mt-4 fs-11 text-muted">
                                    <SlotIcon name="lock" size={11} /> Requires: {t.required_permission}
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

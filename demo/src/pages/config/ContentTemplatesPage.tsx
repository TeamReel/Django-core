import React from 'react';
import { Card, Button, Badge, Input, Alert } from '@django-core/design-system';
import { PageHeader, PageContent } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';
import { Table } from '../../shims/design-system';
import { TYPE_LABELS, SUBTYPE_LABELS, TEMPLATE_CATEGORIES } from './contentTemplatesData';
import { useContentTemplatesData } from './useContentTemplatesData';
import { ContentTemplateModal } from './ContentTemplateModal';

export default function ContentTemplatesPage() {
  const {
    templates, filteredTemplates,
    loading, error,

    selectedCategory, searchQuery, setSearchQuery,
    showInactive, setShowInactive,
    selectedFormation, setSelectedFormation,
    selectedStyle, setSelectedStyle,
    selectedSport, setSelectedSport,
    selectedSubtype, setSelectedSubtype,
    selectedType, setSelectedType,

    availableFormations, availableStyles, availableSports, availableTypes, availableSubtypes,

    isCreateModalOpen, setIsCreateModalOpen,
    editingTemplate, setEditingTemplate,
    saving, modalTab, setModalTab,
    editForm, setEditForm,

    sportCategories, formationsForSelectedSport,
    getVariantsForCategory, getSubtypesForType,

    handleToggleActive, handleDelete, handleSaveTemplate,

    pageTitle, navigate,
  } = useContentTemplatesData();

  const filterSelectStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--app-border)',
    backgroundColor: 'var(--app-bg)',
    color: 'var(--app-text)',
    fontSize: '14px',
    cursor: 'pointer',
  };

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
          <div className="flex-row gap-12 flex-wrap mb-16">
            <div className="flex-1" style={{ minWidth: '200px' }}>
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {availableTypes.length > 0 && (
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setSelectedSubtype('all');
                }}
                style={filterSelectStyle}
              >
                <option value="all">All Types</option>
                {availableTypes.map(t => (
                  <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>
                ))}
              </select>
            )}

            {availableSports.length > 0 && (
              <select
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value)}
                style={filterSelectStyle}
              >
                <option value="all">All Sports</option>
                {availableSports.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}

            {availableSubtypes.length > 0 && (
              <select
                value={selectedSubtype}
                onChange={(e) => setSelectedSubtype(e.target.value)}
                style={filterSelectStyle}
              >
                <option value="all">All Subtypes</option>
                {availableSubtypes.map(st => (
                  <option key={st} value={st}>{SUBTYPE_LABELS[st] || st}</option>
                ))}
              </select>
            )}

            {availableFormations.length > 0 && (
              <select
                value={selectedFormation}
                onChange={(e) => setSelectedFormation(e.target.value)}
                style={filterSelectStyle}
              >
                <option value="all">All Formations</option>
                {availableFormations.map(f => (
                  <option key={f.code} value={f.code}>{f.code} - {f.name}</option>
                ))}
              </select>
            )}

            {availableStyles.length > 0 && (
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                style={filterSelectStyle}
              >
                <option value="all">All Styles</option>
                {availableStyles.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}

            <label className="flex-row gap-8 fs-14">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Show inactive
            </label>
          </div>

          {loading ? (
            <div className="text-center text-muted" style={{ padding: '40px' }}>
              Loading templates...
            </div>
          ) : error ? (
            <Alert variant="error">{error}</Alert>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center text-muted" style={{ padding: '40px' }}>
              No templates found
              {selectedCategory !== 'all' && (
                <div className="mt-8">
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
                  <th className="text-right" style={{ width: '18%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTemplates.map(template => {
                  const sportName = template.sport_detail?.name || '';
                  const sportParts = sportName.match(/^(\w+)\s+(.+)$/);
                  const baseSport = sportParts ? sportParts[1] : sportName;
                  const sportVariant = sportParts ? sportParts[2] : '';

                  return (
                    <tr key={template.id}>
                      <td>
                        <div>
                          <div className="fw-500 flex-row gap-8">
                            {template.name}
                            {template.organisation === null && (
                              <Badge variant="warning" style={{ fontSize: '10px', padding: '2px 6px' }}>Global</Badge>
                            )}
                          </div>
                          {template.description && (
                            <div className="fs-12 text-muted" style={{ marginTop: '2px' }}>
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
                          <span className="text-muted">&mdash;</span>
                        )}
                      </td>
                      <td>
                        {baseSport ? (
                          <span>{baseSport}</span>
                        ) : (
                          <span className="text-muted">&mdash;</span>
                        )}
                      </td>
                      <td>
                        {sportVariant ? (
                          <Badge variant="default">{sportVariant}</Badge>
                        ) : (
                          <span className="text-muted">&mdash;</span>
                        )}
                      </td>
                      <td>
                        {template.formation_detail ? (
                          <Badge variant="info">{template.formation_detail.code}</Badge>
                        ) : (
                          <span className="text-muted">&mdash;</span>
                        )}
                      </td>
                      <td>
                        {template.style_variant ? (
                          <Badge variant="success">{template.style_variant}</Badge>
                        ) : (
                          <span className="text-muted">&mdash;</span>
                        )}
                      </td>
                      <td>
                        <span className="fw-500">{template.credits_required ?? 1}</span>
                      </td>
                      <td>
                        <Badge variant={template.is_active ? 'success' : 'default'}>
                          {template.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="text-right">
                        <div className="flex-row gap-8 justify-end">
                          <Button variant="secondary" size="sm" onClick={() => setEditingTemplate(template)}>
                            Edit
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => handleToggleActive(template)}>
                            {template.is_active ? 'Disable' : 'Enable'}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleDelete(template)}
                            className="text-error"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>

        {/* Stats Card */}
        <Card className="mt-16">
          <div className="flex-row gap-32">
            <div>
              <div className="fs-24 fw-600">{templates.length}</div>
              <div className="fs-12 text-muted">Total Templates</div>
            </div>
            <div>
              <div className="fs-24 fw-600">{templates.filter(t => t.is_active).length}</div>
              <div className="fs-12 text-muted">Active</div>
            </div>
            <div>
              <div className="fs-24 fw-600">{new Set(templates.map(t => t.template_type)).size}</div>
              <div className="fs-12 text-muted">Categories</div>
            </div>
          </div>
        </Card>
      </PageContent>

      {/* Create/Edit Modal */}
      {(isCreateModalOpen || editingTemplate) && (
        <ContentTemplateModal
          editingTemplate={editingTemplate}
          editForm={editForm}
          setEditForm={setEditForm}
          modalTab={modalTab}
          setModalTab={setModalTab}
          saving={saving}
          sportCategories={sportCategories}
          formationsForSelectedSport={formationsForSelectedSport}
          getVariantsForCategory={getVariantsForCategory}
          getSubtypesForType={getSubtypesForType}
          onSave={handleSaveTemplate}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingTemplate(null);
          }}
        />
      )}
    </AppShell>
  );
}

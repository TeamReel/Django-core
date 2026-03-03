import React from 'react';
import { Card, Button, Input } from '@django-core/design-system';
import { type Formation, type Sport } from './contentTemplatesData';
import type { EditFormState } from './useContentTemplatesData';
import { ContentTemplateRequirementsTab } from './ContentTemplateRequirementsTab';

interface ContentTemplateModalProps {
  editingTemplate: { id: number } | null;
  editForm: EditFormState;
  setEditForm: React.Dispatch<React.SetStateAction<EditFormState>>;
  modalTab: 'basic' | 'requirements';
  setModalTab: (tab: 'basic' | 'requirements') => void;
  saving: boolean;
  sportCategories: { categories: Sport[]; variants: Sport[] };
  formationsForSelectedSport: Formation[];
  getVariantsForCategory: (categoryId: number | null) => Sport[];
  getSubtypesForType: (templateType: string) => { value: string; label: string }[];
  onSave: () => void;
  onClose: () => void;
}

export function ContentTemplateModal({
  editingTemplate,
  editForm,
  setEditForm,
  modalTab,
  setModalTab,
  saving,
  sportCategories,
  formationsForSelectedSport,
  getVariantsForCategory,
  getSubtypesForType,
  onSave,
  onClose,
}: ContentTemplateModalProps) {
  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
    >
      <Card
        style={{ width: '700px', maxHeight: '90vh', overflow: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="mb-16">
          {editingTemplate ? 'Edit Template' : 'Create Template'}
        </h2>

        {/* Modal Tabs */}
        <div className="flex-row gap-4 mb-20 border-bottom">
          <button
            onClick={() => setModalTab('basic')}
            className="cursor-pointer fw-500"
            style={{
              padding: '10px 20px', border: 'none',
              background: modalTab === 'basic' ? 'var(--app-primary)' : 'transparent',
              color: modalTab === 'basic' ? 'white' : 'var(--app-text)',
              borderRadius: '6px 6px 0 0',
            }}
          >
            Basic Info
          </button>
          <button
            onClick={() => setModalTab('requirements')}
            className="cursor-pointer fw-500"
            style={{
              padding: '10px 20px', border: 'none',
              background: modalTab === 'requirements' ? 'var(--app-primary)' : 'transparent',
              color: modalTab === 'requirements' ? 'white' : 'var(--app-text)',
              borderRadius: '6px 6px 0 0',
            }}
          >
            Input Requirements
          </button>
        </div>

        {/* Basic Info Tab */}
        {modalTab === 'basic' && (
          <div className="flex-col gap-16">
            <div>
              <label className="field-label">Name *</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="e.g., Lineup 4-3-3 - Modern"
              />
            </div>

            <div>
              <label className="field-label">Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Template description..."
                rows={2}
                className="form-textarea"
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Template Type & Subtype */}
            <div className="grid gap-12 grid-cols-2">
              <div>
                <label className="field-label">Type *</label>
                <select
                  value={editForm.template_type}
                  onChange={(e) => {
                    const newType = e.target.value;
                    const subs = getSubtypesForType(newType);
                    const subtypeStillValid = subs.some(st => st.value === editForm.template_subtype);
                    setEditForm({
                      ...editForm,
                      template_type: newType,
                      template_subtype: subtypeStillValid ? editForm.template_subtype : '',
                    });
                  }}
                  className="form-input"
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
                <label className="field-label">Subtype</label>
                <select
                  value={editForm.template_subtype}
                  onChange={(e) => setEditForm({ ...editForm, template_subtype: e.target.value })}
                  className="form-input"
                >
                  <option value="">-- None --</option>
                  {getSubtypesForType(editForm.template_type).map(st => (
                    <option key={st.value} value={st.value}>{st.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sport Category & Variant */}
            <div className="grid gap-12 grid-cols-2">
              <div>
                <label className="field-label">Sport Category</label>
                <select
                  value={editForm.sport_category || ''}
                  onChange={(e) => {
                    const categoryId = e.target.value ? Number(e.target.value) : null;
                    setEditForm({
                      ...editForm,
                      sport_category: categoryId,
                      sport: null,
                      formation_code: '',
                    });
                  }}
                  className="form-input"
                >
                  <option value="">-- Select Sport --</option>
                  {sportCategories.categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label">Sport Variant</label>
                <select
                  value={editForm.sport || ''}
                  onChange={(e) => setEditForm({
                    ...editForm,
                    sport: e.target.value ? Number(e.target.value) : null,
                    formation_code: '',
                  })}
                  disabled={!editForm.sport_category}
                  className="form-input"
                  style={{
                    backgroundColor: !editForm.sport_category ? 'var(--app-bg-muted)' : 'var(--app-bg)',
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

            {/* Formation & Style */}
            <div className="grid gap-12 grid-cols-2">
              <div>
                <label className="field-label">Formation Code</label>
                <Input
                  value={editForm.formation_code}
                  onChange={(e) => setEditForm({ ...editForm, formation_code: e.target.value })}
                  placeholder="e.g., 4-3-3, 4-4-2, 3-5-2"
                />
                {editForm.formation_code && formationsForSelectedSport.length > 0 && (
                  <div className="fs-12 text-muted mt-4">
                    {formationsForSelectedSport.some(f => f.code.toLowerCase() === editForm.formation_code.toLowerCase())
                      ? 'Matches existing formation'
                      : 'New formation code (will be created)'}
                  </div>
                )}
              </div>

              <div>
                <label className="field-label">Style Variant</label>
                <Input
                  value={editForm.style_variant}
                  onChange={(e) => setEditForm({ ...editForm, style_variant: e.target.value })}
                  placeholder="e.g., Modern, Classic, Bold"
                />
              </div>
            </div>

            {/* AI Workflow ID */}
            <div>
              <label className="field-label">AI Workflow ID</label>
              <Input
                value={editForm.ai_workflow_id}
                onChange={(e) => setEditForm({ ...editForm, ai_workflow_id: e.target.value })}
                placeholder="e.g., wf_lineup_433_modern"
              />
            </div>

            {/* Active Toggle */}
            <div className="flex-row gap-8">
              <input
                type="checkbox"
                id="is_active"
                checked={editForm.is_active}
                onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                style={{ width: '18px', height: '18px' }}
              />
              <label htmlFor="is_active" className="fw-500">Active</label>
            </div>

            {/* Credits Required */}
            <div>
              <label className="field-label">Credits Required</label>
              <Input
                type="number"
                min={1}
                value={editForm.credits_required}
                onChange={(e) => setEditForm({ ...editForm, credits_required: Math.max(1, parseInt(e.target.value) || 1) })}
                placeholder="1"
                style={{ width: '100px' }}
              />
              <p className="fs-12 text-muted mt-4">
                Number of credits consumed per generation
              </p>
            </div>
          </div>
        )}

        {/* Input Requirements Tab */}
        {modalTab === 'requirements' && (
          <ContentTemplateRequirementsTab editForm={editForm} setEditForm={setEditForm} />
        )}

        {/* Actions */}
        <div className="flex-row gap-8 mt-24" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onSave} disabled={saving || !editForm.name}>
            {saving ? 'Saving...' : (editingTemplate ? 'Save Changes' : 'Create Template')}
          </Button>
        </div>
      </Card>
    </div>
  );
}

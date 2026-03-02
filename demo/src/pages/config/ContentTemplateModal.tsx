import React from 'react';
import { Card, Button, Input } from '@django-core/design-system';
import { SUBTYPE_LABELS, TEMPLATE_CATEGORIES, type Formation, type Sport } from './contentTemplatesData';
import type { EditFormState } from './useContentTemplatesData';

const MEMBER_ASSET_TYPES = ['profile_photo', 'in_tenue', 'full_body', 'close_up', 'short_intro', 'celebration', 'legacy'];

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

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid var(--app-border)',
  backgroundColor: 'var(--app-bg)',
  color: 'var(--app-text)',
  fontSize: '14px',
};

function MemberRoleRow({
  icon,
  label,
  roleKey,
  maxCount,
  editForm,
  setEditForm,
}: {
  icon: string;
  label: string;
  roleKey: string;
  maxCount: number;
  editForm: EditFormState;
  setEditForm: React.Dispatch<React.SetStateAction<EditFormState>>;
}) {
  const roleData = (editForm.input_requirements?.members as any)?.[roleKey];
  const count = roleData?.count ?? 0;
  const isDisabled = !count;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 80px 1fr', gap: '12px', alignItems: 'start' }}>
      <label style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', paddingTop: '6px' }}>
        {icon} {label}
      </label>
      <select
        value={count}
        onChange={(e) => {
          const newReqs = { ...editForm.input_requirements };
          if (!newReqs.members) newReqs.members = {};
          const newCount = parseInt(e.target.value);
          if (newCount === 0) {
            delete (newReqs.members as any)[roleKey];
          } else {
            (newReqs.members as any)[roleKey] = {
              ...(newReqs.members as any)[roleKey],
              count: newCount,
              asset_types: roleData?.asset_types || [roleKey === 'coach' || roleKey === 'assistant' ? 'profile_photo' : 'in_tenue'],
            };
          }
          setEditForm({ ...editForm, input_requirements: newReqs });
        }}
        style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--app-border)', backgroundColor: 'var(--app-bg)', color: 'var(--app-text)' }}
      >
        {Array.from({ length: maxCount + 1 }, (_, n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
      <div className="flex-row flex-wrap gap-8">
        {MEMBER_ASSET_TYPES.map(assetType => {
          const isChecked = roleData?.asset_types?.includes(assetType) ?? false;
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
                  const role = (newReqs.members as any)?.[roleKey];
                  if (role) {
                    const currentTypes = role.asset_types || [];
                    if (e.target.checked) {
                      role.asset_types = [...currentTypes, assetType];
                    } else {
                      role.asset_types = currentTypes.filter((t: string) => t !== assetType);
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
  );
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
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
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
        <div className="flex-row" style={{ gap: '4px', marginBottom: '20px', borderBottom: '1px solid var(--app-border)' }}>
          <button
            onClick={() => setModalTab('basic')}
            style={{
              padding: '10px 20px', border: 'none',
              background: modalTab === 'basic' ? 'var(--app-primary)' : 'transparent',
              color: modalTab === 'basic' ? 'white' : 'var(--app-text)',
              borderRadius: '6px 6px 0 0', cursor: 'pointer', fontWeight: 500,
            }}
          >
            Basic Info
          </button>
          <button
            onClick={() => setModalTab('requirements')}
            style={{
              padding: '10px 20px', border: 'none',
              background: modalTab === 'requirements' ? 'var(--app-primary)' : 'transparent',
              color: modalTab === 'requirements' ? 'white' : 'var(--app-text)',
              borderRadius: '6px 6px 0 0', cursor: 'pointer', fontWeight: 500,
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
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: '6px',
                  border: '1px solid var(--app-border)', backgroundColor: 'var(--app-bg)',
                  color: 'var(--app-text)', fontSize: '14px', resize: 'vertical',
                }}
              />
            </div>

            {/* Template Type & Subtype */}
            <div className="grid gap-12" style={{ gridTemplateColumns: '1fr 1fr' }}>
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
                  style={selectStyle}
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
                  style={selectStyle}
                >
                  <option value="">-- None --</option>
                  {getSubtypesForType(editForm.template_type).map(st => (
                    <option key={st.value} value={st.value}>{st.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sport Category & Variant */}
            <div className="grid gap-12" style={{ gridTemplateColumns: '1fr 1fr' }}>
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
                  style={selectStyle}
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
                  style={{
                    ...selectStyle,
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
            <div className="grid gap-12" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label className="field-label">Formation Code</label>
                <Input
                  value={editForm.formation_code}
                  onChange={(e) => setEditForm({ ...editForm, formation_code: e.target.value })}
                  placeholder="e.g., 4-3-3, 4-4-2, 3-5-2"
                />
                {editForm.formation_code && formationsForSelectedSport.length > 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--app-text-muted)', marginTop: '4px' }}>
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
              <p style={{ fontSize: '12px', color: 'var(--app-text-muted)', marginTop: '4px' }}>
                Number of credits consumed per generation
              </p>
            </div>
          </div>
        )}

        {/* Input Requirements Tab */}
        {modalTab === 'requirements' && (
          <div className="flex-col gap-16">
            <p style={{ color: 'var(--app-text-muted)', margin: 0 }}>
              Define what inputs are required for this template to generate content.
            </p>

            {/* Members Required Section */}
            <div style={{ border: '1px solid var(--app-border)', borderRadius: '8px', padding: '16px' }}>
              <h4 className="fw-600" style={{ margin: '0 0 16px 0', fontSize: '15px' }}>
                Members Required
              </h4>

              <div className="flex-col gap-12">
                <MemberRoleRow icon="" label="Goalkeeper" roleKey="goalkeeper" maxCount={3} editForm={editForm} setEditForm={setEditForm} />
                <MemberRoleRow icon="" label="Players" roleKey="player" maxCount={18} editForm={editForm} setEditForm={setEditForm} />
                <MemberRoleRow icon="" label="Coach" roleKey="coach" maxCount={3} editForm={editForm} setEditForm={setEditForm} />
                <MemberRoleRow icon="" label="Assistant" roleKey="assistant" maxCount={3} editForm={editForm} setEditForm={setEditForm} />
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
              <div className="flex-row gap-8 mb-12">
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
                <label htmlFor="req_match" className="fw-600" style={{ fontSize: '15px' }}>
                  Match Data Required
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
              <div className="flex-row gap-8 mb-12">
                <input
                  type="checkbox"
                  id="req_org_assets"
                  checked={!!editForm.input_requirements?.organisation_assets}
                  onChange={(e) => {
                    const newReqs = { ...editForm.input_requirements };
                    if (e.target.checked) {
                      newReqs.organisation_assets = { required: [{ type: 'logo', label: 'Club Logo' }] };
                    } else {
                      delete newReqs.organisation_assets;
                    }
                    setEditForm({ ...editForm, input_requirements: newReqs });
                  }}
                  style={{ width: '18px', height: '18px' }}
                />
                <label htmlFor="req_org_assets" className="fw-600" style={{ fontSize: '15px' }}>
                  Organisation Assets Required
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
              <h4 className="fw-600" style={{ margin: '0 0 12px 0', fontSize: '15px' }}>
                Output Format
              </h4>
              <div className="grid gap-12" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <label className="block fs-13" style={{ marginBottom: '4px' }}>Type</label>
                  <select
                    value={editForm.input_requirements?.output?.type || 'image'}
                    onChange={(e) => {
                      const newReqs = { ...editForm.input_requirements };
                      newReqs.output = { ...newReqs.output, type: e.target.value, format: e.target.value === 'image' ? 'png' : 'mp4' };
                      setEditForm({ ...editForm, input_requirements: newReqs });
                    }}
                    style={{
                      width: '100%', padding: '6px 10px', borderRadius: '4px',
                      border: '1px solid var(--app-border)', backgroundColor: 'var(--app-bg)', color: 'var(--app-text)',
                    }}
                  >
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                </div>
                <div>
                  <label className="block fs-13" style={{ marginBottom: '4px' }}>Aspect Ratio</label>
                  <select
                    value={editForm.input_requirements?.output?.dimensions?.aspect_ratio || '9:16'}
                    onChange={(e) => {
                      const newReqs = { ...editForm.input_requirements };
                      const ratio = e.target.value;
                      let width = 1080, height = 1920;
                      if (ratio === '1:1') { width = 1080; height = 1080; }
                      else if (ratio === '16:9') { width = 1920; height = 1080; }
                      else if (ratio === '4:5') { width = 1080; height = 1350; }
                      newReqs.output = { ...newReqs.output, dimensions: { width, height, aspect_ratio: ratio } };
                      setEditForm({ ...editForm, input_requirements: newReqs });
                    }}
                    style={{
                      width: '100%', padding: '6px 10px', borderRadius: '4px',
                      border: '1px solid var(--app-border)', backgroundColor: 'var(--app-bg)', color: 'var(--app-text)',
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
        <div className="flex-row gap-8" style={{ justifyContent: 'flex-end', marginTop: '24px' }}>
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

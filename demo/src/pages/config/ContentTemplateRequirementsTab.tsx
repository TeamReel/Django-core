/**
 * Requirements tab content for ContentTemplateModal.
 *
 * Extracted to keep the modal component under 500 lines.
 * Includes MemberRoleRow sub-component + all requirement sections:
 * members, match data, organisation assets, output format.
 */

import React from 'react';
import type { EditFormState } from './useContentTemplatesData';

const MEMBER_ASSET_TYPES = ['profile_photo', 'in_tenue', 'full_body', 'close_up', 'short_intro', 'celebration', 'legacy'];

// ── MemberRoleRow ────────────────────────────────────────────────────────────

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

// ── RequirementsTab ──────────────────────────────────────────────────────────

interface RequirementsTabProps {
  editForm: EditFormState;
  setEditForm: React.Dispatch<React.SetStateAction<EditFormState>>;
}

export function ContentTemplateRequirementsTab({ editForm, setEditForm }: RequirementsTabProps) {
  return (
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
  );
}

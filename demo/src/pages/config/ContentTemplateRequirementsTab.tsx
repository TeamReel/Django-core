/**
 * Requirements tab content for ContentTemplateModal.
 *
 * Extracted to keep the modal component under 500 lines.
 * Includes MemberRoleRow sub-component + all requirement sections:
 * members, match data, organisation assets, output format.
 */

import React from 'react';
import type { EditFormState } from './useContentTemplatesData';
import styles from './ContentTemplateRequirementsTab.module.css';

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
  const roleData = editForm.input_requirements?.members?.[roleKey];
  const count = roleData?.count ?? 0;
  const isDisabled = !count;

  return (
    <div className={`grid gap-12 items-start ${styles.memberRoleGrid}`}>
      <label className={`fw-500 flex-row gap-6 ${styles.memberRoleLabel}`}>
        {icon} {label}
      </label>
      <select
        value={count}
        onChange={(e) => {
          const newReqs = { ...editForm.input_requirements };
          if (!newReqs.members) newReqs.members = {};
          const newCount = parseInt(e.target.value);
          if (newCount === 0) {
            delete newReqs.members[roleKey];
          } else {
            newReqs.members[roleKey] = {
              ...newReqs.members[roleKey],
              count: newCount,
              asset_types: roleData?.asset_types || [roleKey === 'coach' || roleKey === 'assistant' ? 'profile_photo' : 'in_tenue'],
            };
          }
          setEditForm({ ...editForm, input_requirements: newReqs });
        }}
        className={`rounded-4 border bg-primary text-primary ${styles.selectInput}`}
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
              className={`flex-row gap-4 py-4 px-8 rounded-4 fs-13 ${styles.assetTypeLabel}`}
              data-checked={isChecked}
              data-disabled={isDisabled}
            >
              <input
                type="checkbox"
                checked={isChecked}
                disabled={isDisabled}
                onChange={(e) => {
                  const newReqs = { ...editForm.input_requirements };
                  const role = newReqs.members?.[roleKey];
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
                className={styles.assetTypeCheckbox}
                data-disabled={isDisabled}
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
      <p className="text-muted m-0">
        Define what inputs are required for this template to generate content.
      </p>

      {/* Members Required Section */}
      <div className="border rounded-8 p-16">
        <h4 className={`fw-600 m-0 mb-16 ${styles.sectionTitle}`}>
          Members Required
        </h4>

        <div className="flex-col gap-12">
          <MemberRoleRow icon="" label="Goalkeeper" roleKey="goalkeeper" maxCount={3} editForm={editForm} setEditForm={setEditForm} />
          <MemberRoleRow icon="" label="Players" roleKey="player" maxCount={18} editForm={editForm} setEditForm={setEditForm} />
          <MemberRoleRow icon="" label="Coach" roleKey="coach" maxCount={3} editForm={editForm} setEditForm={setEditForm} />
          <MemberRoleRow icon="" label="Assistant" roleKey="assistant" maxCount={3} editForm={editForm} setEditForm={setEditForm} />
        </div>

        {/* Use Formation Positions checkbox */}
        <div className="mt-16 pt-12 border-top">
          <label className="flex-row gap-8 cursor-pointer">
            <input
              type="checkbox"
              checked={editForm.input_requirements?.members?.use_formation ?? false}
              onChange={(e) => {
                const newReqs = { ...editForm.input_requirements };
                if (!newReqs.members) newReqs.members = {};
                newReqs.members.use_formation = e.target.checked;
                setEditForm({ ...editForm, input_requirements: newReqs });
              }}
              className={styles.formationCheckbox}
            />
            <span className="fs-13">Use formation positions for players</span>
          </label>
        </div>
      </div>

      {/* Match Data Section */}
      <div className="border rounded-8 p-16">
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
            className={styles.sectionCheckbox}
          />
          <label htmlFor="req_match" className={`fw-600 ${styles.sectionTitle}`}>
            Match Data Required
          </label>
        </div>
        {editForm.input_requirements?.match_data && (
          <div className={`text-muted fs-13 ${styles.indentedText}`}>
            Opponent, date, time, venue information
          </div>
        )}
      </div>

      {/* Organisation Assets Section */}
      <div className="border rounded-8 p-16">
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
            className={styles.sectionCheckbox}
          />
          <label htmlFor="req_org_assets" className={`fw-600 ${styles.sectionTitle}`}>
            Organisation Assets Required
          </label>
        </div>
        {editForm.input_requirements?.organisation_assets && (
          <div className={`text-muted fs-13 ${styles.indentedText}`}>
            Club logo and branding assets
          </div>
        )}
      </div>

      {/* Output Settings */}
      <div className="border rounded-8 p-16">
        <h4 className={`fw-600 m-0 mb-12 ${styles.sectionTitle}`}>
          Output Format
        </h4>
        <div className="grid-cols-2 gap-12">
          <div>
            <label className="block fs-13 mb-4">Type</label>
            <select
              value={editForm.input_requirements?.output?.type || 'image'}
              onChange={(e) => {
                const newReqs = { ...editForm.input_requirements };
                newReqs.output = { ...newReqs.output, type: e.target.value, format: e.target.value === 'image' ? 'png' : 'mp4' };
                setEditForm({ ...editForm, input_requirements: newReqs });
              }}
              className={`w-full rounded-4 border bg-primary text-primary ${styles.selectInput}`}
            >
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
          </div>
          <div>
            <label className="block fs-13 mb-4">Aspect Ratio</label>
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
              className={`w-full rounded-4 border bg-primary text-primary ${styles.selectInput}`}
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

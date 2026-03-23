# H2 — Asset Display per Rol (Frontend)

| | |
|---|---|
| Status | 📋 TODO |
| Effort | ~6 uur |
| Focus | Frontend |
| Afhankelijkheid | H1 |

## Context

Backend ondersteunt nu assets per rol. Frontend moet:
1. Multi-role leden tonen met tabs per rol
2. Asset upload UI vraagt om rol selectie
3. Selectie grid toont asset-status per rol

## Implementatie

### 1. MemberDetailPanel: tabs per rol

**Bestand**: `demo/src/pages/periods/MemberDetailPanel.tsx`

```tsx
interface MemberDetailPanelProps {
  member: SquadMember;
  // ...
}

const MemberDetailPanel: React.FC<MemberDetailPanelProps> = ({ member }) => {
  const roles = member.functional_roles || [member.functional_role].filter(Boolean);
  const [activeRole, setActiveRole] = useState(roles[0] || 'player');

  // Get assets for active role
  const roleAssets = useMemo(() => {
    const tr = member.metadata?.teamreel_assets;
    if (!tr) return null;

    // Try role-specific first
    if (tr.roles?.[activeRole]) {
      return tr.roles[activeRole];
    }
    // Fallback to legacy flat structure
    return { images: tr.images, videos: tr.videos };
  }, [member, activeRole]);

  return (
    <div className={s.panel}>
      {/* Role tabs for multi-role members */}
      {roles.length > 1 && (
        <div className={s.roleTabs} role="tablist">
          {roles.map((role) => (
            <button
              key={role}
              role="tab"
              aria-selected={role === activeRole}
              onClick={() => setActiveRole(role)}
              className={s.roleTab}
            >
              {ROLE_LABELS[role]}
            </button>
          ))}
        </div>
      )}

      {/* Asset grid for selected role */}
      <AssetGrid assets={roleAssets} role={activeRole} memberId={member.id} />
    </div>
  );
};
```

### 2. Asset upload met rol selectie

**Bestand**: `demo/src/components/AssetUploadModal.tsx`

```tsx
interface AssetUploadModalProps {
  memberId: string;
  assetType: 'closeup' | 'fullbody' | 'intro';
  availableRoles: string[];
  onComplete: () => void;
}

const AssetUploadModal: React.FC<AssetUploadModalProps> = ({
  memberId,
  assetType,
  availableRoles,
  onComplete,
}) => {
  const [selectedRole, setSelectedRole] = useState(availableRoles[0]);

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('membership_id', memberId);
    formData.append('asset_type', assetType);
    formData.append('role', selectedRole);  // NEW

    await api.post('/video/jobs/process-asset/', formData);
    onComplete();
  };

  return (
    <Modal>
      {availableRoles.length > 1 && (
        <fieldset>
          <legend>Voor welke rol?</legend>
          {availableRoles.map((role) => (
            <label key={role}>
              <input
                type="radio"
                name="role"
                value={role}
                checked={role === selectedRole}
                onChange={() => setSelectedRole(role)}
              />
              {ROLE_LABELS[role]}
            </label>
          ))}
        </fieldset>
      )}

      <DropZone onDrop={handleUpload} />
    </Modal>
  );
};
```

### 3. Selectie grid met asset dots per rol

**Bestand**: `demo/src/pages/identity/HubSelectieTab.tsx`

```tsx
// Per member row: show asset completion per role
<div className={s.memberRow}>
  <Avatar src={memberAvatarUrl(m)} name={memberName(m)} />
  <span className={s.name}>{memberName(m)}</span>

  {/* Role badges with asset dots */}
  <div className={s.roleBadges}>
    {m.functional_roles?.map((role) => (
      <span key={role} className={s.roleBadge}>
        {ROLE_EMOJI[role]}
        <AssetDots assets={getRoleAssets(m, role)} />
      </span>
    ))}
  </div>
</div>
```

### 4. Helper: getRoleAssets

```tsx
function getRoleAssets(member: SquadMember, role: string) {
  const tr = member.metadata?.teamreel_assets;
  if (!tr) return null;

  // Role-specific first
  if (tr.roles?.[role]) return tr.roles[role];

  // Fallback
  return { images: tr.images, videos: tr.videos };
}
```

## Acceptatiecriteria

- [ ] Multi-role leden: tabs per rol in detail panel
- [ ] Single-role leden: geen extra tabs (clean UX)
- [ ] Upload modal vraagt om rol bij multi-role
- [ ] Selectie grid toont asset dots per rol
- [ ] Backward compat: legacy assets nog zichtbaar
- [ ] WCAG: role="tablist", aria-selected, focus-visible

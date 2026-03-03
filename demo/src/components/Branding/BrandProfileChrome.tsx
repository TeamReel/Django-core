import { Card, Text, Badge, Button } from '@django-core/design-system';
import { getAssetUrl as resolveAssetUrl } from '../../hooks/useBrandProfile';
import {
  Sparkles, Edit, Plus, Loader2, AlertCircle, CheckCircle, XCircle, Wand2, Palette,
} from 'lucide-react';
import type { BrandProfile } from './brandIdentity.types';

// ── ProfileHeader ────────────────────────────────────────────
export function ProfileHeader({
  profile,
  entityName,
  onEdit,
  onGenerateTokens,
  generatingTokens,
}: {
  profile: BrandProfile;
  entityName: string;
  onEdit?: () => void;
  onGenerateTokens?: () => void;
  generatingTokens?: boolean;
}) {
  const logoAsset = profile.assets?.find((a) => a.asset_type === 'logo' || a.asset_type.includes('logo'));
  const logoUrl = logoAsset?.url ? resolveAssetUrl(logoAsset.url) : null;

  return (
    <Card className="p-24">
      <div className="flex-between" style={{ alignItems: 'flex-start' }}>
        <div className="flex-row gap-16" style={{ alignItems: 'flex-start' }}>
          {logoUrl ? (
            <div className="rounded-12 border flex-center p-8 overflow-hidden" style={{ width: '80px', height: '80px', backgroundColor: 'var(--app-surface-alt, #f8f8f8)' }}>
              <img
                src={logoUrl}
                alt={logoAsset?.alt_text || `${entityName} logo`}
                className="object-contain"
                style={{ maxWidth: '100%', maxHeight: '100%' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          ) : (
            <div className="rounded-12 flex-center text-white" style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, var(--app-primary) 0%, var(--app-primary-dark, var(--app-primary)) 100%)' }}>
              <Sparkles size={28} />
            </div>
          )}
          <div>
            <div className="flex-row gap-8">
              <Text weight="bold" size="lg">{profile.name}</Text>
              <Badge variant={profile.is_active ? 'success' : 'default'}>
                {profile.is_active ? <><CheckCircle size={12} /> Active</> : <><XCircle size={12} /> Inactive</>}
              </Badge>
            </div>
            <Text color="secondary" size="sm" className="mt-4">Brand identity for {entityName}</Text>
            <Text color="secondary" size="xs" className="mt-8">
              Last updated: {new Date(profile.updated_at).toLocaleDateString('nl-NL', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </div>
        </div>

        {profile.can_edit && (
          <div className="flex-row gap-8">
            {onGenerateTokens && (
              <Button variant="outline" size="sm" onClick={onGenerateTokens} disabled={generatingTokens} title="Analyseer logo & tenue kleuren en genereer automatisch tokens">
                {generatingTokens ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                {generatingTokens ? 'Analyseren...' : 'Genereer tokens'}
              </Button>
            )}
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}><Edit size={14} />Edit Profile</Button>
            )}
          </div>
        )}
      </div>

      <div className="flex-row gap-32 mt-24 border-top pt-24">
        <div>
          <Text size="xs" color="secondary" weight="bold" className="uppercase">Design Tokens</Text>
          <Text weight="bold" size="xl" className="mt-4">{profile.token_count || profile.tokens?.length || 0}</Text>
        </div>
        <div>
          <Text size="xs" color="secondary" weight="bold" className="uppercase">Brand Assets</Text>
          <Text weight="bold" size="xl" className="mt-4">{profile.asset_count || profile.assets?.length || 0}</Text>
        </div>
        <div>
          <Text size="xs" color="secondary" weight="bold" className="uppercase">Created</Text>
          <Text weight="bold" size="sm" className="mt-8">
            {new Date(profile.created_at).toLocaleDateString('nl-NL', { year: 'numeric', month: 'short', day: 'numeric' })}
          </Text>
        </div>
      </div>
    </Card>
  );
}

// ── EmptyState ───────────────────────────────────────────────
export function EmptyState({
  entityName,
  entityType,
  onCreateProfile,
}: {
  entityName: string;
  entityType: string;
  onCreateProfile?: () => void;
}) {
  return (
    <Card className="text-center" style={{ padding: '48px' }}>
      <div className="rounded-full flex-center mx-auto mb-24" style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, var(--app-surface-alt) 0%, var(--app-border) 100%)' }}>
        <Palette size={36} style={{ opacity: 0.4 }} />
      </div>
      <Text weight="bold" size="lg">No Brand Profile</Text>
      <Text color="secondary" className="mt-8 mx-auto" style={{ maxWidth: '400px' }}>
        {entityName} doesn't have a brand identity configured yet.
        {entityType === 'organisation'
          ? ' Create a brand profile to define colors, typography, and visual assets.'
          : ' Contact your organisation administrator to set up branding.'}
      </Text>

      {entityType === 'organisation' && (
        <Button variant="primary" className="mt-24" onClick={onCreateProfile} disabled={!onCreateProfile}>
          <Plus size={16} />Create Brand Profile
        </Button>
      )}

      {entityType !== 'organisation' && (
        <div className="mt-24 p-16 rounded-8 inline-block" style={{ backgroundColor: 'var(--app-surface-alt, rgba(0,0,0,0.02))' }}>
          <Text size="xs" color="secondary">
            <AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
            Brand profiles are inherited from the parent organisation
          </Text>
        </div>
      )}
    </Card>
  );
}

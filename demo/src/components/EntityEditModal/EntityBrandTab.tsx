/**
 * EntityBrandTab — design token management + assets preview.
 * Includes inline TokenEditor component.
 */
import React from 'react';
import { Badge, Button, Text } from '@django-core/design-system';
import { Palette, Plus, Trash2 } from 'lucide-react';
import type { BrandProfile, DesignToken } from './entityEditTypes';
import { TOKEN_TYPES } from './entityEditTypes';
import styles from './EntityBrandTab.module.css';

// ── Token Editor (shared row) ────────────────────────────────────────

function TokenEditor({
  token,
  onUpdate,
  onDelete,
}: {
  token: DesignToken;
  onUpdate: (updates: Partial<DesignToken>) => void;
  onDelete: () => void;
}) {
  const isColor = token.type === 'color' || /^#[0-9A-Fa-f]{3,8}$/.test(token.value);

  return (
    <div
      className={`grid gap-8 p-8 rounded-6 ${styles.tokenEditorRow}`}
    >
      <input
        type="text"
        value={token.key}
        onChange={(e) => onUpdate({ key: e.target.value })}
        placeholder="Token key (e.g., primary_color)"
        className="p-8 rounded-4 border bg-surface text-primary fs-13"
      />
      <select
        value={token.type}
        onChange={(e) => onUpdate({ type: e.target.value })}
        className="p-8 rounded-4 border bg-surface text-primary fs-13"
      >
        {TOKEN_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      <div className="flex-row gap-4">
        {isColor && (
          <input
            type="color"
            value={token.value.startsWith('#') ? token.value : '#000000'}
            onChange={(e) => onUpdate({ value: e.target.value })}
            className={`p-0 border rounded-4 cursor-pointer ${styles.colorInput}`}
          />
        )}
        <input
          type="text"
          value={token.value}
          onChange={(e) => onUpdate({ value: e.target.value })}
          placeholder="Value"
          className={`flex-1 p-8 rounded-4 border bg-surface text-primary fs-13 ${styles.monoInput}`}
        />
      </div>
      <button
        onClick={onDelete}
        className={`p-8 border-none cursor-pointer rounded-4 ${styles.deleteButton}`}
        title="Token verwijderen"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

// ── Brand Tab ────────────────────────────────────────────────────────

interface BrandTabProps {
  brandProfile: BrandProfile | null;
  tokens: DesignToken[];
  setTokens: React.Dispatch<React.SetStateAction<DesignToken[]>>;
  newTokens: Omit<DesignToken, 'id'>[];
  setNewTokens: React.Dispatch<React.SetStateAction<Omit<DesignToken, 'id'>[]>>;
  deletedTokenIds: string[];
  setDeletedTokenIds: React.Dispatch<React.SetStateAction<string[]>>;
  disabled?: boolean;
}

export function EntityBrandTab({
  brandProfile,
  tokens,
  setTokens,
  newTokens,
  setNewTokens,
  deletedTokenIds,
  setDeletedTokenIds,
  disabled,
}: BrandTabProps) {
  const updateToken = (id: string, updates: Partial<DesignToken>) => {
    setTokens((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };
  const deleteToken = (id: string) => {
    setDeletedTokenIds((prev) => [...prev, id]);
    setTokens((prev) => prev.filter((t) => t.id !== id));
  };
  const addNewToken = () => {
    setNewTokens((prev) => [...prev, { key: '', value: '', type: 'color', description: '' }]);
  };
  const updateNewToken = (index: number, updates: Partial<Omit<DesignToken, 'id'>>) => {
    setNewTokens((prev) => prev.map((t, i) => (i === index ? { ...t, ...updates } : t)));
  };
  const deleteNewToken = (index: number) => {
    setNewTokens((prev) => prev.filter((_, i) => i !== index));
  };

  if (!brandProfile) {
    return (
      <div className="p-32 text-center">
        <Palette size={48} className={`mb-16 ${styles.iconFaded}`} />
        <Text weight="bold">No Brand Profile</Text>
        <Text color="secondary" size="sm" className="mt-8">
          This entity doesn't have a brand profile configured yet.
        </Text>
        <Button variant="primary" className="mt-16" disabled>
          <Plus size={14} />
          Create Brand Profile (Coming Soon)
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-16">
      <div className="flex-between">
        <div>
          <Text weight="bold">{brandProfile.name}</Text>
          <Text size="sm" color="secondary">Design tokens define colors, typography, and spacing</Text>
        </div>
        <Button variant="outline" size="sm" onClick={addNewToken} disabled={disabled}>
          <Plus size={14} /> Add Token
        </Button>
      </div>

      {tokens.map((token) => (
        <TokenEditor key={token.id} token={token} onUpdate={(u) => updateToken(token.id, u)} onDelete={() => deleteToken(token.id)} />
      ))}

      {newTokens.map((token, index) => (
        <TokenEditor key={`new-${index}`} token={{ ...token, id: `new-${index}` }} onUpdate={(u) => updateNewToken(index, u)} onDelete={() => deleteNewToken(index)} />
      ))}

      {tokens.length === 0 && newTokens.length === 0 && (
        <div className={`p-24 text-center rounded-8 ${styles.emptyTokensBox}`}>
          <Text color="secondary">No design tokens yet</Text>
          <Text size="sm" color="secondary">Click "Add Token" to create your first design token</Text>
        </div>
      )}

      {brandProfile.assets && brandProfile.assets.length > 0 && (
        <div className="mt-16">
          <Text size="sm" weight="bold" className="mb-8">Brand Assets ({brandProfile.assets.length})</Text>
          <div className="flex-row gap-8 flex-wrap">
            {brandProfile.assets.map((asset) => (
              <Badge key={asset.id} variant="default">{asset.asset_type}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

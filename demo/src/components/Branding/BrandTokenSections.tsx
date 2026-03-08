import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Card, Text, Badge, Button, Stack } from '@django-core/design-system';
import { Copy, Check, Upload, Image } from 'lucide-react';
import { formatTokenKey, getContrastColor, TOKEN_TYPE_ICONS, TOKEN_TYPE_LABELS, ASSET_TYPE_LABELS } from './brandIdentity.types';
import type { DesignToken, BrandAsset } from './brandIdentity.types';
import { ResponsiveGrid } from '../ui/ResponsiveGrid';
import styles from './BrandTokenSections.module.css';

// ── CopyableValue ────────────────────────────────────────────
export function CopyableValue({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      title={`Copy ${label || value}`}
      className={`inline-flex gap-4 rounded-4 cursor-pointer fs-12 border text-secondary ${styles.copyableButton}`}
    >
      {value}
      {copied ? <Check size={12} className={styles.copiedIcon} /> : <Copy size={12} />}
    </button>
  );
}

// ── ColorPaletteSection ──────────────────────────────────────
export function ColorPaletteSection({ colors }: { colors: DesignToken[] }) {
  if (colors.length === 0) return null;

  return (
    <Card className="p-24">
      <Stack direction="column" gap="4">
        <div className="flex-row gap-8">
          <Text weight="bold" size="md">Color Palette</Text>
          <Badge variant="default">{colors.length} colors</Badge>
        </div>

        <ResponsiveGrid minWidth="180px" gap={16}>
          {colors.map((token) => (
            <div key={token.id} className={`rounded-12 overflow-hidden border ${styles.colorCard}`}>
              <div className={`flex-center ${styles.colorSwatch}`} style={{ '--swatch-bg': token.value } as CSSProperties}>
                <Text weight="bold" size="lg" className={styles.colorSwatchLabel} style={{ '--contrast-color': getContrastColor(token.value) } as CSSProperties}>Aa</Text>
              </div>
              <div className="p-12 bg-surface">
                <Text weight="medium" size="sm">{formatTokenKey(token.key)}</Text>
                <div className={styles.colorTokenValue}><CopyableValue value={token.value} label={token.key} /></div>
                {token.description && <Text size="xs" color="secondary" className={styles.colorTokenDescription}>{token.description}</Text>}
              </div>
            </div>
          ))}
        </ResponsiveGrid>

        <div className="mt-8">
          <Text weight="bold" size="xs" color="secondary" className="mb-8 uppercase">Combined Preview</Text>
          <div className={`rounded-8 overflow-hidden border flex-row ${styles.combinedPreviewBar}`}>
            {colors.map((token) => (
              <div key={token.id} className={`flex-1 ${styles.combinedPreviewSegment}`} style={{ '--swatch-bg': token.value } as CSSProperties} title={`${formatTokenKey(token.key)}: ${token.value}`} />
            ))}
          </div>
        </div>
      </Stack>
    </Card>
  );
}

// ── TypographySection ────────────────────────────────────────
export function TypographySection({ fonts }: { fonts: DesignToken[] }) {
  if (fonts.length === 0) return null;

  return (
    <Card className="p-24">
      <Stack direction="column" gap="4">
        <div className="flex-row gap-8">
          <Text weight="bold" size="md">Typography</Text>
          <Badge variant="default">{fonts.length} fonts</Badge>
        </div>
        <div className="grid gap-16">
          {fonts.map((token) => (
            <div key={token.id} className={`p-20 rounded-12 border ${styles.typographyCard}`}>
              <div className="flex-between mb-12">
                <Text size="sm" color="secondary">{formatTokenKey(token.key)}</Text>
                <CopyableValue value={token.value} label={token.key} />
              </div>
              <div className={styles.typographyPreview} style={{ '--font-family': token.value, '--font-weight': token.key.includes('heading') ? 700 : 400 } as CSSProperties}>
                <Text size="xs" color="secondary" className="mb-4">Preview:</Text>
                <div className={styles.typographyLargePreview}>The quick brown fox jumps</div>
                <div className={`fs-16 mt-8 ${styles.typographyUppercase}`}>ABCDEFGHIJKLMNOPQRSTUVWXYZ</div>
                <div className="fs-14 mt-4 text-secondary">abcdefghijklmnopqrstuvwxyz 0123456789</div>
              </div>
            </div>
          ))}
        </div>
      </Stack>
    </Card>
  );
}

// ── OtherTokensSection ───────────────────────────────────────
export function OtherTokensSection({ tokens }: { tokens: Map<string, DesignToken[]> }) {
  const filteredTokens = Array.from(tokens.entries()).filter(([type]) => type !== 'color' && type !== 'font');
  if (filteredTokens.length === 0) return null;

  return (
    <Card className="p-24">
      <Stack direction="column" gap="4">
        <div className="flex-row gap-8"><Text weight="bold" size="md">Design Tokens</Text></div>
        <div className="grid gap-20">
          {filteredTokens.map(([type, typeTokens]) => {
            const Icon = TOKEN_TYPE_ICONS[type] || TOKEN_TYPE_ICONS.default;
            const label = TOKEN_TYPE_LABELS[type] || type.charAt(0).toUpperCase() + type.slice(1);
            return (
              <div key={type}>
                <div className="flex-row gap-8 mb-12">
                  <Icon size={16} className="opacity-60" />
                  <Text weight="bold" size="sm" className="uppercase">{label}</Text>
                  <Badge variant="default">{typeTokens.length}</Badge>
                </div>
                <ResponsiveGrid minWidth="200px" gap={12}>
                  {typeTokens.map((token) => (
                    <div key={token.id} className={`flex-between rounded-8 border py-12 px-16 ${styles.tokenRow}`}>
                      <Text size="sm" weight="medium">{formatTokenKey(token.key)}</Text>
                      <CopyableValue value={token.value} label={token.key} />
                    </div>
                  ))}
                </ResponsiveGrid>
              </div>
            );
          })}
        </div>
      </Stack>
    </Card>
  );
}

// ── BrandAssetsSection ───────────────────────────────────────
export function BrandAssetsSection({ assets }: { assets: BrandAsset[] }) {
  return (
    <Card className="p-24">
      <Stack direction="column" gap="4">
        <div className="flex-between">
          <div className="flex-row gap-8">
            <Text weight="bold" size="md">Brand Assets</Text>
            <Badge variant="default">{assets.length} assets</Badge>
          </div>
          <Button variant="outline" size="sm" disabled><Upload size={14} />Upload Asset</Button>
        </div>

        {assets.length === 0 ? (
          <div className={`text-center rounded-12 ${styles.emptyState}`}>
            <Image size={48} className={`mb-16 ${styles.emptyStateIcon}`} />
            <Text color="secondary" size="sm">No brand assets uploaded yet</Text>
            <Text color="secondary" size="xs" className="mt-8">Upload logos, icons, banners and other visual assets</Text>
          </div>
        ) : (
          <ResponsiveGrid minWidth="180px" gap={16}>
            {assets.map((asset) => (
              <div key={asset.id} className={`rounded-12 overflow-hidden border bg-surface ${styles.assetCard}`}>
                <div className={`flex-center p-16 ${styles.assetPreview}`}>
                  {asset.url ? (
                    <img
                      src={asset.url}
                      alt={asset.alt_text || asset.asset_type}
                      className={`object-contain ${styles.assetImage}`}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        ((e.target as HTMLImageElement).parentNode as HTMLElement).innerHTML = `
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                          </svg>`;
                      }}
                    />
                  ) : (
                    <Image size={48} className={styles.assetPlaceholderIcon} />
                  )}
                </div>
                <div className="p-12">
                  <Text size="sm" weight="medium">{ASSET_TYPE_LABELS[asset.asset_type] || asset.asset_type.replace(/_/g, ' ')}</Text>
                  {asset.alt_text && <Text size="xs" color="secondary" className="mt-4">{asset.alt_text}</Text>}
                </div>
              </div>
            ))}
          </ResponsiveGrid>
        )}
      </Stack>
    </Card>
  );
}

/**
 * ConfirmStepFlyer — Match Flyer variant picker + action photo settings.
 * Extracted from ConfirmStep to keep each file under 500 lines.
 */
import React from 'react';
import type { Participation } from './types';
import { BackgroundSelector, type BackgroundItem } from './BackgroundSelector';

interface ConfirmStepFlyerProps {
  seasonSquad: Record<string, Participation[]>;
  matchFlyerVariant: 'modern' | 'action' | 'stadium';
  setMatchFlyerVariant: (v: 'modern' | 'action' | 'stadium') => void;
  flyerMemberId: string | null;
  setFlyerMemberId: (id: string | null) => void;
  flyerActionStyle: string;
  setFlyerActionStyle: (style: string) => void;
  flyerPhotoLayout: 'single' | 'triple' | 'hero_duo';
  setFlyerPhotoLayout: (layout: 'single' | 'triple' | 'hero_duo') => void;
  flyerPhotoSlots: Array<{ member_id: string | null; style_variant: string }>;
  setFlyerPhotoSlots: (slots: Array<{ member_id: string | null; style_variant: string }>) => void;
  selectedBackgroundUrl: string | null;
  setSelectedBackgroundUrl: (url: string | null) => void;
  appBackgrounds: BackgroundItem[];
}

const ACTION_STYLE_OPTIONS = [
  { key: 'dribbling', label: 'Dribbelen' },
  { key: 'shooting', label: 'Schieten' },
  { key: 'ball_at_feet', label: 'Bal aan de voet' },
  { key: 'celebrating', label: 'Vieren' },
  { key: 'heading', label: 'Koppen' },
  { key: 'sliding_tackle', label: 'Sliding' },
  { key: 'karate_kick', label: 'Karatetrap' },
] as const;

const VARIANT_OPTIONS = [
  { key: 'modern' as const, label: 'Modern', desc: 'Geometrisch design met clubkleuren en vormen', icon: 'M' },
  { key: 'action' as const, label: 'Actie', desc: 'Samengestelde flyer met actiefoto & clubkleuren', icon: 'A' },
  { key: 'stadium' as const, label: 'Stadium AI', desc: 'AI-gegenereerde stadion achtergrond', icon: 'S' },
];

/** Deduplicate members (goalkeeper + player) by user id */
function deduplicateMembers(seasonSquad: Record<string, Participation[]>) {
  return [...(seasonSquad.goalkeeper || []), ...(seasonSquad.player || [])]
    .filter((p, idx, arr) => {
      const uid = (p.user || p.member)?.id;
      return uid
        ? arr.findIndex(x => (x.user || x.member)?.id === uid) === idx
        : arr.findIndex(x => x.id === p.id) === idx;
    });
}

/** Extract style keys from action_photo metadata (composite keys like "home_dribbling") */
function extractMemberStyles(member: Participation): string[] {
  const tr = (member.metadata as any)?.teamreel_assets || {};
  const actionImgs = tr?.images?.action_photo || {};
  const styles = new Set<string>();
  for (const key of Object.keys(actionImgs)) {
    const parts = key.split('_');
    if (parts.length >= 2) styles.add(parts.slice(1).join('_'));
  }
  return Array.from(styles);
}

/** Get display name for a member */
function memberName(member: Participation): string {
  const user = member.user || member.member;
  if (!user) return 'Unknown';
  return ('name' in user && user.name) ||
    ('user_name' in user && user.user_name) ||
    `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown';
}

export function ConfirmStepFlyer({
  seasonSquad,
  matchFlyerVariant, setMatchFlyerVariant,
  flyerMemberId, setFlyerMemberId,
  flyerActionStyle, setFlyerActionStyle,
  flyerPhotoLayout, setFlyerPhotoLayout,
  flyerPhotoSlots, setFlyerPhotoSlots,
  selectedBackgroundUrl, setSelectedBackgroundUrl,
  appBackgrounds,
}: ConfirmStepFlyerProps) {
  const allMembers = deduplicateMembers(seasonSquad);

  const membersWithActionPhotos = allMembers.filter((member) => {
    const tr = (member.metadata as any)?.teamreel_assets || {};
    const actionImgs = tr?.images?.action_photo || {};
    return Object.keys(actionImgs).length > 0;
  });

  const selectedMemberStyles: string[] = (() => {
    if (!flyerMemberId) return [];
    const member = allMembers.find(m => m.id === flyerMemberId);
    return member ? extractMemberStyles(member) : [];
  })();

  return (
    <div style={{ width: '100%', maxWidth: 480, marginTop: 20 }}>
      {/* Variant picker */}
      <label className="block fs-12 fw-600" style={{
        marginBottom: 10,
        color: 'var(--app-text-muted, #6b7280)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>Ontwerpstijl</label>
      <div className="flex-col gap-8">
        {VARIANT_OPTIONS.map((opt) => {
          const isSelected = matchFlyerVariant === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => {
                setMatchFlyerVariant(opt.key);
                if (opt.key === 'action' && !flyerMemberId) {
                  const firstWithPhoto = membersWithActionPhotos[0];
                  if (firstWithPhoto) {
                    setFlyerMemberId(firstWithPhoto.id);
                    const styles = extractMemberStyles(firstWithPhoto);
                    if (styles.length > 0) setFlyerActionStyle(styles[0]);
                  }
                }
              }}
              style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px',
                border: isSelected ? '2px solid var(--app-primary, #3B8EA5)' : '1px solid var(--app-border, #e5e7eb)',
                borderRadius: 12,
                background: isSelected ? 'var(--app-primary-light, rgba(59,142,165,0.08))' : 'var(--app-surface, white)',
                color: 'var(--app-text, #111)', cursor: 'pointer',
                transition: 'all 0.15s ease', textAlign: 'left', width: '100%',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                backgroundColor: isSelected ? 'var(--app-primary, #3B8EA5)' : 'var(--app-surface-2, #f3f4f6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 700,
                color: isSelected ? 'white' : 'var(--app-primary, #3B8EA5)',
              }}>{opt.icon}</div>
              <div className="flex-1">
                <div className="fw-600 fs-14">{opt.label}</div>
                <div className="fs-12" style={{ color: 'var(--app-text-muted, #6b7280)', marginTop: 1 }}>{opt.desc}</div>
              </div>
              {isSelected && (
                <div style={{
                  position: 'absolute', top: 6, right: 6, width: 18, height: 18,
                  borderRadius: '50%', background: 'var(--color-green-400)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: '#fff', fontWeight: 700,
                }}>✓</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Action variant settings */}
      {matchFlyerVariant === 'action' && (
        <div style={{
          marginTop: 16, padding: 16,
          border: '1px solid var(--app-border, #e5e7eb)',
          borderRadius: 10, background: 'var(--app-surface-2, #f3f4f6)',
        }}>
          <div className="fs-13 fw-700 mb-12" style={{ color: 'var(--app-text, #111)' }}>
            Actiefoto instellingen
          </div>

          {flyerPhotoLayout === 'single' ? (
            <SingleMemberSelector
              flyerMemberId={flyerMemberId}
              setFlyerMemberId={setFlyerMemberId}
              flyerActionStyle={flyerActionStyle}
              setFlyerActionStyle={setFlyerActionStyle}
              membersWithActionPhotos={membersWithActionPhotos}
              selectedMemberStyles={selectedMemberStyles}
            />
          ) : (
            <MultiSlotSelector
              flyerPhotoLayout={flyerPhotoLayout}
              flyerPhotoSlots={flyerPhotoSlots}
              setFlyerPhotoSlots={setFlyerPhotoSlots}
              allMembers={allMembers}
              membersWithActionPhotos={membersWithActionPhotos}
            />
          )}

          {/* Photo layout picker */}
          <div className="mt-16">
            <label className="block fs-11 fw-600 mb-8" style={{
              color: 'var(--app-text-muted, #6b7280)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>Foto Layout</label>
            <div className="flex-row gap-8">
              {([
                { key: 'single' as const, label: '1 Groot', icon: '\u25A0', desc: '1 actiefoto' },
                { key: 'triple' as const, label: '3 Naast', icon: '\u25A0\u25A0\u25A0', desc: '3 naast elkaar' },
                { key: 'hero_duo' as const, label: '1+2', icon: '+', desc: '1 groot + 2 klein' },
              ] as const).map((opt) => {
                const isActive = flyerPhotoLayout === opt.key;
                return (
                  <button key={opt.key} onClick={() => setFlyerPhotoLayout(opt.key)} style={{
                    flex: 1, padding: '8px 4px',
                    border: isActive ? '2px solid var(--app-primary, #3B8EA5)' : '1px solid var(--app-border, #e5e7eb)',
                    borderRadius: 8,
                    background: isActive ? 'var(--app-primary-light, rgba(59,142,165,0.08))' : 'var(--app-surface-2, #f3f4f6)',
                    color: isActive ? '#fff' : 'var(--app-text, #111)',
                    cursor: 'pointer', textAlign: 'center', fontSize: 11, lineHeight: 1.4,
                    transition: 'all 0.15s ease',
                  }}>
                    <div className="fs-16" style={{ marginBottom: 2 }}>{opt.icon}</div>
                    <div className="fw-700">{opt.label}</div>
                    <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2 }}>{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Background selector */}
          {appBackgrounds.length > 0 && (
            <div className="mt-16">
              <BackgroundSelector
                selectedUrl={selectedBackgroundUrl}
                onSelect={setSelectedBackgroundUrl}
                backgrounds={appBackgrounds}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Single member + style selector ─── */

interface SingleMemberSelectorProps {
  flyerMemberId: string | null;
  setFlyerMemberId: (id: string | null) => void;
  flyerActionStyle: string;
  setFlyerActionStyle: (s: string) => void;
  membersWithActionPhotos: Participation[];
  selectedMemberStyles: string[];
}

function SingleMemberSelector({
  flyerMemberId, setFlyerMemberId,
  flyerActionStyle, setFlyerActionStyle,
  membersWithActionPhotos, selectedMemberStyles,
}: SingleMemberSelectorProps) {
  return (
    <>
      <label className="block fs-11 fw-600" style={{
        marginBottom: 6, color: 'var(--app-text-muted, #6b7280)',
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>Speler</label>
      <select
        value={flyerMemberId || ''}
        onChange={(e) => { setFlyerMemberId(e.target.value || null); setFlyerActionStyle('dribbling'); }}
        style={{
          width: '100%', padding: '8px 10px', fontSize: 13,
          border: '1px solid var(--app-border, #e5e7eb)', borderRadius: 6,
          background: 'var(--app-surface-2, #f3f4f6)', color: 'var(--app-text, #111)',
          cursor: 'pointer', marginBottom: 12,
        }}
      >
        <option value="">-- Automatisch (eerste beschikbare) --</option>
        {membersWithActionPhotos.map((member) => {
          const name = memberName(member);
          const shirtNr = (member.metadata as any)?.shirt_number;
          return <option key={member.id} value={member.id}>{shirtNr ? `#${shirtNr} ` : ''}{name}</option>;
        })}
        {membersWithActionPhotos.length === 0 && <option disabled>Geen spelers met actiefoto's</option>}
      </select>

      <label className="block fs-11 fw-600" style={{
        marginBottom: 6, color: 'var(--app-text-muted, #6b7280)',
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>Stijl</label>
      <select
        value={flyerActionStyle}
        onChange={(e) => setFlyerActionStyle(e.target.value)}
        style={{
          width: '100%', padding: '8px 10px', fontSize: 13,
          border: '1px solid var(--app-border, #e5e7eb)', borderRadius: 6,
          background: 'var(--app-surface-2, #f3f4f6)', color: 'var(--app-text, #111)',
          cursor: 'pointer',
        }}
      >
        {ACTION_STYLE_OPTIONS.map((opt) => {
          const available = !flyerMemberId || selectedMemberStyles.includes(opt.key);
          return <option key={opt.key} value={opt.key} disabled={!available}>{opt.label}{!available ? ' (niet beschikbaar)' : ''}</option>;
        })}
      </select>

      {flyerMemberId && selectedMemberStyles.length === 0 && (
        <div className="fs-11 mt-8" style={{ color: 'var(--color-amber-400)' }}>
           Deze speler heeft nog geen bewerkte actiefoto's
        </div>
      )}
    </>
  );
}

/* ─── Multi-slot selector (triple / hero_duo) ─── */

interface MultiSlotSelectorProps {
  flyerPhotoLayout: 'single' | 'triple' | 'hero_duo';
  flyerPhotoSlots: Array<{ member_id: string | null; style_variant: string }>;
  setFlyerPhotoSlots: (slots: Array<{ member_id: string | null; style_variant: string }>) => void;
  allMembers: Participation[];
  membersWithActionPhotos: Participation[];
}

function MultiSlotSelector({
  flyerPhotoLayout, flyerPhotoSlots, setFlyerPhotoSlots,
  allMembers, membersWithActionPhotos,
}: MultiSlotSelectorProps) {
  const slotCount = 3; // triple: 3, hero_duo: 1 big + 2 small = 3
  const slotLabels = flyerPhotoLayout === 'triple'
    ? ['\u2460 Links', '\u2461 Midden', '\u2462 Rechts']
    : ['\u2460 Groot (links)', '\u2461 Klein (rechtsboven)', '\u2462 Klein (rechtsonder)'];

  return (
    <>
      {Array.from({ length: slotCount }).map((_, slotIdx) => {
        const slot = flyerPhotoSlots[slotIdx] || { member_id: null, style_variant: 'dribbling' };
        const slotMemberStyles = slot.member_id
          ? extractMemberStyles(allMembers.find(m => m.id === slot.member_id)!)
          : [];

        return (
          <div key={slotIdx} style={{
            padding: 10, marginBottom: slotIdx < slotCount - 1 ? 8 : 0,
            border: '1px solid var(--app-border, #e5e7eb)',
            borderRadius: 8, background: 'var(--app-surface, white)',
          }}>
            <div style={{
              fontSize: 12, fontWeight: 700, marginBottom: 8,
              color: 'var(--app-text, #111)', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 22, height: 22, borderRadius: '50%',
                background: 'var(--app-primary, #3B8EA5)', color: '#fff',
                fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>{slotIdx + 1}</span>
              {slotLabels[slotIdx]}
            </div>

            <select
              value={slot.member_id || ''}
              onChange={(e) => {
                const newSlots = [...flyerPhotoSlots];
                newSlots[slotIdx] = { ...newSlots[slotIdx], member_id: e.target.value || null, style_variant: 'dribbling' };
                setFlyerPhotoSlots(newSlots);
              }}
              style={{
                width: '100%', padding: '6px 8px', fontSize: 12,
                border: '1px solid var(--app-border, #e5e7eb)', borderRadius: 5,
                background: 'var(--app-surface-2, #f3f4f6)', color: 'var(--app-text, #111)',
                cursor: 'pointer', marginBottom: 6,
              }}
            >
              <option value="">-- Automatisch --</option>
              {membersWithActionPhotos.map((member) => {
                const name = memberName(member);
                const shirtNr = (member.metadata as any)?.shirt_number;
                return <option key={member.id} value={member.id}>{shirtNr ? `#${shirtNr} ` : ''}{name}</option>;
              })}
            </select>

            <select
              value={slot.style_variant}
              onChange={(e) => {
                const newSlots = [...flyerPhotoSlots];
                newSlots[slotIdx] = { ...newSlots[slotIdx], style_variant: e.target.value };
                setFlyerPhotoSlots(newSlots);
              }}
              style={{
                width: '100%', padding: '6px 8px', fontSize: 12,
                border: '1px solid var(--app-border, #e5e7eb)', borderRadius: 5,
                background: 'var(--app-surface-2, #f3f4f6)', color: 'var(--app-text, #111)',
                cursor: 'pointer',
              }}
            >
              {ACTION_STYLE_OPTIONS.map((opt) => {
                const available = !slot.member_id || slotMemberStyles.includes(opt.key);
                return <option key={opt.key} value={opt.key} disabled={!available}>{opt.label}{!available ? ' \u2014' : ''}</option>;
              })}
            </select>
          </div>
        );
      })}
    </>
  );
}

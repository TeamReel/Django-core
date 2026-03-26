/**
 * ConfirmStepFlyer — Match Flyer variant picker + action photo settings.
 * Extracted from ConfirmStep to keep each file under 500 lines.
 */
import React from 'react';
import type { Participation } from './types';
import { BackgroundSelector, type BackgroundItem } from './BackgroundSelector';
import css from './ConfirmStepFlyer.module.css';

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
  const tr = member.metadata?.teamreel_assets || {};
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
    const tr = member.metadata?.teamreel_assets || {};
    const actionImgs = tr?.images?.action_photo || {};
    return Object.keys(actionImgs).length > 0;
  });

  const selectedMemberStyles: string[] = (() => {
    if (!flyerMemberId) return [];
    const member = allMembers.find(m => m.id === flyerMemberId);
    return member ? extractMemberStyles(member) : [];
  })();

  return (
    <div className="w-full max-w-480 mt-20">
      {/* Variant picker */}
      <label className="block fs-12 fw-600 text-muted uppercase tracking-wide mb-10">Ontwerpstijl</label>
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
              className={`relative flex-row items-center gap-12 rounded-12 cursor-pointer text-left w-full text-primary py-12 px-16 transition ${css.variantButton}`}
              data-selected={isSelected}
            >
              <div className={`flex-center fs-16 fw-700 rounded-10 ${css.variantIcon}`} data-selected={isSelected}>{opt.icon}</div>
              <div className="flex-1">
                <div className="fw-600 fs-14">{opt.label}</div>
                <div className={`fs-12 text-muted ${css.variantDesc}`}>{opt.desc}</div>
              </div>
              {isSelected && (
                <div className={`absolute rounded-full flex-center fw-700 text-white ${css.checkMark}`}>OK</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Action variant settings */}
      {matchFlyerVariant === 'action' && (
        <div className="mt-16 p-16 border bg-surface-2 rounded-10">
          <div className="fs-13 fw-700 mb-12 text-primary">
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
            <label className="block fs-11 fw-600 mb-8 text-muted uppercase tracking-wide">Foto Layout</label>
            <div className="flex-row gap-8">
              {([
                { key: 'single' as const, label: '1 Groot', icon: '\u25A0', desc: '1 actiefoto' },
                { key: 'triple' as const, label: '3 Naast', icon: '\u25A0\u25A0\u25A0', desc: '3 naast elkaar' },
                { key: 'hero_duo' as const, label: '1+2', icon: '+', desc: '1 groot + 2 klein' },
              ] as const).map((opt) => {
                const isActive = flyerPhotoLayout === opt.key;
                return (
                  <button key={opt.key} onClick={() => setFlyerPhotoLayout(opt.key)} className={`flex-1 rounded-8 cursor-pointer text-center fs-11 py-8 px-4 ${css.layoutButton}`} data-active={isActive}>
                    <div className={`fs-16 ${css.layoutIcon}`}>{opt.icon}</div>
                    <div className="fw-700">{opt.label}</div>
                    <div className={css.layoutDesc}>{opt.desc}</div>
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
      <label className="form-label-upper">Speler</label>
      <select
        value={flyerMemberId || ''}
        onChange={(e) => {
          const memberId = e.target.value || null;
          setFlyerMemberId(memberId);
          if (memberId) {
            const member = membersWithActionPhotos.find(m => m.id === memberId);
            const styles = member ? extractMemberStyles(member) : [];
            setFlyerActionStyle(styles.length > 0 ? styles[0] : 'dribbling');
          } else {
            setFlyerActionStyle('dribbling');
          }
        }}
        className={`w-full fs-13 rounded-6 bg-surface-2 text-primary cursor-pointer mb-12 ${css.selectInput}`}
      >
        <option value="">-- Automatisch (eerste beschikbare) --</option>
        {membersWithActionPhotos.map((member) => {
          const name = memberName(member);
          const shirtNr = member.metadata?.shirt_number;
          return <option key={member.id} value={member.id}>{shirtNr ? `#${shirtNr} ` : ''}{name}</option>;
        })}
        {membersWithActionPhotos.length === 0 && <option disabled>Geen spelers met actiefoto's</option>}
      </select>

      <label className="form-label-upper">Stijl</label>
      <select
        value={flyerActionStyle}
        onChange={(e) => setFlyerActionStyle(e.target.value)}
        className={`w-full fs-13 rounded-6 bg-surface-2 text-primary cursor-pointer ${css.selectInput}`}
      >
        {ACTION_STYLE_OPTIONS.map((opt) => {
          const available = !flyerMemberId || selectedMemberStyles.includes(opt.key);
          return <option key={opt.key} value={opt.key} disabled={!available}>{opt.label}{!available ? ' (niet beschikbaar)' : ''}</option>;
        })}
      </select>

      {flyerMemberId && selectedMemberStyles.length === 0 && (
        <div className={`fs-11 mt-8 ${css.warningText}`}>
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
    <div className={css.slotList}>
      {Array.from({ length: slotCount }).map((_, slotIdx) => {
        const slot = flyerPhotoSlots[slotIdx] || { member_id: null, style_variant: 'dribbling' };
        const slotMemberStyles = slot.member_id
          ? extractMemberStyles(allMembers.find(m => m.id === slot.member_id)!)
          : [];

        return (
          <div key={slotIdx} className="p-10 border rounded-8 bg-surface">
            <div className="fs-12 fw-700 mb-8 text-primary flex-row items-center gap-6">
              <span className={`inline-flex flex-center rounded-full fs-11 fw-700 text-white ${css.slotBadge}`}>{slotIdx + 1}</span>
              {slotLabels[slotIdx]}
            </div>

            <select
              value={slot.member_id || ''}
              onChange={(e) => {
                const memberId = e.target.value || null;
                const newSlots = [...flyerPhotoSlots];
                let styleVariant = 'dribbling';
                if (memberId) {
                  const member = allMembers.find(m => m.id === memberId);
                  const styles = member ? extractMemberStyles(member) : [];
                  if (styles.length > 0) styleVariant = styles[0];
                }
                newSlots[slotIdx] = { ...newSlots[slotIdx], member_id: memberId, style_variant: styleVariant };
                setFlyerPhotoSlots(newSlots);
              }}
              className={`w-full fs-12 bg-surface-2 text-primary cursor-pointer ${css.slotSelectMember}`}
            >
              <option value="">-- Automatisch --</option>
              {membersWithActionPhotos.map((member) => {
                const name = memberName(member);
                const shirtNr = member.metadata?.shirt_number;
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
              className={`w-full fs-12 bg-surface-2 text-primary cursor-pointer ${css.slotSelect}`}
            >
              {ACTION_STYLE_OPTIONS.map((opt) => {
                const available = !slot.member_id || slotMemberStyles.includes(opt.key);
                return <option key={opt.key} value={opt.key} disabled={!available}>{opt.label}{!available ? ' \u2014' : ''}</option>;
              })}
            </select>
          </div>
        );
      })}
    </div>
  );
}

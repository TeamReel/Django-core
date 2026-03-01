import React from 'react';
import type { ContentTemplate, Participation } from './types';

interface ConfirmStepProps {
  selectedType: { type: string; subtype: string; label: string } | null;
  selectedTemplate: ContentTemplate | null;
  contentTypeLabel?: string;
  matchData: {
    id: string;
    title?: string;
    project?: { id: string; name: string };
    opponent_project?: { id: string; name: string };
    start_time?: string;
  } | null;
  seasonSquad: Record<string, Participation[]>;
  // Match flyer
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
  // Goal celebration
  goalScoreHome: number;
  setGoalScoreHome: (n: number) => void;
  goalScoreAway: number;
  setGoalScoreAway: (n: number) => void;
  goalScorerId: string | null;
  setGoalScorerId: (id: string | null) => void;
  // Match summary
  summaryScoreHome: number;
  setSummaryScoreHome: (n: number) => void;
  summaryScoreAway: number;
  setSummaryScoreAway: (n: number) => void;
  summaryGoalScorers: string;
  setSummaryGoalScorers: (s: string) => void;
  // Background
  selectedBackgroundUrl: string | null;
  setSelectedBackgroundUrl: (url: string | null) => void;
  appBackgrounds: Array<{ id: string; url: string; label?: string; profile_name?: string }>;
  // Team names and logos
  homeTeamName: string;
  awayTeamName: string;
  homeLogoUrl?: string | null;
  awayLogoUrl?: string | null;
}

export function ConfirmStep({
  selectedType,
  selectedTemplate,
  contentTypeLabel,
  matchData,
  seasonSquad,
  matchFlyerVariant,
  setMatchFlyerVariant,
  flyerMemberId,
  setFlyerMemberId,
  flyerActionStyle,
  setFlyerActionStyle,
  flyerPhotoLayout,
  setFlyerPhotoLayout,
  flyerPhotoSlots,
  setFlyerPhotoSlots,
  goalScoreHome,
  setGoalScoreHome,
  goalScoreAway,
  setGoalScoreAway,
  goalScorerId,
  setGoalScorerId,
  summaryScoreHome,
  setSummaryScoreHome,
  summaryScoreAway,
  setSummaryScoreAway,
  summaryGoalScorers,
  setSummaryGoalScorers,
  selectedBackgroundUrl,
  setSelectedBackgroundUrl,
  appBackgrounds,
  homeTeamName,
  awayTeamName,
  homeLogoUrl,
  awayLogoUrl,
}: ConfirmStepProps) {
  return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '16px', marginBottom: '20px',
                backgroundColor: 'var(--app-primary-light, rgba(59,142,165,0.1))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--app-primary, #3B8EA5)', fontSize: '28px', fontWeight: 700,
              }}>
                {(selectedType?.label || contentTypeLabel || '?').charAt(0).toUpperCase()}
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: 'var(--app-text, #111)' }}>
                {selectedType?.subtype === 'goal' ? 'Doelpunt Viering Video' : selectedType?.subtype === 'flyer' ? 'Match Flyer' : selectedType?.subtype === 'match_intro' ? 'Wedstrijd Intro Video' : 'Klaar om te genereren'}
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--app-text-muted, #6b7280)', marginBottom: '24px', textAlign: 'center', maxWidth: '400px' }}>
                {selectedType?.subtype === 'goal'
                  ? 'Vul de doelpuntgegevens in en kies een speler.'
                  : selectedType?.subtype === 'flyer'
                    ? 'Kies een ontwerpstijl en genereer je match flyer.'
                    : selectedType?.subtype === 'match_intro'
                      ? 'Er wordt een 6 seconden intro video gegenereerd met header, logo\'s en wedstrijdinfo.'
                      : <>Je gaat een <strong>{selectedType?.label || selectedTemplate?.name}</strong> maken.</>
                }
              </p>

              {/* Match info */}
              {matchData && (
                <div style={{
                  width: '100%',
                  maxWidth: 480,
                  padding: '14px 18px',
                  borderRadius: 10,
                  border: '1px solid var(--app-border, #e5e7eb)',
                  background: 'var(--app-surface-2, #f3f4f6)',
                }}>
                  <div style={{ fontSize: 13, color: 'var(--app-text, #111)' }}>
                    <strong>Wedstrijd:</strong> {matchData.title || `${matchData.project?.name} vs ${matchData.opponent_project?.name || 'Opponent'}`}
                  </div>
                  {matchData.start_time && (
                    <div style={{ fontSize: 13, color: 'var(--app-text-muted, #6b7280)', marginTop: 4 }}>
                      {new Date(matchData.start_time).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                  )}
                </div>
              )}

              {/* Match Flyer Variant Picker */}
              {selectedType?.subtype === 'flyer' && (
                <div style={{ width: '100%', maxWidth: 480, marginTop: 20 }}>
                  <label style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 10,
                    color: 'var(--app-text-muted, #6b7280)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>Ontwerpstijl</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {([
                      { key: 'modern' as const, label: 'Modern', desc: 'Geometrisch design met clubkleuren en vormen', icon: 'M' },
                      { key: 'action' as const, label: 'Actie', desc: 'Samengestelde flyer met actiefoto & clubkleuren', icon: 'A' },
                      { key: 'stadium' as const, label: 'Stadium AI', desc: 'AI-gegenereerde stadion achtergrond', icon: 'S' },
                    ]).map((opt) => {
                      const isSelected = matchFlyerVariant === opt.key;
                      return (
                        <button
                          key={opt.key}
                          onClick={() => {
                            setMatchFlyerVariant(opt.key);
                            // Auto-select first member with action photo when switching to action variant
                            if (opt.key === 'action' && !flyerMemberId) {
                              const allMembers = [...(seasonSquad.goalkeeper || []), ...(seasonSquad.player || [])]
                                .filter((p, idx, arr) => {
                                  const uid = (p.user || p.member)?.id;
                                  return uid ? arr.findIndex(x => (x.user || x.member)?.id === uid) === idx : arr.findIndex(x => x.id === p.id) === idx;
                                });
                              const firstWithPhoto = allMembers.find((member) => {
                                const tr = (member.metadata as any)?.teamreel_assets || {};
                                const actionImgs = tr?.images?.action_photo || {};
                                return Object.keys(actionImgs).length > 0;
                              });
                              if (firstWithPhoto) {
                                setFlyerMemberId(firstWithPhoto.id);
                                // Auto-select first available style
                                const tr = (firstWithPhoto.metadata as any)?.teamreel_assets || {};
                                const actionImgs = tr?.images?.action_photo || {};
                                const firstKey = Object.keys(actionImgs)[0] || '';
                                const parts = firstKey.split('_');
                                if (parts.length >= 2) {
                                  setFlyerActionStyle(parts.slice(1).join('_'));
                                }
                              }
                            }
                          }}
                          style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '12px 16px',
                            border: isSelected
                              ? '2px solid var(--app-primary, #3B8EA5)'
                              : '1px solid var(--app-border, #e5e7eb)',
                            borderRadius: 12,
                            background: isSelected
                              ? 'var(--app-primary-light, rgba(59,142,165,0.08))'
                              : 'var(--app-surface, white)',
                            color: 'var(--app-text, #111)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            textAlign: 'left',
                            width: '100%',
                          }}
                        >
                          <div style={{
                            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                            backgroundColor: isSelected ? 'var(--app-primary, #3B8EA5)' : 'var(--app-surface-2, #f3f4f6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 16, fontWeight: 700,
                            color: isSelected ? 'white' : 'var(--app-primary, #3B8EA5)',
                          }}>{opt.icon}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{opt.label}</div>
                            <div style={{ fontSize: 12, color: 'var(--app-text-muted, #6b7280)', marginTop: 1 }}>
                              {opt.desc}
                            </div>
                          </div>
                          {isSelected && (
                            <div style={{
                              position: 'absolute', top: 6, right: 6,
                              width: 18, height: 18, borderRadius: '50%',
                              background: '#10b981', display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                              fontSize: 10, color: '#fff', fontWeight: 700,
                            }}>✓</div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Action variant: member + style selection */}
                  {matchFlyerVariant === 'action' && (() => {
                    const actionStyleOptions = [
                      { key: 'dribbling', label: 'Dribbelen' },
                      { key: 'shooting', label: 'Schieten' },
                      { key: 'ball_at_feet', label: 'Bal aan de voet' },
                      { key: 'celebrating', label: 'Vieren' },
                      { key: 'heading', label: 'Koppen' },
                      { key: 'sliding_tackle', label: 'Sliding' },
                      { key: 'karate_kick', label: 'Karatetrap' },
                    ];

                    // Find members that have at least one action photo (dedup by user identity)
                    const allMembers = [...(seasonSquad.goalkeeper || []), ...(seasonSquad.player || [])]
                      .filter((p, idx, arr) => {
                        // Dedup by user id to prevent same person appearing multiple times
                        const uid = (p.user || p.member)?.id;
                        return uid ? arr.findIndex(x => (x.user || x.member)?.id === uid) === idx : arr.findIndex(x => x.id === p.id) === idx;
                      });

                    const membersWithActionPhotos = allMembers.filter((member) => {
                      const tr = (member.metadata as any)?.teamreel_assets || {};
                      const actionImgs = tr?.images?.action_photo || {};
                      return Object.keys(actionImgs).length > 0;
                    });

                    // For the selected member, find which styles have photos
                    const selectedMemberStyles: string[] = (() => {
                      if (!flyerMemberId) return [];
                      const member = allMembers.find(m => m.id === flyerMemberId);
                      if (!member) return [];
                      const tr = (member.metadata as any)?.teamreel_assets || {};
                      const actionImgs = tr?.images?.action_photo || {};
                      // Keys like "home_dribbling", "away_ball_at_feet" — extract style part
                      const styles = new Set<string>();
                      for (const key of Object.keys(actionImgs)) {
                        // Composite key: {kit}_{style} or {kit}_{style1}_{style2}
                        const parts = key.split('_');
                        if (parts.length >= 2) {
                          styles.add(parts.slice(1).join('_'));
                        }
                      }
                      return Array.from(styles);
                    })();

                    return (
                      <div style={{
                        marginTop: 16,
                        padding: 16,
                        border: '1px solid var(--app-border, #e5e7eb)',
                        borderRadius: 10,
                        background: 'var(--app-surface-2, #f3f4f6)',
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--app-text, #111)' }}>
                          Actiefoto instellingen
                        </div>

                        {/* Member selector */}
                        {flyerPhotoLayout === 'single' ? (
                          <>
                            <label style={{
                              display: 'block',
                              fontSize: 11,
                              fontWeight: 600,
                              marginBottom: 6,
                              color: 'var(--app-text-muted, #6b7280)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}>Speler</label>
                            <select
                              value={flyerMemberId || ''}
                              onChange={(e) => {
                                setFlyerMemberId(e.target.value || null);
                                setFlyerActionStyle('dribbling');
                              }}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                fontSize: 13,
                                border: '1px solid var(--app-border, #e5e7eb)',
                                borderRadius: 6,
                                background: 'var(--app-surface-2, #f3f4f6)',
                                color: 'var(--app-text, #111)',
                                cursor: 'pointer',
                                marginBottom: 12,
                              }}
                            >
                              <option value="">-- Automatisch (eerste beschikbare) --</option>
                              {membersWithActionPhotos.map((member) => {
                                const user = member.user || member.member;
                                const name = user ? (
                                  ('name' in user && user.name) ||
                                  ('user_name' in user && user.user_name) ||
                                  `${user.first_name || ''} ${user.last_name || ''}`.trim()
                                ) : 'Unknown';
                                const shirtNr = (member.metadata as any)?.shirt_number;
                                return (
                                  <option key={member.id} value={member.id}>
                                    {shirtNr ? `#${shirtNr} ` : ''}{name}
                                  </option>
                                );
                              })}
                              {membersWithActionPhotos.length === 0 && (
                                <option disabled>Geen spelers met actiefoto's</option>
                              )}
                            </select>

                            <label style={{
                              display: 'block',
                              fontSize: 11,
                              fontWeight: 600,
                              marginBottom: 6,
                              color: 'var(--app-text-muted, #6b7280)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}>Stijl</label>
                            <select
                              value={flyerActionStyle}
                              onChange={(e) => setFlyerActionStyle(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                fontSize: 13,
                                border: '1px solid var(--app-border, #e5e7eb)',
                                borderRadius: 6,
                                background: 'var(--app-surface-2, #f3f4f6)',
                                color: 'var(--app-text, #111)',
                                cursor: 'pointer',
                              }}
                            >
                              {actionStyleOptions.map((opt) => {
                                const available = !flyerMemberId || selectedMemberStyles.includes(opt.key);
                                return (
                                  <option key={opt.key} value={opt.key} disabled={!available}>
                                    {opt.label}{!available ? ' (niet beschikbaar)' : ''}
                                  </option>
                                );
                              })}
                            </select>

                            {flyerMemberId && selectedMemberStyles.length === 0 && (
                              <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 8 }}>
                                 Deze speler heeft nog geen bewerkte actiefoto's
                              </div>
                            )}
                          </>
                        ) : (
                          /* Per-slot selectors for triple / hero_duo layouts */
                          <>
                            {(() => {
                              const slotCount = flyerPhotoLayout === 'triple' ? 3 : 3; // hero_duo: 1 big + 2 small = 3
                              const slotLabels = flyerPhotoLayout === 'triple'
                                ? ['\u2460 Links', '\u2461 Midden', '\u2462 Rechts']
                                : ['\u2460 Groot (links)', '\u2461 Klein (rechtsboven)', '\u2462 Klein (rechtsonder)'];

                              return Array.from({ length: slotCount }).map((_, slotIdx) => {
                                const slot = flyerPhotoSlots[slotIdx] || { member_id: null, style_variant: 'dribbling' };

                                // Get styles available for this slot's selected member
                                const slotMemberStyles: string[] = (() => {
                                  if (!slot.member_id) return [];
                                  const member = allMembers.find(m => m.id === slot.member_id);
                                  if (!member) return [];
                                  const tr = (member.metadata as any)?.teamreel_assets || {};
                                  const actionImgs = tr?.images?.action_photo || {};
                                  const styles = new Set<string>();
                                  for (const key of Object.keys(actionImgs)) {
                                    const parts = key.split('_');
                                    if (parts.length >= 2) styles.add(parts.slice(1).join('_'));
                                  }
                                  return Array.from(styles);
                                })();

                                return (
                                  <div key={slotIdx} style={{
                                    padding: 10,
                                    marginBottom: slotIdx < slotCount - 1 ? 8 : 0,
                                    border: '1px solid var(--app-border, #e5e7eb)',
                                    borderRadius: 8,
                                    background: 'var(--app-surface, white)',
                                  }}>
                                    <div style={{
                                      fontSize: 12,
                                      fontWeight: 700,
                                      marginBottom: 8,
                                      color: 'var(--app-text, #111)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 6,
                                    }}>
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 22,
                                        height: 22,
                                        borderRadius: '50%',
                                        background: 'var(--app-primary, #3B8EA5)',
                                        color: '#fff',
                                        fontSize: 11,
                                        fontWeight: 700,
                                        flexShrink: 0,
                                      }}>{slotIdx + 1}</span>
                                      {slotLabels[slotIdx]}
                                    </div>

                                    <select
                                      value={slot.member_id || ''}
                                      onChange={(e) => {
                                        const newSlots = [...flyerPhotoSlots];
                                        newSlots[slotIdx] = {
                                          ...newSlots[slotIdx],
                                          member_id: e.target.value || null,
                                          style_variant: 'dribbling',
                                        };
                                        setFlyerPhotoSlots(newSlots);
                                      }}
                                      style={{
                                        width: '100%',
                                        padding: '6px 8px',
                                        fontSize: 12,
                                        border: '1px solid var(--app-border, #e5e7eb)',
                                        borderRadius: 5,
                                        background: 'var(--app-surface-2, #f3f4f6)',
                                        color: 'var(--app-text, #111)',
                                        cursor: 'pointer',
                                        marginBottom: 6,
                                      }}
                                    >
                                      <option value="">-- Automatisch --</option>
                                      {membersWithActionPhotos.map((member) => {
                                        const user = member.user || member.member;
                                        const name = user ? (
                                          ('name' in user && user.name) ||
                                          ('user_name' in user && user.user_name) ||
                                          `${user.first_name || ''} ${user.last_name || ''}`.trim()
                                        ) : 'Unknown';
                                        const shirtNr = (member.metadata as any)?.shirt_number;
                                        return (
                                          <option key={member.id} value={member.id}>
                                            {shirtNr ? `#${shirtNr} ` : ''}{name}
                                          </option>
                                        );
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
                                        width: '100%',
                                        padding: '6px 8px',
                                        fontSize: 12,
                                        border: '1px solid var(--app-border, #e5e7eb)',
                                        borderRadius: 5,
                                        background: 'var(--app-surface-2, #f3f4f6)',
                                        color: 'var(--app-text, #111)',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {actionStyleOptions.map((opt) => {
                                        const available = !slot.member_id || slotMemberStyles.includes(opt.key);
                                        return (
                                          <option key={opt.key} value={opt.key} disabled={!available}>
                                            {opt.label}{!available ? ' \u2014' : ''}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </div>
                                );
                              });
                            })()}
                          </>
                        )}

                        {/* Photo layout selector */}
                        <div style={{ marginTop: 16 }}>
                          <label style={{
                            display: 'block',
                            fontSize: 11,
                            fontWeight: 600,
                            marginBottom: 8,
                            color: 'var(--app-text-muted, #6b7280)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}>Foto Layout</label>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {([
                              { key: 'single' as const, label: '1 Groot', icon: '\u25A0', desc: '1 actiefoto' },
                              { key: 'triple' as const, label: '3 Naast', icon: '\u25A0\u25A0\u25A0', desc: '3 naast elkaar' },
                              { key: 'hero_duo' as const, label: '1+2', icon: '+', desc: '1 groot + 2 klein' },
                            ] as const).map((opt) => {
                              const isActive = flyerPhotoLayout === opt.key;
                              return (
                                <button
                                  key={opt.key}
                                  onClick={() => setFlyerPhotoLayout(opt.key)}
                                  style={{
                                    flex: 1,
                                    padding: '8px 4px',
                                    border: isActive
                                      ? '2px solid var(--app-primary, #3B8EA5)'
                                      : '1px solid var(--app-border, #e5e7eb)',
                                    borderRadius: 8,
                                    background: isActive
                                      ? 'var(--app-primary-light, rgba(59,142,165,0.08))'
                                      : 'var(--app-surface-2, #f3f4f6)',
                                    color: isActive ? '#fff' : 'var(--app-text, #111)',
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    fontSize: 11,
                                    lineHeight: 1.4,
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  <div style={{ fontSize: 16, marginBottom: 2 }}>{opt.icon}</div>
                                  <div style={{ fontWeight: 700 }}>{opt.label}</div>
                                  <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2 }}>{opt.desc}</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Background selector for action flyer */}
                        {appBackgrounds.length > 0 && (
                          <div style={{ marginTop: 16 }}>
                            <label style={{
                              display: 'block',
                              fontSize: 11,
                              fontWeight: 600,
                              marginBottom: 8,
                              color: 'var(--app-text-muted, #6b7280)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}>Achtergrond</label>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
                              gap: 6,
                            }}>
                              {/* Default — no custom background */}
                              <button
                                onClick={() => setSelectedBackgroundUrl(null)}
                                style={{
                                  position: 'relative',
                                  border: !selectedBackgroundUrl
                                    ? '2px solid var(--app-primary, #3B8EA5)'
                                    : '1px solid var(--app-border, #e5e7eb)',
                                  borderRadius: 6,
                                  overflow: 'hidden',
                                  cursor: 'pointer',
                                  padding: 0,
                                  background: !selectedBackgroundUrl
                                    ? 'var(--app-primary-light, rgba(59,142,165,0.08))'
                                    : 'var(--app-surface, white)',
                                }}
                              >
                                <div style={{
                                  width: '100%',
                                  aspectRatio: '9/16',
                                  background: 'linear-gradient(to bottom, #16a34a, #14532d)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}>

                                </div>
                                <div style={{
                                  padding: '2px 0',
                                  textAlign: 'center',
                                  fontWeight: 600,
                                  fontSize: 9,
                                  color: !selectedBackgroundUrl ? '#fff' : 'var(--app-text, #111)',
                                  background: !selectedBackgroundUrl
                                    ? 'var(--app-primary, #3B8EA5)'
                                    : 'var(--app-surface-2, #f3f4f6)',
                                }}>Standaard</div>
                                {!selectedBackgroundUrl && (
                                  <div style={{
                                    position: 'absolute', top: 2, right: 2,
                                    width: 14, height: 14, borderRadius: '50%',
                                    background: '#10b981', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    fontSize: 8, color: '#fff', fontWeight: 700,
                                  }}>✓</div>
                                )}
                              </button>

                              {appBackgrounds.map((bg) => {
                                const isSelected = selectedBackgroundUrl === bg.url;
                                return (
                                  <button
                                    key={bg.id}
                                    onClick={() => setSelectedBackgroundUrl(bg.url)}
                                    style={{
                                      position: 'relative',
                                      border: isSelected
                                        ? '2px solid var(--app-primary, #3B8EA5)'
                                        : '1px solid var(--app-border, #e5e7eb)',
                                      borderRadius: 6,
                                      overflow: 'hidden',
                                      cursor: 'pointer',
                                      padding: 0,
                                      background: isSelected
                                        ? 'var(--app-primary-light, rgba(59,142,165,0.08))'
                                        : 'var(--app-surface, white)',
                                    }}
                                  >
                                    <div style={{
                                      width: '100%',
                                      aspectRatio: '9/16',
                                      background: `url(${bg.url}) center/cover`,
                                    }} />
                                    <div style={{
                                      padding: '2px 0',
                                      textAlign: 'center',
                                      fontWeight: 600,
                                      fontSize: 9,
                                      color: isSelected ? '#fff' : 'var(--app-text, #111)',
                                      background: isSelected
                                        ? 'var(--app-primary, #3B8EA5)'
                                        : 'var(--app-surface-2, #f3f4f6)',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}>
                                      {bg.label || bg.profile_name || 'Locatie'}
                                    </div>
                                    {isSelected && (
                                      <div style={{
                                        position: 'absolute', top: 2, right: 2,
                                        width: 14, height: 14, borderRadius: '50%',
                                        background: '#10b981', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center',
                                        fontSize: 8, color: '#fff', fontWeight: 700,
                                      }}>✓</div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Match Summary Options */}
              {selectedType?.subtype === 'match_summary' && (
                <div style={{
                  width: '100%',
                  maxWidth: 480,
                  marginTop: 20,
                  border: '1px solid var(--app-border, #e5e7eb)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: 'var(--app-surface, white)',
                }}>
                  <div style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--app-border, #e5e7eb)',
                    background: 'var(--app-surface-2, #f3f4f6)',
                  }}>
                    <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--app-text, #111)' }}>
                      Wedstrijd Samenvatting
                    </h4>
                  </div>

                  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Score input */}
                    <div>
                      <label style={{
                        display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 8,
                        color: 'var(--app-text-muted, #6b7280)',
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>Eindstand</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 11, color: 'var(--app-text-muted, #6b7280)', marginBottom: 4 }}>
                            {homeTeamName}
                          </div>
                          <input
                            type="number"
                            min={0}
                            max={99}
                            value={summaryScoreHome}
                            onChange={(e) => setSummaryScoreHome(Math.max(0, parseInt(e.target.value) || 0))}
                            style={{
                              width: 60, padding: '10px', fontSize: 28, fontWeight: 700,
                              textAlign: 'center', borderRadius: 8,
                              border: '1px solid var(--app-border, #e5e7eb)',
                              background: 'var(--app-surface-2, #f3f4f6)',
                              color: 'var(--app-text, #111)',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--app-text, #111)' }}>-</span>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 11, color: 'var(--app-text-muted, #6b7280)', marginBottom: 4 }}>
                            {awayTeamName}
                          </div>
                          <input
                            type="number"
                            min={0}
                            max={99}
                            value={summaryScoreAway}
                            onChange={(e) => setSummaryScoreAway(Math.max(0, parseInt(e.target.value) || 0))}
                            style={{
                              width: 60, padding: '10px', fontSize: 28, fontWeight: 700,
                              textAlign: 'center', borderRadius: 8,
                              border: '1px solid var(--app-border, #e5e7eb)',
                              background: 'var(--app-surface-2, #f3f4f6)',
                              color: 'var(--app-text, #111)',
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Goal scorers */}
                    <div>
                      <label style={{
                        display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6,
                        color: 'var(--app-text-muted, #6b7280)',
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>Doelpuntenmakers (1 per regel)</label>
                      <textarea
                        value={summaryGoalScorers}
                        onChange={(e) => setSummaryGoalScorers(e.target.value)}
                        placeholder={"De Jong 23'\nBerghuis 67'\nKluivert 89'"}
                        rows={5}
                        style={{
                          width: '100%', padding: '10px', fontSize: 13,
                          borderRadius: 8, resize: 'vertical',
                          border: '1px solid var(--app-border, #e5e7eb)',
                          background: 'var(--app-surface-2, #f3f4f6)',
                          color: 'var(--app-text, #111)',
                          fontFamily: 'inherit',
                        }}
                      />
                    </div>

                    {/* Background selector (reuse appBackgrounds) */}
                    {appBackgrounds.length > 0 && (
                      <div>
                        <label style={{
                          display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 8,
                          color: 'var(--app-text-muted, #6b7280)',
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>Achtergrond</label>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
                          gap: 6,
                        }}>
                          <button
                            onClick={() => setSelectedBackgroundUrl(null)}
                            style={{
                              position: 'relative',
                              border: !selectedBackgroundUrl
                                ? '2px solid var(--app-primary, #3B8EA5)'
                                : '1px solid var(--app-border, #e5e7eb)',
                              borderRadius: 6, overflow: 'hidden', cursor: 'pointer', padding: 0,
                              background: !selectedBackgroundUrl
                                ? 'var(--app-primary-light, rgba(59,142,165,0.08))'
                                : 'var(--app-surface, white)',
                            }}
                          >
                            <div style={{
                              width: '100%', aspectRatio: '9/16',
                              background: 'linear-gradient(to bottom, #16a34a, #14532d)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>

                            </div>
                            <div style={{
                              padding: '2px 0', textAlign: 'center', fontWeight: 600, fontSize: 9,
                              color: !selectedBackgroundUrl ? '#fff' : 'var(--app-text, #111)',
                              background: !selectedBackgroundUrl
                                ? 'var(--app-primary, #3B8EA5)'
                                : 'var(--app-surface-2, #f3f4f6)',
                            }}>Standaard</div>
                          </button>
                          {appBackgrounds.map((bg) => {
                            const isSelected = selectedBackgroundUrl === bg.url;
                            return (
                              <button
                                key={bg.id}
                                onClick={() => setSelectedBackgroundUrl(bg.url)}
                                style={{
                                  position: 'relative',
                                  border: isSelected
                                    ? '2px solid var(--app-primary, #3B8EA5)'
                                    : '1px solid var(--app-border, #e5e7eb)',
                                  borderRadius: 6, overflow: 'hidden', cursor: 'pointer', padding: 0,
                                  background: isSelected
                                    ? 'var(--app-primary-light, rgba(59,142,165,0.08))'
                                    : 'var(--app-surface, white)',
                                }}
                              >
                                <div style={{
                                  width: '100%', aspectRatio: '9/16',
                                  background: `url(${bg.url}) center/cover`,
                                }} />
                                <div style={{
                                  padding: '2px 0', textAlign: 'center', fontWeight: 600, fontSize: 9,
                                  color: isSelected ? '#fff' : 'var(--app-text, #111)',
                                  background: isSelected
                                    ? 'var(--app-primary, #3B8EA5)'
                                    : 'var(--app-surface-2, #f3f4f6)',
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>{bg.label || bg.profile_name || 'Locatie'}</div>
                                {isSelected && (
                                  <div style={{
                                    position: 'absolute', top: 2, right: 2,
                                    width: 14, height: 14, borderRadius: '50%',
                                    background: '#10b981', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    fontSize: 8, color: '#fff', fontWeight: 700,
                                  }}>✓</div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Goal Celebration Options */}
              {selectedType?.subtype === 'goal' && (
                <div style={{
                  width: '100%',
                  maxWidth: 480,
                  marginTop: 20,
                  border: '1px solid var(--app-border, #e5e7eb)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: 'var(--app-surface, white)',
                }}>
                  {/* Section header */}
                  <div style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--app-border, #e5e7eb)',
                    background: 'var(--app-surface-2, #f3f4f6)',
                  }}>
                    <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--app-text, #111)' }}>
                      Doelpunt Details
                    </h4>
                  </div>

                  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Score input */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: 12,
                        fontWeight: 600,
                        marginBottom: 10,
                        color: 'var(--app-text-muted, #6b7280)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>Nieuwe Stand</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center' }}>
                        {/* Home team */}
                        <div style={{ textAlign: 'center', minWidth: 80 }}>
                          {homeLogoUrl ? (
                            <img src={homeLogoUrl} alt="" style={{ width: 28, height: 28, objectFit: 'contain', margin: '0 auto 4px' }} />
                          ) : null}
                          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: 'var(--app-text-muted, #6b7280)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90 }}>
                            {homeTeamName}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 0, justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => setGoalScoreHome(Math.max(0, goalScoreHome - 1))}
                              style={{
                                width: 32, height: 56, border: '2px solid var(--app-border, #e5e7eb)', borderRight: 'none',
                                borderRadius: '8px 0 0 8px', background: 'var(--app-surface, white)',
                                color: 'var(--app-text-muted, #6b7280)', fontSize: 18, fontWeight: 700, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                            >{'\u2212'}</button>
                            <div style={{
                              width: 48, height: 56, fontSize: 28, fontWeight: 700,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              borderTop: '2px solid var(--app-border, #e5e7eb)',
                              borderBottom: '2px solid var(--app-border, #e5e7eb)',
                              background: 'var(--app-surface, white)',
                              color: 'var(--app-text, #111)',
                            }}>{goalScoreHome}</div>
                            <button
                              type="button"
                              onClick={() => setGoalScoreHome(Math.min(99, goalScoreHome + 1))}
                              style={{
                                width: 32, height: 56, border: '2px solid var(--app-border, #e5e7eb)', borderLeft: 'none',
                                borderRadius: '0 8px 8px 0', background: 'var(--app-surface, white)',
                                color: 'var(--app-text-muted, #6b7280)', fontSize: 18, fontWeight: 700, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                            >+</button>
                          </div>
                        </div>
                        <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--app-text-muted, #6b7280)', marginTop: 20 }}>-</span>
                        {/* Away team */}
                        <div style={{ textAlign: 'center', minWidth: 80 }}>
                          {awayLogoUrl ? (
                            <img src={awayLogoUrl} alt="" style={{ width: 28, height: 28, objectFit: 'contain', margin: '0 auto 4px' }} />
                          ) : null}
                          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: 'var(--app-text-muted, #6b7280)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90 }}>
                            {awayTeamName}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 0, justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => setGoalScoreAway(Math.max(0, goalScoreAway - 1))}
                              style={{
                                width: 32, height: 56, border: '2px solid var(--app-border, #e5e7eb)', borderRight: 'none',
                                borderRadius: '8px 0 0 8px', background: 'var(--app-surface, white)',
                                color: 'var(--app-text-muted, #6b7280)', fontSize: 18, fontWeight: 700, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                            >{'\u2212'}</button>
                            <div style={{
                              width: 48, height: 56, fontSize: 28, fontWeight: 700,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              borderTop: '2px solid var(--app-border, #e5e7eb)',
                              borderBottom: '2px solid var(--app-border, #e5e7eb)',
                              background: 'var(--app-surface, white)',
                              color: 'var(--app-text, #111)',
                            }}>{goalScoreAway}</div>
                            <button
                              type="button"
                              onClick={() => setGoalScoreAway(Math.min(99, goalScoreAway + 1))}
                              style={{
                                width: 32, height: 56, border: '2px solid var(--app-border, #e5e7eb)', borderLeft: 'none',
                                borderRadius: '0 8px 8px 0', background: 'var(--app-surface, white)',
                                color: 'var(--app-text-muted, #6b7280)', fontSize: 18, fontWeight: 700, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                            >+</button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Goal scorer dropdown selector */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: 12,
                        fontWeight: 600,
                        marginBottom: 10,
                        color: 'var(--app-text-muted, #6b7280)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>Doelpuntenmaker</label>
                      <select
                        value={goalScorerId || ''}
                        onChange={(e) => setGoalScorerId(e.target.value || null)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: 14,
                          border: '1px solid var(--app-border, #e5e7eb)',
                          borderRadius: 8,
                          background: 'var(--app-surface, white)',
                          color: 'var(--app-text, #111)',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="">-- Selecteer speler --</option>
                        {(() => {
                          const CELEB_LABELS: Record<string, string> = {
                            arms_wide: 'Armen wijd',
                            fist_pump: 'Vuist omhoog',
                            point_to_sky: 'Wijs naar hemel',
                            slide: 'Knie\u00ebn slide',
                          };
                          const allMembers = [...(seasonSquad.goalkeeper || []), ...(seasonSquad.player || [])];
                          // Dedup by user ID (same person may appear in multiple roles)
                          const seenUserIds = new Set<string>();
                          const uniqueMembers = allMembers.filter((p) => {
                            const userId = (p.user || p.member)?.id;
                            if (!userId || seenUserIds.has(userId)) return false;
                            seenUserIds.add(userId);
                            return true;
                          });

                          // Build one option per celebration type per member
                          const options: { member: typeof uniqueMembers[0]; name: string; celebType: string; celebLabel: string; hasCelebration: boolean }[] = [];
                          for (const member of uniqueMembers) {
                            const user = member.user || member.member;
                            const name = user ? (
                              ('name' in user && user.name) ||
                              ('user_name' in user && user.user_name) ||
                              `${user.first_name || ''} ${user.last_name || ''}`.trim()
                            ) : 'Unknown';
                            const tr = (member.metadata as any)?.teamreel_assets || {};
                            const videos = tr?.videos || {};
                            const celebrationObj = videos?.celebration || {};
                            const celebrationKeys = Object.keys(celebrationObj).filter(k => {
                              const val = celebrationObj[k];
                              return val && (typeof val === 'string' || (typeof val === 'object' && Object.keys(val).length > 0));
                            });
                            // Extract unique celebration types from composite keys (e.g. "home_arms_wide" → "arms_wide")
                            const celebTypes = [...new Set(celebrationKeys.map(k => {
                              const parts = k.split('_');
                              return parts.length > 1 ? parts.slice(1).join('_') : k;
                            }))];
                            if (celebTypes.length > 0) {
                              for (const ct of celebTypes) {
                                options.push({ member, name, celebType: ct, celebLabel: CELEB_LABELS[ct] || ct, hasCelebration: true });
                              }
                            } else {
                              options.push({ member, name, celebType: '', celebLabel: '', hasCelebration: false });
                            }
                          }

                          // Sort: available players first, then by name, then by type
                          options.sort((a, b) => {
                            if (a.hasCelebration && !b.hasCelebration) return -1;
                            if (!a.hasCelebration && b.hasCelebration) return 1;
                            const nameComp = a.name.localeCompare(b.name);
                            if (nameComp !== 0) return nameComp;
                            return a.celebLabel.localeCompare(b.celebLabel);
                          });

                          return options.map(({ member, name, hasCelebration, celebType, celebLabel }) => {
                            const suffix = hasCelebration
                              ? ` \u2014 ${celebLabel}`
                              : ' (geen celebration video)';
                            return (
                              <option
                                key={`${member.id}_${celebType}`}
                                value={member.id}
                                disabled={!hasCelebration}
                                style={{
                                  color: hasCelebration ? 'inherit' : '#999',
                                  fontWeight: hasCelebration ? 500 : 400,
                                }}
                              >
                                {name}{suffix}
                              </option>
                            );
                          });
                        })()}
                      </select>
                      {!goalScorerId && (
                        <div style={{ fontSize: 11, color: '#e11d48', marginTop: 6 }}>
                          Selecteer een doelpuntenmaker
                        </div>
                      )}
                    </div>

                    {/* Background selector (reuse same pattern) */}
                    {appBackgrounds.length > 0 && (
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: 12,
                          fontWeight: 600,
                          marginBottom: 10,
                          color: 'var(--app-text-muted, #6b7280)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}>Achtergrond</label>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                          gap: 8,
                        }}>
                          <button
                            onClick={() => setSelectedBackgroundUrl(null)}
                            style={{
                              position: 'relative',
                              border: !selectedBackgroundUrl
                                ? '2px solid var(--app-primary, #3B8EA5)'
                                : '1px solid var(--app-border, #e5e7eb)',
                              borderRadius: 8,
                              overflow: 'hidden',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            <div style={{
                              width: '100%',
                              aspectRatio: '9/16',
                              background: 'linear-gradient(to bottom, #16a34a, #14532d)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>

                            </div>
                            <div style={{
                              padding: '3px 0',
                              textAlign: 'center',
                              fontWeight: 600,
                              fontSize: 9,
                              color: !selectedBackgroundUrl ? 'var(--app-primary, #3B8EA5)' : 'var(--app-text-muted, #6b7280)',
                            }}>
                              Standaard
                            </div>
                          </button>

                          {appBackgrounds.map((bg) => {
                            const isSel = selectedBackgroundUrl === bg.url;
                            return (
                              <button
                                key={bg.id}
                                onClick={() => setSelectedBackgroundUrl(bg.url)}
                                style={{
                                  position: 'relative',
                                  border: isSel
                                    ? '2px solid var(--app-primary, #3B8EA5)'
                                    : '1px solid var(--app-border, #e5e7eb)',
                                  borderRadius: 8,
                                  overflow: 'hidden',
                                  cursor: 'pointer',
                                  padding: 0,
                                }}
                              >
                                <div style={{
                                  width: '100%',
                                  aspectRatio: '9/16',
                                  background: `url(${bg.url}) center/cover`,
                                }} />
                                <div style={{
                                  padding: '3px 0',
                                  textAlign: 'center',
                                  fontWeight: 600,
                                  fontSize: 9,
                                  color: isSel ? 'var(--app-primary, #3B8EA5)' : 'var(--app-text-muted, #6b7280)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}>
                                  {bg.label || bg.profile_name || 'Locatie'}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
  );
}

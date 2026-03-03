import React, { useState, useEffect } from 'react';
import s from './ProjectSeasonDetailPage.module.css';
import { getCsrfToken } from '../../utils/csrf';

// ─── Types ───────────────────────────────────────────────────────────

export type ThenVsNowVideoType =
  | 'duo_portret'
  | 'duo_portret_cover'
  | 'duo_portret_overlay'
  | 'sidebyside_cover'
  | 'sidebyside_overlay'
  | 'transformation'
  | 'walking_composite';

type ModalStep = 'members' | 'generating' | 'submitted' | 'error';

interface Background {
  id: string;
  url: string;
  label?: string;
  profile_name?: string;
}

export interface ThenVsNowMember {
  id: string;
  name: string;
  shirtNumber?: string;
  position?: string;
  hasDuoPortret: boolean;
  hasDuoPortretCover: boolean;
  hasDuoPortretOverlay: boolean;
  hasSidebysideCover: boolean;
  hasSidebysideOverlay: boolean;
  hasTransformation: boolean;
  hasWalkingComposite: boolean;
  transformationKeys?: string[];
}

interface ThenVsNowModalProps {
  videoType: ThenVsNowVideoType;
  eligibleMembers: ThenVsNowMember[];
  apiBaseUrl: string;
  projectId: string;
  seasonId: string;
  onClose: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────

const VIDEO_TYPE_LABELS: Record<ThenVsNowVideoType, string> = {
  duo_portret: 'Duo Portret',
  duo_portret_cover: 'Duo Portret Cover',
  duo_portret_overlay: 'Duo Portret Overlay',
  sidebyside_cover: 'Then vs Now Cover',
  sidebyside_overlay: 'Then vs Now Overlay',
  transformation: 'Transformation',
  walking_composite: 'Walking Composite',
};

const STEP_SUBTITLES: Record<ModalStep, string> = {
  members: 'Selecteer spelers voor de compilatie video',
  generating: 'Job wordt aangemaakt...',
  submitted: 'Job is gestart!',
  error: 'Er is een fout opgetreden',
};

function filterByVideoType(m: ThenVsNowMember, videoType: ThenVsNowVideoType): boolean {
  switch (videoType) {
    case 'duo_portret': return m.hasDuoPortret;
    case 'duo_portret_cover': return m.hasDuoPortretCover;
    case 'duo_portret_overlay': return m.hasDuoPortretOverlay;
    case 'sidebyside_cover': return m.hasSidebysideCover;
    case 'sidebyside_overlay': return m.hasSidebysideOverlay;
    case 'walking_composite': return m.hasWalkingComposite;
    case 'transformation': return m.hasTransformation;
  }
}

// ─── Component ───────────────────────────────────────────────────────

const ThenVsNowModal: React.FC<ThenVsNowModalProps> = ({
  videoType,
  eligibleMembers,
  apiBaseUrl,
  projectId,
  seasonId,
  onClose,
}) => {
  const [step, setStep] = useState<ModalStep>('members');
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [_jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [selectedBgUrl, setSelectedBgUrl] = useState<string | null>(null);
  const [variantKeys, setVariantKeys] = useState<Record<string, string>>({});

  // Pre-select all eligible members on mount
  useEffect(() => {
    const eligible = eligibleMembers.filter((m) => filterByVideoType(m, videoType));
    setSelected(eligible.map((m) => m.id));
  }, [eligibleMembers, videoType]);

  // Fetch backgrounds on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/branding/assets/app-backgrounds/`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : (data?.data || data?.results || []);
          const bgs = items
            .filter((a: any) => a.url)
            .map((a: any) => ({
              id: a.id,
              url: a.url,
              label: a.label || '',
              profile_name: a.project_name || a.profile_name || '',
            }));
          setBackgrounds(bgs);
        }
      } catch (err) {
        console.warn('Failed to fetch app backgrounds:', err);
      }
    })();
  }, [apiBaseUrl]);

  const handleSubmit = async () => {
    setStep('generating');
    setError(null);
    try {
      if (!projectId) throw new Error('No project ID available');

      let apiVideoType = videoType as string;
      let compositionStyle: string | null = null;
      if (videoType === 'duo_portret_cover') {
        apiVideoType = 'duo_portret';
        compositionStyle = 'cover';
      } else if (videoType === 'duo_portret_overlay') {
        apiVideoType = 'duo_portret';
        compositionStyle = 'overlay';
      } else if (videoType === 'sidebyside_cover') {
        apiVideoType = 'sidebyside';
        compositionStyle = 'cover';
      } else if (videoType === 'sidebyside_overlay') {
        apiVideoType = 'sidebyside';
        compositionStyle = 'overlay';
      }

      const res = await fetch(`${apiBaseUrl}/api/v1/video/jobs/then-vs-now-compilation/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({
          project_id: projectId,
          video_type: apiVideoType,
          ...(compositionStyle ? { composition_style: compositionStyle } : {}),
          period_id: seasonId || null,
          selected_member_ids: selected,
          ...(selectedBgUrl ? { background_url: selectedBgUrl } : {}),
          ...(Object.keys(variantKeys).length > 0 ? { member_variant_keys: variantKeys } : {}),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || err.detail || `Failed (${res.status})`);
      }
      const data = await res.json();
      const jobId = data.data?.id || data.id;
      setJobId(jobId);

      setStep('submitted');
      setTimeout(() => onClose(), 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to start compilation');
      setStep('error');
    }
  };

  // ── Derived data ─────────────────────────────────────────────────

  const eligible = eligibleMembers.filter((m) => filterByVideoType(m, videoType));
  const eligibleMap = new Map(eligible.map((m) => [m.id, m]));

  const q = search.toLowerCase().trim();
  const selectedOrdered = selected.map((id) => eligibleMap.get(id)).filter(Boolean) as ThenVsNowMember[];
  const unselected = eligible.filter((m) => !selected.includes(m.id));
  const filteredUnselected = q ? unselected.filter((m) => m.name.toLowerCase().includes(q)) : unselected;

  // ── Reorder helpers ──────────────────────────────────────────────

  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    const next = [...selected];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setSelected(next);
  };
  const moveDown = (idx: number) => {
    if (idx >= selected.length - 1) return;
    const next = [...selected];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    setSelected(next);
  };
  const removeItem = (id: string) => setSelected(selected.filter((x) => x !== id));
  const addItem = (id: string) => {
    if (!selected.includes(id)) setSelected([...selected, id]);
  };

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div
      className={s.thenNowBackdrop}
      onClick={() => { if (step !== 'generating') onClose(); }}
    >
      <div className={s.thenNowModal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={s.thenNowHeader}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
              Compilatie — {VIDEO_TYPE_LABELS[videoType]}
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--app-muted-text)', marginTop: '2px' }}>
              {STEP_SUBTITLES[step]}
            </div>
          </div>
          {step !== 'generating' && (
            <button onClick={onClose} className={s.modalCloseBtn}>&times;</button>
          )}
        </div>

        {/* Step: Member selection */}
        {step === 'members' && (
          <div style={{ padding: '16px 20px' }}>
            {/* Select all / deselect all */}
            <div className={s.selectAllRow}>
              <div className={s.selectionCounter}>
                {selected.length} van {eligible.length} speler{eligible.length !== 1 ? 's' : ''} geselecteerd
              </div>
              <button
                onClick={() => {
                  if (selected.length === eligible.length) {
                    setSelected([]);
                  } else {
                    setSelected(eligible.map((m) => m.id));
                  }
                }}
                className={s.selectAllBtn}
              >
                {selected.length === eligible.length ? 'Deselecteer alles' : 'Selecteer alles'}
              </button>
            </div>

            {/* Selected members — ordered list */}
            {selectedOrdered.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div className={s.sectionLabel}>Volgorde in video</div>
                <div className={s.orderedList}>
                  {selectedOrdered.map((m, idx) => (
                    <div
                      key={m.id}
                      className={s.orderedMemberRow}
                      style={{
                        borderBottom: idx < selectedOrdered.length - 1 ? '1px solid var(--app-border)' : 'none',
                      }}
                    >
                      <span className={s.orderNumber}>{idx + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className={s.memberName}>{m.name}</div>
                        <div className={s.memberMeta}>
                          {m.shirtNumber && <span>#{m.shirtNumber}</span>}
                          {m.position && <span>{m.position}</span>}
                        </div>
                        {/* Transformation variant picker */}
                        {videoType === 'transformation' && m.transformationKeys && m.transformationKeys.length > 1 && (
                          <div className={s.variantRow}>
                            {m.transformationKeys.map((vk) => {
                              const label = vk.replace('transformation_', '').replace('transformation', 'default').replace(/_/g, ' ');
                              const isSelected = (variantKeys[m.id] || '') === vk;
                              const isDefault = !variantKeys[m.id] && vk === m.transformationKeys![0];
                              return (
                                <button
                                  key={vk}
                                  onClick={() => setVariantKeys((prev) => ({ ...prev, [m.id]: vk }))}
                                  className={s.variantPill}
                                  style={{
                                    border: (isSelected || isDefault) ? '1px solid var(--app-primary, #2563eb)' : '1px solid var(--app-border)',
                                    backgroundColor: (isSelected || isDefault) ? 'var(--app-primary, #2563eb)' : 'transparent',
                                    color: (isSelected || isDefault) ? '#fff' : 'var(--app-muted-text)',
                                  }}
                                >{label}</button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <button onClick={() => moveUp(idx)} disabled={idx === 0} title="Omhoog" className={s.arrowBtn} style={{ cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.25 : 0.7 }}>{"\u25B2"}</button>
                      <button onClick={() => moveDown(idx)} disabled={idx === selectedOrdered.length - 1} title="Omlaag" className={s.arrowBtn} style={{ cursor: idx === selectedOrdered.length - 1 ? 'default' : 'pointer', opacity: idx === selectedOrdered.length - 1 ? 0.25 : 0.7 }}>{"\u25BC"}</button>
                      <button onClick={() => removeItem(m.id)} title="Verwijderen" className={s.removeBtn}>{"\u2715"}</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unselected members */}
            {unselected.length > 0 && (
              <div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                  <div className={s.unselectedHeader}>Beschikbare spelers</div>
                  <input
                    type="text"
                    placeholder="Zoek..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ flex: 1, padding: '4px 8px', border: '1px solid var(--app-border)', borderRadius: '4px', fontSize: '12px', backgroundColor: 'var(--app-bg)', color: 'var(--app-text)' }}
                  />
                </div>
                <div style={{ border: '1px solid var(--app-border)', borderRadius: '8px', overflow: 'hidden', maxHeight: '160px', overflowY: 'auto' }}>
                  {filteredUnselected.length === 0 ? (
                    <div className={s.emptyState}>Geen spelers gevonden</div>
                  ) : filteredUnselected.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => addItem(m.id)}
                      className={s.clickableRow}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--app-surface-2, #2a2a3e)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <span className={s.addIcon}>+</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className={s.memberName}>{m.name}</div>
                        <div className={s.memberMeta}>
                          {m.shirtNumber && <span>#{m.shirtNumber}</span>}
                          {m.position && <span>{m.position}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Background selector */}
            {backgrounds.length > 0 && videoType !== 'duo_portret_cover' && videoType !== 'sidebyside_cover' && (
              <div style={{ marginTop: '16px' }}>
                <div className={s.sectionLabel}>Achtergrond / Locatie</div>
                <div className={s.bgSelectorGrid}>
                  <button
                    onClick={() => setSelectedBgUrl(null)}
                    style={{
                      position: 'relative',
                      border: !selectedBgUrl ? '2px solid var(--app-primary, #2563eb)' : '1px solid var(--app-border, #333)',
                      borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', padding: 0,
                      background: !selectedBgUrl ? 'var(--app-surface-2, #2a2a3e)' : 'transparent',
                    }}
                  >
                    <div className={s.bgPreviewDefault}>
                      <span style={{ fontSize: '20px' }}>{"\u26BD"}</span>
                    </div>
                    <div className={s.bgOptionLabel} style={{ color: !selectedBgUrl ? '#fff' : 'var(--app-muted-text)', background: !selectedBgUrl ? 'var(--app-primary, #2563eb)' : 'var(--app-surface-2, #2a2a3e)' }}>
                      Standaard
                    </div>
                    {!selectedBgUrl && (
                      <div className={s.checkBadge}>{"\u2713"}</div>
                    )}
                  </button>
                  {backgrounds.map((bg) => {
                    const isActive = selectedBgUrl === bg.url;
                    return (
                      <button
                        key={bg.id}
                        onClick={() => setSelectedBgUrl(bg.url)}
                        style={{
                          position: 'relative',
                          border: isActive ? '2px solid var(--app-primary, #2563eb)' : '1px solid var(--app-border, #333)',
                          borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', padding: 0,
                          background: isActive ? 'var(--app-surface-2, #2a2a3e)' : 'transparent',
                        }}
                      >
                        <div style={{ width: '100%', aspectRatio: '9/16', background: `url(${bg.url}) center/cover` }} />
                        <div className={s.bgOptionLabel} style={{
                          color: isActive ? '#fff' : 'var(--app-muted-text)',
                          background: isActive ? 'var(--app-primary, #2563eb)' : 'var(--app-surface-2, #2a2a3e)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {bg.label || bg.profile_name || 'Locatie'}
                        </div>
                        {isActive && (
                          <div className={s.checkBadge}>{"\u2713"}</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step: Generating */}
        {step === 'generating' && (
          <div className={s.statusStep}>
            <div className={s.statusEmoji}>{"\u23F3"}</div>
            <div className={s.statusTitle}>Job wordt aangemaakt...</div>
          </div>
        )}

        {/* Step: Submitted */}
        {step === 'submitted' && (
          <div className={s.statusStep}>
            <div className={s.statusEmoji}>{"\u2705"}</div>
            <div className={s.statusTitle}>Job gestart!</div>
            <div className={s.statusDesc}>
              {selected.length} speler{selected.length !== 1 ? 's' : ''} • Video wordt op de achtergrond verwerkt
            </div>
            <div className={s.statusDesc}>
              Bekijk de voortgang bij <strong>Workflow</strong> of in de <strong>Video Jobs</strong> queue.
            </div>
          </div>
        )}

        {/* Step: Error */}
        {step === 'error' && (
          <div className={s.statusStep}>
            <div className={s.statusEmoji}>{"\u274C"}</div>
            <div className={s.statusTitleError}>Generatie mislukt</div>
            <div className={s.statusDesc}>{error || 'Unknown error'}</div>
          </div>
        )}

        {/* Footer */}
        <div className={s.thenNowFooter}>
          {step === 'members' && (
            <>
              <button onClick={onClose} className={s.modalBtnSecondary}>Annuleren</button>
              <button
                onClick={handleSubmit}
                disabled={selected.length === 0}
                className={s.modalBtnPrimary}
                style={{
                  cursor: selected.length > 0 ? 'pointer' : 'not-allowed',
                  background: selected.length > 0 ? '#6366f1' : 'var(--app-muted-text)',
                  opacity: selected.length > 0 ? 1 : 0.5,
                }}
              >{"\uD83C\uDFAC"} Genereer Video ({selected.length})</button>
            </>
          )}
          {step === 'submitted' && (
            <button onClick={onClose} className={s.modalBtnSecondary}>Sluiten</button>
          )}
          {step === 'error' && (
            <>
              <button onClick={() => setStep('members')} className={s.modalBtnSecondary}>{"\u2190"} Terug</button>
              <button onClick={onClose} className={s.modalBtnSecondary}>Sluiten</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThenVsNowModal;

/**
 * MediaReadinessMembers — Members list accordion + member detail views
 * for the MediaReadinessCard sheet navigation.
 */
import React, { useCallback } from 'react';
import {
  CheckCircle2, Circle, ChevronRight, ChevronDown,
  ImageIcon, Sparkles,
} from 'lucide-react';
import {
  MEMBER_MEDIA_TYPES,
  type MemberMediaStatus,
  type MediaReadiness,
} from './useMediaReadiness';
import styles from './MediaReadinessCard.module.css';

// ─── Helpers (shared with card) ───────────────────────────

function progressClass(pct: number): string {
  if (pct >= 80) return styles.progressFillGood;
  if (pct >= 40) return styles.progressFillWarn;
  return styles.progressFillBad;
}

// ─── MembersListView ──────────────────────────────────────

interface MembersListViewProps {
  members: MediaReadiness['members'];
  expandedMembers: Set<string>;
  toggleMember: (id: string) => void;
  closeSheet: () => void;
}

export const MembersListView: React.FC<MembersListViewProps> = ({
  members, expandedMembers, toggleMember, closeSheet,
}) => {
  const incompleteCount = members.list.filter(m => !m.isComplete).length;

  return (
    <div className={styles.sheetContent}>
      <div className={styles.summaryBar}>
        <div className={styles.summaryLabel}>
          <span className={styles.summaryText}>
            {members.complete}/{members.total} spelers volledig
          </span>
          <span className={styles.summaryPercent}>{members.percent}%</span>
        </div>
        <div className={styles.progressTrack}>
          <div
            className={`${styles.progressFill} ${progressClass(members.percent)}`}
            style={{ width: `${Math.max(4, members.percent)}%` }}
          />
        </div>
      </div>

      <div className={styles.typeGrid}>
        {members.list.map(member => {
          const isExpanded = expandedMembers.has(member.id);
          return (
            <div key={member.id} className={styles.memberAccordion}>
              {/* Accordion header */}
              <div
                className={`${styles.memberRow} ${isExpanded ? styles.memberRowExpanded : ''}`}
                onClick={() => toggleMember(member.id)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMember(member.id); } }}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
              >
                <div className={styles.memberAvatar}>
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt="" className={styles.avatarImg} loading="lazy" />
                  ) : (
                    <span className={styles.avatarInitial}>{member.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className={styles.memberInfo}>
                  <span className={styles.memberName}>{member.name}</span>
                  <div className={styles.memberProgressTrack}>
                    <div
                      className={`${styles.memberProgressFill} ${member.isComplete ? styles.memberProgressComplete : ''}`}
                      style={{ width: `${Math.max(4, member.percent)}%` }}
                    />
                  </div>
                </div>
                <span className={`${styles.memberMeta} ${member.isComplete ? styles.memberMetaComplete : ''}`}>
                  {member.isComplete ? <CheckCircle2 size={13} /> : `${member.completedCount}/${MEMBER_MEDIA_TYPES.length}`}
                </span>
                <span className={`${styles.accordionChevron} ${isExpanded ? styles.accordionChevronOpen : ''}`}>
                  <ChevronDown size={14} />
                </span>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <MemberAccordionBody member={member} closeSheet={closeSheet} />
              )}
            </div>
          );
        })}
      </div>

      {incompleteCount > 0 && (
        <div
          className={`${styles.callout} ${styles.calloutAction}`}
          onClick={() => {
            closeSheet();
            window.dispatchEvent(
              new CustomEvent('teamreel:open-quick-create', {
                detail: { flow: 'content', subtype: 'profile_photo' },
              }),
            );
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              closeSheet();
              window.dispatchEvent(
                new CustomEvent('teamreel:open-quick-create', {
                  detail: { flow: 'content', subtype: 'profile_photo' },
                }),
              );
            }
          }}
          role="button"
          tabIndex={0}
        >
          <span className={`${styles.calloutIcon} ${styles.calloutIconAction}`}>
            <Sparkles size={14} />
          </span>
          <span className={styles.calloutText}>
            {incompleteCount} speler{incompleteCount > 1 ? 's' : ''} hebben ontbrekende media
          </span>
          <span className={styles.calloutArrow}><ChevronRight size={14} /></span>
        </div>
      )}
    </div>
  );
};

// ─── MemberAccordionBody ──────────────────────────────────

const MemberAccordionBody: React.FC<{
  member: MemberMediaStatus;
  closeSheet: () => void;
}> = ({ member, closeSheet }) => {
  const handleGenerateType = useCallback((subtypeKey: string) => {
    closeSheet();
    window.dispatchEvent(
      new CustomEvent('teamreel:open-quick-create', {
        detail: { flow: 'content', subtype: subtypeKey },
      }),
    );
  }, [closeSheet]);

  return (
    <div className={styles.accordionBody}>
      {MEMBER_MEDIA_TYPES.map(type => {
        const done = member.completedTypes.has(type.key);
        return (
          <div key={type.key} className={styles.accordionAssetRow} data-present={done}>
            <span className={`${styles.accordionDot} ${done ? styles.accordionDotDone : styles.accordionDotMissing}`}>
              {done ? <CheckCircle2 size={14} /> : <Circle size={14} />}
            </span>
            <span className={`${styles.accordionLabel} ${done ? '' : styles.accordionLabelMissing}`}>
              {type.label}
            </span>
            {!done && (
              <button
                className={styles.assetActionBtn}
                onClick={() => handleGenerateType(type.key)}
                aria-label={`Genereer ${type.label} voor ${member.name}`}
              >
                <Sparkles size={14} />
                <span>Genereer</span>
              </button>
            )}
          </div>
        );
      })}

      {!member.isComplete && (
        <button
          className={styles.accordionGenerateAll}
          onClick={() => {
            closeSheet();
            const firstMissing = MEMBER_MEDIA_TYPES.find(t => !member.completedTypes.has(t.key));
            if (firstMissing) {
              window.dispatchEvent(
                new CustomEvent('teamreel:open-quick-create', {
                  detail: { flow: 'content', subtype: firstMissing.key },
                }),
              );
            }
          }}
        >
          <Sparkles size={14} />
          Alle ontbrekende genereren
        </button>
      )}
    </div>
  );
};

// ─── MemberDetailView ─────────────────────────────────────

interface MemberDetailViewProps {
  member: MemberMediaStatus;
  closeSheet: () => void;
}

export const MemberDetailView: React.FC<MemberDetailViewProps> = ({ member, closeSheet }) => (
  <div className={styles.sheetContent}>
    <div className={styles.memberDetailHeader}>
      <div className={styles.memberDetailAvatar}>
        {member.avatarUrl ? (
          <img src={member.avatarUrl} alt="" className={styles.memberDetailAvatarImg} />
        ) : (
          <span className={styles.memberDetailInitial}>{member.name.charAt(0).toUpperCase()}</span>
        )}
      </div>
      <div>
        <div className={styles.memberDetailName}>{member.name}</div>
        <div className={styles.memberDetailSub}>
          {member.completedCount}/{MEMBER_MEDIA_TYPES.length} media klaar
        </div>
      </div>
    </div>

    <div className={styles.typeGrid}>
      {MEMBER_MEDIA_TYPES.map(type => {
        const done = member.completedTypes.has(type.key);
        const handleGenerateType = () => {
          closeSheet();
          window.dispatchEvent(
            new CustomEvent('teamreel:open-quick-create', {
              detail: { flow: 'content', subtype: type.key },
            }),
          );
        };
        return (
          <div key={type.key} className={styles.assetRow} data-present={done}>
            <div className={styles.assetThumb}>
              <span className={styles.assetThumbPlaceholder}>
                <ImageIcon size={18} />
              </span>
            </div>
            <div className={styles.assetInfo}>
              <span className={styles.assetLabel}>{type.label}</span>
              <span className={styles.assetVariant}>
                {done ? 'Gegenereerd' : 'Niet aanwezig'}
              </span>
            </div>
            {!done ? (
              <button
                className={styles.assetActionBtn}
                onClick={handleGenerateType}
                aria-label={`Genereer ${type.label}`}
              >
                <Sparkles size={14} />
                <span>Genereer</span>
              </button>
            ) : (
              <span className={`${styles.assetCheck} ${styles.assetCheckOk}`}>
                <CheckCircle2 size={16} />
              </span>
            )}
          </div>
        );
      })}
    </div>

    {!member.isComplete && (() => {
      const handleGenerate = () => {
        closeSheet();
        const firstMissing = MEMBER_MEDIA_TYPES.find(t => !member.completedTypes.has(t.key));
        if (firstMissing) {
          window.dispatchEvent(
            new CustomEvent('teamreel:open-quick-create', {
              detail: { flow: 'content', subtype: firstMissing.key },
            }),
          );
        }
      };
      return (
        <div
          className={`${styles.callout} ${styles.calloutAction}`}
          onClick={handleGenerate}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleGenerate(); } }}
          role="button"
          tabIndex={0}
        >
          <span className={`${styles.calloutIcon} ${styles.calloutIconAction}`}>
            <Sparkles size={14} />
          </span>
          <span className={styles.calloutText}>
            Ontbrekende media genereren
          </span>
          <span className={styles.calloutArrow}><ChevronRight size={14} /></span>
        </div>
      );
    })()}
  </div>
);

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
import memberStyles from './MediaReadinessCard.member.module.css';
import assetStyles from './MediaReadinessCard.assets.module.css';

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
      <div className={assetStyles.summaryBar}>
        <div className={assetStyles.summaryLabel}>
          <span className={assetStyles.summaryText}>
            {members.complete}/{members.total} spelers volledig
          </span>
          <span className={assetStyles.summaryPercent}>{members.percent}%</span>
        </div>
        <div className={styles.progressTrack}>
          <div
            className={`${styles.progressFill} ${progressClass(members.percent)}`}
            style={{ width: `${Math.max(4, members.percent)}%` }}
          />
        </div>
      </div>

      <div className={assetStyles.typeGrid}>
        {members.list.map(member => {
          const isExpanded = expandedMembers.has(member.id);
          return (
            <div key={member.id} className={memberStyles.memberAccordion}>
              {/* Accordion header */}
              <div
                className={`${memberStyles.memberRow} ${isExpanded ? memberStyles.memberRowExpanded : ''}`}
                onClick={() => toggleMember(member.id)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMember(member.id); } }}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
              >
                <div className={memberStyles.memberAvatar}>
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt="" className={memberStyles.avatarImg} loading="lazy" />
                  ) : (
                    <span className={memberStyles.avatarInitial}>{member.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className={memberStyles.memberInfo}>
                  <span className={memberStyles.memberName}>{member.name}</span>
                  <div className={memberStyles.memberProgressTrack}>
                    <div
                      className={`${memberStyles.memberProgressFill} ${member.isComplete ? memberStyles.memberProgressComplete : ''}`}
                      style={{ width: `${Math.max(4, member.percent)}%` }}
                    />
                  </div>
                </div>
                <span className={`${memberStyles.memberMeta} ${member.isComplete ? memberStyles.memberMetaComplete : ''}`}>
                  {member.isComplete ? <CheckCircle2 size={13} /> : `${member.completedCount}/${MEMBER_MEDIA_TYPES.length}`}
                </span>
                <span className={`${memberStyles.accordionChevron} ${isExpanded ? memberStyles.accordionChevronOpen : ''}`}>
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
          className={`${assetStyles.callout} ${assetStyles.calloutAction}`}
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
          <span className={`${assetStyles.calloutIcon} ${assetStyles.calloutIconAction}`}>
            <Sparkles size={14} />
          </span>
          <span className={assetStyles.calloutText}>
            {incompleteCount} speler{incompleteCount > 1 ? 's' : ''} hebben ontbrekende media
          </span>
          <span className={assetStyles.calloutArrow}><ChevronRight size={14} /></span>
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
    <div className={memberStyles.accordionBody}>
      {MEMBER_MEDIA_TYPES.map(type => {
        const done = member.completedTypes.has(type.key);
        return (
          <div key={type.key} className={memberStyles.accordionAssetRow} data-present={done}>
            <span className={`${memberStyles.accordionDot} ${done ? memberStyles.accordionDotDone : memberStyles.accordionDotMissing}`}>
              {done ? <CheckCircle2 size={14} /> : <Circle size={14} />}
            </span>
            <span className={`${memberStyles.accordionLabel} ${done ? '' : memberStyles.accordionLabelMissing}`}>
              {type.label}
            </span>
            {!done && (
              <button
                className={assetStyles.assetActionBtn}
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
          className={memberStyles.accordionGenerateAll}
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
    <div className={memberStyles.memberDetailHeader}>
      <div className={memberStyles.memberDetailAvatar}>
        {member.avatarUrl ? (
          <img src={member.avatarUrl} alt="" className={memberStyles.memberDetailAvatarImg} />
        ) : (
          <span className={memberStyles.memberDetailInitial}>{member.name.charAt(0).toUpperCase()}</span>
        )}
      </div>
      <div>
        <div className={memberStyles.memberDetailName}>{member.name}</div>
        <div className={memberStyles.memberDetailSub}>
          {member.completedCount}/{MEMBER_MEDIA_TYPES.length} media klaar
        </div>
      </div>
    </div>

    <div className={assetStyles.typeGrid}>
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
          <div key={type.key} className={assetStyles.assetRow} data-present={done}>
            <div className={assetStyles.assetThumb}>
              <span className={assetStyles.assetThumbPlaceholder}>
                <ImageIcon size={18} />
              </span>
            </div>
            <div className={assetStyles.assetInfo}>
              <span className={assetStyles.assetLabel}>{type.label}</span>
              <span className={assetStyles.assetVariant}>
                {done ? 'Gegenereerd' : 'Niet aanwezig'}
              </span>
            </div>
            {!done ? (
              <button
                className={assetStyles.assetActionBtn}
                onClick={handleGenerateType}
                aria-label={`Genereer ${type.label}`}
              >
                <Sparkles size={14} />
                <span>Genereer</span>
              </button>
            ) : (
              <span className={`${assetStyles.assetCheck} ${assetStyles.assetCheckOk}`}>
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
          className={`${assetStyles.callout} ${assetStyles.calloutAction}`}
          onClick={handleGenerate}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleGenerate(); } }}
          role="button"
          tabIndex={0}
        >
          <span className={`${assetStyles.calloutIcon} ${assetStyles.calloutIconAction}`}>
            <Sparkles size={14} />
          </span>
          <span className={assetStyles.calloutText}>
            Ontbrekende media genereren
          </span>
          <span className={assetStyles.calloutArrow}><ChevronRight size={14} /></span>
        </div>
      );
    })()}
  </div>
);

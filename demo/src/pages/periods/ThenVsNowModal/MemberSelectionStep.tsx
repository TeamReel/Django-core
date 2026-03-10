/**
 * MemberSelectionStep - Member selection UI for ThenVsNowModal
 */
import React from 'react';
import type { ThenVsNowMember, ThenVsNowVideoType, Background } from './types';
import s from '../ProjectSeasonDetailPage.module.css';
import styles from '../ThenVsNowModal.module.css';

interface MemberSelectionStepProps {
  selected: string[];
  eligible: ThenVsNowMember[];
  selectedOrdered: ThenVsNowMember[];
  filteredUnselected: ThenVsNowMember[];
  unselected: ThenVsNowMember[];
  search: string;
  setSearch: (val: string) => void;
  videoType: ThenVsNowVideoType;
  variantKeys: Record<string, string>;
  setVariantKeys: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  backgrounds: Background[];
  selectedBgUrl: string | null;
  setSelectedBgUrl: (url: string | null) => void;
  moveUp: (idx: number) => void;
  moveDown: (idx: number) => void;
  removeItem: (id: string) => void;
  addItem: (id: string) => void;
  toggleSelectAll: () => void;
}

export function MemberSelectionStep({
  selected,
  eligible,
  selectedOrdered,
  filteredUnselected,
  unselected,
  search,
  setSearch,
  videoType,
  variantKeys,
  setVariantKeys,
  backgrounds,
  selectedBgUrl,
  setSelectedBgUrl,
  moveUp,
  moveDown,
  removeItem,
  addItem,
  toggleSelectAll,
}: MemberSelectionStepProps) {
  return (
    <div className={styles.membersStep}>
      {/* Select all / deselect all */}
      <div className={s.selectAllRow}>
        <div className={s.selectionCounter}>
          {selected.length} van {eligible.length} speler{eligible.length !== 1 ? 's' : ''} geselecteerd
        </div>
        <button onClick={toggleSelectAll} className={s.selectAllBtn}>
          {selected.length === eligible.length ? 'Deselecteer alles' : 'Selecteer alles'}
        </button>
      </div>

      {/* Selected members — ordered list */}
      {selectedOrdered.length > 0 && (
        <div className="mb-16">
          <div className={s.sectionLabel}>Volgorde in video</div>
          <div className={s.orderedList}>
            {selectedOrdered.map((m, idx) => (
              <div
                key={m.id}
                className={`${s.orderedMemberRow} ${styles.orderedMemberRowBorder}`}
                data-last={idx === selectedOrdered.length - 1 || undefined}
              >
                <span className={s.orderNumber}>{idx + 1}</span>
                <div className="flex-1-min">
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
                            className={`${s.variantPill} ${styles.variantPill}`}
                            data-active={isSelected || isDefault || undefined}
                          >{label}</button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button onClick={() => moveUp(idx)} disabled={idx === 0} title="Omhoog" className={`${s.arrowBtn} ${styles.arrowBtn}`} data-disabled={idx === 0 || undefined}>{"\u25B2"}</button>
                <button onClick={() => moveDown(idx)} disabled={idx === selectedOrdered.length - 1} title="Omlaag" className={`${s.arrowBtn} ${styles.arrowBtn}`} data-disabled={idx === selectedOrdered.length - 1 || undefined}>{"\u25BC"}</button>
                <button onClick={() => removeItem(m.id)} title="Verwijderen" className={s.removeBtn}>{"\u2715"}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unselected members */}
      {unselected.length > 0 && (
        <div>
          <div className={`flex-row gap-8 ${styles.unselectedHeaderRow}`}>
            <div className={s.unselectedHeader}>Beschikbare spelers</div>
            <input
              type="text"
              placeholder="Zoek..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <div className={`border rounded-8 overflow-hidden ${styles.scrollList}`}>
            {filteredUnselected.length === 0 ? (
              <div className={s.emptyState}>Geen spelers gevonden</div>
            ) : filteredUnselected.map((m) => (
              <div
                key={m.id}
                onClick={() => addItem(m.id)}
                className={`${s.clickableRow} ${styles.clickableRowHover}`}
              >
                <span className={s.addIcon}>+</span>
                <div className="flex-1-min">
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
        <div className="mt-16">
          <div className={s.sectionLabel}>Achtergrond / Locatie</div>
          <div className={s.bgSelectorGrid}>
            <button
              onClick={() => setSelectedBgUrl(null)}
              className={styles.bgButton}
              data-active={!selectedBgUrl || undefined}
            >
              <div className={s.bgPreviewDefault}>
                <span className={styles.bgEmoji}>{"\u26BD"}</span>
              </div>
              <div className={`${s.bgOptionLabel} ${styles.bgOptionLabel}`} data-active={!selectedBgUrl || undefined}>
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
                  className={styles.bgButton}
                  data-active={isActive || undefined}
                >
                  <div className={styles.bgPreviewImage} style={{ backgroundImage: `url(${bg.url})` }} />
                  <div className={`${s.bgOptionLabel} ${styles.bgOptionLabel}`} data-active={isActive || undefined}>
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
  );
}

/**
 * TrashSheetContent — Prullenbak (Trash) UI for ProfileHubPage sheet
 *
 * Displays soft-deleted items with restore/permanent-delete actions.
 * Lazy-loaded when trash sheet opens.
 */
import { useState, useMemo, useCallback } from 'react';
import { Trash2, RotateCcw, AlertCircle } from 'lucide-react';
import { useTrash } from '../../hooks/useTrash';
import { useUserRole } from '../../components/PermissionGuards';
import s from './TrashSheetContent.module.css';

export function TrashSheetContent() {
  const trash = useTrash();
  const { isSystemAdmin } = useUserRole();

  // Content type filter state (filters by content_type string, e.g. "activities.activity")
  const [contentTypeFilter, setContentTypeFilter] = useState<string | undefined>(undefined);

  // Get unique content types from stats for filter dropdown
  const contentTypes = useMemo(() => {
    // Defensive: stats might not be an array during loading
    if (!Array.isArray(trash.stats)) return [];
    return trash.stats.map((stat) => ({
      value: stat.content_type,
      label: stat.content_type.split('.').pop() || stat.content_type,
      count: stat.count,
    }));
  }, [trash.stats]);

  // Filtered items - match on content_type_detail string
  const filteredItems = useMemo(() => {
    if (!contentTypeFilter) return trash.items;
    return trash.items.filter((item) => {
      const itemContentType = `${item.content_type_detail.app_label}.${item.content_type_detail.model}`;
      return itemContentType === contentTypeFilter;
    });
  }, [trash.items, contentTypeFilter]);

  // Handlers - useTrash already handles toast notifications
  const handleRestore = useCallback(async (id: string, label: string) => {
    try {
      await trash.restore(id, label);
    } catch {
      // Error already handled by useTrash with toast
    }
  }, [trash]);

  const handlePermanentDelete = useCallback(async (id: string, label: string) => {
    if (!confirm(`"${label}" definitief verwijderen? Dit kan niet ongedaan worden.`)) return;
    try {
      await trash.permanentDelete(id, label);
    } catch {
      // Error already handled by useTrash with toast
    }
  }, [trash]);

  const handleEmptyTrash = useCallback(async () => {
    if (!confirm('Alle items in de prullenbak definitief verwijderen? Dit kan niet ongedaan worden.')) return;
    try {
      await trash.emptyTrash();
    } catch {
      // Error already handled by useTrash with toast
    }
  }, [trash]);

  // Loading state
  if (trash.loading && trash.items.length === 0) {
    return (
      <div className={s.loading} role="status" aria-live="polite">
        <div className={s.spinner} />
        <span>Laden...</span>
      </div>
    );
  }

  // Safely access stats array
  const statsArray = Array.isArray(trash.stats) ? trash.stats : [];

  return (
    <div className={s.container}>
      {/* Header description */}
      <p className={s.description}>
        Verwijderde items worden 30 dagen bewaard voordat ze definitief worden verwijderd
      </p>

      {/* Stats badges */}
      {statsArray.length > 0 && (
        <div className={s.stats}>
          {statsArray.map((stat) => (
            <span key={stat.content_type} className={s.statBadge}>
              {stat.content_type.split('.').pop()}: {stat.count}
            </span>
          ))}
        </div>
      )}

      {/* Admin actions: empty trash */}
      {isSystemAdmin && trash.items.length > 0 && (
        <button
          type="button"
          onClick={handleEmptyTrash}
          disabled={trash.mutating}
          className={s.dangerButton}
        >
          <Trash2 size={16} />
          {trash.mutating ? 'Bezig...' : 'Prullenbak legen'}
        </button>
      )}

      {/* Filter dropdown */}
      {contentTypes.length > 1 && (
        <div className={s.filterRow}>
          <label htmlFor="trash-filter" className={s.filterLabel}>
            Filter op type
          </label>
          <select
            id="trash-filter"
            value={contentTypeFilter ?? ''}
            onChange={(e) => setContentTypeFilter(e.target.value || undefined)}
            className={s.filterSelect}
          >
            <option value="">Alle types</option>
            {contentTypes.map((ct) => (
              <option key={ct.value} value={ct.value}>
                {ct.label} ({ct.count})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Empty state */}
      {!trash.loading && filteredItems.length === 0 && (
        <div className={s.emptyState}>
          <Trash2 size={40} className={s.emptyIcon} aria-hidden="true" />
          <span>Prullenbak is leeg</span>
        </div>
      )}

      {/* Trash items list */}
      {filteredItems.length > 0 && (
        <ul className={s.list}>
          {filteredItems.map((item) => (
            <li key={item.id} className={s.item}>
              <div className={s.itemContent}>
                <div className={s.itemTitle} title={item.object_repr}>
                  {item.object_repr}
                </div>
                <div className={s.itemMeta}>
                  <span className={s.itemType}>
                    {item.content_type_detail.label}
                  </span>
                  <span className={s.itemDate}>
                    {new Date(item.deleted_at).toLocaleDateString('nl-NL', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  {item.is_expired && (
                    <span className={s.itemExpired}>
                      <AlertCircle size={12} />
                      Verlopen
                    </span>
                  )}
                </div>
              </div>
              <div className={s.itemActions}>
                <button
                  type="button"
                  onClick={() => handleRestore(item.id, item.object_repr)}
                  disabled={trash.mutating}
                  className={s.restoreButton}
                  aria-label={`Herstel ${item.object_repr}`}
                >
                  <RotateCcw size={16} />
                </button>
                {isSystemAdmin && (
                  <button
                    type="button"
                    onClick={() => handlePermanentDelete(item.id, item.object_repr)}
                    disabled={trash.mutating}
                    className={s.deleteButton}
                    aria-label={`Verwijder ${item.object_repr} definitief`}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {trash.count > 20 && (
        <div className={s.pagination}>
          <button
            type="button"
            onClick={() => trash.setPage(trash.page - 1)}
            disabled={trash.page === 1 || trash.mutating}
            className={s.pageButton}
          >
            Vorige
          </button>
          <span className={s.pageInfo} aria-current="page">
            {trash.page} / {Math.ceil(trash.count / 20)}
          </span>
          <button
            type="button"
            onClick={() => trash.setPage(trash.page + 1)}
            disabled={trash.page >= Math.ceil(trash.count / 20) || trash.mutating}
            className={s.pageButton}
          >
            Volgende
          </button>
        </div>
      )}
    </div>
  );
}

export default TrashSheetContent;

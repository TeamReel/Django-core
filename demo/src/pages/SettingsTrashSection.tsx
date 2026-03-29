import type { UseTrashResult } from '../hooks/useTrash';
import { contentTypeLabel } from '@/utils/contentTypeLabels';
import styles from './SettingsPage.module.css';

interface TrashContentType {
  id: string;
  label: string;
  count: number;
}

export interface SettingsTrashSectionProps {
  isSystemAdmin: boolean;
  trash: UseTrashResult;
  trashContentTypeFilter: number | undefined;
  setTrashContentTypeFilter: (v: number | undefined) => void;
  trashContentTypes: TrashContentType[];
  handleTrashRestore: (id: string, objectRepr?: string) => Promise<void>;
  handleTrashPermanentDelete: (id: string, objectRepr?: string) => Promise<void>;
  handleEmptyTrash: () => Promise<void>;
}

export function SettingsTrashSection({
  isSystemAdmin, trash,
  trashContentTypeFilter, setTrashContentTypeFilter,
  trashContentTypes,
  handleTrashRestore, handleTrashPermanentDelete, handleEmptyTrash,
}: SettingsTrashSectionProps) {
  return (
    <div className="max-w-800">
      <h2 className="mb-8 mt-0">Prullenbak</h2>
      <p className="text-muted mb-32">
        Verwijderde items worden 30 dagen bewaard voordat ze definitief worden verwijderd
      </p>

      {/* Stats badges */}
      {trash.stats.length > 0 && (
        <div className="flex-row gap-8 mb-24 flex-wrap">
          {trash.stats.map((stat) => (
            <span
              key={stat.content_type}
              className="px-12 py-4 rounded-16 fs-12 fw-600 bg-surface border"
            >
              {contentTypeLabel(stat.content_type)}: {stat.count}
            </span>
          ))}
        </div>
      )}

      {/* Admin actions */}
      {isSystemAdmin && trash.items.length > 0 && (
        <div className="mb-24">
          <button
            type="button"
            onClick={handleEmptyTrash}
            disabled={trash.mutating}
            className={`border-none rounded-4 fs-14 fw-600 text-white ${styles.dangerButton}`}
          >
            {trash.mutating ? 'Bezig...' : 'Prullenbak legen'}
          </button>
        </div>
      )}

      {/* Filter dropdown */}
      {trashContentTypes.length > 1 && (
        <div className="mb-24">
          <label className="block mb-8 fw-600">Filter op type</label>
          <select
            value={trashContentTypeFilter ?? ''}
            onChange={(e) => setTrashContentTypeFilter(e.target.value ? Number(e.target.value) : undefined)}
            className={`w-full border rounded-4 fs-14 ${styles.formInput}`}
            style={{ maxWidth: '200px' }}
          >
            <option value="">Alle types</option>
            {trashContentTypes.map((ct) => (
              <option key={ct.id} value={ct.id}>
                {ct.label} ({ct.count})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Loading state */}
      {trash.loading && (
        <div className="p-24 text-center text-muted" role="status" aria-live="polite">
          Laden...
        </div>
      )}

      {/* Empty state */}
      {!trash.loading && trash.items.length === 0 && (
        <div className="p-24 text-center text-muted border rounded-8 bg-surface">
          <div className="fs-32 mb-8" aria-hidden="true">🗑️</div>
          <div>Prullenbak is leeg</div>
        </div>
      )}

      {/* Trash items list */}
      {!trash.loading && trash.items.length > 0 && (
        <div className="flex-col gap-12">
          {trash.items.map((item) => (
            <div
              key={item.id}
              className={`p-16 border rounded-8 bg-surface ${styles.trashItem}`}
            >
              <div className="flex-row items-start justify-between gap-16">
                <div className="flex-1 min-w-0">
                  <div className="fw-600 mb-4 truncate" title={item.object_repr}>
                    {item.object_repr}
                  </div>
                  <div className="flex-row gap-16 fs-12 text-muted flex-wrap">
                    <span className="badge badge--subtle">
                      {item.content_type_detail.label}
                    </span>
                    <span>
                      Verwijderd {new Date(item.deleted_at).toLocaleDateString('nl-NL', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                    {item.deleted_by_email && (
                      <span>door {item.deleted_by_email}</span>
                    )}
                    {item.is_expired && (
                      <span className="text-error fw-600">Verlopen</span>
                    )}
                  </div>
                </div>
                <div className="flex-row gap-8 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleTrashRestore(item.id, item.object_repr)}
                    disabled={trash.mutating}
                    className={`border-none rounded-4 fs-12 fw-600 text-white ${styles.restoreButton}`}
                  >
                    Herstellen
                  </button>
                  {isSystemAdmin && (
                    <button
                      type="button"
                      onClick={() => handleTrashPermanentDelete(item.id, item.object_repr)}
                      disabled={trash.mutating}
                      className={`border rounded-4 fs-12 fw-600 ${styles.deleteButton}`}
                    >
                      Verwijderen
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {trash.count > 20 && (
        <div className="flex-row justify-center gap-8 mt-24">
          <button
            type="button"
            onClick={() => trash.setPage(trash.page - 1)}
            disabled={trash.page === 1 || trash.mutating}
            className={`border rounded-4 fs-12 fw-600 px-12 py-8 ${styles.paginationButton}`}
          >
            Vorige
          </button>
          <span className="px-12 py-8 fs-12" aria-current="page">
            Pagina {trash.page} van {Math.ceil(trash.count / 20)}
          </span>
          <button
            type="button"
            onClick={() => trash.setPage(trash.page + 1)}
            disabled={trash.page >= Math.ceil(trash.count / 20) || trash.mutating}
            className={`border rounded-4 fs-12 fw-600 px-12 py-8 ${styles.paginationButton}`}
          >
            Volgende
          </button>
        </div>
      )}
    </div>
  );
}

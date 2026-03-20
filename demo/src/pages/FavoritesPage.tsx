import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Star, Trash2, X } from 'lucide-react';
import { AppIcon } from '../components/AppIcon';
import { PageHeader } from '../components/ui/PageHeader';
import { useNavFavorites } from '../hooks/useNavItems';
import { clearFavorites, removeFavorite } from '../utils/navStorage';
import styles from './FavoritesPage.module.css';

export default function FavoritesPage() {
  const favorites = useNavFavorites();

  const sorted = useMemo(() => {
    return [...favorites].sort((a, b) => b.ts - a.ts);
  }, [favorites]);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Favorites"
        subtitle="Your pinned shortcuts."
        className="mb-16"
        actions={
          <div className="flex-row gap-8">
            <Link
              to="/recents"
              className={`inline-flex gap-8 rounded-8 border bg-surface fs-13 fw-600 ${styles.navLink}`}
            >
              Back to Recents
            </Link>

            <button
              type="button"
              onClick={() => clearFavorites()}
              className={`inline-flex gap-8 rounded-8 border bg-surface fs-13 fw-600 cursor-pointer ${styles.clearButton}`}
              title="Clear favorites"
            >
              <AppIcon icon={Trash2} size={16} /> Clear
            </button>
          </div>
        }
      />

      <div className="bg-surface border rounded-12 overflow-hidden">
        {sorted.length === 0 ? (
          <div className="p-16 text-muted">
            No favorites yet. Open Recents and click “Save”.
          </div>
        ) : (
          sorted.map((item) => (
            <div
              key={item.path}
              className={styles.itemRow}
            >
              <Link
                to={item.path}
                className={styles.itemLink}
              >
                <AppIcon icon={Star} size={16} />
                <span className="fw-600 fs-14 truncate">
                  {item.label}
                </span>
                <span className="fs-12 text-muted">{item.kind}</span>
              </Link>

              <button
                type="button"
                onClick={() => removeFavorite(item.path)}
                className={`inline-flex gap-6 rounded-8 border bg-surface-2 cursor-pointer fs-12 fw-600 ${styles.removeButton}`}
                title="Verwijderen"
              >
                <AppIcon icon={X} size={14} />
                Verwijderen
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

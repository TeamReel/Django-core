import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Star, Trash2, X } from 'lucide-react';
import { AppIcon } from '../components/AppIcon';
import { PageHeader } from '../components/ui/PageHeader';
import { useNavFavorites } from '../hooks/useNavItems';
import { clearFavorites, removeFavorite } from '../utils/navStorage';

export default function FavoritesPage() {
  const favorites = useNavFavorites();

  const sorted = useMemo(() => {
    return [...favorites].sort((a, b) => b.ts - a.ts);
  }, [favorites]);

  return (
    <div style={{ backgroundColor: 'var(--app-bg)', minHeight: '100%' }}>
      <PageHeader
        title="Favorites"
        subtitle="Your pinned shortcuts."
        className="mb-16"
        actions={
          <div className="flex-row gap-8">
            <Link
              to="/recents"
              className="inline-flex gap-8 rounded-8 border bg-surface fs-13 fw-600"
              style={{ padding: '8px 10px', color: 'var(--app-text)', textDecoration: 'none' }}
            >
              Back to Recents
            </Link>

            <button
              type="button"
              onClick={() => clearFavorites()}
              className="inline-flex gap-8 rounded-8 border bg-surface fs-13 fw-600 cursor-pointer"
              style={{ padding: '8px 10px', color: 'var(--app-text)' }}
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
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '12px 14px',
                borderTop: '1px solid var(--app-border)',
              }}
            >
              <Link
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  color: 'var(--app-text)',
                  textDecoration: 'none',
                  minWidth: 0,
                }}
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
                className="inline-flex gap-6 rounded-8 border bg-surface-2 cursor-pointer fs-12 fw-600"
                style={{ padding: '6px 8px', color: 'var(--app-text)' }}
                title="Remove"
              >
                <AppIcon icon={X} size={14} />
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

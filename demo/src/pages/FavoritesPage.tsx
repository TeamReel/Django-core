import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Star, Trash2, X } from 'lucide-react';
import { AppIcon } from '../components/AppIcon';
import { useNavFavorites } from '../hooks/useNavItems';
import { clearFavorites, removeFavorite } from '../utils/navStorage';

export default function FavoritesPage() {
  const favorites = useNavFavorites();

  const sorted = useMemo(() => {
    return [...favorites].sort((a, b) => b.ts - a.ts);
  }, [favorites]);

  return (
    <div style={{ backgroundColor: 'var(--app-bg)', minHeight: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, color: 'var(--app-text)' }}>Favorites</h1>
          <div style={{ fontSize: 13, color: 'var(--app-muted-text)', marginTop: 4 }}>
            Your pinned shortcuts.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link
            to="/recents"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid var(--app-border)',
              background: 'var(--app-surface)',
              color: 'var(--app-text)',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Back to Recents
          </Link>

          <button
            type="button"
            onClick={() => clearFavorites()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid var(--app-border)',
              background: 'var(--app-surface)',
              color: 'var(--app-text)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
            title="Clear favorites"
          >
            <AppIcon icon={Trash2} size={16} /> Clear
          </button>
        </div>
      </div>

      <div
        style={{
          background: 'var(--app-surface)',
          border: '1px solid var(--app-border)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        {sorted.length === 0 ? (
          <div style={{ padding: 16, color: 'var(--app-muted-text)' }}>
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
                <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.label}
                </span>
                <span style={{ fontSize: 12, color: 'var(--app-muted-text)' }}>{item.kind}</span>
              </Link>

              <button
                type="button"
                onClick={() => removeFavorite(item.path)}
                style={{
                  border: '1px solid var(--app-border)',
                  background: 'var(--app-surface-2)',
                  borderRadius: 8,
                  padding: '6px 8px',
                  cursor: 'pointer',
                  color: 'var(--app-text)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                }}
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

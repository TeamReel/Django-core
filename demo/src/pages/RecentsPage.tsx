import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Star, Trash2, X } from 'lucide-react';
import { AppIcon } from '../components/AppIcon';
import { useNavRecents, useNavFavorites } from '../hooks/useNavItems';
import { clearRecents, removeRecent, toggleFavorite, type NavStoredItem } from '../utils/navStorage';

export default function RecentsPage() {
  const recents = useNavRecents();
  const favorites = useNavFavorites();

  const favoritePaths = useMemo(() => new Set(favorites.map(f => f.path)), [favorites]);

  const onToggleFavorite = (item: NavStoredItem) => {
    toggleFavorite({ kind: item.kind, label: item.label, path: item.path });
  };

  return (
    <div style={{ backgroundColor: 'var(--app-bg)', minHeight: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, color: 'var(--app-text)' }}>Recents</h1>
          <div style={{ fontSize: 13, color: 'var(--app-muted-text)', marginTop: 4 }}>
            Recently visited items across the app.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link
            to="/favorites"
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
            <AppIcon icon={Star} size={16} /> Favorites
          </Link>

          <button
            type="button"
            onClick={() => clearRecents()}
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
            title="Clear recents"
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
        {recents.length === 0 ? (
          <div style={{ padding: 16, color: 'var(--app-muted-text)' }}>
            No recent items yet.
          </div>
        ) : (
          recents.map((item) => {
            const isFav = favoritePaths.has(item.path);
            return (
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
                  <AppIcon icon={Clock} size={16} />
                  <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--app-muted-text)' }}>{item.kind}</span>
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(item)}
                    style={{
                      border: '1px solid var(--app-border)',
                      background: 'var(--app-surface-2)',
                      borderRadius: 8,
                      padding: '6px 8px',
                      cursor: 'pointer',
                      color: isFav ? '#f59e0b' : 'var(--app-text)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                    title={isFav ? 'Unfavorite' : 'Add to favorites'}
                  >
                    <AppIcon icon={Star} size={14} />
                    {isFav ? 'Saved' : 'Save'}
                  </button>

                  <button
                    type="button"
                    onClick={() => removeRecent(item.path)}
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
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

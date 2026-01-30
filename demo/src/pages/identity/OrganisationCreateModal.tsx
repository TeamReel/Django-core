import { useState } from 'react';
import { useSports } from '../../hooks/useSports';

interface OrganisationCreateModalProps {
  opened: boolean;
  onClose: () => void;
  onCreate: (orgData: { name: string; description?: string; sport_id?: string | null }) => Promise<void>;
}

export default function OrganisationCreateModal({
  opened,
  onClose,
  onCreate,
}: OrganisationCreateModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sportId, setSportId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { categories, loading: sportsLoading } = useSports();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onCreate({ name, description, sport_id: sportId });
      setName('');
      setDescription('');
      setSportId(null);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (!opened) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--app-surface)',
          padding: '24px',
          borderRadius: '8px',
          width: '500px',
          maxWidth: '90%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          color: 'var(--app-text)',
          border: '1px solid var(--app-border)',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--app-text)' }}>
          Create Organisation
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '4px',
                  fontWeight: 500,
                  color: 'var(--app-text)',
                }}
              >
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-input-bg)',
                  color: 'var(--app-text)',
                }}
                required
                disabled={saving}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '4px',
                  fontWeight: 500,
                  color: 'var(--app-text)',
                }}
              >
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-input-bg)',
                  color: 'var(--app-text)',
                  minHeight: '80px',
                }}
                disabled={saving}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '4px',
                  fontWeight: 500,
                  color: 'var(--app-text)',
                }}
              >
                Sport
              </label>
              <select
                value={sportId || ''}
                onChange={(e) => setSportId(e.target.value || null)}
                disabled={saving || sportsLoading}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-input-bg)',
                  color: 'var(--app-text)',
                }}
              >
                <option value="">— Select sport —</option>
                {categories.map((sport) => (
                  <option key={sport.id} value={sport.id}>
                    {sport.sport_icon} {sport.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginTop: '24px',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: '#0066cc',
                color: 'white',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

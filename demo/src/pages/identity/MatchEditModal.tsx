import { useEffect, useState } from 'react';

interface MatchActivity {
  id: string;
  title: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  description?: string;
  activity_type?: string;
}

interface MatchEditModalProps {
  opened: boolean;
  onClose: () => void;
  match: MatchActivity | null;
  onSave: (payload: Partial<MatchActivity>) => Promise<void>;
}

export default function MatchEditModal({ opened, onClose, match, onSave }: MatchEditModalProps) {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!opened || !match) return;
    setTitle(match.title ?? '');
    setStartTime(match.start_time ?? '');
    setEndTime(match.end_time ?? '');
    setLocation(match.location ?? '');
    setDescription(match.description ?? '');
    setError(null);
  }, [opened, match]);

  if (!opened || !match) return null;

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        title,
        start_time: startTime || undefined,
        end_time: endTime || undefined,
        location: location || undefined,
        description: description || undefined,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }

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
          width: '640px',
          maxWidth: '95%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          color: 'var(--app-text)',
          border: '1px solid var(--app-border)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <h2 style={{ marginTop: 0, marginBottom: '12px', color: 'var(--app-text)' }}>Edit Match</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface-2)',
              color: 'var(--app-text)',
              cursor: 'pointer',
              height: 'fit-content',
            }}
          >
            Close
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '10px 16px' }}>
          <label style={{ fontWeight: 600 }} htmlFor="match-title">
            Title
          </label>
          <input
            id="match-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface-2)',
              color: 'var(--app-text)',
            }}
          />

          <label style={{ fontWeight: 600 }} htmlFor="match-start">
            Start
          </label>
          <input
            id="match-start"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            placeholder="YYYY-MM-DDTHH:MM:SSZ"
            style={{
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface-2)',
              color: 'var(--app-text)',
            }}
          />

          <label style={{ fontWeight: 600 }} htmlFor="match-end">
            End
          </label>
          <input
            id="match-end"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            placeholder="YYYY-MM-DDTHH:MM:SSZ"
            style={{
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface-2)',
              color: 'var(--app-text)',
            }}
          />

          <label style={{ fontWeight: 600 }} htmlFor="match-location">
            Location
          </label>
          <input
            id="match-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={{
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface-2)',
              color: 'var(--app-text)',
            }}
          />

          <label style={{ fontWeight: 600 }} htmlFor="match-description">
            Description
          </label>
          <textarea
            id="match-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            style={{
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface-2)',
              color: 'var(--app-text)',
              resize: 'vertical',
            }}
          />
        </div>

        {error && <div style={{ marginTop: '12px', color: 'var(--app-danger, #d32f2f)' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #1e5aa5',
              backgroundColor: '#2563eb',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

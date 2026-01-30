import React, { useEffect, useMemo, useState } from 'react';
import { useSports } from '../../hooks/useSports';

export interface PeriodLike {
  id: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  data?: Record<string, any>;
  metadata?: Record<string, any>;
}

interface PeriodEditModalProps {
  opened: boolean;
  onClose: () => void;
  period: PeriodLike | null;
  showSportVariant?: boolean;
  showDates?: boolean;
  onSave: (payload: {
    name?: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    data?: Record<string, any>;
    sport_id?: string | null;
  }) => Promise<void>;
}

export default function PeriodEditModal({ opened, onClose, period, onSave, showSportVariant = true, showDates = true }: PeriodEditModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState('');
  const [selectedSportId, setSelectedSportId] = useState('');
  const [initialSportId, setInitialSportId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { variants, loading: sportsLoading } = useSports();

  // Some endpoints/pages pass a wrapped API response shape like { data: { ...periodFields } }.
  // Detect that and unwrap it so the form pre-fills correctly.
  const resolvedPeriod: any = useMemo(() => {
    if (!period) return null;
    const candidate: any = period;

    const looksLikePeriod = (obj: any): boolean => {
      if (!obj || typeof obj !== 'object') return false;
      // Heuristics: real Period objects have id+name, or date fields.
      if (obj.id && obj.name) return true;
      if (obj.name && (obj.start_date || obj.end_date)) return true;
      if (obj.start_date || obj.end_date) return true;
      return false;
    };

    // Common wrappers we’ve seen:
    // - { data: { ...period } }
    // - { data: { data: { ...period } } }
    // - { id: <something>, data: { ...period } }  (id present but fields live under data)
    const d1: any = candidate?.data;
    const d2: any = candidate?.data?.data;

    // If candidate already looks correct, keep it.
    if (looksLikePeriod(candidate)) return candidate;

    // If candidate doesn't look like a period, but nested objects do, unwrap.
    if (looksLikePeriod(d2)) return d2;
    if (looksLikePeriod(d1)) return d1;

    // Fallback to whatever we got.
    return candidate;
  }, [period]);

  // Reset form state whenever modal opens or period changes
  // Use JSON.stringify on period to detect deep changes (not just reference)
  const periodKey = JSON.stringify({
    id: (resolvedPeriod as any)?.id,
    name: (resolvedPeriod as any)?.name,
    description: (resolvedPeriod as any)?.description,
    start_date: (resolvedPeriod as any)?.start_date,
    end_date: (resolvedPeriod as any)?.end_date,
  });

  // Single effect to handle both reset (when closed) and populate (when opened with period)
  useEffect(() => {
    if (!opened) {
      // Reset when closed
      setName('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setType('');
      setSelectedSportId('');
      setInitialSportId('');
      setError(null);
      return;
    }

    // Populate form with period data when opened
    if (resolvedPeriod) {
      setName(resolvedPeriod.name ?? '');
      setDescription(resolvedPeriod.description ?? '');
      setStartDate(resolvedPeriod.start_date ?? '');
      setEndDate(resolvedPeriod.end_date ?? '');
      const data = (resolvedPeriod as any).data ?? (resolvedPeriod as any).metadata ?? {};
      setType(String((data as any)?.type ?? ''));

      const currentSportId = String((resolvedPeriod as any)?.sport_id ?? (resolvedPeriod as any)?.sport?.id ?? '').trim();
      setSelectedSportId(currentSportId);
      setInitialSportId(currentSportId);
      setError(null);
    }
  }, [opened, periodKey, resolvedPeriod]);

  if (!opened || !resolvedPeriod) return null;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        name,
        description,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      };

      // Keep existing metadata but update its "type" when provided.
      if (type !== '') {
        payload.data = { ...(resolvedPeriod as any).data, type };
      }

      if (showSportVariant && selectedSportId !== initialSportId) {
        payload.sport_id = selectedSportId ? selectedSportId : null;
      }

      await onSave(payload);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
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
      onClick={onClose}
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
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <h2 style={{ marginTop: 0, marginBottom: '12px', color: 'var(--app-text)' }}>Edit Period</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: 'var(--app-text)',
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: 600 }} htmlFor="period-name">
              Name
            </label>
            <input
              id="period-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
              }}
            />
          </div>

          {showDates && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontWeight: 600 }} htmlFor="period-start">
                  Start (YYYY-MM-DD)
                </label>
                <input
                  id="period-start"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="YYYY-MM-DD"
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--app-border)',
                    backgroundColor: 'var(--app-surface-2)',
                    color: 'var(--app-text)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontWeight: 600 }} htmlFor="period-end">
                  End (YYYY-MM-DD)
                </label>
                <input
                  id="period-end"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="YYYY-MM-DD"
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--app-border)',
                    backgroundColor: 'var(--app-surface-2)',
                    color: 'var(--app-text)',
                  }}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: 600 }} htmlFor="period-type">
              Type (optional)
            </label>
            <input
              id="period-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="season / league / cup"
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
              }}
            />
          </div>

          {showSportVariant && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontWeight: 600 }} htmlFor="period-sport">
                Sport Variant
              </label>
              <select
                id="period-sport"
                value={selectedSportId}
                onChange={(e) => setSelectedSportId(e.target.value)}
                disabled={saving || sportsLoading}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-surface-2)',
                  color: 'var(--app-text)',
                }}
              >
                <option value="">— Select sport variant —</option>
                {variants.map((sport) => (
                  <option key={sport.id} value={sport.id}>
                    {sport.sport_icon} {sport.name} {sport.category_name ? `(${sport.category_name})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: 600 }} htmlFor="period-description">
              Description
            </label>
            <textarea
              id="period-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
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

          {error && <div style={{ color: 'var(--app-danger, #d32f2f)' }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
                cursor: 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                border: '1px solid var(--app-primary, #2563eb)',
                backgroundColor: 'var(--app-primary, #2563eb)',
                color: '#fff',
                cursor: 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

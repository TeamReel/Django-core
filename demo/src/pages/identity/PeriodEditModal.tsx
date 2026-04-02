import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useSports } from '../../hooks/useSports';
import styles from './PeriodEditModal.module.css';
import { logger } from '@/utils/logger';

export interface PeriodLike {
  id: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  title?: string;
  label?: string;
  type?: string;
  sport_id?: string | number | null;
  sport?: { id: string | number; name?: string } | null;
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

interface PeriodEditModalProps {
  opened: boolean;
  onClose: () => void;
  period: PeriodLike | null;
  showSportVariant?: boolean;
  showDates?: boolean;
  /** Organisation's sport category ID - if provided, only variants of this category are shown */
  organisationSportId?: string | null;
  onSave: (payload: {
    name?: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    data?: Record<string, unknown>;
    sport_id?: string | null;
  }) => Promise<void>;
}

export default function PeriodEditModal({ opened, onClose, period, onSave, showSportVariant = true, showDates = true, organisationSportId }: PeriodEditModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState('');
  const [selectedSportId, setSelectedSportId] = useState('');
  const [initialSportId, setInitialSportId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { variants, getVariantsForCategory, loading: sportsLoading } = useSports();

  // Filter variants by organisation sport category if provided
  const filteredVariants = useMemo(() => {
    const categoryId = String(organisationSportId || '').trim();
    if (!categoryId) return variants;
    const filtered = getVariantsForCategory(categoryId);
    // If no variants found for category, fall back to all variants
    return filtered.length > 0 ? filtered : variants;
  }, [variants, organisationSportId, getVariantsForCategory]);

  const firstNonEmptyString = (...values: unknown[]): string => {
    for (const v of values) {
      const s = String(v ?? '').trim();
      if (s) return s;
    }
    return '';
  };

  const extractPeriodName = (p: PeriodLike | null): string =>
    firstNonEmptyString(
      p?.name,
      p?.title,
      p?.label,
      p?.data?.name,
      (p?.data?.data as Record<string, unknown> | undefined)?.name,
      p?.metadata?.name,
      (p?.metadata?.identity as Record<string, unknown> | undefined)?.name,
    );

  const extractPeriodDescription = (p: PeriodLike | null): string =>
    firstNonEmptyString(
      p?.description,
      p?.data?.description,
      (p?.data?.data as Record<string, unknown> | undefined)?.description,
      p?.metadata?.description,
    );

  const extractPeriodType = (p: PeriodLike | null): string =>
    firstNonEmptyString(
      p?.type,
      p?.data?.type,
      (p?.data?.data as Record<string, unknown> | undefined)?.type,
      p?.metadata?.type,
    );

  const extractSportId = (p: PeriodLike | null): string =>
    firstNonEmptyString(
      p?.sport_id,
      p?.sport?.id,
      p?.metadata?.sport_id,
      (p?.metadata?.sport as Record<string, unknown> | undefined)?.id,
      p?.data?.sport_id,
      (p?.data?.sport as Record<string, unknown> | undefined)?.id,
      (p?.data?.metadata as Record<string, unknown> | undefined)?.sport_id,
      ((p?.data?.metadata as Record<string, unknown> | undefined)?.sport as Record<string, unknown> | undefined)?.id,
      (p?.data?.data as Record<string, unknown> | undefined)?.sport_id,
      ((p?.data?.data as Record<string, unknown> | undefined)?.sport as Record<string, unknown> | undefined)?.id,
    );

  // Some endpoints/pages pass a wrapped API response shape like { data: { ...periodFields } }.
  // Detect that and unwrap it so the form pre-fills correctly.
  const resolvedPeriod: PeriodLike | null = useMemo(() => {
    if (!period) return null;
    const candidate = period as Record<string, unknown>;

    const looksLikePeriod = (obj: unknown): obj is PeriodLike => {
      if (!obj || typeof obj !== 'object') return false;
      const r = obj as Record<string, unknown>;
      // Heuristics: Period objects have an id, and at least some period-ish fields.
      const hasId = r.id != null;
      const hasAnyFields =
        r.name != null ||
        r.description != null ||
        r.start_date != null ||
        r.end_date != null ||
        r.sport_id != null ||
        r.sport != null;
      if (hasId && hasAnyFields) return true;

      // Sometimes we only get name + any other period fields.
      const hasName = r.name != null;
      const hasOther = r.description != null || r.start_date != null || r.end_date != null || r.sport_id != null || r.sport != null;
      if (hasName && hasOther) return true;
      return false;
    };

    // Common wrappers we’ve seen:
    // - { data: { ...period } }
    // - { data: { data: { ...period } } }
    // - { id: <something>, data: { ...period } }  (id present but fields live under data)
    const d1 = candidate?.data as Record<string, unknown> | undefined;
    const d2 = (d1?.data) as Record<string, unknown> | undefined;
    const d3 = (d2?.data) as Record<string, unknown> | undefined;

    // If candidate already looks correct, keep it.
    if (looksLikePeriod(candidate)) return candidate;

    // If candidate doesn't look like a period, but nested objects do, unwrap.
    if (looksLikePeriod(d3)) return d3;
    if (looksLikePeriod(d2)) return d2;
    if (looksLikePeriod(d1)) return d1;

    // Fallback to whatever we got.
    return candidate as PeriodLike;
  }, [period]);

  // Reset form state whenever modal opens or period changes
  // Use JSON.stringify on the RESOLVED period to detect changes (handles wrapped API responses)
  const periodKey = useMemo(() => {
    const p = resolvedPeriod;
    return JSON.stringify({
      id: p?.id,
      name: extractPeriodName(p),
      description: extractPeriodDescription(p),
      start_date: p?.start_date,
      end_date: p?.end_date,
      sport_id: extractSportId(p),
    });
  }, [resolvedPeriod]);

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
      setName(extractPeriodName(resolvedPeriod));
      setDescription(extractPeriodDescription(resolvedPeriod));
      setStartDate(resolvedPeriod.start_date ?? '');
      setEndDate(resolvedPeriod.end_date ?? '');
      setType(extractPeriodType(resolvedPeriod));

      const currentSportId = extractSportId(resolvedPeriod);
      setSelectedSportId(currentSportId);
      setInitialSportId(currentSportId);
      setError(null);
    }
  }, [opened, periodKey]);

  if (!opened || !resolvedPeriod) return null;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload: { name?: string; description?: string; start_date?: string; end_date?: string; data?: Record<string, unknown>; sport_id?: string | null } = {
        name,
        description,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      };

      // Keep existing metadata but update its "type" when provided.
      if (type !== '') {
        payload.data = { ...(resolvedPeriod?.data ?? {}), type };
      }

      if (showSportVariant && selectedSportId !== initialSportId) {
        payload.sport_id = selectedSportId ? selectedSportId : null;
      }

      await onSave(payload);
      onClose();
    } catch (e) {
      logger.error('Failed to save period', e);
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen={opened}
      onClose={onClose}
      title="Edit Period"
      size="md"
      footer={
        <div className={styles.footer}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={`rounded-6 border bg-surface-2 text-primary cursor-pointer ${styles.cancelBtn}`}
            data-saving={saving || undefined}
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`rounded-6 cursor-pointer ${styles.saveBtn}`}
            data-saving={saving || undefined}
          >
            {saving ? 'Opslaan…' : 'Opslaan'}
          </button>
        </div>
      }
    >
      <div className="flex-col gap-12">
        <div className="flex-col gap-6">
          <label className="fw-600" htmlFor="period-name">
            Name
          </label>
          <input
            id="period-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`rounded-6 border bg-surface-2 text-primary ${styles.input}`}
          />
        </div>

          {showDates && (
            <div className={styles.dateGrid}>
              <div className="flex-col gap-6">
                <label className="fw-600" htmlFor="period-start">
                  Start (YYYY-MM-DD)
                </label>
                <input
                  id="period-start"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="YYYY-MM-DD"
                  className={`rounded-6 border bg-surface-2 text-primary ${styles.input}`}
                />
              </div>

              <div className="flex-col gap-6">
                <label className="fw-600" htmlFor="period-end">
                  End (YYYY-MM-DD)
                </label>
                <input
                  id="period-end"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="YYYY-MM-DD"
                  className={`rounded-6 border bg-surface-2 text-primary ${styles.input}`}
                />
              </div>
            </div>
          )}

          <div className="flex-col gap-6">
            <label className="fw-600" htmlFor="period-type">
              Type (optional)
            </label>
            <input
              id="period-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="season / league / cup"
              className={`rounded-6 border bg-surface-2 text-primary ${styles.input}`}
            />
          </div>

          {showSportVariant && (
            <div className="flex-col gap-6">
              <label className="fw-600" htmlFor="period-sport">
                Sport Variant
              </label>
              <select
                id="period-sport"
                value={selectedSportId}
                onChange={(e) => setSelectedSportId(e.target.value)}
                disabled={saving || sportsLoading}
                className={`rounded-6 border bg-surface-2 text-primary ${styles.input}`}
              >
                <option value="">— Select sport variant —</option>
                {filteredVariants.map((sport) => (
                  <option key={sport.id} value={sport.id}>
                    {sport.sport_icon} {sport.name} {sport.category_name ? `(${sport.category_name})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex-col gap-6">
            <label className="fw-600" htmlFor="period-description">
              Description
            </label>
            <textarea
              id="period-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className={`rounded-6 border bg-surface-2 text-primary ${styles.textarea}`}
            />
          </div>

          {error && <div className="text-danger">{error}</div>}
        </div>
      </Modal>
  );
}

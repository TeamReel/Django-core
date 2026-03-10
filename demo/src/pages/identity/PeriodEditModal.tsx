import React, { useEffect, useMemo, useState } from 'react';
import { useSports } from '../../hooks/useSports';
import styles from './PeriodEditModal.module.css';
import { logger } from '@/utils/logger';

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
  /** Organisation's sport category ID - if provided, only variants of this category are shown */
  organisationSportId?: string | null;
  onSave: (payload: {
    name?: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    data?: Record<string, any>;
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

  const extractPeriodName = (p: any): string =>
    firstNonEmptyString(
      p?.name,
      p?.title,
      p?.label,
      p?.data?.name,
      p?.data?.data?.name,
      p?.metadata?.name,
      p?.metadata?.identity?.name,
    );

  const extractPeriodDescription = (p: any): string =>
    firstNonEmptyString(
      p?.description,
      p?.data?.description,
      p?.data?.data?.description,
      p?.metadata?.description,
    );

  const extractPeriodType = (p: any): string =>
    firstNonEmptyString(
      p?.type,
      p?.data?.type,
      p?.data?.data?.type,
      p?.metadata?.type,
    );

  const extractSportId = (p: any): string =>
    firstNonEmptyString(
      p?.sport_id,
      p?.sport?.id,
      p?.metadata?.sport_id,
      p?.metadata?.sport?.id,
      p?.data?.sport_id,
      p?.data?.sport?.id,
      p?.data?.metadata?.sport_id,
      p?.data?.metadata?.sport?.id,
      p?.data?.data?.sport_id,
      p?.data?.data?.sport?.id,
    );

  // Some endpoints/pages pass a wrapped API response shape like { data: { ...periodFields } }.
  // Detect that and unwrap it so the form pre-fills correctly.
  const resolvedPeriod: any = useMemo(() => {
    if (!period) return null;
    const candidate: any = period;

    const looksLikePeriod = (obj: any): boolean => {
      if (!obj || typeof obj !== 'object') return false;
      // Heuristics: Period objects have an id, and at least some period-ish fields.
      const hasId = obj.id != null;
      const hasAnyFields =
        obj.name != null ||
        obj.description != null ||
        obj.start_date != null ||
        obj.end_date != null ||
        obj.sport_id != null ||
        obj.sport != null;
      if (hasId && hasAnyFields) return true;

      // Sometimes we only get name + any other period fields.
      const hasName = obj.name != null;
      const hasOther = obj.description != null || obj.start_date != null || obj.end_date != null || obj.sport_id != null || obj.sport != null;
      if (hasName && hasOther) return true;
      return false;
    };

    // Common wrappers we’ve seen:
    // - { data: { ...period } }
    // - { data: { data: { ...period } } }
    // - { id: <something>, data: { ...period } }  (id present but fields live under data)
    const d1: any = candidate?.data;
    const d2: any = candidate?.data?.data;
    const d3: any = candidate?.data?.data?.data;

    // If candidate already looks correct, keep it.
    if (looksLikePeriod(candidate)) return candidate;

    // If candidate doesn't look like a period, but nested objects do, unwrap.
    if (looksLikePeriod(d3)) return d3;
    if (looksLikePeriod(d2)) return d2;
    if (looksLikePeriod(d1)) return d1;

    // Fallback to whatever we got.
    return candidate;
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
      logger.error('Failed to save period', e);
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={`flex-center ${styles.overlay}`}
      onClick={onClose}
    >
      <div
        className={`p-24 rounded-8 bg-surface text-primary border ${styles.modal}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-between gap-12">
          <h2 className="m-0 mb-12 text-primary">Edit Period</h2>
          <button
            onClick={onClose}
            className="bg-transparent border-none fs-18 cursor-pointer text-primary"
            aria-label="Close"
          >
            ×
          </button>
        </div>

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

          <div className={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className={`rounded-6 border bg-surface-2 text-primary cursor-pointer ${styles.cancelBtn}`}
              data-saving={saving || undefined}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`rounded-6 cursor-pointer ${styles.saveBtn}`}
              data-saving={saving || undefined}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

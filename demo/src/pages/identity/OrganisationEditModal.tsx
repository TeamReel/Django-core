import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useSports } from '../../hooks/useSports';
import { logger } from '@/utils/logger';
import type { Organisation } from '../../types';
import styles from './OrganisationEditModal.module.css';

interface OrganisationEditModalProps {
  opened: boolean;
  onClose: () => void;
  organisation: Organisation | null;
  onSave: (orgData: Partial<Organisation> & { sport_id?: string | null }) => Promise<void>;
}

export default function OrganisationEditModal({ opened, onClose, organisation, onSave }: OrganisationEditModalProps) {
  const [formData, setFormData] = useState<Partial<Organisation> & { sport_id?: string | null }>({});
  const [saving, setSaving] = useState(false);
  const { categories, loading: sportsLoading } = useSports();

  useEffect(() => {
    if (organisation) {
      setFormData({
        name: organisation.name,
        slug: organisation.slug,
        description: organisation.description,
        is_active: organisation.is_active,
        sport_id: organisation.sport?.id || null,
      });
    }
  }, [organisation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      logger.error('Failed to save organisation', error);
    } finally {
      setSaving(false);
    }
  };

  if (!organisation) return null;

  return (
    <Modal
      isOpen={opened}
      onClose={onClose}
      title="Edit Organisation"
      size="md"
      footer={
        <div className={styles.buttonRow}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={`py-8 px-16 rounded-4 border bg-surface-2 text-primary ${styles.cancelBtn}`}
            data-saving={saving || undefined}
          >
            Annuleren
          </button>
          <button
            type="submit"
            form="org-edit-form"
            disabled={saving}
            className={`py-8 px-16 rounded-4 border-none ${styles.submitBtn}`}
            data-saving={saving || undefined}
          >
            {saving ? 'Opslaan...' : 'Wijzigingen opslaan'}
          </button>
        </div>
      }
    >
      <form id="org-edit-form" onSubmit={handleSubmit}>
        <div className="flex-col gap-16">
          <div>
            <label className="field-label text-primary">Name</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full p-8 rounded-4 border text-primary ${styles.formInput}`}
              required
            />
          </div>

          <div>
            <label className="field-label text-primary">Slug</label>
            <input
              type="text"
              value={formData.slug || ''}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className={`w-full p-8 rounded-4 border text-primary ${styles.formInput}`}
              required
            />
          </div>

          <div>
            <label className="field-label text-primary">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={`w-full p-8 rounded-4 border text-primary ${styles.formTextarea}`}
            />
          </div>

          <div>
            <label className="flex-row gap-8 text-primary">
              <input
                type="checkbox"
                checked={formData.is_active ?? true}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              Active
            </label>
          </div>

          <div>
            <label className="field-label text-primary">Sport</label>
            <select
              value={formData.sport_id || ''}
              onChange={(e) => setFormData({ ...formData, sport_id: e.target.value || null })}
              disabled={sportsLoading}
              className={`w-full p-8 rounded-4 border text-primary ${styles.formInput}`}
            >
              <option value="">— No sport selected —</option>
              {categories.map((sport) => (
                <option key={sport.id} value={sport.id}>
                  {sport.sport_icon} {sport.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </form>
    </Modal>
  );
}

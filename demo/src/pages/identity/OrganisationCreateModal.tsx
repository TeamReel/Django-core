import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useSports } from '../../hooks/useSports';
import { logger } from '@/utils/logger';
import styles from './OrganisationCreateModal.module.css';

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
      logger.error('Failed to create organisation', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={opened}
      onClose={onClose}
      title="Create Organisation"
      size="md"
      footer={
        <div className={styles.actions}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={styles.cancelButton}
            data-saving={String(saving)}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="org-create-form"
            disabled={saving}
            className={styles.submitButton}
            data-saving={String(saving)}
          >
            {saving ? 'Creating...' : 'Create'}
          </button>
        </div>
      }
    >
      <form id="org-create-form" onSubmit={handleSubmit}>
        <div className={styles.fieldGroup}>
          <div>
            <label className={styles.label}>
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={styles.input}
              required
              disabled={saving}
            />
          </div>

          <div>
            <label className={styles.label}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={styles.textarea}
              disabled={saving}
            />
          </div>

          <div>
            <label className={styles.label}>
              Sport
            </label>
            <select
              value={sportId || ''}
              onChange={(e) => setSportId(e.target.value || null)}
              disabled={saving || sportsLoading}
              className={styles.input}
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
      </form>
    </Modal>
  );
}

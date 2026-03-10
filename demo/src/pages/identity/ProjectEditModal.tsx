import { useEffect, useState } from 'react';
import { Alert } from '@django-core/design-system';
import { logger } from '@/utils/logger';
import styles from './ProjectEditModal.module.css';

interface Project {
  id: string | number;
  slug?: string;
  name: string;
  description?: string;
  is_active?: boolean;
}

interface ProjectEditModalProps {
  opened: boolean;
  onClose: () => void;
  project: Project | null;
  onSave: (projectData: Partial<Project>) => Promise<void>;
}

export default function ProjectEditModal({ opened, onClose, project, onSave }: ProjectEditModalProps) {
  const [formData, setFormData] = useState<Partial<Project>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description,
        is_active: Boolean(project.is_active),
      });
      setError(null);
    }
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      logger.error('Failed to save changes', error);
      const message = error instanceof Error ? error.message : 'Failed to save changes';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (!opened || !project) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>Edit Project</h2>

        {error && (
          <div className={styles.errorWrapper}>
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.fieldGroup}>
            <div>
              <label className={styles.label}>Name</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={styles.input}
                required
              />
            </div>

            <div>
              <label className={styles.label}>Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={styles.textarea}
              />
            </div>

            <div>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.is_active ?? true}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
                Active
              </label>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className={styles.cancelButton}
              data-disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={styles.submitButton}
              data-disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

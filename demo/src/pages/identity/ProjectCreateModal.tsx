import { useEffect, useMemo, useState } from 'react';

type OrgOption = { id: string; name: string; slug?: string };
type ProjectOption = { id: string | number; name: string; slug?: string; organisation?: any };

interface ProjectCreateModalProps {
  opened: boolean;
  onClose: () => void;
  title: string;

  organisations?: OrgOption[];
  clubs?: ProjectOption[];
  requireOrganisation?: boolean;
  requireClub?: boolean;
  initialOrganisationId?: string;
  initialClubId?: string;

  onCreate: (projectData: {
    name: string;
    description?: string;
    organisation_id?: string;
    parent_project_id?: string;
  }) => Promise<void>;
}

export default function ProjectCreateModal({
  opened,
  onClose,
  title,
  onCreate,
  organisations = [],
  clubs = [],
  requireOrganisation = false,
  requireClub = false,
  initialOrganisationId = '',
  initialClubId = '',
}: ProjectCreateModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedOrganisationId, setSelectedOrganisationId] = useState('');
  const [selectedClubId, setSelectedClubId] = useState('');

  const hasOrgSelect = organisations.length > 0;
  const hasClubSelect = clubs.length > 0;

  useEffect(() => {
    if (!opened) return;
    setError(null);
    setSelectedOrganisationId(initialOrganisationId);
    setSelectedClubId(initialClubId);
  }, [opened, initialOrganisationId, initialClubId]);

  const sortedOrganisations = useMemo(() => {
    return [...organisations].sort((a, b) => a.name.localeCompare(b.name));
  }, [organisations]);

  const filteredClubs = useMemo(() => {
    const orgId = selectedOrganisationId;
    const list = orgId
      ? clubs.filter((c) => {
          const cOrg = typeof c.organisation === 'string' ? c.organisation : c.organisation?.id;
          return String(cOrg) === String(orgId);
        })
      : clubs;
    return [...list].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [clubs, selectedOrganisationId]);

  const getClubOrganisationId = (clubId: string): string | null => {
    const club = clubs.find((c) => String(c.id) === String(clubId));
    if (!club) return null;
    const org = typeof club.organisation === 'string' ? club.organisation : club.organisation?.id;
    return org ? String(org) : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (requireOrganisation && !selectedOrganisationId) {
        throw new Error('Select a federation first.');
      }
      if (requireClub && !selectedClubId) {
        throw new Error('Select a club first.');
      }

      await onCreate({
        name,
        description: description || undefined,
        organisation_id: selectedOrganisationId || undefined,
        parent_project_id: selectedClubId || undefined,
      });
      setName('');
      setDescription('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  if (!opened) return null;

  return (
    <div className="modal-backdrop">
      <div
        className="p-24 rounded-8 shadow-lg border"
        style={{
          backgroundColor: 'var(--app-surface)',
          width: '520px',
          maxWidth: '92%',
          color: 'var(--app-text)',
        }}
      >
        <div className="flex-between gap-12">
          <h2 className="mb-16 mt-0 text-primary">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-4 border bg-surface-2 text-primary"
            style={{
              padding: '6px 10px',
              cursor: saving ? 'not-allowed' : 'pointer',
              height: 'fit-content',
            }}
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex-col gap-16">
            {hasOrgSelect && (
              <div>
                <label
                  className="block fw-500 text-primary"
                  style={{ marginBottom: '6px' }}
                  htmlFor="project-create-org"
                >
                  Federation
                </label>
                <select
                  id="project-create-org"
                  value={selectedOrganisationId}
                  onChange={(e) => {
                    setSelectedOrganisationId(e.target.value);
                    setSelectedClubId('');
                  }}
                  disabled={saving}
                  required={requireOrganisation}
                  className="w-full p-8 rounded-4 form-input"
                >
                  <option value="">Select federation…</option>
                  {sortedOrganisations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {hasClubSelect && (
              <div>
                <label
                  className="block fw-500 text-primary"
                  style={{ marginBottom: '6px' }}
                  htmlFor="project-create-club"
                >
                  Club
                </label>
                <select
                  id="project-create-club"
                  value={selectedClubId}
                  onChange={(e) => {
                    const clubId = e.target.value;
                    setSelectedClubId(clubId);

                    // If user selects a club first, auto-fill federation.
                    const orgId = clubId ? getClubOrganisationId(clubId) : null;
                    if (orgId) setSelectedOrganisationId(orgId);
                  }}
                  disabled={saving}
                  required={requireClub}
                  className="w-full p-8 rounded-4 form-input"
                >
                  <option value="">Select club…</option>
                  {filteredClubs.map((c) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label
                className="block fw-500 text-primary"
                style={{ marginBottom: '6px' }}
                htmlFor="project-create-name"
              >
                Name
              </label>
              <input
                id="project-create-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-8 rounded-4 form-input"
                required
                disabled={saving}
              />
            </div>

            <div>
              <label
                className="block fw-500 text-primary"
                style={{ marginBottom: '6px' }}
                htmlFor="project-create-description"
              >
                Description
              </label>
              <textarea
                id="project-create-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-8 rounded-4 form-textarea"
                style={{ minHeight: '90px' }}
                disabled={saving}
              />
            </div>

            {error && (
              <div className="fs-13 text-error">{error}</div>
            )}
          </div>

          <div
            className="flex-row gap-12 mt-20"
            style={{ justifyContent: 'flex-end' }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="py-8 px-16 rounded-4 border bg-surface-2 text-primary"
              style={{ cursor: saving ? 'not-allowed' : 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="py-8 px-16 rounded-4 border-none text-white"
              style={{
                backgroundColor: '#0066cc',
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

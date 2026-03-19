/**
 * AppBackgroundsPage — Superadmin management of sport-linked backgrounds.
 *
 * Allows superadmins to create, edit, and delete global background images
 * used in video generation (lineup, match intro, goal celebration, etc.).
 * Backgrounds are linked to a Sport so teams only see relevant options.
 */
import React, { useState } from 'react';
import { Card, Badge, Button, Alert } from '@django-core/design-system';
import { PageHeader, PageContent } from '@django-core/page-templates';
import { useAppBackgroundsData } from './useAppBackgroundsData';
import styles from './AppBackgroundsPage.module.css';

interface AppBackgroundForm {
  label: string;
  sport: string;
  sort_order: number;
  is_active: boolean;
}

const EMPTY_FORM: AppBackgroundForm = {
  label: '',
  sport: '',
  sort_order: 0,
  is_active: true,
};

export const AppBackgroundsPage: React.FC = () => {
  const d = useAppBackgroundsData();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<AppBackgroundForm>(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setFile(null);
    setShowForm(true);
  };

  const openEdit = (bg: typeof d.backgrounds[0]) => {
    setEditId(bg.id);
    setForm({
      label: bg.label,
      sport: bg.sport_id || '',
      sort_order: bg.sort_order,
      is_active: bg.is_active,
    });
    setFile(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      await d.update(editId, form);
    } else {
      if (!file) return;
      await d.create(form, file);
    }
    setShowForm(false);
    setForm(EMPTY_FORM);
    setEditId(null);
    setFile(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Weet je zeker dat je deze achtergrond wilt verwijderen?')) return;
    await d.remove(id);
  };

  if (d.loading) {
    return (
      <div className="p-6">
        <PageHeader
          title="Achtergronden"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Config' },
            { label: 'Achtergronden' },
          ]}
        />
        <PageContent>
          <Card>
            <div className="text-center py-8">
              Laden...
            </div>
          </Card>
        </PageContent>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Achtergronden beheren"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Config' },
          { label: 'Achtergronden' },
        ]}
        actions={
          <div className="flex-row gap-12">
            <div className={`fs-11 rounded-6 fw-600 cursor-default ${styles.superadminBadge}`}>
              SUPERADMIN
            </div>
            <Button variant="primary" size="sm" onClick={openCreate}>
              + Nieuwe achtergrond
            </Button>
          </div>
        }
      />

      <PageContent>
        {d.error && (
          <Alert variant="error" className="mb-4">
            {d.error}
          </Alert>
        )}

        <Alert variant="info" className="mb-4">
          <strong>Sport-achtergronden:</strong> Deze achtergronden worden getoond bij het
          genereren van content (line-ups, match intro&apos;s, etc.). Ze zijn gekoppeld aan
          een sport, zodat clubs alleen relevante achtergronden zien. Alleen superadmins
          kunnen ze aanmaken en bewerken.
        </Alert>

        {/* ─── Create / Edit form ─── */}
        {showForm && (
          <Card className="mb-16">
            <form onSubmit={handleSubmit} className={styles.form}>
              <h3 className="fs-16 fw-600 mb-12">
                {editId ? 'Achtergrond bewerken' : 'Nieuwe achtergrond'}
              </h3>

              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label className="fs-12 fw-600 mb-4 block">Label</label>
                  <input
                    type="text"
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    placeholder="bv. Voetbalveld"
                    required
                    className="py-8 px-12 border rounded-4 fs-14 w-full"
                  />
                </div>

                <div className={styles.field}>
                  <label className="fs-12 fw-600 mb-4 block">Sport</label>
                  <select
                    value={form.sport}
                    onChange={(e) => setForm({ ...form, sport: e.target.value })}
                    required
                    className="py-8 px-12 border rounded-4 fs-14 w-full"
                  >
                    <option value="">— Kies sport —</option>
                    {d.sports.map((s: { id: string; name: string; parent_name?: string }) => (
                      <option key={s.id} value={s.id}>
                        {s.parent_name ? `${s.parent_name} → ${s.name}` : s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label className="fs-12 fw-600 mb-4 block">Volgorde</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                    className="py-8 px-12 border rounded-4 fs-14 w-full"
                  />
                </div>

                <div className={styles.field}>
                  <label className="fs-12 fw-600 mb-4 block">Actief</label>
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  />
                </div>

                {!editId && (
                  <div className={styles.field}>
                    <label className="fs-12 fw-600 mb-4 block">Afbeelding</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      required
                      className="fs-14"
                    />
                  </div>
                )}
              </div>

              <div className="flex-row gap-8 mt-12">
                <Button type="submit" variant="primary" size="sm" disabled={d.saving}>
                  {d.saving ? 'Opslaan...' : editId ? 'Bijwerken' : 'Aanmaken'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowForm(false); setEditId(null); }}
                >
                  Annuleren
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* ─── Background grid ─── */}
        {d.backgrounds.length === 0 ? (
          <Card>
            <div className="text-center py-16">
              <p className="fs-14 mb-8" style={{ color: 'var(--app-muted-text)' }}>
                Nog geen achtergronden aangemaakt.
              </p>
              <Button variant="primary" size="sm" onClick={openCreate}>
                + Eerste achtergrond toevoegen
              </Button>
            </div>
          </Card>
        ) : (
          <div className={styles.grid}>
            {d.backgrounds.map((bg) => (
              <Card key={bg.id} className={styles.card}>
                {bg.url ? (
                  <div
                    className={styles.thumbnail}
                    style={{ background: `url(${bg.url}) center/cover` }}
                  />
                ) : (
                  <div className={styles.thumbnailPlaceholder}>
                    Geen afbeelding
                  </div>
                )}
                <div className={styles.cardBody}>
                  <div className="flex-between">
                    <span className="fs-14 fw-600">{bg.label}</span>
                    <Badge variant={bg.is_active ? 'success' : 'default'}>
                      {bg.is_active ? 'Actief' : 'Inactief'}
                    </Badge>
                  </div>
                  <div className="fs-12 mt-4" style={{ color: 'var(--app-muted-text)' }}>
                    Sport: {bg.sport_name} · Volgorde: {bg.sort_order}
                  </div>
                  <div className="flex-row gap-8 mt-8">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(bg)}>
                      Bewerken
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(bg.id)}>
                      Verwijderen
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </PageContent>
    </>
  );
};

export default AppBackgroundsPage;

import React from 'react';
import type { Organisation, Project, User } from '../../types';
import { fetchAllPages, invalidateFetchAllPagesCache } from '../../utils/fetchAllPages';
import { setActiveContext, getActiveContext } from '../../utils/activeContext';
import { getApiV1BaseUrl } from './orgDataHelpers';
import { api } from '@/api';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UseOrgActionsParams {
  org: Organisation | null;
  currentOrgSlug: string | undefined;
  currentOrgId: string | undefined;
  navigate: (to: string, opts?: { replace?: boolean }) => void;
  // State setters
  setOrg: (v: Organisation | null) => void;
  setActivatingContext: (v: boolean) => void;
  setActiveContextState: (v: Record<string, unknown> | null) => void;
  setDeleteLoading: (v: boolean) => void;
  setInviteLoading: (v: boolean) => void;
  setInviteEmail: (v: string) => void;
  setIsEditMode: (v: boolean) => void;
  setEditName: (v: string) => void;
  setEditType: (v: string) => void;
  setEditCountry: (v: string) => void;
  setSaving: (v: boolean) => void;
  setMembers: (v: User[]) => void;
  setClubs: React.Dispatch<React.SetStateAction<Project[]>>;
  setTeams: React.Dispatch<React.SetStateAction<Project[]>>;
  setAllClubsForTeams: React.Dispatch<React.SetStateAction<Project[]>>;
  // Current values
  inviteEmail: string;
  inviteRole: 'admin' | 'member';
  editName: string;
  editType: string;
  editCountry: string;
}

// ─── Hook: all mutation handlers ─────────────────────────────────────────────

export function useOrgActions(params: UseOrgActionsParams) {
  const {
    org, currentOrgSlug, currentOrgId, navigate,
    setOrg, setActivatingContext, setActiveContextState,
    setDeleteLoading, setInviteLoading, setInviteEmail,
    setIsEditMode, setEditName, setEditType, setEditCountry, setSaving,
    setMembers, setClubs, setTeams, setAllClubsForTeams,
    inviteEmail, inviteRole, editName, editType, editCountry,
  } = params;

  const { pushToast } = useToast();
  const confirm = useConfirm();

  const handleActivateContext = async () => {
    try {
      setActivatingContext(true);
      await setActiveContext('organisation', String(org?.slug || org?.id || ''));
      const context = await getActiveContext();
      setActiveContextState(context);
    } finally {
      setActivatingContext(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    try {
      setInviteLoading(true);
      const apiV1BaseUrl = getApiV1BaseUrl();
      await api.post(`/organisations/${currentOrgSlug}/members/`, { email: inviteEmail, role: inviteRole });
      try {
        const p = new URLSearchParams();
        p.set('include_project_memberships', 'true');
        p.set('include_role_assignments', 'true');
        p.set('include_project_membership_details', 'true');
        p.set('page_size', '250');
        const membersUrl = `${apiV1BaseUrl}/organisations/${currentOrgSlug}/members/?${p.toString()}`;
        const allMembers = await fetchAllPages<User>(
          membersUrl,
          { headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-Organisation-ID': String(org?.id || currentOrgId || '') }, credentials: 'include' },
          { bypass: true },
        );
        setMembers(allMembers);
      } catch { /* ignore */ }
      setInviteEmail('');
      pushToast({ message: 'Member added successfully', type: 'success' });
    } catch (err) {
      logger.error('Invite error', err);
      pushToast({ message: err instanceof Error ? err.message : 'Failed to invite member', type: 'error' });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({ title: 'Organisatie verwijderen', message: 'Weet je zeker dat je deze organisatie wilt verwijderen? Dit kan niet ongedaan worden gemaakt.', confirmLabel: 'Verwijderen', variant: 'danger' });
    if (!ok) return;
    try {
      setDeleteLoading(true);
      await api.delete(`/organisations/${currentOrgSlug}/`);
      navigate('/federations');
    } catch (err) {
      logger.error('Delete error', err);
      pushToast({ message: 'Organisatie verwijderen mislukt', type: 'error' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEdit = () => {
    setEditName(org?.name || '');
    setEditType(org?.metadata?.type || '');
    setEditCountry(org?.metadata?.country || '');
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditName('');
    setEditType('');
    setEditCountry('');
  };

  const handleSaveEdit = async () => {
    if (!org || !editName.trim()) { pushToast({ message: 'Organisation name is required', type: 'error' }); return; }
    try {
      setSaving(true);
      const updatedOrg = await api.patch<Organisation>(`/organisations/${currentOrgSlug}/`, { name: editName.trim(), metadata: { ...org.metadata, type: editType.trim(), country: editCountry.trim() } });
      setOrg(updatedOrg);
      setIsEditMode(false);
    } catch (err) {
      logger.error('Update error', err);
      pushToast({ message: 'Failed to update organisation', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const saveOrganisationEdits = async (orgData: Partial<Organisation> & { sport_id?: string | null }) => {
    if (!org) throw new Error('Missing organisation');
    const patch: Record<string, unknown> = { ...orgData as Record<string, unknown> };
    delete patch.slug;
    delete patch.sport;
    const updatedOrg = await api.patch<Organisation>(`/organisations/${currentOrgSlug}/`, patch);
    if (updatedOrg) setOrg(updatedOrg);
    invalidateFetchAllPagesCache();
    try {
      const refreshed = await api.get<Organisation>(`/organisations/${currentOrgSlug}/`);
      if (refreshed) setOrg(refreshed);
    } catch { /* Best-effort */ }
  };

  const saveProjectEdits = async (project: Project, patch: Partial<Project>) => {
    const projectSlugOrId = project.slug || project.id;
    const updated = await api.patch<Project>(`/organisations/${currentOrgSlug}/projects/${projectSlugOrId}/`, patch);
    setClubs((prev) => prev.map((p) => (String(p.id) === String(project.id) ? { ...p, ...updated } : p)));
    setTeams((prev) => prev.map((p) => (String(p.id) === String(project.id) ? { ...p, ...updated } : p)));
    setAllClubsForTeams((prev) => prev.map((p) => (String(p.id) === String(project.id) ? { ...p, ...updated } : p)));
  };

  return {
    handleActivateContext, handleInvite, handleDelete,
    handleEdit, handleCancelEdit, handleSaveEdit,
    saveOrganisationEdits, saveProjectEdits,
  };
}

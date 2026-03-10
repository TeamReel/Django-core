/**
 * useAddMemberData - Data hook for AddMemberModal
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/api';
import { logger } from '@/utils/logger';
import type { AddMemberModalProps, UserResult, NewUserFormData } from './types';

export function useAddMemberData({
  isOpen,
  onClose,
  onSuccess,
  contextLevel,
  orgSlug,
  clubProjectId,
  teamProjectId,
}: AddMemberModalProps) {
  const [tab, setTab] = useState<'new' | 'existing'>('existing');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Existing-user search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('member');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // New-user form state
  const [newUser, setNewUser] = useState<NewUserFormData>({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
  });
  const [emailManuallyEdited, setEmailManuallyEdited] = useState(false);

  // Auto-fill email & password when first/last name change
  const updateNewUserName = (field: 'first_name' | 'last_name', value: string) => {
    const updated = { ...newUser, [field]: value };
    if (!emailManuallyEdited) {
      const first = (field === 'first_name' ? value : newUser.first_name).trim();
      const last = (field === 'last_name' ? value : newUser.last_name).trim();
      if (first && last) {
        const initial = first.charAt(0).toLowerCase();
        const surname = last.toLowerCase().replace(/\s+/g, '');
        updated.email = `${initial}.${surname}@teamreel.com`;
        updated.password = 'Basis123.';
      }
    }
    setNewUser(updated);
  };

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setTab('existing');
      setError(null);
      setSuccessMsg(null);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedRole('member');
      setNewUser({ first_name: '', last_name: '', email: '', password: '' });
      setEmailManuallyEdited(false);
    }
  }, [isOpen]);

  // Search users debounced
  const searchUsers = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      setIsSearching(true);
      const { results } = await api.list<UserResult>('/admin/users/', {
        params: { search: q },
        pageSize: 20,
      });
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => searchUsers(searchQuery), 350);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery, searchUsers]);

  /**
   * Add an existing user as member.
   * If contextLevel is team → also add to club → also add to org.
   * If contextLevel is club → also add to org.
   * If contextLevel is organisation → just add to org.
   */
  const addExistingUser = async (user: UserResult) => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      // 1) Always add to organisation
      try {
        await api.post(`/organisations/${orgSlug}/members/`, {
          email: user.email,
          role: selectedRole === 'admin' ? 'admin' : 'member',
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : '';
        if (!msg.toLowerCase().includes('already') && !msg.toLowerCase().includes('exists')) {
          throw new Error(msg || 'Failed to add member to federation');
        }
      }

      // 2) Add to club project if clubProjectId provided (club or team level)
      if (clubProjectId && (contextLevel === 'club' || contextLevel === 'team')) {
        try {
          await api.post(`/projects/${clubProjectId}/members/`, {
            user_id: Number(user.id),
            role: selectedRole === 'admin' ? 'admin' : 'editor',
          });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : '';
          if (!msg.toLowerCase().includes('already') && !msg.toLowerCase().includes('exists')) {
            throw new Error(msg || 'Failed to add member to club');
          }
        }
      }

      // 3) Add to team project if teamProjectId provided (team level only)
      if (teamProjectId && contextLevel === 'team') {
        try {
          await api.post(`/projects/${teamProjectId}/members/`, {
            user_id: Number(user.id),
            role: selectedRole === 'admin' ? 'admin' : 'editor',
          });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : '';
          if (!msg.toLowerCase().includes('already') && !msg.toLowerCase().includes('exists')) {
            throw new Error(msg || 'Failed to add member to team');
          }
        }
      }

      setSuccessMsg(`${user.first_name || user.email} added as member!`);
      onSuccess();

      // Auto-close after short delay
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: unknown) {
      logger.error('Failed to add member', err);
      setError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  // Create new user + add
  const createNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.password) {
      setError('Email and password are required');
      return;
    }
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      // 1) Create the user account
      const createdUser = await api.post<UserResult>('/admin/users/', {
        ...newUser,
        password_confirm: newUser.password,
      });

      // 2) Add to hierarchy using the same logic as existing user
      await addExistingUser(createdUser);
    } catch (err: unknown) {
      logger.error('Failed to create user', err);
      setError(err instanceof Error ? err.message : 'Failed to create user');
      setLoading(false);
    }
  };

  return {
    tab,
    setTab,
    error,
    setError,
    successMsg,
    setSuccessMsg,
    loading,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    selectedRole,
    setSelectedRole,
    newUser,
    setNewUser,
    emailManuallyEdited,
    setEmailManuallyEdited,
    updateNewUserName,
    addExistingUser,
    createNewUser,
    contextLevel,
    onClose,
  };
}

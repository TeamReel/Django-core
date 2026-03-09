/**
 * MemberSearchStep — Member add wizard: search & select existing user.
 *
 * Debounced search against /api/v1/admin/users/?search=…
 * Shows results with name + email. On select → advance to role step.
 * Also offers "Nieuw lid aanmaken" to switch to MemberDetails step.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, UserPlus, Loader, User as UserIcon } from 'lucide-react';
import { useWizard } from '../../Wizard';
import { api } from '@/api';
import styles from '../CreateWizard.module.css';

// ─── Types ────────────────────────────────────────────────

export interface UserResult {
  id: number | string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
}

export interface MemberSearchData {
  /** Callback when a user is selected */
  onSelectUser: (user: UserResult) => void;
  /** Switch to "new member" flow */
  onNewMember: () => void;
  /** Context summary (team name, etc.) */
  contextSummary: string;
}

// ─── Component ────────────────────────────────────────────

export function MemberSearchStep({ data }: { data: MemberSearchData }) {
  const { goTo } = useWizard();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Debounced search ──────────────────────────────────
  const searchUsers = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    try {
      setIsSearching(true);
      const { results } = await api.list<UserResult>('/admin/users/', {
        params: { search: q },
        pageSize: 20,
      });
      setResults(results);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => searchUsers(query), 350);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, searchUsers]);

  // ── Handlers ──────────────────────────────────────────
  const handleSelect = (user: UserResult) => {
    data.onSelectUser(user);
    goTo('memberRole');
  };

  const handleNewMember = () => {
    data.onNewMember();
    goTo('memberDetails');
  };

  return (
    <div className={styles.memberStepWrap}>
      {/* Context banner */}
      {data.contextSummary && (
        <div className={styles.memberContextBanner}>
          <UserIcon size={14} />
          <span>{data.contextSummary}</span>
        </div>
      )}

      {/* Search bar */}
      <div className={styles.memberSearchBar}>
        <Search size={18} className={styles.memberSearchIcon} />
        <input
          className={styles.memberSearchInput}
          type="text"
          placeholder="Zoek op naam of email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {/* Results section */}
      <div className={styles.memberSearchResults}>
        {isSearching && (
          <div className={styles.memberSearchEmpty}>
            <Loader size={20} className={styles.memberSpinner} />
            <span>Zoeken…</span>
          </div>
        )}

        {!isSearching && query.length >= 2 && results.length === 0 && (
          <div className={styles.memberSearchEmpty}>
            <span>Geen gebruikers gevonden voor &ldquo;{query}&rdquo;</span>
          </div>
        )}

        {!isSearching && query.length < 2 && (
          <div className={styles.memberSearchEmpty}>
            <Search size={20} />
            <span>Typ minimaal 2 tekens om te zoeken</span>
          </div>
        )}

        {!isSearching && results.length > 0 && (
          <div className={styles.memberResultsList}>
            {results.map((u) => (
              <button
                key={String(u.id)}
                className={styles.memberResultRow}
                onClick={() => handleSelect(u)}
                type="button"
              >
                <div className={styles.memberResultAvatar}>
                  {(u.first_name?.[0] || u.email[0] || '?').toUpperCase()}
                </div>
                <div className={styles.memberResultInfo}>
                  <span className={styles.memberResultName}>
                    {u.first_name} {u.last_name}
                  </span>
                  <span className={styles.memberResultEmail}>{u.email}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Separator + New member CTA */}
      <div className={styles.memberDivider}>
        <span>of</span>
      </div>

      <button
        className={styles.memberNewBtn}
        onClick={handleNewMember}
        type="button"
      >
        <UserPlus size={18} />
        Nieuw lid aanmaken
      </button>
    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Pencil, Eye, Trash2, MoreHorizontal } from 'lucide-react';
import { ShareButton } from '../../components/ShareButton';
import { setActiveContext, getActiveContext } from '../../utils/activeContext';
import { api } from '@/api';
import { useToast } from '@/components/ui/Toast';
import type { Project } from './teamDetailTypes';
import s from './TeamOrganisationDetailPage.module.css';

interface TeamPageHeaderProps {
  team: Project;
  club: { name?: string } | null;
  org: { id: string | number };
  isActive: boolean;
  activatingContext: boolean;
  setActivatingContext: (v: boolean) => void;
  activeContextState: unknown;
  setActiveContextState: (ctx: unknown) => void;
  isPlayer: boolean;
  backToClubHref: string;
  setTeam: React.Dispatch<React.SetStateAction<Project | null>>;
  onEditClick: () => void;
  onDetailClick: () => void;
}

export function TeamPageHeader({
  team,
  club,
  org,
  isActive,
  activatingContext,
  setActivatingContext,
  activeContextState,
  setActiveContextState,
  isPlayer,
  backToClubHref,
  setTeam,
  onEditClick,
  onDetailClick,
}: TeamPageHeaderProps) {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!overflowOpen) return;
    const handler = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) setOverflowOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [overflowOpen]);

  return (
    <div className={s.headerRow}>
      <div className={s.titleBlock}>
        <Link to={backToClubHref} className={s.parentLink}>
          {club?.name || 'Club'}
        </Link>
        <h1>{team.name}</h1>
        <p>{team?.team_type === 'legends' ? 'Legends Team' : 'Team'}</p>
      </div>

      <div className={s.actions}>
        <button
          type="button"
          className={`${s.activeBtn} ${isActive ? s.activeBtnOn : ''}`}
          disabled={activatingContext || isActive}
          onClick={async () => {
            if (!team || isActive) return;
            try {
              setActivatingContext(true);
              await setActiveContext('team', String(team.id));
              const context = await getActiveContext();
              setActiveContextState(context);
            } finally {
              setActivatingContext(false);
            }
          }}
          title="Stel dit team in als actieve context"
        >
          {isActive && <Check size={14} />}
          {isActive ? 'Actief' : 'Activeren'}
        </button>

        {!isPlayer && (
          <button type="button" className={s.iconBtn} onClick={onEditClick} title="Bewerken">
            <Pencil size={16} />
          </button>
        )}

        <ShareButton compact />

        <div className={s.overflowWrap} ref={overflowRef}>
          <button type="button" className={s.iconBtn} onClick={() => setOverflowOpen((v) => !v)} title="Meer">
            <MoreHorizontal size={16} />
          </button>
          {overflowOpen && (
            <div className={s.overflowMenu}>
              <button type="button" onClick={() => { onDetailClick(); setOverflowOpen(false); }}>
                <Eye size={14} /> Bekijken
              </button>
              <button type="button" onClick={() => { navigate(backToClubHref); setOverflowOpen(false); }}>
                <Eye size={14} /> Terug naar club
              </button>
              {!isPlayer && (
                <button
                  type="button"
                  onClick={async () => {
                    const newType = team?.team_type === 'legends' ? 'regular' : 'legends';
                    try {
                      await api.patch(`/projects/${encodeURIComponent(String(team.id))}/`, { team_type: newType });
                      setTeam((prev) => prev ? { ...prev, team_type: newType } : prev);
                    } catch {
                      pushToast({ message: 'Kon team type niet opslaan', type: 'error' });
                    }
                    setOverflowOpen(false);
                  }}
                >
                  {team?.team_type === 'legends' ? '⚽ Maak Regulier' : '⭐ Maak Legends'}
                </button>
              )}
              {!isPlayer && (
                <button
                  type="button"
                  className={s.overflowDanger}
                  onClick={async () => {
                    if (!window.confirm(`Weet je zeker dat je team ${team.name} wilt verwijderen?`)) return;
                    try {
                      await api.delete(`/projects/${encodeURIComponent(String(team.id))}/`);
                      navigate(backToClubHref);
                    } catch {
                      pushToast({ message: 'Kon team niet verwijderen', type: 'error' });
                    }
                    setOverflowOpen(false);
                  }}
                >
                  <Trash2 size={14} /> Verwijderen
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

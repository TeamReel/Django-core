/**
 * useMatchWizardData — State, effects, and handlers for MatchWizard.
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActivities, Activity } from '../hooks/useActivities';
import { getApiBaseUrl } from '../utils/apiBase';
import type { ContentTemplate } from '../pages/identity/ContentGenerationModal';
import {
  WizardStep, ContentPhase, SquadMember,
  LINEUP_REQUIRED_SUBTYPES, POSITIONS, getSquadMemberName,
} from './matchWizardTypes';

export function useMatchWizardData(isOpen: boolean, onClose: () => void, initialMatchId?: string) {
  const navigate = useNavigate();
  const apiBaseUrl = getApiBaseUrl();

  const [currentStep, setCurrentStep] = useState<WizardStep>('match');
  const [selectedMatch, setSelectedMatch] = useState<Activity | null>(null);
  const [lineupSlots, setLineupSlots] = useState<{ goalkeeper: string[]; player: string[] }>({ goalkeeper: [], player: [] });
  const [lineupFormation, setLineupFormation] = useState('4-3-3');
  const [squadGroups, setSquadGroups] = useState<Record<string, SquadMember[]>>({ goalkeeper: [], player: [] });
  const [guestPlayers, setGuestPlayers] = useState<SquadMember[]>([]);
  const [squadLoading, setSquadLoading] = useState(false);
  const [selectedContentPhase, setSelectedContentPhase] = useState<ContentPhase>('pre');
  const [editingPosition, setEditingPosition] = useState<number | null>(null);
  const [lineupSaving, setLineupSaving] = useState(false);

  // Matches
  const { activities, loading: matchesLoading, error: matchesLoadError } = useActivities({ limit: 10 });

  // Error states per step
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [squadError, setSquadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const matchesError = matchesLoadError ? 'Kon wedstrijden niet laden. Controleer je verbinding.' : null;

  const [pendingContent, setPendingContent] = useState<{
    key: string; label: string; subtype: string; templateType: string;
  } | null>(null);

  // Content generation modal
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [selectedContentTypeLabel, setSelectedContentTypeLabel] = useState('');
  const contentGeneratedRef = useRef(false);

  // Templates
  const [availableTemplates, setAvailableTemplates] = useState<Record<string, ContentTemplate[]>>({});
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const upcomingMatches = activities.filter(a => {
    const isMatch = a.activity_type.toLowerCase().includes('match');
    return isMatch && new Date(a.start_time) > new Date();
  });

  // ── Effects ──────────────────────────────────────────────────

  // Auto-select match (and skip to content step when initialMatchId provided)
  useEffect(() => {
    if (isOpen && !selectedMatch) {
      if (initialMatchId) {
        const m = activities.find(a => a.id === initialMatchId || (a as any).slug === initialMatchId);
        if (m) {
          setSelectedMatch(m);
          setCurrentStep('content');
        } else if (!matchesLoading) {
          // Match not in initial fetch — load it directly from API
          (async () => {
            try {
              const res = await fetch(
                `${apiBaseUrl}/api/v1/activities/${encodeURIComponent(initialMatchId)}/`,
                { credentials: 'include', headers: { 'Content-Type': 'application/json' } },
              );
              if (res.ok) {
                const raw = await res.json();
                const data = raw?.data || raw;
                if (data?.id) {
                  setSelectedMatch(data as Activity);
                  setCurrentStep('content');
                }
              }
            } catch (err) {
              console.error('[MatchWizard] Failed to fetch match by id:', err);
            }
          })();
        }
      } else if (upcomingMatches.length > 0) {
        setSelectedMatch(upcomingMatches[0]);
      }
    }
  }, [isOpen, activities, initialMatchId, upcomingMatches, selectedMatch, matchesLoading, apiBaseUrl]);

  // Reset to initial state when wizard closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedMatch(null);
      setCurrentStep('match');
      setSelectedContentPhase('pre');
      setIsContentModalOpen(false);
    }
  }, [isOpen]);

  // Load saved lineup from match metadata
  useEffect(() => {
    if (!selectedMatch) return;
    const metadata = (selectedMatch as any).metadata;
    const saved = metadata?.lineup;
    if (saved) {
      if (saved.formation) setLineupFormation(saved.formation);
      if (saved.goalkeeper || saved.player) setLineupSlots({ goalkeeper: saved.goalkeeper || [], player: saved.player || [] });
    } else if (metadata?.formation) {
      setLineupFormation(metadata.formation);
    }
  }, [selectedMatch]);

  // Fetch squad when entering lineup
  useEffect(() => {
    if (selectedMatch && currentStep === 'lineup') fetchSquad();
  }, [selectedMatch, currentStep]);

  // Fetch templates when entering content
  useEffect(() => {
    if (selectedMatch && currentStep === 'content') fetchTemplates();
  }, [selectedMatch, currentStep]);

  // ── Fetch helpers ─────────────────────────────────────────────

  const fetchSquad = async () => {
    if (!selectedMatch) return;
    const projectId = (selectedMatch as any).project?.id;
    if (!projectId) return;

    setSquadLoading(true);
    setSquadError(null);
    try {
      const url = `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(String(projectId))}/members/?page_size=100`;
      const res = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) { setSquadError('Kon spelers niet laden'); setSquadLoading(false); return; }

      const raw = await res.json();
      let members: SquadMember[] = [];
      if (raw?.data?.data && Array.isArray(raw.data.data)) members = raw.data.data;
      else if (raw?.data?.results && Array.isArray(raw.data.results)) members = raw.data.results;
      else if (raw?.results && Array.isArray(raw.results)) members = raw.results;
      else if (Array.isArray(raw?.data)) members = raw.data;
      else if (Array.isArray(raw)) members = raw;

      let nextUrl = raw?.meta?.pagination?.next;
      while (nextUrl) {
        const nr = await fetch(nextUrl, { credentials: 'include', headers: { 'Content-Type': 'application/json' } });
        if (!nr.ok) break;
        const nd = await nr.json();
        let nm: SquadMember[] = [];
        if (nd?.data?.data && Array.isArray(nd.data.data)) nm = nd.data.data;
        else if (Array.isArray(nd?.data)) nm = nd.data;
        else if (Array.isArray(nd)) nm = nd;
        members = [...members, ...nm];
        nextUrl = nd?.meta?.pagination?.next;
      }

      const groups: Record<string, SquadMember[]> = { goalkeeper: [], player: [] };
      members.forEach(p => {
        let roles: string[] = [];
        if (p.functional_roles?.length) roles = p.functional_roles;
        else if (p.metadata?.functional_roles?.length) roles = p.metadata.functional_roles;
        else if (p.data?.functional_role) roles = [p.data.functional_role];
        else if (p.metadata?.team_role) roles = [p.metadata.team_role];
        else roles = ['player'];

        roles.forEach(role => {
          const nr = role.toLowerCase();
          if (nr === 'goalkeeper' || nr === 'keeper' || nr === 'gk') groups.goalkeeper.push(p);
          else if (groups[nr]) groups[nr].push(p);
          else groups.player.push(p);
        });
      });
      setSquadGroups(groups);
    } catch (err) {
      console.error('Failed to fetch squad:', err);
      setSquadError('Kon spelers niet laden. Controleer je verbinding.');
    } finally {
      setSquadLoading(false);
    }
  };

  const fetchTemplates = async () => {
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/content-generation/templates/?is_active=true&page_size=500`, {
        credentials: 'include', headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) { setTemplatesError('Kon sjablonen niet laden'); setTemplatesLoading(false); return; }
      const data = await res.json();
      const rawResults = data?.data?.data || data?.data?.results || data?.results || data?.data || data || [];
      const all: ContentTemplate[] = Array.isArray(rawResults) ? rawResults : [];
      const grouped: Record<string, ContentTemplate[]> = {};
      all.forEach(t => {
        const subtype = t.template_subtype || t.template_type;
        if (!grouped[subtype]) grouped[subtype] = [];
        grouped[subtype].push(t);
      });
      setAvailableTemplates(grouped);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      setTemplatesError('Kon sjablonen niet laden. Controleer je verbinding.');
    } finally {
      setTemplatesLoading(false);
    }
  };

  const saveLineup = async () => {
    if (!selectedMatch) return;
    setLineupSaving(true);
    setSaveError(null);
    try {
      const matchId = (selectedMatch as any).slug || selectedMatch.id;
      const existingMetadata = (selectedMatch as any).metadata || {};
      const csrfToken = document.cookie.match(/csrftoken=([^;]+)/)?.[1] ?? '';
      await fetch(`${apiBaseUrl}/api/v1/activities/${encodeURIComponent(String(matchId))}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
        credentials: 'include',
        body: JSON.stringify({
          metadata: { ...existingMetadata, formation: lineupFormation, lineup: { formation: lineupFormation, goalkeeper: lineupSlots.goalkeeper, player: lineupSlots.player } },
        }),
      });
    } catch (err) {
      console.error('Failed to save lineup:', err);
      setSaveError('Opslaan mislukt. Probeer opnieuw.');
    } finally {
      setLineupSaving(false);
    }
  };

  // ── Handlers ──────────────────────────────────────────────────

  const handleSelectPlayer = (positionIdx: number, isGoalkeeper: boolean, memberId: string | null) => {
    if (isGoalkeeper) {
      const newGk = [...lineupSlots.goalkeeper];
      newGk[positionIdx] = memberId || '';
      setLineupSlots({ ...lineupSlots, goalkeeper: newGk.filter(Boolean) as string[] });
    } else {
      const newPlayers = [...lineupSlots.player];
      while (newPlayers.length <= positionIdx) newPlayers.push('');
      newPlayers[positionIdx] = memberId || '';
      setLineupSlots({ ...lineupSlots, player: newPlayers });
    }
    setEditingPosition(null);
  };

  const openContentGeneration = (contentKey: string, contentLabel: string, subtype: string, templateType: string) => {
    const templates = availableTemplates[subtype] || [];
    let matchedTemplate: ContentTemplate | undefined;

    if ((subtype === 'lineup' || subtype === 'lineup_flyer') && templates.length > 0) {
      if (lineupFormation) {
        matchedTemplate = templates.find(t =>
          t.formation_detail?.code === lineupFormation ||
          t.name.toLowerCase().includes(lineupFormation.toLowerCase().replace(/-/g, '')),
        );
      }
      if (!matchedTemplate) matchedTemplate = templates[0];
    } else {
      matchedTemplate = templates[0];
    }

    const syntheticAllowed = ['match_intro', 'goal', 'poster'];
    if (!matchedTemplate && syntheticAllowed.includes(subtype)) {
      const synthetic: Record<string, ContentTemplate> = {
        match_intro: { id: 0, name: 'Match Intro', description: '', style_variant: '', template_type: 'pre_match', template_subtype: 'match_intro', is_active: true, input_requirements: {} } as any,
        goal: { id: 0, name: 'Goal Celebration', description: '', style_variant: '', template_type: 'during_match', template_subtype: 'goal', is_active: true, input_requirements: {} } as any,
        poster: { id: 0, name: 'Elftalfoto', description: '', style_variant: '', template_type: 'pre_match', template_subtype: 'poster', is_active: true, input_requirements: { members: { goalkeeper: { count: 1, asset_types: ['in_tenue'] }, player: { count: 10, asset_types: ['in_tenue'] } } } } as any,
      };
      matchedTemplate = synthetic[subtype];
    }

    setSelectedContentTypeLabel(contentLabel);
    setSelectedTemplate(matchedTemplate || null);
    setIsContentModalOpen(true);
  };

  const handleContentSelect = (contentKey: string, contentLabel: string, subtype: string, templateType: string) => {
    if (!selectedMatch) return;
    setPendingContent({ key: contentKey, label: contentLabel, subtype, templateType });
    if (LINEUP_REQUIRED_SUBTYPES.has(subtype)) {
      setCurrentStep('lineup');
      return;
    }
    setCurrentStep('review');
  };

  const handleLineupConfirm = () => {
    saveLineup();
    setCurrentStep('review');
  };

  const handleReviewConfirm = () => {
    if (pendingContent) openContentGeneration(pendingContent.key, pendingContent.label, pendingContent.subtype, pendingContent.templateType);
  };

  const handleContentModalClose = () => {
    setIsContentModalOpen(false);
    setSelectedTemplate(null);
    setSelectedContentTypeLabel('');
    if (contentGeneratedRef.current) {
      // Content was generated — close entire wizard
      contentGeneratedRef.current = false;
      handleClose();
    } else {
      // User hit back before generation — return to review step
      setCurrentStep('review');
    }
  };
  const handleContentGenerated = (_message?: string) => {
    // Mark that content was generated so the next onClose closes the wizard
    contentGeneratedRef.current = true;
  };

  const handleBack = () => {
    if (currentStep === 'review') {
      // Go back to lineup if lineup was required, else back to content
      if (pendingContent && LINEUP_REQUIRED_SUBTYPES.has(pendingContent.subtype)) setCurrentStep('lineup');
      else setCurrentStep('content');
    }
    else if (currentStep === 'lineup') { setPendingContent(null); setCurrentStep('content'); }
    else if (currentStep === 'content') setCurrentStep('match');
    else handleClose();
  };

  const handleClose = () => {
    setCurrentStep('match');
    setSelectedMatch(null);
    setLineupSlots({ goalkeeper: [], player: [] });
    setSquadGroups({ goalkeeper: [], player: [] });      setGuestPlayers([]);    setEditingPosition(null);
    setPendingContent(null);
    onClose();
  };

  // ── Derived ──────────────────────────────────────────────────

  const gkPool = squadGroups.goalkeeper || [];
  const playerPool = squadGroups.player || [];
  const allPlayers = [...gkPool, ...playerPool, ...guestPlayers];

  const filledPositions = lineupSlots.goalkeeper.filter(Boolean).length + lineupSlots.player.filter(Boolean).length;
  const totalPositions = POSITIONS.length;

  const getStepTitle = (): string => {
    switch (currentStep) {
      case 'match': return 'Selecteer wedstrijd';
      case 'content': return 'Kies content';
      case 'lineup': return pendingContent ? `Opstelling — ${pendingContent.label}` : 'Opstelling';
      case 'review': return 'Bevestig generatie';
    }
  };

  const addGuestPlayer = (name: string, jerseyNumber?: string) => {
    const guest: SquadMember = {
      id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user: { name },
      metadata: jerseyNumber ? { shirt_number: jerseyNumber } : undefined,
      isGuest: true,
    };
    setGuestPlayers(prev => [...prev, guest]);
  };

  const removeGuestPlayer = (guestId: string) => {
    setGuestPlayers(prev => prev.filter(g => g.id !== guestId));
    // Clear from lineup slots if assigned
    setLineupSlots(prev => ({
      goalkeeper: prev.goalkeeper.map(id => id === guestId ? '' : id).filter(Boolean),
      player: prev.player.map(id => id === guestId ? '' : id),
    }));
  };

  const getMemberById = (memberId: string) => allPlayers.find(m => m.id === memberId);
  const getMemberName = (memberId: string) => { const m = getMemberById(memberId); return m ? getSquadMemberName(m) : 'Onbekend'; };
  const getMemberJersey = (memberId: string) => { const m = getMemberById(memberId); const j = m?.metadata?.shirt_number || m?.data?.jersey_number; return j ? String(j) : null; };

  return {
    navigate,
    // Step
    currentStep, setCurrentStep, selectedMatch, setSelectedMatch,
    // Lineup
    lineupSlots, lineupFormation, squadGroups, squadLoading,
    editingPosition, setEditingPosition, lineupSaving,
    filledPositions, totalPositions, allPlayers,
    // Content
    selectedContentPhase, setSelectedContentPhase, pendingContent,
    isContentModalOpen, selectedTemplate, selectedContentTypeLabel,
    // Errors
    matchesError, templatesError, squadError, saveError,
    // Matches
    matchesLoading, upcomingMatches,
    // Handlers
    handleSelectPlayer, handleContentSelect, handleLineupConfirm, handleReviewConfirm,
    handleContentModalClose, handleContentGenerated,
    handleBack, handleClose,
    // Guest players
    guestPlayers, addGuestPlayer, removeGuestPlayer,
    // Helpers
    getStepTitle, getMemberName, getMemberJersey, getMemberById,
    // Retry
    retrySquad: fetchSquad, retryTemplates: fetchTemplates,
  };
}

/**
 * MatchWizard - Step-by-step mobile wizard for match preparation
 *
 * 3-step flow:
 * 1. Select/confirm match (active match pre-selected)
 * 2. Set lineup (mobile-friendly position-by-position)
 * 3. Create content (pre-match / during-match options)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomSheet, Button, Badge } from '@django-core/design-system';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Users,
  Zap,
  Calendar,
  Shirt,
  Play,
  Image,
  Video,
  FileText,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import { useActivities, Activity } from '../hooks/useActivities';
import { formatRelativeTime, getDateUrgency } from '../utils/relativeTime';
import { getApiBaseUrl } from '../utils/apiBase';
import ContentGenerationModal, { type ContentTemplate } from '../pages/identity/ContentGenerationModal';

type WizardStep = 'match' | 'lineup' | 'content';
type ContentPhase = 'pre' | 'during' | 'post';

interface MatchWizardProps {
  isOpen: boolean;
  onClose: () => void;
  initialMatchId?: string;
}

interface SquadMember {
  id: string;
  user?: {
    id?: string;
    name?: string;
    user_name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  member?: {
    id?: string;
    name?: string;
    user_name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  user_name?: string;
  metadata?: {
    shirt_number?: string | number;
    position?: string;
    functional_roles?: string[];
    team_role?: string;
  };
  data?: {
    jersey_number?: string | number;
    functional_role?: string;
  };
  functional_roles?: string[];
}

// Keys map to real template subtype values from backend
const CONTENT_TYPES = {
  pre: [
    { key: 'flyer', subtype: 'flyer', label: 'Match Flyer', icon: Image, description: 'Aankondiging voor socials', templateType: 'pre_match' },
    { key: 'lineup', subtype: 'lineup', label: 'Lineup Video', icon: Video, description: 'Visuele opstelling video', templateType: 'pre_match' },
    { key: 'lineup_flyer', subtype: 'lineup_flyer', label: 'Lineup Flyer', icon: Users, description: 'Opstelling flyer', templateType: 'pre_match' },
    { key: 'match_intro', subtype: 'match_intro', label: 'Match Intro', icon: Play, description: 'Match intro video', templateType: 'pre_match' },
    { key: 'poster', subtype: 'poster', label: 'Elftalfoto', icon: Image, description: 'Teamfoto genereren', templateType: 'pre_match' },
    { key: 'walkon', subtype: 'walkon', label: 'Walk-on Video', icon: Video, description: 'Spelers intro video', templateType: 'pre_match' },
    { key: 'anthem', subtype: 'anthem', label: 'Anthem Video', icon: Play, description: 'Volkslied video', templateType: 'pre_match' },
  ],
  during: [
    { key: 'goal', subtype: 'goal', label: 'Goal Celebration', icon: Zap, description: 'Doelpunt vieren', templateType: 'during_match' },
    { key: 'score_update', subtype: 'score_update', label: 'Score Update', icon: FileText, description: 'Tussenstand delen', templateType: 'during_match' },
  ],
  post: [
    { key: 'end_score', subtype: 'end_score', label: 'Eindstand', icon: FileText, description: 'Uitslag delen', templateType: 'post_match' },
    { key: 'match_summary', subtype: 'match_summary', label: 'Samenvatting', icon: FileText, description: 'Wedstrijd samenvatting', templateType: 'post_match' },
    { key: 'highlights', subtype: 'highlights', label: 'Highlights', icon: Video, description: 'Samenvattingsvideo', templateType: 'post_match' },
  ],
};

const POSITIONS = [
  { slot: 1, label: 'GK', fullLabel: 'Keeper' },
  { slot: 2, label: 'LB', fullLabel: 'Links Achter' },
  { slot: 3, label: 'CB', fullLabel: 'Centrale Verdediger' },
  { slot: 4, label: 'CB', fullLabel: 'Centrale Verdediger' },
  { slot: 5, label: 'RB', fullLabel: 'Rechts Achter' },
  { slot: 6, label: 'CDM', fullLabel: 'Controleur' },
  { slot: 7, label: 'CM', fullLabel: 'Middenvelder' },
  { slot: 8, label: 'CM', fullLabel: 'Middenvelder' },
  { slot: 9, label: 'LW', fullLabel: 'Links Aanvaller' },
  { slot: 10, label: 'ST', fullLabel: 'Spits' },
  { slot: 11, label: 'RW', fullLabel: 'Rechts Aanvaller' },
];

export default function MatchWizard({ isOpen, onClose, initialMatchId }: MatchWizardProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<WizardStep>('match');
  const [selectedMatch, setSelectedMatch] = useState<Activity | null>(null);
  const [lineupSlots, setLineupSlots] = useState<{ goalkeeper: string[]; player: string[] }>({
    goalkeeper: [],
    player: [],
  });
  const [lineupFormation, setLineupFormation] = useState<string>('4-3-3');
  const [squadGroups, setSquadGroups] = useState<Record<string, SquadMember[]>>({
    goalkeeper: [],
    player: [],
  });
  const [squadLoading, setSquadLoading] = useState(false);
  const [selectedContentPhase, setSelectedContentPhase] = useState<ContentPhase>('pre');
  const [editingPosition, setEditingPosition] = useState<number | null>(null);
  const [lineupSaving, setLineupSaving] = useState(false);

  // Content generation modal state
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [selectedContentTypeLabel, setSelectedContentTypeLabel] = useState<string>('');

  // Template fetching (same as desktop)
  const [availableTemplates, setAvailableTemplates] = useState<Record<string, ContentTemplate[]>>({});
  const [templatesLoading, setTemplatesLoading] = useState(false);

  const apiBaseUrl = getApiBaseUrl();

  // Helper: get member name
  const getSquadMemberName = (p: SquadMember): string => {
    const user = p.user || p.member;
    if (!user && p.user_name) return p.user_name;
    if (!user) return 'Onbekend';
    if (user.name) return user.name;
    if (user.user_name) return user.user_name;
    const full = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    if (full) return full;
    if (user.email) return user.email;
    return 'Onbekend';
  };

  // Fetch upcoming matches
  const { activities, loading: matchesLoading } = useActivities({ limit: 10 });

  const upcomingMatches = activities.filter((a) => {
    const isMatch = a.activity_type.toLowerCase().includes('match');
    const isFuture = new Date(a.start_time) > new Date();
    return isMatch && isFuture;
  });

  // Auto-select first match or initial match
  useEffect(() => {
    if (isOpen && !selectedMatch) {
      if (initialMatchId) {
        const match = activities.find(a => a.id === initialMatchId || (a as any).slug === initialMatchId);
        if (match) setSelectedMatch(match);
      } else if (upcomingMatches.length > 0) {
        setSelectedMatch(upcomingMatches[0]);
      }
    }
  }, [isOpen, activities, initialMatchId, upcomingMatches, selectedMatch]);

  // Load existing lineup from match metadata when match changes
  useEffect(() => {
    if (!selectedMatch) return;
    const metadata = (selectedMatch as any).metadata;
    const saved = metadata?.lineup;
    if (saved) {
      if (saved.formation) {
        setLineupFormation(saved.formation);
      }
      if (saved.goalkeeper || saved.player) {
        setLineupSlots({
          goalkeeper: saved.goalkeeper || [],
          player: saved.player || [],
        });
      }
    } else if (metadata?.formation) {
      setLineupFormation(metadata.formation);
    }
  }, [selectedMatch]);

  // Fetch squad when match is selected and entering lineup step
  useEffect(() => {
    if (selectedMatch && currentStep === 'lineup') {
      fetchSquad();
    }
  }, [selectedMatch, currentStep]);

  const fetchSquad = async () => {
    if (!selectedMatch) return;
    const projectId = (selectedMatch as any).project?.id;
    if (!projectId) return;

    setSquadLoading(true);
    try {
      // Same API as MatchDetailPage uses
      const url = `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(String(projectId))}/members/?page_size=100`;
      const res = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) {
        setSquadLoading(false);
        return;
      }

      const raw = await res.json();
      let members: SquadMember[] = [];

      // Handle various response formats
      if (raw?.data?.data && Array.isArray(raw.data.data)) members = raw.data.data;
      else if (raw?.data?.results && Array.isArray(raw.data.results)) members = raw.data.results;
      else if (raw?.results && Array.isArray(raw.results)) members = raw.results;
      else if (Array.isArray(raw?.data)) members = raw.data;
      else if (Array.isArray(raw)) members = raw;

      // Paginate if needed
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

      // Group by functional_roles (same logic as MatchDetailPage)
      const groups: Record<string, SquadMember[]> = { goalkeeper: [], player: [] };
      members.forEach((p) => {
        let roles: string[] = [];
        if (p.functional_roles && Array.isArray(p.functional_roles) && p.functional_roles.length > 0) {
          roles = p.functional_roles;
        } else if (p.metadata?.functional_roles && Array.isArray(p.metadata.functional_roles) && p.metadata.functional_roles.length > 0) {
          roles = p.metadata.functional_roles;
        } else if (p.data?.functional_role) {
          roles = [p.data.functional_role];
        } else if (p.metadata?.team_role) {
          roles = [p.metadata.team_role];
        } else {
          roles = ['player']; // Default to player
        }

        roles.forEach(role => {
          const nr = role.toLowerCase();
          if (nr === 'goalkeeper' || nr === 'keeper' || nr === 'gk') {
            groups.goalkeeper.push(p);
          } else if (groups[nr]) {
            groups[nr].push(p);
          } else {
            groups.player.push(p);
          }
        });
      });

      setSquadGroups(groups);
    } catch (err) {
      console.error('Failed to fetch squad:', err);
    } finally {
      setSquadLoading(false);
    }
  };

  const saveLineup = async () => {
    if (!selectedMatch) return;
    setLineupSaving(true);
    try {
      const matchId = (selectedMatch as any).slug || selectedMatch.id;
      const existingMetadata = (selectedMatch as any).metadata || {};

      const lineupData = {
        formation: lineupFormation,
        goalkeeper: lineupSlots.goalkeeper,
        player: lineupSlots.player,
      };

      // PATCH the activity with updated metadata
      const res = await fetch(`${apiBaseUrl}/api/v1/activities/${encodeURIComponent(String(matchId))}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          metadata: {
            ...existingMetadata,
            formation: lineupFormation,
            lineup: lineupData,
          },
        }),
      });

      if (!res.ok) {
        console.error('Failed to save lineup');
      }
    } catch (err) {
      console.error('Failed to save lineup:', err);
    } finally {
      setLineupSaving(false);
    }
  };

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

  // Fetch available templates when entering content step
  useEffect(() => {
    if (selectedMatch && currentStep === 'content') {
      fetchTemplates();
    }
  }, [selectedMatch, currentStep]);

  const fetchTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('is_active', 'true');
      params.append('page_size', '500');

      const res = await fetch(`${apiBaseUrl}/api/v1/content-generation/templates/?${params.toString()}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) return;

      const data = await res.json();
      const rawResults = data?.data?.data || data?.data?.results || data?.results || data?.data || data || [];
      const allTemplates: ContentTemplate[] = Array.isArray(rawResults) ? rawResults : [];

      // Group templates by subtype
      const grouped: Record<string, ContentTemplate[]> = {};
      allTemplates.forEach(t => {
        const subtype = t.template_subtype || t.template_type;
        if (!grouped[subtype]) grouped[subtype] = [];
        grouped[subtype].push(t);
      });
      setAvailableTemplates(grouped);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleContentSelect = (contentKey: string, contentLabel: string, subtype: string, templateType: string) => {
    if (!selectedMatch) return;

    // Find the matching template from fetched templates (same logic as desktop)
    const templates = availableTemplates[subtype] || [];
    let matchedTemplate: ContentTemplate | undefined;

    // Special handling for lineup: match on formation
    if ((subtype === 'lineup' || subtype === 'lineup_flyer') && templates.length > 0) {
      const matchFormation = lineupFormation;
      if (matchFormation) {
        matchedTemplate = templates.find(t =>
          t.formation_detail?.code === matchFormation ||
          t.name.toLowerCase().includes(matchFormation.toLowerCase().replace(/-/g, ''))
        );
      }
      if (!matchedTemplate) matchedTemplate = templates[0];
    } else {
      matchedTemplate = templates[0];
    }

    // For types without templates, create a synthetic one (same as desktop)
    const templateNotRequired = ['match_intro', 'goal', 'poster'].includes(subtype);
    if (!matchedTemplate && templateNotRequired) {
      const syntheticTemplates: Record<string, ContentTemplate> = {
        match_intro: { id: 0, name: 'Match Intro', description: '', style_variant: '', template_type: 'pre_match', template_subtype: 'match_intro', is_active: true, input_requirements: {} } as any,
        goal: { id: 0, name: 'Goal Celebration', description: '', style_variant: '', template_type: 'during_match', template_subtype: 'goal', is_active: true, input_requirements: {} } as any,
        poster: { id: 0, name: 'Elftalfoto', description: '', style_variant: '', template_type: 'pre_match', template_subtype: 'poster', is_active: true, input_requirements: { members: { goalkeeper: { count: 1, asset_types: ['in_tenue'] }, player: { count: 10, asset_types: ['in_tenue'] } } } } as any,
      };
      matchedTemplate = syntheticTemplates[subtype];
    }

    setSelectedContentTypeLabel(contentLabel);
    setSelectedTemplate(matchedTemplate || null);
    setIsContentModalOpen(true);
  };

  const handleContentModalClose = () => {
    setIsContentModalOpen(false);
    setSelectedTemplate(null);
    setSelectedContentTypeLabel('');
  };

  const handleContentGenerated = (message?: string) => {
    // Content was generated successfully
    handleContentModalClose();
    // Optionally show success message or close wizard
  };

  const goToStep = (step: WizardStep) => {
    if (currentStep === 'lineup' && step !== 'lineup') {
      saveLineup();
    }
    setCurrentStep(step);
  };

  const handleClose = () => {
    setCurrentStep('match');
    setSelectedMatch(null);
    setLineupSlots({ goalkeeper: [], player: [] });
    setSquadGroups({ goalkeeper: [], player: [] });
    setEditingPosition(null);
    onClose();
  };

  // Calculate filled positions
  const gkPool = squadGroups.goalkeeper || [];
  const playerPool = squadGroups.player || [];
  const allPlayers = [...gkPool, ...playerPool];

  const filledPositions = lineupSlots.goalkeeper.filter(Boolean).length + lineupSlots.player.filter(Boolean).length;
  const totalPositions = POSITIONS.length;

  const getStepTitle = () => {
    switch (currentStep) {
      case 'match': return 'Selecteer Wedstrijd';
      case 'lineup': return 'Opstelling';
      case 'content': return 'Content Maken';
    }
  };

  const getMemberById = (memberId: string): SquadMember | undefined => {
    return allPlayers.find(m => m.id === memberId);
  };

  const getMemberName = (memberId: string): string => {
    const member = getMemberById(memberId);
    return member ? getSquadMemberName(member) : 'Onbekend';
  };

  const getMemberJersey = (memberId: string): string | null => {
    const member = getMemberById(memberId);
    const jersey = member?.metadata?.shirt_number || member?.data?.jersey_number;
    return jersey ? String(jersey) : null;
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      title={getStepTitle()}
    >
      <div style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
        {/* Progress Steps */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          padding: '16px',
          borderBottom: '1px solid var(--app-border)',
        }}>
          {(['match', 'lineup', 'content'] as WizardStep[]).map((step, idx) => (
            <div
              key={step}
              onClick={() => step === 'match' || selectedMatch ? goToStep(step) : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 16px',
                borderRadius: '20px',
                backgroundColor: currentStep === step
                  ? 'var(--app-primary)'
                  : 'var(--app-surface-2)',
                color: currentStep === step ? 'white' : 'var(--app-text-muted)',
                fontSize: '13px',
                fontWeight: currentStep === step ? 600 : 400,
                cursor: step === 'match' || selectedMatch ? 'pointer' : 'default',
                opacity: step !== 'match' && !selectedMatch ? 0.5 : 1,
              }}
            >
              {step === 'match' && <Calendar size={14} />}
              {step === 'lineup' && <Shirt size={14} />}
              {step === 'content' && <Zap size={14} />}
              <span>{idx + 1}</span>
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          {/* Step 1: Match Selection */}
          {currentStep === 'match' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {matchesLoading ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--app-text-muted)' }}>
                  Laden...
                </div>
              ) : upcomingMatches.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--app-text-muted)' }}>
                  Geen komende wedstrijden gevonden
                </div>
              ) : (
                upcomingMatches.map((match) => {
                  const isSelected = selectedMatch?.id === match.id;
                  const date = new Date(match.start_time);
                  const relativeTime = formatRelativeTime(date, 'nl');
                  const urgency = getDateUrgency(date);

                  return (
                    <button
                      key={match.id}
                      onClick={() => setSelectedMatch(match)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '16px',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid var(--app-primary)' : '1px solid var(--app-border)',
                        backgroundColor: isSelected ? 'var(--app-primary-light, rgba(59,142,165,0.1))' : 'var(--app-surface)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                      }}
                    >
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        backgroundColor: urgency === 'urgent' ? 'var(--color-error)' :
                                        urgency === 'soon' ? 'var(--color-warning)' : 'var(--app-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '12px',
                      }}>
                        {date.getDate()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--app-text)' }}>
                          {match.title}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--app-text-muted)' }}>
                          {relativeTime} • {date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      {isSelected && (
                        <Check size={24} style={{ color: 'var(--app-primary)' }} />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* Step 2: Lineup */}
          {currentStep === 'lineup' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Progress indicator */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}>
                <span style={{ fontSize: '14px', color: 'var(--app-text-muted)' }}>
                  {filledPositions} / {totalPositions} posities ingevuld
                </span>
                <div style={{
                  width: '100px',
                  height: '4px',
                  backgroundColor: 'var(--app-border)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${(filledPositions / totalPositions) * 100}%`,
                    height: '100%',
                    backgroundColor: filledPositions === totalPositions ? 'var(--color-success)' : 'var(--app-primary)',
                    transition: 'width 0.2s ease',
                  }} />
                </div>
              </div>

              {squadLoading ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--app-text-muted)' }}>
                  Spelers laden...
                </div>
              ) : allPlayers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--app-text-muted)' }}>
                  Geen spelers gevonden in het team
                </div>
              ) : (
                /* Position list - mobile friendly */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {POSITIONS.map((posConfig) => {
                    const isGoalkeeper = posConfig.slot === 1;
                    const positionIdx = isGoalkeeper ? 0 : posConfig.slot - 2;
                    const memberId = isGoalkeeper
                      ? lineupSlots.goalkeeper[0] || null
                      : lineupSlots.player[positionIdx] || null;
                    const isEditing = editingPosition === posConfig.slot;

                    // Build list of already used member IDs
                    const usedMemberIds = [
                      ...(lineupSlots.goalkeeper || []),
                      ...(lineupSlots.player || []),
                    ].filter(Boolean);

                    if (isEditing) {
                      // Show player selection
                      return (
                        <div
                          key={posConfig.slot}
                          style={{
                            backgroundColor: 'var(--app-surface-2)',
                            borderRadius: '12px',
                            padding: '12px',
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '12px',
                          }}>
                            <span style={{ fontWeight: 600, color: 'var(--app-text)' }}>
                              {posConfig.fullLabel} ({posConfig.label})
                            </span>
                            <button
                              onClick={() => setEditingPosition(null)}
                              style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: 'var(--app-text-muted)',
                                cursor: 'pointer',
                              }}
                            >
                              Annuleren
                            </button>
                          </div>
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            maxHeight: '200px',
                            overflow: 'auto',
                          }}>
                            {/* Option to clear */}
                            <button
                              onClick={() => handleSelectPlayer(positionIdx, isGoalkeeper, null)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: 'var(--app-surface)',
                                color: 'var(--app-text-muted)',
                                cursor: 'pointer',
                                textAlign: 'left',
                              }}
                            >
                              — Geen speler —
                            </button>
                            {allPlayers.map((member) => {
                              const isUsed = usedMemberIds.includes(member.id) && member.id !== memberId;
                              const jersey = member.metadata?.shirt_number || member.data?.jersey_number;
                              return (
                                <button
                                  key={member.id}
                                  onClick={() => !isUsed && handleSelectPlayer(positionIdx, isGoalkeeper, member.id)}
                                  disabled={isUsed}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: member.id === memberId
                                      ? 'var(--app-primary)'
                                      : 'var(--app-surface)',
                                    color: member.id === memberId
                                      ? 'white'
                                      : isUsed ? 'var(--app-text-muted)' : 'var(--app-text)',
                                    cursor: isUsed ? 'not-allowed' : 'pointer',
                                    opacity: isUsed ? 0.5 : 1,
                                    textAlign: 'left',
                                  }}
                                >
                                  {jersey && (
                                    <span style={{
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '50%',
                                      backgroundColor: 'var(--app-border)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                    }}>
                                      {jersey}
                                    </span>
                                  )}
                                  <span style={{ flex: 1 }}>{getSquadMemberName(member)}</span>
                                  {isUsed && <span style={{ fontSize: '11px' }}>✓ ingevuld</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    // Normal position row
                    return (
                      <button
                        key={posConfig.slot}
                        onClick={() => setEditingPosition(posConfig.slot)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          border: '1px solid var(--app-border)',
                          backgroundColor: memberId ? 'var(--app-surface)' : 'var(--app-surface-2)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        {/* Position badge */}
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          backgroundColor: memberId ? 'var(--color-success)' : 'var(--app-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: memberId ? 'white' : 'var(--app-text-muted)',
                        }}>
                          {posConfig.label}
                        </div>
                        {/* Player info */}
                        <div style={{ flex: 1 }}>
                          {memberId ? (
                            <>
                              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--app-text)' }}>
                                {getMemberName(memberId)}
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>
                                {getMemberJersey(memberId) && `#${getMemberJersey(memberId)} • `}
                                {posConfig.fullLabel}
                              </div>
                            </>
                          ) : (
                            <div style={{ color: 'var(--app-text-muted)', fontSize: '14px' }}>
                              Tik om {posConfig.fullLabel} te kiezen
                            </div>
                          )}
                        </div>
                        <ChevronRight size={20} style={{ color: 'var(--app-text-muted)' }} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Content */}
          {currentStep === 'content' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Phase tabs */}
              <div style={{
                display: 'flex',
                gap: '8px',
                padding: '4px',
                backgroundColor: 'var(--app-surface-2)',
                borderRadius: '10px',
              }}>
                {[
                  { key: 'pre', label: 'Voor', icon: Clock },
                  { key: 'during', label: 'Tijdens', icon: Play },
                  { key: 'post', label: 'Na', icon: Check },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setSelectedContentPhase(key as ContentPhase)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '10px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: selectedContentPhase === key
                        ? 'var(--app-primary)'
                        : 'transparent',
                      color: selectedContentPhase === key ? 'white' : 'var(--app-text-muted)',
                      fontWeight: selectedContentPhase === key ? 600 : 400,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Content type cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {CONTENT_TYPES[selectedContentPhase].map((content) => {
                  const Icon = content.icon;
                  return (
                    <button
                      key={content.key}
                      onClick={() => handleContentSelect(content.key, content.label, content.subtype, content.templateType)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '16px',
                        borderRadius: '12px',
                        border: '1px solid var(--app-border)',
                        backgroundColor: 'var(--app-surface)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        transition: 'transform 0.15s, border-color 0.15s',
                      }}
                      onTouchStart={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)';
                      }}
                      onTouchEnd={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                      }}
                    >
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        backgroundColor: 'var(--app-primary-light, rgba(59,142,165,0.1))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Icon size={24} style={{ color: 'var(--app-primary)' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--app-text)' }}>
                          {content.label}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--app-text-muted)' }}>
                          {content.description}
                        </div>
                      </div>
                      <Zap size={20} style={{ color: 'var(--app-primary)' }} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bottom navigation */}
        <div style={{
          display: 'flex',
          gap: '12px',
          padding: '16px',
          borderTop: '1px solid var(--app-border)',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        }}>
          {currentStep !== 'match' && (
            <Button
              variant="secondary"
              onClick={() => goToStep(currentStep === 'content' ? 'lineup' : 'match')}
              style={{ flex: 1 }}
            >
              <ChevronLeft size={18} />
              Terug
            </Button>
          )}
          {currentStep !== 'content' && (
            <Button
              variant="primary"
              onClick={() => goToStep(currentStep === 'match' ? 'lineup' : 'content')}
              disabled={!selectedMatch}
              style={{ flex: currentStep === 'match' ? 1 : 2 }}
            >
              {currentStep === 'match' ? 'Opstelling' : 'Content'}
              <ChevronRight size={18} />
            </Button>
          )}
          {currentStep === 'content' && (
            <Button
              variant="secondary"
              onClick={handleClose}
              style={{ flex: 1 }}
            >
              Sluiten
            </Button>
          )}
        </div>
      </div>

      {/* Inline Content Generation Modal */}
      {selectedMatch && isContentModalOpen && (
        <ContentGenerationModal
          isOpen={isContentModalOpen}
          onClose={handleContentModalClose}
          onGenerated={handleContentGenerated}
          matchData={{
            id: String(selectedMatch.id),
            title: selectedMatch.title,
            project: (selectedMatch as any).project,
            opponent_project: (selectedMatch as any).opponent_project,
            participations: (selectedMatch as any).participations,
            start_time: selectedMatch.start_time,
            location: (selectedMatch as any).location,
            metadata: {
              formation: lineupFormation,
              lineup: {
                formation: lineupFormation,
                goalkeeper: lineupSlots.goalkeeper,
                player: lineupSlots.player,
              },
              ...(selectedMatch as any).metadata,
            },
          }}
          organisationSport={(selectedMatch as any).project?.sport}
          organisationId={(selectedMatch as any).project?.organisation_id || (selectedMatch as any).organisation?.id}
          template={selectedTemplate}
          contentTypeLabel={selectedContentTypeLabel}
        />
      )}
    </BottomSheet>
  );
}

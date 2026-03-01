/**
 * MatchWizard - Step-by-step mobile wizard for match content creation
 *
 * Flow:
 * 1. Select/confirm match (active match pre-selected)
 * 2. Choose content type (pre / during / post)
 * 3. Set lineup (only for lineup-dependent content types)
 * 4. → Generate via ContentGenerationModal
 *
 * Consistent modal design: back arrow + title + close X in header.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomSheet, Button, Badge } from '@django-core/design-system';
import {
  ChevronRight,
  Check,
  Users,
  Zap,
  Play,
  Image,
  Video,
  FileText,
  Clock,
} from 'lucide-react';
import { useActivities, Activity } from '../hooks/useActivities';
import { formatRelativeTime, getDateUrgency } from '../utils/relativeTime';
import { getApiBaseUrl } from '../utils/apiBase';
import ContentGenerationModal, { type ContentTemplate } from '../pages/identity/ContentGenerationModal';

type WizardStep = 'match' | 'content' | 'lineup';
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

// Content types that require a lineup to be set first
const LINEUP_REQUIRED_SUBTYPES = new Set([
  'lineup', 'lineup_flyer', 'walkon', 'poster', 'match_intro',
]);

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

  // Track which content type was selected (for lineup → generate flow)
  const [pendingContent, setPendingContent] = useState<{
    key: string; label: string; subtype: string; templateType: string;
  } | null>(null);

  // Content generation modal state
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [selectedContentTypeLabel, setSelectedContentTypeLabel] = useState<string>('');

  // Template fetching
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

  // Fetch squad when entering lineup step
  useEffect(() => {
    if (selectedMatch && currentStep === 'lineup') {
      fetchSquad();
    }
  }, [selectedMatch, currentStep]);

  // Fetch templates when entering content step
  useEffect(() => {
    if (selectedMatch && currentStep === 'content') {
      fetchTemplates();
    }
  }, [selectedMatch, currentStep]);

  const fetchSquad = async () => {
    if (!selectedMatch) return;
    const projectId = (selectedMatch as any).project?.id;
    if (!projectId) return;

    setSquadLoading(true);
    try {
      const url = `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(String(projectId))}/members/?page_size=100`;
      const res = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) { setSquadLoading(false); return; }

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
          roles = ['player'];
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

      const csrfToken = document.cookie.match(/csrftoken=([^;]+)/)?.[1] ?? '';
      const res = await fetch(`${apiBaseUrl}/api/v1/activities/${encodeURIComponent(String(matchId))}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
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

  // ── Content type selection → route to lineup or generate ────────────
  const handleContentSelect = (contentKey: string, contentLabel: string, subtype: string, templateType: string) => {
    if (!selectedMatch) return;

    const needsLineup = LINEUP_REQUIRED_SUBTYPES.has(subtype);
    if (needsLineup) {
      // Save the pending content and go to lineup step
      setPendingContent({ key: contentKey, label: contentLabel, subtype, templateType });
      setCurrentStep('lineup');
      return;
    }

    // No lineup needed — go directly to generate
    openContentGeneration(contentKey, contentLabel, subtype, templateType);
  };

  const openContentGeneration = (contentKey: string, contentLabel: string, subtype: string, templateType: string) => {
    const templates = availableTemplates[subtype] || [];
    let matchedTemplate: ContentTemplate | undefined;

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

  // After lineup is confirmed, generate the pending content
  const handleLineupConfirm = () => {
    saveLineup();
    if (pendingContent) {
      openContentGeneration(pendingContent.key, pendingContent.label, pendingContent.subtype, pendingContent.templateType);
    }
  };

  const handleContentModalClose = () => {
    setIsContentModalOpen(false);
    setSelectedTemplate(null);
    setSelectedContentTypeLabel('');
  };

  const handleContentGenerated = (_message?: string) => {
    // Content was generated — keep modal open for video jobs
  };

  const handleBack = () => {
    if (currentStep === 'lineup') {
      setPendingContent(null);
      setCurrentStep('content');
    } else if (currentStep === 'content') {
      setCurrentStep('match');
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setCurrentStep('match');
    setSelectedMatch(null);
    setLineupSlots({ goalkeeper: [], player: [] });
    setSquadGroups({ goalkeeper: [], player: [] });
    setEditingPosition(null);
    setPendingContent(null);
    onClose();
  };

  // Pool for lineup
  const gkPool = squadGroups.goalkeeper || [];
  const playerPool = squadGroups.player || [];
  const allPlayers = [...gkPool, ...playerPool];

  const filledPositions = lineupSlots.goalkeeper.filter(Boolean).length + lineupSlots.player.filter(Boolean).length;
  const totalPositions = POSITIONS.length;

  const getStepTitle = (): string => {
    switch (currentStep) {
      case 'match': return 'Selecteer wedstrijd';
      case 'content': return 'Kies content';
      case 'lineup': return pendingContent ? `Opstelling — ${pendingContent.label}` : 'Opstelling';
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

  // ── Shared button style ─────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1px solid var(--app-border)',
    backgroundColor: 'var(--app-surface)',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'transform 0.1s ease',
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      // Hide BottomSheet's own title — we render our own header
    >
      <div className="flex-col" style={{ maxHeight: '65vh' }}>

        {/* ── Consistent header: back + title + close ──────────────── */}
        <div className="flex-row gap-12 border-bottom" style={{ padding: '4px 16px 12px', flexShrink: 0 }}>
          {currentStep !== 'match' ? (
            <button
              onClick={handleBack}
              aria-label="Terug"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '40px', height: '40px', borderRadius: '10px',
                backgroundColor: 'var(--app-surface-2)', border: '1px solid var(--app-border)',
                cursor: 'pointer', color: 'var(--app-text)', fontSize: '20px', lineHeight: 1,
              }}
            >
              ←
            </button>
          ) : (
            <div style={{ width: '40px' }} />
          )}
          <span className="flex-1 text-center fw-600 fs-16 text-primary">
            {getStepTitle()}
          </span>
          <button
            onClick={handleClose}
            aria-label="Sluiten"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '40px', height: '40px', borderRadius: '10px',
              backgroundColor: 'var(--app-surface-2)', border: '1px solid var(--app-border)',
              cursor: 'pointer', color: 'var(--app-text)', fontSize: '20px', lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* ── Step content (scrollable) ────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-16">

          {/* ── Step 1: Match selection ─────────────────────────────── */}
          {currentStep === 'match' && (
            <div className="flex-col gap-10">
              {matchesLoading ? (
                <div className="text-center p-32" style={{ color: 'var(--app-text-muted)' }}>
                  Laden...
                </div>
              ) : upcomingMatches.length === 0 ? (
                <div className="text-center p-32" style={{ color: 'var(--app-text-muted)' }}>
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
                      onClick={() => {
                        setSelectedMatch(match);
                        setCurrentStep('content');
                      }}
                      style={{
                        ...cardStyle,
                        border: isSelected ? '2px solid var(--app-primary)' : cardStyle.border,
                        backgroundColor: isSelected ? 'var(--app-primary-light, rgba(59,142,165,0.08))' : cardStyle.backgroundColor,
                      }}
                    >
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                        backgroundColor: urgency === 'urgent' ? 'var(--color-error)' :
                                        urgency === 'soon' ? 'var(--color-warning)' : 'var(--app-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 700, fontSize: '14px',
                      }}>
                        {date.getDate()}
                      </div>
                      <div className="flex-1-min">
                        <div className="fw-600 text-primary truncate" style={{ fontSize: '15px' }}>
                          {match.title}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--app-text-muted)' }}>
                          {relativeTime} &middot; {date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      {isSelected && <Check size={22} style={{ color: 'var(--app-primary)', flexShrink: 0 }} />}
                      {!isSelected && <ChevronRight size={20} style={{ color: 'var(--app-text-muted)', flexShrink: 0 }} />}
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* ── Step 2: Content type selection ─────────────────────── */}
          {currentStep === 'content' && (
            <div className="flex-col gap-16">
              {/* Phase tabs: Voor / Tijdens / Na */}
              <div style={{
                display: 'flex', gap: '4px', padding: '3px',
                backgroundColor: 'var(--app-surface-2)', borderRadius: '10px',
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
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: '6px', padding: '10px 8px', borderRadius: '8px', border: 'none',
                      backgroundColor: selectedContentPhase === key ? 'var(--app-primary)' : 'transparent',
                      color: selectedContentPhase === key ? 'white' : 'var(--app-text-muted)',
                      fontWeight: selectedContentPhase === key ? 600 : 400,
                      fontSize: '13px', cursor: 'pointer',
                      transition: 'background-color 0.15s ease, color 0.15s ease',
                    }}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Content type cards */}
              <div className="flex-col gap-8">
                {CONTENT_TYPES[selectedContentPhase].map((content) => {
                  const Icon = content.icon;
                  const needsLineup = LINEUP_REQUIRED_SUBTYPES.has(content.subtype);
                  return (
                    <button
                      key={content.key}
                      onClick={() => handleContentSelect(content.key, content.label, content.subtype, content.templateType)}
                      style={cardStyle}
                    >
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                        backgroundColor: 'var(--app-primary-light, rgba(59,142,165,0.08))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon size={22} style={{ color: 'var(--app-primary)' }} />
                      </div>
                      <div className="flex-1-min">
                        <div className="fw-600 text-primary" style={{ fontSize: '15px' }}>
                          {content.label}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--app-text-muted)' }}>
                          {content.description}
                          {needsLineup && ' (opstelling nodig)'}
                        </div>
                      </div>
                      <ChevronRight size={20} style={{ color: 'var(--app-text-muted)', flexShrink: 0 }} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 3: Lineup (only for lineup-dependent content) ── */}
          {currentStep === 'lineup' && (
            <div className="flex-col gap-8">
              {/* Progress indicator */}
              <div className="flex-between mb-8">
                <span style={{ fontSize: '14px', color: 'var(--app-text-muted)' }}>
                  {filledPositions} / {totalPositions} posities
                </span>
                <div style={{
                  width: '100px', height: '4px',
                  backgroundColor: 'var(--app-border)', borderRadius: '2px', overflow: 'hidden',
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
                <div className="text-center p-32" style={{ color: 'var(--app-text-muted)' }}>
                  Spelers laden...
                </div>
              ) : allPlayers.length === 0 ? (
                <div className="text-center p-32" style={{ color: 'var(--app-text-muted)' }}>
                  Geen spelers gevonden in het team
                </div>
              ) : (
                <div className="flex-col gap-6">
                  {POSITIONS.map((posConfig) => {
                    const isGoalkeeper = posConfig.slot === 1;
                    const positionIdx = isGoalkeeper ? 0 : posConfig.slot - 2;
                    const memberId = isGoalkeeper
                      ? lineupSlots.goalkeeper[0] || null
                      : lineupSlots.player[positionIdx] || null;
                    const isEditing = editingPosition === posConfig.slot;

                    const usedMemberIds = [
                      ...(lineupSlots.goalkeeper || []),
                      ...(lineupSlots.player || []),
                    ].filter(Boolean);

                    if (isEditing) {
                      return (
                        <div
                          key={posConfig.slot}
                          className="bg-surface-2 rounded-12 p-12"
                        >
                          <div className="flex-between" style={{ marginBottom: '10px' }}>
                            <span className="fw-600 text-primary">
                              {posConfig.fullLabel} ({posConfig.label})
                            </span>
                            <button
                              onClick={() => setEditingPosition(null)}
                              className="fs-12 rounded-6 bg-transparent border cursor-pointer"
                              style={{
                                padding: '4px 12px',
                                color: 'var(--app-text-muted)',
                              }}
                            >
                              Annuleren
                            </button>
                          </div>
                          <div className="flex-col gap-4 overflow-y-auto" style={{ maxHeight: '180px' }}>
                            <button
                              onClick={() => handleSelectPlayer(positionIdx, isGoalkeeper, null)}
                              style={{
                                ...cardStyle, padding: '10px 12px',
                                color: 'var(--app-text-muted)', fontSize: '14px',
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
                                    ...cardStyle,
                                    padding: '10px 12px',
                                    backgroundColor: member.id === memberId ? 'var(--app-primary)' : cardStyle.backgroundColor,
                                    color: member.id === memberId ? 'white' : isUsed ? 'var(--app-text-muted)' : 'var(--app-text)',
                                    cursor: isUsed ? 'not-allowed' : 'pointer',
                                    opacity: isUsed ? 0.5 : 1,
                                  }}
                                >
                                  {jersey && (
                                    <span style={{
                                      width: '26px', height: '26px', borderRadius: '50%',
                                      backgroundColor: member.id === memberId ? 'rgba(255,255,255,0.3)' : 'var(--app-surface-2)',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: '11px', fontWeight: 600, flexShrink: 0,
                                    }}>
                                      {jersey}
                                    </span>
                                  )}
                                  <span className="flex-1">{getSquadMemberName(member)}</span>
                                  {isUsed && <span className="fs-11 opacity-70">ingevuld</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={posConfig.slot}
                        onClick={() => setEditingPosition(posConfig.slot)}
                        style={{
                          ...cardStyle,
                          backgroundColor: memberId ? 'var(--app-surface)' : 'var(--app-surface-2)',
                        }}
                      >
                        <div style={{
                          width: '34px', height: '34px', borderRadius: '8px', flexShrink: 0,
                          backgroundColor: memberId ? 'var(--color-success)' : 'var(--app-border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 700,
                          color: memberId ? 'white' : 'var(--app-text-muted)',
                        }}>
                          {posConfig.label}
                        </div>
                        <div className="flex-1-min">
                          {memberId ? (
                            <>
                              <div className="fw-600 fs-14 text-primary">
                                {getMemberName(memberId)}
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>
                                {getMemberJersey(memberId) && `#${getMemberJersey(memberId)} \u00b7 `}
                                {posConfig.fullLabel}
                              </div>
                            </>
                          ) : (
                            <div style={{ color: 'var(--app-text-muted)', fontSize: '14px' }}>
                              {posConfig.fullLabel}
                            </div>
                          )}
                        </div>
                        <ChevronRight size={18} style={{ color: 'var(--app-text-muted)', flexShrink: 0 }} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Bottom action bar ─────────────────────────────────────── */}
        {currentStep === 'match' && selectedMatch && (
          <div style={{
            padding: '12px 16px',
            paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
            borderTop: '1px solid var(--app-border)', flexShrink: 0,
          }}>
            <button
              onClick={() => setCurrentStep('content')}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                backgroundColor: 'var(--app-primary)', color: 'white',
                fontWeight: 600, fontSize: '15px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              Verder
              <ChevronRight size={18} />
            </button>
          </div>
        )}
        {currentStep === 'lineup' && (
          <div style={{
            padding: '12px 16px',
            paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
            borderTop: '1px solid var(--app-border)', flexShrink: 0,
          }}>
            <button
              onClick={handleLineupConfirm}
              disabled={lineupSaving}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                backgroundColor: 'var(--app-primary)', color: 'white',
                fontWeight: 600, fontSize: '15px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                opacity: lineupSaving ? 0.7 : 1,
              }}
            >
              <Zap size={18} />
              {lineupSaving ? 'Opslaan...' : 'Genereer content'}
            </button>
          </div>
        )}
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

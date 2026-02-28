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
} from 'lucide-react';
import { useActivities, Activity } from '../hooks/useActivities';
import { formatRelativeTime, getDateUrgency } from '../utils/relativeTime';
import { getApiBaseUrl } from '../utils/apiBase';

type WizardStep = 'match' | 'lineup' | 'content';
type ContentPhase = 'pre' | 'during' | 'post';

interface MatchWizardProps {
  isOpen: boolean;
  onClose: () => void;
  initialMatchId?: string;
}

interface SquadMember {
  id: string;
  user_name?: string;
  metadata?: {
    shirt_number?: string | number;
    position?: string;
  };
  data?: {
    jersey_number?: string | number;
  };
}

interface LineupPosition {
  slot: number;
  label: string;
  memberId: string | null;
}

const CONTENT_TYPES = {
  pre: [
    { key: 'flyer', label: 'Match Flyer', icon: Image, description: 'Aankondiging voor socials' },
    { key: 'lineup', label: 'Opstelling', icon: Users, description: 'Visuele opstelling delen' },
    { key: 'walkon', label: 'Walk-on Video', icon: Video, description: 'Spelers intro video' },
  ],
  during: [
    { key: 'goal', label: 'Goal Celebration', icon: Zap, description: 'Doelpunt vieren' },
    { key: 'substitution', label: 'Wissel', icon: Users, description: 'Wisselmoment' },
    { key: 'highlight', label: 'Highlight', icon: Play, description: 'Speelmoment vastleggen' },
  ],
  post: [
    { key: 'end_score', label: 'Eindstand', icon: FileText, description: 'Uitslag delen' },
    { key: 'highlights', label: 'Highlights', icon: Video, description: 'Samenvattingsvideo' },
    { key: 'motm', label: 'Man of the Match', icon: Zap, description: 'Beste speler uitlichten' },
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
  const [lineup, setLineup] = useState<LineupPosition[]>(
    POSITIONS.map(p => ({ slot: p.slot, label: p.label, memberId: null }))
  );
  const [squad, setSquad] = useState<SquadMember[]>([]);
  const [squadLoading, setSquadLoading] = useState(false);
  const [selectedContentPhase, setSelectedContentPhase] = useState<ContentPhase>('pre');
  const [editingPosition, setEditingPosition] = useState<number | null>(null);
  const [lineupSaving, setLineupSaving] = useState(false);

  const apiBaseUrl = getApiBaseUrl();

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

  // Fetch squad when match is selected
  useEffect(() => {
    if (selectedMatch && currentStep === 'lineup') {
      fetchSquad();
    }
  }, [selectedMatch, currentStep]);

  const fetchSquad = async () => {
    if (!selectedMatch) return;
    setSquadLoading(true);
    try {
      // Get project ID from match
      const projectId = (selectedMatch as any).project?.id;
      if (!projectId) return;

      const response = await fetch(
        `${apiBaseUrl}/api/v1/projects/${projectId}/squad/`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const data = await response.json();
        // Combine all squad members
        const members = [
          ...(data.goalkeeper || []),
          ...(data.player || []),
        ];
        setSquad(members);
      }
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
      const slots = {
        goalkeeper: lineup.filter(p => p.slot === 1 && p.memberId).map(p => p.memberId),
        player: lineup.filter(p => p.slot > 1 && p.memberId).map(p => p.memberId),
      };

      await fetch(`${apiBaseUrl}/api/v1/activities/${matchId}/lineup/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ slots }),
      });
    } catch (err) {
      console.error('Failed to save lineup:', err);
    } finally {
      setLineupSaving(false);
    }
  };

  const handleSelectPosition = (slot: number, memberId: string | null) => {
    setLineup(prev =>
      prev.map(p => (p.slot === slot ? { ...p, memberId } : p))
    );
    setEditingPosition(null);
  };

  const handleContentSelect = (contentKey: string) => {
    if (!selectedMatch) return;
    const matchSlug = (selectedMatch as any).slug || selectedMatch.id;
    // Navigate to match content tab with content type pre-selected
    navigate(`/matches/${matchSlug}?tab=content&generate=${contentKey}`);
    onClose();
  };

  const goToStep = (step: WizardStep) => {
    // Save lineup when leaving lineup step
    if (currentStep === 'lineup' && step !== 'lineup') {
      saveLineup();
    }
    setCurrentStep(step);
  };

  const handleClose = () => {
    // Reset state
    setCurrentStep('match');
    setSelectedMatch(null);
    setLineup(POSITIONS.map(p => ({ slot: p.slot, label: p.label, memberId: null })));
    setEditingPosition(null);
    onClose();
  };

  const filledPositions = lineup.filter(p => p.memberId).length;
  const totalPositions = POSITIONS.length;

  const getStepTitle = () => {
    switch (currentStep) {
      case 'match': return 'Selecteer Wedstrijd';
      case 'lineup': return 'Opstelling';
      case 'content': return 'Content Maken';
    }
  };

  const getMemberName = (memberId: string): string => {
    const member = squad.find(m => m.id === memberId);
    return member?.user_name || 'Onbekend';
  };

  const getMemberJersey = (memberId: string): string | null => {
    const member = squad.find(m => m.id === memberId);
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
              ) : (
                /* Position list - mobile friendly */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {lineup.map((pos) => {
                    const posConfig = POSITIONS.find(p => p.slot === pos.slot);
                    const isEditing = editingPosition === pos.slot;
                    const selectedMember = pos.memberId ? squad.find(m => m.id === pos.memberId) : null;
                    const usedMemberIds = lineup.filter(p => p.memberId).map(p => p.memberId);

                    if (isEditing) {
                      // Show player selection
                      return (
                        <div
                          key={pos.slot}
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
                              {posConfig?.fullLabel} ({pos.label})
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
                              onClick={() => handleSelectPosition(pos.slot, null)}
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
                            {squad.map((member) => {
                              const isUsed = usedMemberIds.includes(member.id) && member.id !== pos.memberId;
                              const jersey = member.metadata?.shirt_number || member.data?.jersey_number;
                              return (
                                <button
                                  key={member.id}
                                  onClick={() => !isUsed && handleSelectPosition(pos.slot, member.id)}
                                  disabled={isUsed}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: member.id === pos.memberId
                                      ? 'var(--app-primary)'
                                      : 'var(--app-surface)',
                                    color: member.id === pos.memberId
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
                                  <span style={{ flex: 1 }}>{member.user_name}</span>
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
                        key={pos.slot}
                        onClick={() => setEditingPosition(pos.slot)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          border: '1px solid var(--app-border)',
                          backgroundColor: pos.memberId ? 'var(--app-surface)' : 'var(--app-surface-2)',
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
                          backgroundColor: pos.memberId ? 'var(--color-success)' : 'var(--app-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: pos.memberId ? 'white' : 'var(--app-text-muted)',
                        }}>
                          {pos.label}
                        </div>
                        {/* Player info */}
                        <div style={{ flex: 1 }}>
                          {pos.memberId ? (
                            <>
                              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--app-text)' }}>
                                {getMemberName(pos.memberId)}
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>
                                {getMemberJersey(pos.memberId) && `#${getMemberJersey(pos.memberId)} • `}
                                {posConfig?.fullLabel}
                              </div>
                            </>
                          ) : (
                            <div style={{ color: 'var(--app-text-muted)', fontSize: '14px' }}>
                              Tik om {posConfig?.fullLabel} te kiezen
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
                      onClick={() => handleContentSelect(content.key)}
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
    </BottomSheet>
  );
}

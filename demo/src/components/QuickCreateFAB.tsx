/**
 * QuickCreateFAB - Floating Action Button for quick content creation
 *
 * Shows a + button on mobile that opens a bottom sheet with upcoming matches
 * for quick content creation. Reduces taps from 4+ to 2.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomSheet, Button } from '@django-core/design-system';
import { Plus, Zap, Calendar, ChevronRight } from 'lucide-react';
import { useActivities, Activity } from '../hooks/useActivities';
import { formatRelativeTime, getDateUrgency } from '../utils/relativeTime';

interface QuickCreateFABProps {
  /** Organisation ID for filtering activities */
  organisationId?: string;
  /** Project/Team ID for filtering activities */
  projectId?: string;
}

export default function QuickCreateFAB({ organisationId, projectId }: QuickCreateFABProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch upcoming activities (matches)
  const { activities, loading } = useActivities({
    limit: 50,
    project_id: projectId,
    organisation_id: organisationId,
  });

  // Filter to only upcoming matches
  const upcomingMatches = activities.filter((a) => {
    const isMatch = a.activity_type.toLowerCase().includes('match');
    const isFuture = new Date(a.start_time) > new Date();
    return isMatch && isFuture;
  }).slice(0, 5); // Show max 5 upcoming matches

  // Most urgent match (next one)
  const nextMatch = upcomingMatches[0];

  const handleQuickCreate = (matchTitle: string) => {
    // Search for the match to find its ID
    const searchQuery = encodeURIComponent(matchTitle.replace(/^(vs |@ )/, ''));
    navigate(`/search?q=${searchQuery}`);
    setIsOpen(false);
  };

  const handleGoToNextMatch = () => {
    if (nextMatch) {
      const searchQuery = encodeURIComponent(nextMatch.title.replace(/^(vs |@ )/, ''));
      navigate(`/search?q=${searchQuery}`);
    }
    setIsOpen(false);
  };

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Snel content maken"
        style={{
          position: 'fixed',
          bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', // Above bottom nav
          right: '16px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: 'var(--app-primary, #3B8EA5)',
          color: 'white',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.25)';
        }}
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>

      {/* Quick Create Bottom Sheet */}
      <BottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Snel content maken"
      >
        <div style={{ padding: '8px 0' }}>
          {/* Quick action: Go to next match */}
          {nextMatch && (
            <button
              onClick={handleGoToNextMatch}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                backgroundColor: 'var(--app-primary, #3B8EA5)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                marginBottom: '16px',
                minHeight: '44px',
              }}
            >
              <Zap size={24} />
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>
                  Volgende wedstrijd
                </div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>
                  {nextMatch.title} — {formatRelativeTime(nextMatch.start_time, 'nl')}
                </div>
              </div>
              <ChevronRight size={20} />
            </button>
          )}

          {/* Divider */}
          {upcomingMatches.length > 1 && (
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--app-muted-text)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '8px',
                paddingLeft: '4px',
              }}
            >
              Komende wedstrijden
            </div>
          )}

          {/* List of upcoming matches */}
          {upcomingMatches.slice(1).map((match) => {
            const urgency = getDateUrgency(match.start_time);
            const urgencyColor =
              urgency === 'urgent' ? '#ef4444' :
              urgency === 'soon' ? '#f59e0b' :
              'var(--app-muted-text)';

            return (
              <button
                key={match.id}
                onClick={() => handleQuickCreate(match.title)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 8px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  minHeight: '44px',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = 'var(--app-surface-2)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = 'transparent')
                }
              >
                <Calendar size={20} color="var(--app-muted-text)" />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 500,
                      fontSize: '14px',
                      color: 'var(--app-text)',
                    }}
                  >
                    {match.title}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: urgencyColor,
                      fontWeight: 500,
                    }}
                  >
                    {formatRelativeTime(match.start_time, 'nl')}
                  </div>
                </div>
                <ChevronRight size={18} color="var(--app-muted-text)" />
              </button>
            );
          })}

          {/* Empty state */}
          {upcomingMatches.length === 0 && !loading && (
            <div
              style={{
                textAlign: 'center',
                padding: '32px 16px',
                color: 'var(--app-muted-text)',
              }}
            >
              <Calendar size={40} style={{ marginBottom: '12px', opacity: 0.5 }} />
              <div style={{ fontWeight: 500 }}>Geen komende wedstrijden</div>
              <div style={{ fontSize: '14px', marginTop: '4px' }}>
                Plan wedstrijden in om snel content te maken
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div
              style={{
                textAlign: 'center',
                padding: '32px 16px',
                color: 'var(--app-muted-text)',
              }}
            >
              Laden...
            </div>
          )}
        </div>
      </BottomSheet>
    </>
  );
}

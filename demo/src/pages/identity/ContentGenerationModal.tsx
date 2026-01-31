import React, { useState, useEffect, useMemo } from 'react';
import { Button, Badge } from '@django-core/design-system';
import { getApiBaseUrl } from '../../utils/apiBase';

// Map slot types to template types/subtypes
const SLOT_TYPE_MAPPING: Record<string, { types: string[]; subtypes?: string[] }> = {
  'announcement': { types: ['pre_match'], subtypes: ['flyer'] },
  'poster': { types: ['pre_match'], subtypes: ['flyer', 'poster'] },
  'walk-on': { types: ['pre_match'], subtypes: ['walkon'] },
  'lineup': { types: ['pre_match'], subtypes: ['lineup'] },
  'goal-update': { types: ['during_match'], subtypes: ['goal'] },
  'score-update': { types: ['during_match'], subtypes: ['score_update'] },
  'injury-update': { types: ['during_match'], subtypes: ['injury'] },
  'half-time': { types: ['during_match'], subtypes: ['score_update'] },
  'full-time': { types: ['post_match'], subtypes: ['end_score', 'match_summary'] },
};

// Asset type labels
const ASSET_TYPE_LABELS: Record<string, string> = {
  profile_photo: 'Profile Photo',
  in_tenue: 'In Tenue',
  full_body: 'Full Body',
  close_up: 'Close-up',
  short_intro: 'Short Intro',
  celebration: 'Celebration',
  legacy: 'Legacy',
};

interface ContentTemplate {
  id: number;
  name: string;
  description: string | null;
  template_type: string;
  template_subtype: string | null;
  style_variant: string | null;
  is_active?: boolean;
  credits_required?: number;
  formation_detail?: { code: string; name: string } | null;
  sport_detail?: { id: number; name: string } | null;
  input_requirements?: {
    members?: {
      goalkeeper?: { count: number; asset_type: string };
      player?: { count: number; asset_type: string };
      coach?: { count: number; asset_type: string };
      assistant?: { count: number; asset_type: string };
      use_formation?: boolean;
    };
    match_data?: { required: string[] };
    organisation_assets?: { required: Array<{ type: string; label: string }> };
    output?: { type: string; format: string; dimensions?: { width: number; height: number; aspect_ratio: string } };
  };
}

interface Participation {
  id: string;
  member?: {
    id: string;
    user_name?: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
  role?: string;
  status?: string;
  data?: {
    side?: 'home' | 'away';
    jersey_number?: number;
    position?: string;
    is_captain?: boolean;
    functional_role?: string;
  };
}

interface ContentGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  slotType: string;
  matchData: {
    id: string;
    title?: string;
    project?: { id: string; name: string };
    opponent_project?: { id: string; name: string };
    participations?: Participation[];
    start_time?: string;
    location?: string;
  } | null;
}

// Group participations by functional role
function groupParticipationsByRole(participations: Participation[]): Record<string, Participation[]> {
  const groups: Record<string, Participation[]> = {
    goalkeeper: [],
    player: [],
    coach: [],
    assistant: [],
  };

  participations.forEach(p => {
    const role = p.data?.functional_role?.toLowerCase() || 'player';
    if (groups[role]) {
      groups[role].push(p);
    } else {
      groups.player.push(p); // Default to player if unknown role
    }
  });

  return groups;
}

export default function ContentGenerationModal({ isOpen, onClose, slotType, matchData }: ContentGenerationModalProps) {
  const [step, setStep] = useState<'select' | 'members' | 'generating' | 'success'>('select');
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [progress, setProgress] = useState(0);
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected members per role
  const [selectedMembers, setSelectedMembers] = useState<Record<string, string[]>>({
    goalkeeper: [],
    player: [],
    coach: [],
    assistant: [],
  });

  // Group participations by functional role
  const participationsByRole = useMemo(() => {
    if (!matchData?.participations) return { goalkeeper: [], player: [], coach: [], assistant: [] };
    return groupParticipationsByRole(matchData.participations);
  }, [matchData?.participations]);

  // Fetch templates when opening
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelectedTemplate(null);
      setProgress(0);
      setSelectedMembers({ goalkeeper: [], player: [], coach: [], assistant: [] });
      fetchTemplates();
    }
  }, [isOpen, slotType]);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const mapping = SLOT_TYPE_MAPPING[slotType];
      const params = new URLSearchParams();
      params.append('is_active', 'true');

      if (mapping?.types?.length) {
        mapping.types.forEach(t => params.append('template_type', t));
      }
      if (mapping?.subtypes?.length) {
        mapping.subtypes.forEach(s => params.append('template_subtype', s));
      }

      const response = await fetch(`${getApiBaseUrl()}/api/v1/content-generation/templates/?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch templates');

      const data = await response.json();
      setTemplates(data.results || data || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  // Check if member selection is complete based on template requirements
  const memberSelectionValid = useMemo(() => {
    if (!selectedTemplate?.input_requirements?.members) return true;

    const reqs = selectedTemplate.input_requirements.members;

    for (const role of ['goalkeeper', 'player', 'coach', 'assistant'] as const) {
      const req = reqs[role];
      if (req && req.count > 0) {
        if (selectedMembers[role].length !== req.count) {
          return false;
        }
      }
    }
    return true;
  }, [selectedTemplate, selectedMembers]);

  // Calculate total required members
  const totalRequiredMembers = useMemo(() => {
    if (!selectedTemplate?.input_requirements?.members) return 0;
    const reqs = selectedTemplate.input_requirements.members;
    let total = 0;
    for (const role of ['goalkeeper', 'player', 'coach', 'assistant'] as const) {
      if (reqs[role]?.count) total += reqs[role].count;
    }
    return total;
  }, [selectedTemplate]);

  if (!isOpen) return null;

  const handleSelectTemplate = (template: ContentTemplate) => {
    setSelectedTemplate(template);

    // Check if template requires member selection
    const needsMembers = template.input_requirements?.members &&
      Object.values(template.input_requirements.members).some((r: any) => r?.count > 0);

    if (needsMembers) {
      setStep('members');
    } else {
      handleGenerate();
    }
  };

  const handleMemberToggle = (role: string, memberId: string) => {
    const req = selectedTemplate?.input_requirements?.members?.[role as keyof typeof selectedTemplate.input_requirements.members];
    const maxCount = req?.count || 0;

    setSelectedMembers(prev => {
      const current = prev[role] || [];
      if (current.includes(memberId)) {
        // Remove
        return { ...prev, [role]: current.filter(id => id !== memberId) };
      } else if (current.length < maxCount) {
        // Add if under limit
        return { ...prev, [role]: [...current, memberId] };
      }
      return prev;
    });
  };

  const handleGenerate = () => {
    if (!selectedTemplate) return;

    setStep('generating');

    // Simulate B34 Generative Pipeline
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 20;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setTimeout(() => setStep('success'), 500);
      }
      setProgress(Math.min(p, 100));
    }, 400);
  };

  const renderRoleLabel = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1) + 's';
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--app-surface, white)',
          padding: '24px',
          borderRadius: '12px',
          width: '700px',
          maxWidth: '90%',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          color: 'var(--app-text)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh',
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h2 className="text-xl font-bold m-0">Create {slotType.replace('-', ' ')} Content</h2>
            <div className="text-sm text-gray-500 mt-1">
               {matchData?.project?.name} vs {matchData?.opponent_project?.name || 'Opponent'}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Steps indicator */}
        {(step === 'select' || step === 'members') && totalRequiredMembers > 0 && (
          <div className="flex items-center gap-2 mb-4 text-sm">
            <span className={`px-2 py-1 rounded ${step === 'select' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-400'}`}>
              1. Select Template
            </span>
            <span className="text-gray-300">→</span>
            <span className={`px-2 py-1 rounded ${step === 'members' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-400'}`}>
              2. Select Members
            </span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-[300px]">

          {/* Step 1: Select Template */}
          {step === 'select' && (
            <div className="space-y-4">
              {loading && (
                <div className="text-center py-10 text-gray-500">Loading templates...</div>
              )}

              {error && (
                <div className="text-center py-10 text-red-500">{error}</div>
              )}

              {!loading && !error && templates.length === 0 && (
                <div className="text-center py-10 text-gray-400">
                  No templates found for "{slotType}" content type.
                </div>
              )}

              {!loading && !error && templates.length > 0 && (
                <>
                  <p className="text-sm text-gray-600">Select a template to generate this content.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {templates.map(template => {
                      const memberReqs = template.input_requirements?.members;
                      const reqSummary: string[] = [];
                      if (memberReqs) {
                        (['goalkeeper', 'player', 'coach', 'assistant'] as const).forEach(role => {
                          if (memberReqs[role]?.count) {
                            reqSummary.push(`${memberReqs[role].count} ${role}${memberReqs[role].count > 1 ? 's' : ''}`);
                          }
                        });
                      }

                      return (
                        <div
                          key={template.id}
                          onClick={() => handleSelectTemplate(template)}
                          className="border rounded-lg p-4 cursor-pointer transition-all flex flex-col gap-2 hover:border-blue-500 hover:bg-blue-50"
                        >
                          <div className="aspect-video bg-gray-200 rounded mb-2 flex items-center justify-center text-gray-400 text-xs">
                            [Preview]
                          </div>
                          <div className="font-semibold text-sm">{template.name}</div>
                          <div className="flex flex-wrap gap-1 items-center">
                            <Badge variant="default" size="sm">{template.template_type}</Badge>
                            {template.template_subtype && (
                              <Badge variant="info" size="sm">{template.template_subtype}</Badge>
                            )}
                            {template.style_variant && (
                              <Badge variant="secondary" size="sm">{template.style_variant}</Badge>
                            )}
                            <span className="text-xs text-gray-500 ml-auto">
                              💎 {template.credits_required ?? 1} credit{(template.credits_required ?? 1) !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {reqSummary.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              Requires: {reqSummary.join(', ')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 2: Select Members */}
          {step === 'members' && selectedTemplate && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="font-medium">{selectedTemplate.name}</div>
                <div className="text-sm text-gray-500">Select the members for this content</div>
              </div>

              {(['goalkeeper', 'player', 'coach', 'assistant'] as const).map(role => {
                const req = selectedTemplate.input_requirements?.members?.[role];
                if (!req?.count) return null;

                const available = participationsByRole[role] || [];
                const selected = selectedMembers[role];
                const assetTypeLabel = req.asset_type ? ASSET_TYPE_LABELS[req.asset_type] || req.asset_type : null;

                return (
                  <div key={role} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <span className="font-medium">{renderRoleLabel(role)}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          ({selected.length} / {req.count} selected)
                        </span>
                      </div>
                      {assetTypeLabel && (
                        <Badge variant="secondary" size="sm">Asset: {assetTypeLabel}</Badge>
                      )}
                    </div>

                    {available.length === 0 ? (
                      <div className="text-sm text-gray-400 italic">No {role}s in match lineup</div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {available.map(p => {
                          const isSelected = selected.includes(p.id);
                          const canSelect = isSelected || selected.length < req.count;
                          const memberName = p.member?.user_name ||
                            `${p.member?.first_name || ''} ${p.member?.last_name || ''}`.trim() ||
                            'Unknown';

                          return (
                            <div
                              key={p.id}
                              onClick={() => canSelect && handleMemberToggle(role, p.id)}
                              className={`
                                flex items-center gap-2 p-2 rounded border cursor-pointer transition-all
                                ${isSelected
                                  ? 'border-blue-500 bg-blue-50'
                                  : canSelect
                                    ? 'border-gray-200 hover:border-gray-300'
                                    : 'border-gray-100 opacity-50 cursor-not-allowed'
                                }
                              `}
                            >
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs overflow-hidden">
                                {p.member?.avatar_url ? (
                                  <img src={p.member.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  memberName.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{memberName}</div>
                                {p.data?.jersey_number && (
                                  <div className="text-xs text-gray-500">#{p.data.jersey_number}</div>
                                )}
                              </div>
                              {isSelected && (
                                <div className="text-blue-500 text-lg">✓</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Generating */}
          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <div className="w-full max-w-xs mb-4">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
              <div className="text-lg font-medium text-gray-700 animate-pulse">Generating Content...</div>
              <div className="text-sm text-gray-500 mt-2">Applying {matchData?.project?.name} branding...</div>
            </div>
          )}

          {/* Success */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
              <div className="text-5xl mb-4">✨</div>
              <h3 className="text-2xl font-bold mb-2">Content Ready!</h3>
              <p className="text-gray-600 mb-6 max-w-sm">
                Your graphic has been generated and saved to the Match Gallery.
              </p>
              <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm mb-4 border border-yellow-200 max-w-md">
                <strong>Note:</strong> In the final version (B31), this will redirect to the Editor for final adjustments.
              </div>
              <div className="aspect-video w-64 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-gray-400 mb-6">
                [Final Asset Preview]
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t flex justify-end gap-3">
          {step === 'select' && (
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          )}
          {step === 'members' && (
            <>
              <Button variant="ghost" onClick={() => setStep('select')}>Back</Button>
              <Button disabled={!memberSelectionValid} onClick={handleGenerate}>
                Generate Graphic
              </Button>
            </>
          )}
          {step === 'generating' && (
            <Button disabled>Processing...</Button>
          )}
          {step === 'success' && (
            <>
              <Button variant="secondary" onClick={() => { setStep('select'); onClose(); }}>Close</Button>
              <Button onClick={() => alert('Download coming in B22')}>Download</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

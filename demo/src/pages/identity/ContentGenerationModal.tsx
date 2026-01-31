import React, { useState, useEffect, useMemo } from 'react';
import { Button, Badge } from '@django-core/design-system';
import { getApiBaseUrl } from '../../utils/apiBase';

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

export interface ContentTemplate {
  id: number;
  name: string;
  description: string | null;
  template_type: string;
  template_subtype: string | null;
  style_variant: string | null;
  is_active?: boolean;
  credits_required?: number;
  sport?: number | null;
  sport_detail?: { id: number; name: string; slug?: string; parent_sport_id?: number | null } | null;
  formation_detail?: { code: string; name: string } | null;
  input_requirements?: {
    members?: {
      goalkeeper?: { count: number; asset_types?: string[] };
      player?: { count: number; asset_types?: string[] };
      coach?: { count: number; asset_types?: string[] };
      assistant?: { count: number; asset_types?: string[] };
      use_formation?: boolean;
    };
    match_data?: { required: string[] };
    organisation_assets?: { required: Array<{ type: string; label: string }> };
    output?: { type: string; format: string; dimensions?: { width: number; height: number; aspect_ratio: string } };
  };
}

// Content type definitions - exported for use in other components
// Organized by template_type, with items having template_subtype
// Labels match backend TemplateSubtype choices
export const CONTENT_TYPES = {
  pre_match: {
    label: 'Pre-match',
    items: [
      { id: 'flyer', label: 'Match Flyer', icon: '📣', subtype: 'flyer' },
      { id: 'lineup', label: 'Lineup Announcement', icon: '📋', subtype: 'lineup' },
      { id: 'walkon', label: 'Walk-on Video', icon: '🚶', subtype: 'walkon' },
      { id: 'anthem', label: 'Anthem Video', icon: '🎵', subtype: 'anthem' },
    ],
  },
  during_match: {
    label: 'During match',
    items: [
      { id: 'goal', label: 'Goal Celebration', icon: '⚽', subtype: 'goal' },
      { id: 'score_update', label: 'Score Update', icon: '🔢', subtype: 'score_update' },
    ],
  },
  post_match: {
    label: 'Post-match',
    items: [
      { id: 'end_score', label: 'Final Score', icon: '🏁', subtype: 'end_score' },
      { id: 'match_summary', label: 'Match Summary', icon: '📊', subtype: 'match_summary' },
      { id: 'highlights', label: 'Highlights Reel', icon: '🎬', subtype: 'highlights' },
    ],
  },
  season: {
    label: 'Season',
    items: [
      { id: 'transformation', label: 'Then vs Now', icon: '🔄', subtype: 'transformation' },
      { id: 'season_recap', label: 'Season Recap', icon: '📅', subtype: 'season_recap' },
    ],
  },
  member: {
    label: 'Member',
    items: [
      { id: 'member_intro', label: 'Short Intro', icon: '👋', subtype: 'member_intro' },
      { id: 'member_closeup', label: 'Closeup Video', icon: '📸', subtype: 'member_closeup' },
      { id: 'member_celebration', label: 'Personal Celebration', icon: '🎉', subtype: 'member_celebration' },
    ],
  },
};

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
  matchData: {
    id: string;
    title?: string;
    project?: { id: string; name: string };
    opponent_project?: { id: string; name: string };
    participations?: Participation[];
    start_time?: string;
    location?: string;
  } | null;
  organisationSport?: { id: number | string; name: string; slug?: string } | null;
  /** Pre-selected template - skips type/template selection */
  template?: ContentTemplate | null;
  /** Content type label for header */
  contentTypeLabel?: string;
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
      groups.player.push(p);
    }
  });

  return groups;
}

export default function ContentGenerationModal({
  isOpen,
  onClose,
  matchData,
  organisationSport,
  template: initialTemplate,
  contentTypeLabel,
}: ContentGenerationModalProps) {
  const [step, setStep] = useState<'type' | 'template' | 'members' | 'generating' | 'success'>('type');
  const [selectedType, setSelectedType] = useState<{ type: string; subtype: string; label: string } | null>(null);
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

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setProgress(0);
      setSelectedMembers({ goalkeeper: [], player: [], coach: [], assistant: [] });
      setTemplates([]);
      setError(null);

      // If template is provided, skip to members step
      if (initialTemplate) {
        setSelectedTemplate(initialTemplate);
        setSelectedType({ type: initialTemplate.template_type, subtype: initialTemplate.template_subtype || '', label: contentTypeLabel || initialTemplate.name });

        // Check if template requires member selection
        const needsMembers = initialTemplate.input_requirements?.members &&
          Object.entries(initialTemplate.input_requirements.members).some(([key, val]) =>
            key !== 'use_formation' && val && typeof val !== 'boolean' && val.count > 0
          );

        if (needsMembers) {
          setStep('members');
        } else {
          // No members needed, go directly to generate
          setStep('generating');
          setTimeout(() => handleGenerateInternal(), 100);
        }
      } else {
        setStep('type');
        setSelectedType(null);
        setSelectedTemplate(null);
      }
    }
  }, [isOpen, initialTemplate, contentTypeLabel]);

  // Fetch templates when content type is selected
  const fetchTemplates = async (templateType: string, templateSubtype: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('is_active', 'true');
      params.append('template_type', templateType);
      params.append('template_subtype', templateSubtype);

      // Filter by sport if available
      if (organisationSport?.id) {
        params.append('sport', String(organisationSport.id));
      }

      const response = await fetch(`${getApiBaseUrl()}/api/v1/content-generation/templates/?${params.toString()}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to fetch templates');

      const data = await response.json();
      let results = data.results || data || [];

      // If no sport-specific templates found, try without sport filter
      if (results.length === 0 && organisationSport?.id) {
        const paramsAll = new URLSearchParams();
        paramsAll.append('is_active', 'true');
        paramsAll.append('template_type', templateType);
        paramsAll.append('template_subtype', templateSubtype);

        const responseAll = await fetch(`${getApiBaseUrl()}/api/v1/content-generation/templates/?${paramsAll.toString()}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (responseAll.ok) {
          const dataAll = await responseAll.json();
          results = dataAll.results || dataAll || [];
        }
      }

      setTemplates(results);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  // Check if member selection is complete
  const memberSelectionValid = useMemo(() => {
    if (!selectedTemplate?.input_requirements?.members) return true;
    const reqs = selectedTemplate.input_requirements.members;

    for (const role of ['goalkeeper', 'player', 'coach', 'assistant'] as const) {
      const req = reqs[role];
      if (req && typeof req !== 'boolean' && req.count > 0) {
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
      const req = reqs[role];
      if (req && typeof req !== 'boolean' && req.count) total += req.count;
    }
    return total;
  }, [selectedTemplate]);

  if (!isOpen) return null;

  const handleSelectType = (type: string, subtype: string, label: string) => {
    setSelectedType({ type, subtype, label });
    setStep('template');
    fetchTemplates(type, subtype);
  };

  const handleSelectTemplate = (template: ContentTemplate) => {
    setSelectedTemplate(template);

    // Check if template requires member selection
    const needsMembers = template.input_requirements?.members &&
      Object.entries(template.input_requirements.members).some(([key, val]) =>
        key !== 'use_formation' && val && typeof val !== 'boolean' && val.count > 0
      );

    if (needsMembers) {
      setStep('members');
    } else {
      handleGenerate();
    }
  };

  const handleMemberToggle = (role: string, memberId: string) => {
    const req = selectedTemplate?.input_requirements?.members?.[role as 'goalkeeper' | 'player' | 'coach' | 'assistant'];
    const maxCount = (req && typeof req !== 'boolean' && req.count) || 0;

    setSelectedMembers(prev => {
      const current = prev[role] || [];
      if (current.includes(memberId)) {
        return { ...prev, [role]: current.filter(id => id !== memberId) };
      } else if (current.length < maxCount) {
        return { ...prev, [role]: [...current, memberId] };
      }
      return prev;
    });
  };

  const handleGenerateInternal = () => {
    setStep('generating');

    // Simulate generation
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

  const handleGenerate = () => {
    if (!selectedTemplate) return;
    handleGenerateInternal();
  };

  const handleBack = () => {
    // If we started with a template, just close the modal
    if (initialTemplate) {
      onClose();
      return;
    }

    if (step === 'template') {
      setStep('type');
      setSelectedType(null);
      setTemplates([]);
    } else if (step === 'members') {
      setStep('template');
      setSelectedTemplate(null);
      setSelectedMembers({ goalkeeper: [], player: [], coach: [], assistant: [] });
    }
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
          width: '1200px',
          maxWidth: '95%',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          color: 'var(--app-text)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '95vh',
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h2 className="text-xl font-bold m-0">
              {step === 'type' && 'Create Content'}
              {step === 'template' && `Select ${selectedType?.label} Template`}
              {step === 'members' && `Create ${contentTypeLabel || selectedType?.label || 'Content'}`}
              {step === 'generating' && 'Generating...'}
              {step === 'success' && 'Content Ready!'}
            </h2>
            <div className="text-sm text-gray-500 mt-1">
              {matchData?.project?.name} vs {matchData?.opponent_project?.name || 'Opponent'}
              {organisationSport && (
                <span className="ml-2">
                  <Badge variant="info" size="sm">⚽ {organisationSport.name}</Badge>
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        {/* Progress indicator - only show for multi-step flow */}
        {!initialTemplate && (step === 'type' || step === 'template' || step === 'members') && (
          <div className="flex items-center gap-2 mb-4 text-sm">
            <span className={`px-3 py-1 rounded-full ${step === 'type' ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-100 text-gray-500'}`}>
              1. Content Type
            </span>
            <span className="text-gray-300">→</span>
            <span className={`px-3 py-1 rounded-full ${step === 'template' ? 'bg-blue-100 text-blue-700 font-medium' : selectedType ? 'bg-gray-100 text-gray-500' : 'text-gray-300'}`}>
              2. Template
            </span>
            {totalRequiredMembers > 0 && (
              <>
                <span className="text-gray-300">→</span>
                <span className={`px-3 py-1 rounded-full ${step === 'members' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-300'}`}>
                  3. Members
                </span>
              </>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-[400px]">

          {/* Step 1: Select Content Type */}
          {step === 'type' && (
            <div className="space-y-6">
              {Object.entries(CONTENT_TYPES).map(([typeKey, typeData]) => (
                <div key={typeKey}>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    {typeData.label}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {typeData.items.map(item => (
                      <div
                        key={item.id}
                        onClick={() => handleSelectType(typeKey, item.subtype, item.label)}
                        className="p-4 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white hover:border-blue-400 hover:shadow-sm transition-all"
                      >
                        <div className="text-3xl mb-2">{item.icon}</div>
                        <div className="font-semibold text-sm">{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 2: Select Template */}
          {step === 'template' && (
            <div className="space-y-4">
              {loading && (
                <div className="text-center py-10 text-gray-500">
                  <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
                  <div>Loading templates...</div>
                </div>
              )}

              {error && (
                <div className="space-y-4">
                  <div className="text-center py-6 px-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="text-yellow-600 mb-2">⚠️ Could not load templates</div>
                    <div className="text-sm text-gray-600 mb-4">
                      Make sure the backend server is running.
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => selectedType && fetchTemplates(selectedType.type, selectedType.subtype)}>
                      Retry
                    </Button>
                  </div>
                </div>
              )}

              {!loading && !error && templates.length === 0 && (
                <div className="text-center py-10">
                  <div className="text-5xl mb-4">📭</div>
                  <div className="text-gray-600 mb-2">No templates found for "{selectedType?.label}"</div>
                  <div className="text-sm text-gray-400 mb-4">
                    {organisationSport ? `Looking for ${organisationSport.name} templates` : 'No sport filter active'}
                  </div>
                  <a href="/content-templates" className="text-blue-600 hover:underline text-sm">
                    → Go to Content Templates to create one
                  </a>
                </div>
              )}

              {!loading && !error && templates.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map(template => {
                    const memberReqs = template.input_requirements?.members;
                    const reqSummary: string[] = [];
                    if (memberReqs) {
                      (['goalkeeper', 'player', 'coach', 'assistant'] as const).forEach(role => {
                        const req = memberReqs[role];
                        if (req && typeof req !== 'boolean' && req.count) {
                          reqSummary.push(`${req.count} ${role}${req.count > 1 ? 's' : ''}`);
                        }
                      });
                    }

                    return (
                      <div
                        key={template.id}
                        onClick={() => handleSelectTemplate(template)}
                        className="border rounded-lg p-4 cursor-pointer transition-all flex flex-col gap-2 hover:border-blue-500 hover:bg-blue-50 hover:shadow-md"
                      >
                        <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded flex items-center justify-center text-gray-400 text-sm">
                          {template.style_variant || 'Preview'}
                        </div>
                        <div className="font-semibold">{template.name}</div>
                        {template.description && (
                          <div className="text-xs text-gray-500 line-clamp-2">{template.description}</div>
                        )}
                        <div className="flex flex-wrap gap-1 items-center">
                          {template.sport_detail && (
                            <Badge variant="info" size="sm">⚽ {template.sport_detail.name}</Badge>
                          )}
                          {template.formation_detail && (
                            <Badge variant="default" size="sm">{template.formation_detail.code}</Badge>
                          )}
                          {template.style_variant && (
                            <Badge variant="success" size="sm">{template.style_variant}</Badge>
                          )}
                        </div>
                        <div className="flex justify-between items-center mt-auto pt-2 border-t text-xs text-gray-500">
                          <span>💎 {template.credits_required ?? 1} credit{(template.credits_required ?? 1) !== 1 ? 's' : ''}</span>
                          {reqSummary.length > 0 && (
                            <span>{reqSummary.join(', ')}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Select Members */}
          {step === 'members' && selectedTemplate && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg flex items-center gap-4">
                <div className="text-3xl">📋</div>
                <div>
                  <div className="font-semibold">{selectedTemplate.name}</div>
                  <div className="text-sm text-gray-600">Select the required members for this template</div>
                </div>
              </div>

              {/* Template Requirements Overview */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span>📋</span> Template Requirements
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(['goalkeeper', 'player', 'coach', 'assistant'] as const).map(role => {
                    const req = selectedTemplate.input_requirements?.members?.[role];
                    if (!req || typeof req === 'boolean' || !req.count) return null;

                    const selected = selectedMembers[role];
                    const assetTypes = req.asset_types || [];
                    const assetLabels = assetTypes.map(t => ASSET_TYPE_LABELS[t] || t);

                    return (
                      <div key={role} className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          selected.length === req.count ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {selected.length}/{req.count}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{renderRoleLabel(role)}</div>
                          {assetLabels.length > 0 && (
                            <div className="text-xs text-gray-500">{assetLabels.join(', ')}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {selectedTemplate.input_requirements?.output && (
                  <div className="mt-4 pt-4 border-t border-gray-300">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Output:</span> {selectedTemplate.input_requirements.output.type} • {selectedTemplate.input_requirements.output.format}
                      {selectedTemplate.input_requirements.output.dimensions && (
                        <span> • {selectedTemplate.input_requirements.output.dimensions.aspect_ratio}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Member Selection */}
              {(['goalkeeper', 'player', 'coach', 'assistant'] as const).map(role => {
                const req = selectedTemplate.input_requirements?.members?.[role];
                if (!req || typeof req === 'boolean' || !req.count) return null;

                const available = participationsByRole[role] || [];
                const selected = selectedMembers[role];
                const assetTypes = req.asset_types || [];
                const assetLabels = assetTypes.map(t => ASSET_TYPE_LABELS[t] || t);

                return (
                  <div key={role} className="border border-gray-300 rounded-lg p-5 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <span className="font-semibold text-lg">{renderRoleLabel(role)}</span>
                        <span className={`text-sm ml-3 px-2 py-1 rounded-full ${
                          selected.length === req.count
                            ? 'bg-green-100 text-green-700 font-medium'
                            : 'bg-yellow-50 text-yellow-700'
                        }`}>
                          {selected.length} / {req.count} selected
                        </span>
                      </div>
                      {assetLabels.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {assetLabels.map((label, idx) => (
                            <Badge key={idx} variant="info" size="sm">📸 {label}</Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {available.length === 0 ? (
                      <div className="text-sm text-gray-500 italic p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                        ⚠️ No {role}s found in match lineup. Add players to the lineup first.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
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
                                relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all
                                ${isSelected
                                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200 shadow-md'
                                  : canSelect
                                    ? 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 hover:shadow-sm'
                                    : 'border-gray-100 opacity-40 cursor-not-allowed'
                                }
                              `}
                            >
                              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-lg font-medium overflow-hidden flex-shrink-0">
                                {p.member?.avatar_url ? (
                                  <img src={p.member.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  memberName.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="text-center w-full">
                                <div className="text-sm font-medium truncate">{memberName}</div>
                                {p.data?.jersey_number && (
                                  <div className="text-xs text-gray-500 font-semibold">#{p.data.jersey_number}</div>
                                )}
                              </div>
                              {isSelected && (
                                <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">✓</div>
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
            <div className="flex flex-col items-center justify-center h-full py-16">
              <div className="w-full max-w-sm mb-6">
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
                </div>
                <div className="text-center text-sm text-gray-500 mt-2">{Math.round(progress)}%</div>
              </div>
              <div className="text-xl font-medium text-gray-700 animate-pulse">Generating Content...</div>
              <div className="text-sm text-gray-500 mt-2">Applying {matchData?.project?.name} branding</div>
            </div>
          )}

          {/* Success */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <div className="text-6xl mb-4">✨</div>
              <h3 className="text-2xl font-bold mb-2">Content Ready!</h3>
              <p className="text-gray-600 mb-6 max-w-sm">
                Your {selectedType?.label} graphic has been generated.
              </p>
              <div className="aspect-video w-80 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border flex items-center justify-center text-gray-400 mb-6">
                [Preview]
              </div>
              <div className="p-4 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-200 max-w-md">
                <strong>Note:</strong> Full generation pipeline coming in B34. This is a UI preview.
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t flex justify-between">
          <div>
            {(step === 'template' || step === 'members') && (
              <Button variant="ghost" onClick={handleBack}>← Back</Button>
            )}
          </div>
          <div className="flex gap-3">
            {step !== 'generating' && step !== 'success' && (
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
            )}
            {step === 'members' && (
              <Button disabled={!memberSelectionValid} onClick={handleGenerate}>
                Generate Content
              </Button>
            )}
            {step === 'success' && (
              <>
                <Button variant="secondary" onClick={onClose}>Close</Button>
                <Button onClick={() => alert('Download coming in B34')}>Download</Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

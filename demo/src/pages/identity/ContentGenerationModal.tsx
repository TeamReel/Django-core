import React, { useState, useEffect } from 'react';
import { Button, Card, Badge } from '@django-core/design-system';

interface ContentGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  slotType: 'announcement' | 'lineup' | 'half-time' | 'full-time';
  matchData: any; // Using any for "Basic" phase, to be typed with B30 Activity later
}

// B31 Placeholder: Mock Templates
const MOCK_TEMPLATES = {
  announcement: [
    { id: 'ann-1', name: 'Classic Versus', style: 'Modern', tags: ['Instagram', 'Story'] },
    { id: 'ann-2', name: 'Bold Typography', style: 'Bold', tags: ['Twitter'] },
  ],
  lineup: [
    { id: 'lin-1', name: 'Field View', style: 'Tactical', tags: ['11v11'] },
    { id: 'lin-2', name: 'List View (Simple)', style: 'Minimal', tags: ['List'] },
    { id: 'lin-3', name: 'Player Spotlight', style: 'Dynamic', tags: ['Video'] },
  ],
  'half-time': [
    { id: 'ht-1', name: 'Score Update', style: 'Clean', tags: [] },
  ],
  'full-time': [
    { id: 'ft-1', name: 'Result Card', style: 'Impact', tags: ['Win', 'Loss'] },
    { id: 'ft-2', name: 'MVP Highlight', style: 'Photo-heavy', tags: ['MVP'] },
  ]
};

export default function ContentGenerationModal({ isOpen, onClose, slotType, matchData }: ContentGenerationModalProps) {
  const [step, setStep] = useState<'select' | 'generating' | 'success'>('select');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelectedTemplateId(null);
      setProgress(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGenerate = () => {
    if (!selectedTemplateId) return;

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

  const templates = MOCK_TEMPLATES[slotType] || [];

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
        zIndex: 1100, // Higher than other modals
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--app-surface, white)',
          padding: '24px',
          borderRadius: '12px',
          width: '600px',
          maxWidth: '90%',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          color: 'var(--app-text)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh',
        }}
      >
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h2 className="text-xl font-bold m-0">Create {slotType.replace('-', ' ')} Content</h2>
            <div className="text-sm text-gray-500 mt-1">
               {matchData?.project?.name} vs {matchData?.opponent_project?.name || 'Opponent'}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[300px]">

          {step === 'select' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Select a template to generate this content. This will use the match data you have entered.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {templates.map(template => (
                  <div
                    key={template.id}
                    onClick={() => setSelectedTemplateId(template.id)}
                    className={`
                      border rounded-lg p-4 cursor-pointer transition-all flex flex-col gap-2 relative
                      ${selectedTemplateId === template.id
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className="aspect-video bg-gray-200 rounded mb-2 flex items-center justify-center text-gray-400 text-xs">
                        {/* Placeholder for B22 FileAsset Preview */}
                        [Preview: {template.name}]
                    </div>
                    <div className="font-semibold text-sm">{template.name}</div>
                    <div className="flex flex-wrap gap-1">
                         <Badge variant="outline" size="sm">{template.style}</Badge>
                         {template.tags.map(tag => (
                             <Badge key={tag} variant="secondary" size="sm">{tag}</Badge>
                         ))}
                    </div>
                    {selectedTemplateId === template.id && (
                        <div className="absolute top-2 right-2 text-blue-500 bg-white rounded-full p-1 shadow-sm">
                            ✓
                        </div>
                    )}
                  </div>
                ))}
              </div>

              {templates.length === 0 && (
                  <div className="text-center py-10 text-gray-400">
                      No templates found for this slot type.
                  </div>
              )}
            </div>
          )}

          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center h-full py-12">
                <div className="w-full max-w-xs mb-4">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-600 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
                <div className="text-lg font-medium text-gray-700 animate-pulse">
                    Generating Content...
                </div>
                <div className="text-sm text-gray-500 mt-2">
                    Applying {matchData?.project?.name} branding...
                </div>
            </div>
          )}

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

        <div className="mt-6 pt-4 border-t flex justify-end gap-3">
            {step === 'select' && (
                <>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button
                        disabled={!selectedTemplateId}
                        onClick={handleGenerate}
                    >
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

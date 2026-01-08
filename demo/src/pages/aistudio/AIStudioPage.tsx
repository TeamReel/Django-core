import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button, Card, Badge, Alert } from '@django-core/design-system';
import { PageHeader, PageContent } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';

export default function AIStudioPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const contextId = params.get('context'); // e.g. matchId
  const [isGenerating, setIsGenerating] = useState(false);

  const startGeneration = () => {
     setIsGenerating(true);
     // Simulate API call
     setTimeout(() => {
         setIsGenerating(false);
         navigate('/content');
     }, 2500);
  };

  return (
    <AppShell>
      <div>
        <PageHeader
           title="AI Studio"
           breadcrumbs={[
             { label: 'Home', onClick: () => navigate('/') },
             { label: 'AI Studio', current: true }
           ]}
        />
        <PageContent>
           <Card>
              <div style={{ textAlign: 'center', padding: '40px' }}>
                 <div style={{ fontSize: '48px', marginBottom: '20px' }}>✨</div>
                 <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
                    Generate Content
                 </h2>
                 {contextId && (
                    <Alert variant="info" className="mb-6 inline-block">
                       Context: Match #{contextId}
                    </Alert>
                 )}
                 <p style={{ maxWidth: '500px', margin: '0 auto 24px', opacity: 0.7 }}>
                    Select a template to generate high-quality social media posts,
                    match reports, or highlight videos using TeamReel AI.
                 </p>

                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '40px' }}>
                     {['Match Report', 'Social Post', 'Video Highlights', 'Player Stats'].map(type => (
                        <div key={type}
                             onClick={() => !isGenerating && startGeneration()}
                             style={{
                                cursor: 'pointer',
                                padding: '24px',
                                border: '1px solid #ddd',
                                borderRadius: '8px',
                                background: 'white',
                                transition: 'all 0.2s'
                             }}
                             className="hover:border-blue-500 hover:shadow-md"
                        >
                            <strong>{type}</strong>
                        </div>
                     ))}
                 </div>

                 {isGenerating && (
                    <div style={{ color: '#007bff', fontWeight: 500 }}>
                        <span className="animate-pulse">Generating content... ⚡</span>
                    </div>
                 )}
              </div>
           </Card>
        </PageContent>
      </div>
    </AppShell>
  );
}

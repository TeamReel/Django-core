import React, { useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button, Card, Badge, Alert } from '@django-core/design-system';
import { PageHeader, PageContent } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';

export default function AIStudioPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const contextId = params.get('context'); // e.g. matchId
   const [notAvailable, setNotAvailable] = useState(false);

   const contextLabel = useMemo(() => {
      const raw = String(contextId || '').trim();
      if (!raw) return '';
      if (raw.includes(':')) return raw;
      if (raw === 'match') return 'Match';
      if (raw === 'season') return 'Season';
      if (/^\d+$/.test(raw)) return `Match #${raw}`;
      return raw;
   }, [contextId]);

  const startGeneration = () => {
     // No mock generation: this requires backend modules (B31/B34/B35).
     setNotAvailable(true);
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
                       Context: {contextLabel}
                    </Alert>
                 )}
                 <p style={{ maxWidth: '500px', margin: '0 auto 24px', opacity: 0.7 }}>
                    Select a template to generate high-quality social media posts,
                    match reports, or highlight videos using TeamReel AI.
                 </p>

                 {notAvailable && (
                    <Alert variant="warning" className="mb-6 inline-block">
                       Generation is not available yet (no mock runs). Requires B31 (Content), B34 (Pipelines) and B35 (Assets).
                    </Alert>
                 )}

                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '40px' }}>
                     {['Match Report', 'Social Post', 'Video Highlights', 'Player Stats'].map(type => (
                        <div key={type}
                             onClick={() => startGeneration()}
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

                 <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Button variant="secondary" onClick={() => navigate('/content')}>Open Content Library</Button>
                 </div>
              </div>
           </Card>
        </PageContent>
      </div>
    </AppShell>
  );
}

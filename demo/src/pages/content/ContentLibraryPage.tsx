import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge, Alert } from '@django-core/design-system';
import { PageHeader, PageContent } from '@django-core/page-templates';

export default function ContentLibraryPage() {
  const navigate = useNavigate();
   const [scope, setScope] = useState<'all' | 'match' | 'season'>('all');

  return (
    <>
      <div>
        <PageHeader
           title="Content Library"
           breadcrumbs={[
             { label: 'Home', onClick: () => navigate('/') },
             { label: 'Content', current: true }
           ]}
           actions={
                   <Button onClick={() => navigate('/studio/create')}>+ New (AI Studio)</Button>
           }
        />
        <PageContent>
               <Card className="mb-6">
                  <div style={{ padding: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
                     <div>
                        <div style={{ fontWeight: 800, marginBottom: 4 }}>Create content for…</div>
                        <div style={{ opacity: 0.7, fontSize: 13 }}>In TeamReel, content is usually tied to a match or a season.</div>
                     </div>
                     <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <Button variant="secondary" onClick={() => navigate('/studio/create?context=match')}>
                           Match
                        </Button>
                        <Button variant="secondary" onClick={() => navigate('/studio/create?context=season')}>
                           Season
                        </Button>
                     </div>
                  </div>
               </Card>

               <Alert variant="info" className="mb-6">
                  Content Library is currently running without backend persistence. To avoid mock data, this page will stay empty until
                  modules B31 (Content Templates & Generation) + B34 (Pipelines) + B35 (Asset Library) are implemented.
               </Alert>

               <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, opacity: 0.8 }}>Filter:</span>
                  <Button size="sm" variant={scope === 'all' ? 'primary' : 'secondary'} onClick={() => setScope('all')}>All</Button>
                  <Button size="sm" variant={scope === 'match' ? 'primary' : 'secondary'} onClick={() => setScope('match')}>Matches</Button>
                  <Button size="sm" variant={scope === 'season' ? 'primary' : 'secondary'} onClick={() => setScope('season')}>Seasons</Button>
               </div>

               <Card>
                  <div style={{ padding: 18 }}>
                     <div style={{ fontWeight: 800, marginBottom: 6 }}>No content yet</div>
                     <div style={{ opacity: 0.75, fontSize: 13, marginBottom: 12 }}>
                        This will show generated content items once the backend content modules are live.
                     </div>
                     <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <Button onClick={() => navigate('/studio/create')}>Open AI Studio</Button>
                        <Button variant="secondary" onClick={() => navigate('/directory?tab=matches')}>Pick a match</Button>
                     </div>
                     <div style={{ marginTop: 10, opacity: 0.6, fontSize: 12 }}>
                        Active filter: <strong>{scope}</strong>
                     </div>
                  </div>
               </Card>
        </PageContent>
      </div>
    </>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge, Alert } from '@django-core/design-system';
import { PageHeader, PageContent } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';

export default function ContentLibraryPage() {
  const navigate = useNavigate();

  return (
    <AppShell>
      <div>
        <PageHeader
           title="Content Library"
           breadcrumbs={[
             { label: 'Home', onClick: () => navigate('/') },
             { label: 'Content', current: true }
           ]}
           actions={
             <Button onClick={() => navigate('/studio/create')}>+ New Content</Button>
           }
        />
        <PageContent>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                 <Card key={i} className="overflow-hidden">
                    <div style={{ height: '150px', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       Preview {i}
                    </div>
                    <div style={{ padding: '16px' }}>
                       <h4 style={{ fontWeight: 600, marginBottom: '8px' }}>Match Report: Ajax vs Almere</h4>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Badge variant="success">Ready</Badge>
                          <Button size="sm" variant="secondary">Download</Button>
                       </div>
                    </div>
                 </Card>
              ))}
           </div>
        </PageContent>
      </div>
    </AppShell>
  );
}

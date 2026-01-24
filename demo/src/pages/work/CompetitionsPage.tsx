import { PageContent, PageHeader } from '@django-core/page-templates';
import { useNavigate } from 'react-router-dom';
import { CompetitionsList } from '../identity/directory/CompetitionsList';

export default function CompetitionsPage() {
  const navigate = useNavigate();

  const breadcrumbs = [
    { label: 'Dashboard', onClick: () => navigate('/dashboard') },
    { label: 'Directory', onClick: () => navigate('/directory') },
    { label: 'Competitions', current: true },
  ];

  return (
    <>
      <PageHeader title="Competitions" breadcrumbs={breadcrumbs} />
      <PageContent>
        <CompetitionsList />
      </PageContent>
    </>
  );
}

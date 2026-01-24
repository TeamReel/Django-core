import { PageContent, PageHeader } from '@django-core/page-templates';
import { useNavigate } from 'react-router-dom';
import { MatchesList } from '../identity/directory/MatchesList';

export default function MatchesPage() {
  const navigate = useNavigate();

  const breadcrumbs = [
    { label: 'Dashboard', onClick: () => navigate('/dashboard') },
    { label: 'Directory', onClick: () => navigate('/directory') },
    { label: 'Matches', current: true },
  ];

  return (
    <>
      <PageHeader title="Matches" breadcrumbs={breadcrumbs} />
      <PageContent>
        <MatchesList />
      </PageContent>
    </>
  );
}

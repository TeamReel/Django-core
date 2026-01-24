import { PageContent, PageHeader } from '@django-core/page-templates';
import { useNavigate } from 'react-router-dom';
import { TeamsList } from '../identity/directory/TeamsList';

export default function TeamsPage() {
  const navigate = useNavigate();

  const breadcrumbs = [
    { label: 'Dashboard', onClick: () => navigate('/dashboard') },
    { label: 'Directory', onClick: () => navigate('/directory') },
    { label: 'Teams', current: true },
  ];

  return (
    <>
      <PageHeader title="Teams" breadcrumbs={breadcrumbs} />
      <PageContent>
        <TeamsList />
      </PageContent>
    </>
  );
}

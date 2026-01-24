import { PageContent, PageHeader } from '@django-core/page-templates';
import { useNavigate } from 'react-router-dom';
import { ClubsList } from '../identity/directory/ClubsList';

export default function ClubsPage() {
  const navigate = useNavigate();

  const breadcrumbs = [
    { label: 'Dashboard', onClick: () => navigate('/dashboard') },
    { label: 'Directory', onClick: () => navigate('/directory') },
    { label: 'Clubs', current: true },
  ];

  return (
    <>
      <PageHeader title="Clubs" breadcrumbs={breadcrumbs} />
      <PageContent>
        <ClubsList />
      </PageContent>
    </>
  );
}

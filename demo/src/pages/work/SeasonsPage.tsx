import { PageContent, PageHeader } from '@django-core/page-templates';
import { useNavigate } from 'react-router-dom';
import { SeasonsList } from '../identity/directory/SeasonsList';

export default function SeasonsPage() {
  const navigate = useNavigate();

  const breadcrumbs = [
    { label: 'Dashboard', onClick: () => navigate('/dashboard') },
    { label: 'Directory', onClick: () => navigate('/directory') },
    { label: 'Seasons', current: true },
  ];

  return (
    <>
      <PageHeader title="Seasons" breadcrumbs={breadcrumbs} />
      <PageContent>
        <SeasonsList />
      </PageContent>
    </>
  );
}

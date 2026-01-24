import { PageContent, PageHeader } from '@django-core/page-templates';
import { useNavigate } from 'react-router-dom';
import { ClubsList } from '../identity/directory/ClubsList';

export default function ClubsPage() {
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title="Clubs" />
      <PageContent>
        <ClubsList />
      </PageContent>
    </>
  );
}

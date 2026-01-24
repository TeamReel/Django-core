import { PageContent, PageHeader } from '@django-core/page-templates';
import { useNavigate } from 'react-router-dom';
import { MatchesList } from '../identity/directory/MatchesList';

export default function MatchesPage() {
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title="Matches" />
      <PageContent>
        <MatchesList />
      </PageContent>
    </>
  );
}

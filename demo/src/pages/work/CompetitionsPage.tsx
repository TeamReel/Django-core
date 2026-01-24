import { PageContent, PageHeader } from '@django-core/page-templates';
import { useNavigate } from 'react-router-dom';
import { CompetitionsList } from '../identity/directory/CompetitionsList';

export default function CompetitionsPage() {
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title="Competitions" />
      <PageContent>
        <CompetitionsList />
      </PageContent>
    </>
  );
}

import { PageContent, PageHeader } from '@django-core/page-templates';
import { useNavigate } from 'react-router-dom';
import { TeamsList } from '../identity/directory/TeamsList';

export default function TeamsPage() {
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title="Teams" />
      <PageContent>
        <TeamsList />
      </PageContent>
    </>
  );
}

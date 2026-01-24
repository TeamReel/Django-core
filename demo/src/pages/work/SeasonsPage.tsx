import { PageContent, PageHeader } from '@django-core/page-templates';
import { useNavigate } from 'react-router-dom';
import { SeasonsList } from '../identity/directory/SeasonsList';

export default function SeasonsPage() {
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title="Seasons" />
      <PageContent>
        <SeasonsList />
      </PageContent>
    </>
  );
}

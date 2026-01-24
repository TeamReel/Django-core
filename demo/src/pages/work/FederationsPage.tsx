import { PageContent, PageHeader } from '@django-core/page-templates';
import { FederationsList } from '../identity/directory/FederationsList';

export default function FederationsPage() {
  return (
    <>
      <PageHeader title="Federations" />
      <PageContent>
        <FederationsList />
      </PageContent>
    </>
  );
}

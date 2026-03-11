import React from 'react';
import GovernanceSummaryCard from '../../../components/Governance/GovernanceSummaryCard';
import TransactionsPanel from '../../../components/transactions/TransactionsPanel';
import type { Organisation, MatchDetail, Project } from './types';

interface MatchTransactionsTabProps {
  org: Organisation | null;
  match: MatchDetail;
  project: Project | null;
}

export default function MatchTransactionsTab({
  org,
  match,
  project,
}: MatchTransactionsTabProps) {
  return (
    <div className="grid gap-12">
      <GovernanceSummaryCard
        organisationId={String(org?.id || '')}
        projectId={String(match?.project?.id || project?.id || '')}
        title="Governance (Org policies)"
        description="Balance policy can warn/block match-scoped transactions when credits run low."
      />
      <TransactionsPanel
        title="Transactions"
        description="Match-scoped transactions (usage_event.metadata.activity_id)"
        filters={{
          organization_id: String(org?.id || ''),
          project_id: String(match?.project?.id || project?.id || ''),
          activity_id: String(match?.id || ''),
        }}
      />
    </div>
  );
}

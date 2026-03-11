import React from 'react';
import TransactionsPanel from '../../components/transactions/TransactionsPanel';

export interface SeasonTransactionsTabProps {
  orgId: string;
  projectId: string;
  seasonId: string;
}

const SeasonTransactionsTab: React.FC<SeasonTransactionsTabProps> = ({
  orgId,
  projectId,
  seasonId,
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="lg:col-span-3">
      <div className="grid gap-12">
        <TransactionsPanel
          title="Transactions"
          description="Season-scoped transactions (usage_event.metadata.season_id)"
          filters={{
            organization_id: orgId,
            project_id: projectId,
            season_id: seasonId,
          }}
        />
      </div>
    </div>
  </div>
);

export default SeasonTransactionsTab;

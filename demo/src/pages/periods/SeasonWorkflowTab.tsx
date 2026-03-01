import React from 'react';
import { WorkflowPanel } from '../../components/Workflows';

export interface SeasonWorkflowTabProps {
  projectId: string;
  seasonId: string;
}

const SeasonWorkflowTab: React.FC<SeasonWorkflowTabProps> = ({ projectId, seasonId }) => (
  <WorkflowPanel
    projectId={projectId}
    contentTypeName="period"
    objectId={seasonId}
  />
);

export default SeasonWorkflowTab;

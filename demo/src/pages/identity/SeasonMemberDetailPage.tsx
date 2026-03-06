import ProjectSeasonMemberDetailPage from '../periods/ProjectSeasonMemberDetailPage';
import { SeasonProvider } from '../../providers/SeasonProvider';

export default function SeasonMemberDetailPage() {
  return (
    <SeasonProvider>
      <ProjectSeasonMemberDetailPage />
    </SeasonProvider>
  );
}

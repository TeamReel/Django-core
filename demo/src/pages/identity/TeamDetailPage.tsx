import ProjectDetailPage from './ProjectDetailPage';

export default function TeamDetailPage() {
  // Wrapper so Club vs Team detail can diverge safely over time.
  // Keep using the shared detail implementation, but force team-mode.
  return <ProjectDetailPage forceMode="team" />;
}

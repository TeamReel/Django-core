import ProjectDetailPage from './ProjectDetailPage';

export default function ClubDetailPage() {
  // Wrapper so Club vs Team detail can diverge safely over time.
  return <ProjectDetailPage forceMode="club" />;
}

import ProjectDetailPage from './ProjectDetailPage';

export default function TeamDetailPage() {
  // Intentionally reusing the shared detail implementation for now.
  // This wrapper exists so we can safely diverge Team vs Club detail UX
  // without making ProjectDetailPage even more complex.
  return <ProjectDetailPage />;
}

import { Badge } from '@django-core/design-system';
import { Modal } from '@/components/ui/Modal';
import type { Project } from '@/types/api/project';

interface ProjectDetailModalProps {
  opened: boolean;
  onClose: () => void;
  project: Project | null;
}

export default function ProjectDetailModal({ opened, onClose, project }: ProjectDetailModalProps) {
  if (!project) return null;

  return (
    <Modal
      isOpen={opened}
      onClose={onClose}
      title="Project Details"
      size="sm"
      footer={
        <button
          onClick={onClose}
          className="py-8 px-16 rounded-4 border bg-surface-2 text-primary cursor-pointer"
        >
          Close
        </button>
      }
    >
      <div className="flex-col gap-20">
        {/* Project Information */}
        <div>
          <h3 className="fs-16 fw-600 mb-16 text-primary">Project Information</h3>
          <div className="flex-col gap-12">
            <div>
              <label className="label-muted mb-4">Name</label>
              <div className="fw-500 text-primary">{project.name}</div>
            </div>

            {project.description && (
              <div>
                <label className="label-muted mb-4">Description</label>
                <div className="fw-500 text-primary">{project.description}</div>
              </div>
            )}

            {project.organisation && (
              <div>
                <label className="label-muted mb-4">Organisation</label>
                <div className="fw-500 text-primary">{typeof project.organisation === 'string' ? project.organisation : (project.organisation.name || project.organisation.slug || project.organisation.id || '—')}</div>
              </div>
            )}

            <div>
              <label className="label-muted mb-4">Status</label>
              <Badge variant={project.is_active ? 'success' : 'error'}>
                {project.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            {typeof project.member_count === 'number' && (
              <div>
                <label className="label-muted mb-4">Members</label>
                <div className="fw-500 text-primary">{project.member_count}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

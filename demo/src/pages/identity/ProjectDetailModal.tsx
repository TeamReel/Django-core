import { useState, useEffect } from 'react';
import { Badge } from '@django-core/design-system';
import type { Project } from '@/types/api/project';
import styles from './ProjectDetailModal.module.css';

interface ProjectDetailModalProps {
  opened: boolean;
  onClose: () => void;
  project: Project | null;
}

export default function ProjectDetailModal({ opened, onClose, project }: ProjectDetailModalProps) {
  if (!opened || !project) return null;

  return (
    <div
      className={`flex-center ${styles.modalBackdrop}`}
    >
      <div
        className={`bg-surface p-24 rounded-8 overflow-auto border ${styles.modalContent}`}
      >
        <h2 className={`text-primary ${styles.modalTitle}`}>Project Details</h2>

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

        <div className={`mt-24 ${styles.modalFooter}`}>
          <button
            onClick={onClose}
            className="py-8 px-16 rounded-4 border bg-surface-2 text-primary cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Badge } from '@django-core/design-system';

interface Project {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  organisation?: {
    id: string;
    name: string;
  };
  member_count?: number;
}

interface ProjectDetailModalProps {
  opened: boolean;
  onClose: () => void;
  project: Project | null;
}

export default function ProjectDetailModal({ opened, onClose, project }: ProjectDetailModalProps) {
  if (!opened || !project) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'var(--app-surface)',
        padding: '24px',
        borderRadius: '8px',
        width: '600px',
        maxWidth: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        color: 'var(--app-text)',
        border: '1px solid var(--app-border)'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--app-text)' }}>Project Details</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Project Information */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--app-text)' }}>Project Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>Name</label>
                <div style={{ fontWeight: 500, color: 'var(--app-text)' }}>{project.name}</div>
              </div>

              {project.description && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>Description</label>
                  <div style={{ fontWeight: 500, color: 'var(--app-text)' }}>{project.description}</div>
                </div>
              )}

              {project.organisation && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>Organisation</label>
                  <div style={{ fontWeight: 500, color: 'var(--app-text)' }}>{project.organisation.name}</div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>Status</label>
                <Badge variant={project.is_active ? 'success' : 'error'}>
                  {project.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              {typeof project.member_count === 'number' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>Members</label>
                  <div style={{ fontWeight: 500, color: 'var(--app-text)' }}>{project.member_count}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface-2)',
              color: 'var(--app-text)',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

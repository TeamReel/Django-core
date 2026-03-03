/**
 * Tests for PermissionMatrix component
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { PermissionMatrix } from './PermissionMatrix';
import { Role } from '../types';

// Mock design system
vi.mock('@django-core/design-system', () => ({
  Modal: ({ children, isOpen, title }: any) => (
    isOpen ? (
      <div role="dialog">
        <h1>{title}</h1>
        {children}
      </div>
    ) : null
  ),
  Grid: ({ children }: any) => <div>{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
  Badge: ({ children }: any) => <span>{children}</span>,
  Stack: ({ children }: any) => <div>{children}</div>,
  Heading: ({ children }: any) => <h3>{children}</h3>,
}));

describe('PermissionMatrix', () => {
  const mockRoles: Role[] = [
    {
      id: 'role-1',
      name: 'Admin',
      permissions: ['projects.view', 'projects.edit', 'users.view'],
    },
    {
      id: 'role-2',
      name: 'Viewer',
      permissions: ['projects.view'],
    },
  ];

  const mockAllPermissions = [
    'projects.view',
    'projects.edit',
    'users.view',
    'users.edit',
  ];

  it('renders correctly when open', () => {
    render(
      <PermissionMatrix
        isOpen={true}
        onClose={() => {}}
        roles={mockRoles}
        allPermissions={mockAllPermissions}
      />
    );

    expect(screen.getByText('Permission Matrix')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Viewer')).toBeInTheDocument();
    expect(screen.getByText('projects')).toBeInTheDocument();
    expect(screen.getByText('users')).toBeInTheDocument();
    expect(screen.getByText('projects.view')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <PermissionMatrix
        isOpen={false}
        onClose={() => {}}
        roles={mockRoles}
        allPermissions={mockAllPermissions}
      />
    );

    expect(screen.queryByText('Permission Matrix')).not.toBeInTheDocument();
  });
});

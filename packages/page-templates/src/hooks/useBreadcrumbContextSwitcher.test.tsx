import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useBreadcrumbContextSwitcher } from './useBreadcrumbContextSwitcher';
import type {
  Organisation,
  Project,
  User,
  BreadcrumbContext,
  PermissionChecks,
} from './useBreadcrumbContextSwitcher';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual: any = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('useBreadcrumbContextSwitcher', () => {
  const mockOrganisations: Organisation[] = [
    { id: '1', name: 'Bundesliga', slug: 'bundesliga' },
    { id: '2', name: 'Premier League', slug: 'premier-league' },
    { id: '3', name: 'La Liga', slug: 'la-liga' },
  ];

  const mockProjects: Project[] = [
    { id: 'p1', name: 'Team Management', slug: 'team-management', organisation_id: '1' },
    { id: 'p2', name: 'Player Stats', slug: 'player-stats', organisation_id: '1' },
    { id: 'p3', name: 'Match Fixtures', slug: 'match-fixtures', organisation_id: '2' },
  ];

  const mockUsers: User[] = [
    { id: 'u1', username: 'john_doe', email: 'john@example.com' },
    { id: 'u2', username: 'jane_smith', email: 'jane@example.com' },
    { id: 'u3', username: 'admin_user', email: 'admin@example.com' },
  ];

  beforeEach(() => {
    mockNavigate.mockClear();
  });

  const wrapper = ({ children }: any) => <MemoryRouter>{children}</MemoryRouter>;

  describe('Option Filtering', () => {
    it('returns all organisations when no permission filter', () => {
      const { result } = renderHook(
        () =>
          useBreadcrumbContextSwitcher({
            organisations: mockOrganisations,
            projects: mockProjects,
            users: mockUsers,
            context: {},
          }),
        { wrapper }
      );

      expect(result.current.organisationOptions).toHaveLength(3);
      expect(result.current.organisationOptions[0]).toEqual({
        id: '1',
        label: 'Bundesliga',
        slug: 'bundesliga',
      });
    });

    it('filters organisations by permission', () => {
      const permissions: PermissionChecks = {
        canAccessOrganisation: (orgId) => orgId === '1' || orgId === '2',
      };

      const { result } = renderHook(
        () =>
          useBreadcrumbContextSwitcher({
            organisations: mockOrganisations,
            projects: mockProjects,
            users: mockUsers,
            context: {},
            permissions,
          }),
        { wrapper }
      );

      expect(result.current.organisationOptions).toHaveLength(2);
      expect(result.current.organisationOptions.map((o) => o.id)).toEqual(['1', '2']);
    });

    it('returns empty projects when no org is selected', () => {
      const { result } = renderHook(
        () =>
          useBreadcrumbContextSwitcher({
            organisations: mockOrganisations,
            projects: mockProjects,
            users: mockUsers,
            context: {},
          }),
        { wrapper }
      );

      expect(result.current.projectOptions).toHaveLength(0);
    });

    it('filters projects by current organisation', () => {
      const context: BreadcrumbContext = {
        currentOrgId: '1',
      };

      const { result } = renderHook(
        () =>
          useBreadcrumbContextSwitcher({
            organisations: mockOrganisations,
            projects: mockProjects,
            users: mockUsers,
            context,
          }),
        { wrapper }
      );

      expect(result.current.projectOptions).toHaveLength(2);
      expect(result.current.projectOptions.map((p) => p.id)).toEqual(['p1', 'p2']);
    });

    it('filters projects by permission', () => {
      const context: BreadcrumbContext = {
        currentOrgId: '1',
      };

      const permissions: PermissionChecks = {
        canAccessProject: (projectId) => projectId === 'p1',
      };

      const { result } = renderHook(
        () =>
          useBreadcrumbContextSwitcher({
            organisations: mockOrganisations,
            projects: mockProjects,
            users: mockUsers,
            context,
            permissions,
          }),
        { wrapper }
      );

      expect(result.current.projectOptions).toHaveLength(1);
      expect(result.current.projectOptions[0].id).toBe('p1');
    });

    it('filters users by permission', () => {
      const permissions: PermissionChecks = {
        canViewUser: (userId) => userId === 'u1' || userId === 'u2',
      };

      const { result } = renderHook(
        () =>
          useBreadcrumbContextSwitcher({
            organisations: mockOrganisations,
            projects: mockProjects,
            users: mockUsers,
            context: {},
            permissions,
          }),
        { wrapper }
      );

      expect(result.current.userOptions).toHaveLength(2);
      expect(result.current.userOptions.map((u) => u.id)).toEqual(['u1', 'u2']);
    });
  });

  describe('Organisation Switching', () => {
    it('navigates to organisation detail when switching orgs', () => {
      const context: BreadcrumbContext = {
        currentOrgId: '1',
      };

      const { result } = renderHook(
        () =>
          useBreadcrumbContextSwitcher({
            organisations: mockOrganisations,
            projects: mockProjects,
            users: mockUsers,
            context,
          }),
        { wrapper }
      );

      act(() => {
        result.current.handleOrganisationSwitch({
          id: '2',
          label: 'Premier League',
          slug: 'premier-league',
        });
      });

      expect(mockNavigate).toHaveBeenCalledWith('/app/organisations/premier-league');
    });

    it('preserves project when switching to org that owns it', () => {
      const context: BreadcrumbContext = {
        currentOrgId: '1',
        currentProjectId: 'p3', // This project belongs to org '2'
      };

      const { result } = renderHook(
        () =>
          useBreadcrumbContextSwitcher({
            organisations: mockOrganisations,
            projects: mockProjects,
            users: mockUsers,
            context,
          }),
        { wrapper }
      );

      act(() => {
        result.current.handleOrganisationSwitch({
          id: '2',
          label: 'Premier League',
          slug: 'premier-league',
        });
      });

      // Should navigate to project detail since project belongs to new org
      expect(mockNavigate).toHaveBeenCalledWith(
        '/app/organisations/premier-league/projects/match-fixtures'
      );
    });

    it('resets project when switching to org that does not own it', () => {
      const context: BreadcrumbContext = {
        currentOrgId: '1',
        currentProjectId: 'p1', // This project belongs to org '1'
      };

      const { result } = renderHook(
        () =>
          useBreadcrumbContextSwitcher({
            organisations: mockOrganisations,
            projects: mockProjects,
            users: mockUsers,
            context,
          }),
        { wrapper }
      );

      act(() => {
        result.current.handleOrganisationSwitch({
          id: '2',
          label: 'Premier League',
          slug: 'premier-league',
        });
      });

      // Should navigate to org detail without project
      expect(mockNavigate).toHaveBeenCalledWith('/app/organisations/premier-league');
    });

    it('uses custom basePath when provided', () => {
      const { result } = renderHook(
        () =>
          useBreadcrumbContextSwitcher({
            organisations: mockOrganisations,
            projects: mockProjects,
            users: mockUsers,
            context: {},
            basePath: '/dashboard',
          }),
        { wrapper }
      );

      act(() => {
        result.current.handleOrganisationSwitch({
          id: '1',
          label: 'Bundesliga',
          slug: 'bundesliga',
        });
      });

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/organisations/bundesliga');
    });
  });

  describe('Project Switching', () => {
    it('navigates to project detail when switching projects', () => {
      const context: BreadcrumbContext = {
        currentOrgId: '1',
        currentProjectId: 'p1',
      };

      const { result } = renderHook(
        () =>
          useBreadcrumbContextSwitcher({
            organisations: mockOrganisations,
            projects: mockProjects,
            users: mockUsers,
            context,
          }),
        { wrapper }
      );

      act(() => {
        result.current.handleProjectSwitch({
          id: 'p2',
          label: 'Player Stats',
          slug: 'player-stats',
        });
      });

      expect(mockNavigate).toHaveBeenCalledWith('/app/organisations/bundesliga/projects/player-stats');
    });

    it('does nothing when no org is selected', () => {
      const { result } = renderHook(
        () =>
          useBreadcrumbContextSwitcher({
            organisations: mockOrganisations,
            projects: mockProjects,
            users: mockUsers,
            context: {},
          }),
        { wrapper }
      );

      act(() => {
        result.current.handleProjectSwitch({
          id: 'p1',
          label: 'Team Management',
          slug: 'team-management',
        });
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('handles missing organisation gracefully', () => {
      const context: BreadcrumbContext = {
        currentOrgId: 'non-existent',
      };

      const { result } = renderHook(
        () =>
          useBreadcrumbContextSwitcher({
            organisations: mockOrganisations,
            projects: mockProjects,
            users: mockUsers,
            context,
          }),
        { wrapper }
      );

      act(() => {
        result.current.handleProjectSwitch({
          id: 'p1',
          label: 'Team Management',
          slug: 'team-management',
        });
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('User Switching', () => {
    it('navigates to user detail when switching users', () => {
      const { result } = renderHook(
        () =>
          useBreadcrumbContextSwitcher({
            organisations: mockOrganisations,
            projects: mockProjects,
            users: mockUsers,
            context: {},
          }),
        { wrapper }
      );

      act(() => {
        result.current.handleUserSwitch({
          id: 'u1',
          label: 'john_doe',
          slug: 'john_doe',
        });
      });

      expect(mockNavigate).toHaveBeenCalledWith('/app/users/john_doe');
    });

    it('uses id as fallback when slug is missing', () => {
      const { result } = renderHook(
        () =>
          useBreadcrumbContextSwitcher({
            organisations: mockOrganisations,
            projects: mockProjects,
            users: mockUsers,
            context: {},
          }),
        { wrapper }
      );

      act(() => {
        result.current.handleUserSwitch({
          id: 'u2',
          label: 'jane_smith',
        });
      });

      expect(mockNavigate).toHaveBeenCalledWith('/app/users/u2');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty organisations array', () => {
      const { result } = renderHook(
        () =>
          useBreadcrumbContextSwitcher({
            organisations: [],
            projects: mockProjects,
            users: mockUsers,
            context: {},
          }),
        { wrapper }
      );

      expect(result.current.organisationOptions).toHaveLength(0);
    });

    it('handles empty projects array', () => {
      const context: BreadcrumbContext = {
        currentOrgId: '1',
      };

      const { result } = renderHook(
        () =>
          useBreadcrumbContextSwitcher({
            organisations: mockOrganisations,
            projects: [],
            users: mockUsers,
            context,
          }),
        { wrapper }
      );

      expect(result.current.projectOptions).toHaveLength(0);
    });

    it('handles empty users array', () => {
      const { result } = renderHook(
        () =>
          useBreadcrumbContextSwitcher({
            organisations: mockOrganisations,
            projects: mockProjects,
            users: [],
            context: {},
          }),
        { wrapper }
      );

      expect(result.current.userOptions).toHaveLength(0);
    });

    it('updates options when props change', () => {
      const { result, rerender } = renderHook(
        (props) => useBreadcrumbContextSwitcher(props),
        {
          wrapper,
          initialProps: {
            organisations: mockOrganisations,
            projects: mockProjects,
            users: mockUsers,
            context: {},
          },
        }
      );

      expect(result.current.organisationOptions).toHaveLength(3);

      // Update to filtered organisations
      rerender({
        organisations: mockOrganisations.slice(0, 2),
        projects: mockProjects,
        users: mockUsers,
        context: {},
      });

      expect(result.current.organisationOptions).toHaveLength(2);
    });
  });
});

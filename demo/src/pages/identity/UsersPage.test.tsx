import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import UsersPage from './UsersPage';

vi.mock('@django-core/design-system', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Card: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@django-core/page-templates', () => ({
  PageHeader: ({ title }: any) => <h1>{title}</h1>,
  BreadcrumbContextSwitcher: () => null,
}));

vi.mock('../../components/Skeleton', () => ({
  SkeletonTablePage: () => <div>Loading...</div>,
}));

vi.mock('./useUsersData', () => ({
  useUsersData: () => ({
    navigate: vi.fn(),
    context: { organisation: { id: '1', slug: 'demo', name: 'Demo Org' }, project: null },
    myOrganisations: [{ id: '1', slug: 'demo', name: 'Demo Org' }],
    orgIdParam: null,
    organisationOptions: [],
    filteredUsers: [],
    isLoading: false,
    error: null,
    total: 0,
    currentPage: 1,
    organisations: [],
    clubs: [],
    teams: [],
    availableRoles: [],
    selectedOrgId: '',
    selectedClubKey: '',
    selectedTeamKey: '',
    statusFilter: 'all',
    roleFilter: 'all',
    breadcrumbs: [],
    editingUser: null,
    isModalOpen: false,
    detailUser: null,
    isDetailModalOpen: false,
    isInviteModalOpen: false,
    isAddMemberOpen: false,
    assignUser: null,
    isAssignModalOpen: false,
    linkUser: null,
    isLinkModalOpen: false,
    user: { id: '1' },
    isSuperAdmin: false,
    canManageUsers: true,
    waitingForOrgContext: false,
    handleEditClick: vi.fn(),
    handleSaveUser: vi.fn(),
    fetchUsers: vi.fn(),
    setEditingUser: vi.fn(),
    setIsModalOpen: vi.fn(),
    setDetailUser: vi.fn(),
    setIsDetailModalOpen: vi.fn(),
    setIsInviteModalOpen: vi.fn(),
    setIsAddMemberOpen: vi.fn(),
    setAssignUser: vi.fn(),
    setIsAssignModalOpen: vi.fn(),
    setLinkUser: vi.fn(),
    setIsLinkModalOpen: vi.fn(),
    setSelectedOrgId: vi.fn(),
    setSelectedClubKey: vi.fn(),
    setSelectedTeamKey: vi.fn(),
    setStatusFilter: vi.fn(),
    setRoleFilter: vi.fn(),
  }),
}));

vi.mock('./UsersFilterBar', () => ({ UsersFilterBar: () => <div>Filters</div> }));
vi.mock('./UsersTable', () => ({ UsersTable: () => <div>UsersTable</div> }));
vi.mock('./UserEditModal', () => ({ default: () => null }));
vi.mock('./UserDetailModal', () => ({ default: () => null }));
vi.mock('./InviteMemberModal', () => ({ default: () => null }));
vi.mock('./AddMemberModal', () => ({ default: () => null }));
vi.mock('./AssignUserToOrgModal', () => ({ default: () => null }));
vi.mock('./LinkUserModal', () => ({ default: () => null }));

describe('UsersPage', () => {
  it('renders page title', () => {
    renderWithProviders(<UsersPage />);
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });

  it('renders users table', () => {
    renderWithProviders(<UsersPage />);
    expect(screen.getByText('UsersTable')).toBeInTheDocument();
  });
});

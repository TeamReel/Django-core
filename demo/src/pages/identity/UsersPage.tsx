/**
 * UsersPage — orchestrator.
 * Delegates logic to useUsersData, filters to UsersFilterBar, table to UsersTable.
 */
import { Button, Card } from '@django-core/design-system';
import { PageHeader, BreadcrumbContextSwitcher } from '@django-core/page-templates';
import UserEditModal from './UserEditModal';
import UserDetailModal from './UserDetailModal';
import InviteMemberModal from './InviteMemberModal';
import AddMemberModal from './AddMemberModal';
import up from './UsersPage.module.css';
import AssignUserToOrgModal from './AssignUserToOrgModal';
import LinkUserModal from './LinkUserModal';
import { SkeletonTablePage } from '../../components/Skeleton';
import { useUsersData } from './useUsersData';
import { UsersFilterBar } from './UsersFilterBar';
import { UsersTable } from './UsersTable';

export default function UsersPage() {
  const d = useUsersData();

  if (d.waitingForOrgContext) {
    return <SkeletonTablePage rows={5} columns={4} />;
  }

  return (
    <>
      <PageHeader
        title={
          d.isSuperAdmin
            ? 'All Users (System Admin)'
            : d.orgIdParam
              ? `Users - ${(d.myOrganisations.find(o => o.slug === d.orgIdParam || o.id === d.orgIdParam) || d.context.organisation)?.name || 'Organisation'}`
              : 'All Users'
        }
        subtitle={
          d.isSuperAdmin
            ? 'Manage all users in the system.'
            : d.orgIdParam
              ? 'View members of the current organisation.'
              : 'View all users associated with your organisations and unassigned users.'
        }
        breadcrumbs={d.breadcrumbs}
        actions={
          <UsersFilterBar
            isSuperAdmin={d.isSuperAdmin}
            orgIdParam={d.orgIdParam}
            context={d.context}
            navigate={d.navigate}
            canManageUsers={d.canManageUsers}
            filterState={{
              statusFilter: d.statusFilter,
              setStatusFilter: d.setStatusFilter,
              roleFilter: d.roleFilter,
              setRoleFilter: d.setRoleFilter,
              availableRoles: d.availableRoles,
            }}
            scopeState={{
              selectedOrgId: d.selectedOrgId,
              setSelectedOrgId: d.setSelectedOrgId,
              selectedClubId: d.selectedClubId,
              setSelectedClubId: d.setSelectedClubId,
              setSelectedClubKey: d.setSelectedClubKey,
              selectedTeamId: d.selectedTeamId,
              setSelectedTeamId: d.setSelectedTeamId,
              setSelectedTeamKey: d.setSelectedTeamKey,
            }}
            scopeOptions={{
              organisations: d.organisations,
              myOrganisations: d.myOrganisations,
              clubs: d.clubs,
              teams: d.teams,
            }}
            resetPageToFirst={d.resetPageToFirst}
            setIsAddMemberOpen={d.setIsAddMemberOpen}
          />
        }
      />

      {d.error && (
        <div className={`p-12 rounded-4 mb-24 ${up.errorBanner}`}>
          {d.error}
        </div>
      )}

      {d.isLoading ? (
        <SkeletonTablePage rows={5} columns={4} showFilters={false} />
      ) : (
        <Card>
          <UsersTable
            filteredUsers={d.filteredUsers}
            canManageUsers={d.canManageUsers}
            isSuperAdmin={d.isSuperAdmin}
            navigate={d.navigate}
            orgIdParam={d.orgIdParam}
            context={d.context}
            organisations={d.organisations}
            selectedOrgId={d.selectedOrgId}
            selectedClubKey={d.selectedClubKey}
            selectedTeamKey={d.selectedTeamKey}
            handleEditClick={d.handleEditClick}
            setDetailUser={d.setDetailUser}
            setIsDetailModalOpen={d.setIsDetailModalOpen}
            setAssignUser={d.setAssignUser}
            setIsAssignModalOpen={d.setIsAssignModalOpen}
            setLinkUser={d.setLinkUser}
            setIsLinkModalOpen={d.setIsLinkModalOpen}
            fetchUsers={d.fetchUsers}
          />
        </Card>
      )}

      {/* Pagination */}
      {!d.isLoading && d.total > d.limit && (
        <div className="mt-20 flex-center gap-12">
          <Button variant="secondary" onClick={() => d.handlePageChange(d.currentPage - 1)} disabled={d.currentPage <= 1}>
            Previous
          </Button>
          <span className="fs-14 text-muted">
            Page {d.currentPage} of {d.totalPages} ({d.total} total users)
          </span>
          <Button variant="secondary" onClick={() => d.handlePageChange(d.currentPage + 1)} disabled={d.currentPage >= d.totalPages}>
            Next
          </Button>
        </div>
      )}

      {/* Modals */}
      <UserEditModal
        opened={d.isModalOpen}
        onClose={() => d.setIsModalOpen(false)}
        user={d.editingUser as any}
        onSave={d.handleSaveUser as any}
        onSaved={d.fetchUsers}
        organisationSlug={String(d.orgIdParam || d.context.organisation?.slug || '')}
        scopeProjectKey={String(d.selectedTeamKey || d.selectedClubKey || '')}
      />

      <InviteMemberModal
        opened={d.isInviteModalOpen}
        onClose={() => d.setIsInviteModalOpen(false)}
        orgSlug={d.orgIdParam || d.context.organisation?.slug || ''}
        onInviteSuccess={d.fetchUsers}
      />

      <AddMemberModal
        isOpen={d.isAddMemberOpen}
        onClose={() => d.setIsAddMemberOpen(false)}
        onSuccess={() => { d.fetchUsers(); d.setIsAddMemberOpen(false); }}
        contextLevel={d.selectedTeamKey ? 'team' : d.selectedClubKey ? 'club' : 'organisation'}
        orgSlug={d.orgIdParam || d.context.organisation?.slug || ''}
        clubProjectId={d.selectedClubKey || undefined}
        teamProjectId={d.selectedTeamKey || undefined}
      />

      <AssignUserToOrgModal
        opened={d.isAssignModalOpen}
        onClose={() => d.setIsAssignModalOpen(false)}
        user={d.assignUser as any}
        organisations={d.isSuperAdmin ? d.organisations : d.myOrganisations}
        onSuccess={() => { d.fetchUsers(); d.setIsAssignModalOpen(false); }}
      />

      <LinkUserModal
        opened={d.isLinkModalOpen}
        onClose={() => d.setIsLinkModalOpen(false)}
        user={d.linkUser as any}
        organisations={d.isSuperAdmin ? d.organisations : d.myOrganisations}
        clubs={d.clubs}
        teams={d.teams}
        initialOrganisationSlugOrId={String(d.orgIdParam || d.context.organisation?.slug || '')}
        onSuccess={() => { d.fetchUsers(); d.setIsLinkModalOpen(false); }}
      />

      <UserDetailModal
        opened={d.isDetailModalOpen}
        onClose={() => d.setIsDetailModalOpen(false)}
        user={d.detailUser as any}
      />
    </>
  );
}

import re
import os

backup_file_path = (
    r"c:\Users\brian\Documents\django-core\demo\src\pages\identity\ProjectDetailPage.tsx.bak"
)
target_file_path = (
    r"c:\Users\brian\Documents\django-core\demo\src\pages\identity\ProjectDetailPage.tsx"
)

with open(backup_file_path, "r", encoding="utf-8") as f:
    backup_content = f.read()

# 1. Imports and Component Start
component_start_match = re.search(r"export const ProjectDetailPage", backup_content)
if not component_start_match:
    print("Could not find component start")
    exit(1)

component_start_index = component_start_match.start()
preamble = backup_content[:component_start_index]

# Fix AppShell Import logic - simpler: just append if missing
if "import AppShell from '../../components/AppShell';" not in preamble:
    # Append to imports
    last_import = [m.end() for m in re.finditer(r"import .*?;", preamble)]
    if last_import:
        insert_pos = last_import[-1]
        preamble = (
            preamble[:insert_pos]
            + "\nimport AppShell from '../../components/AppShell';"
            + preamble[insert_pos:]
        )
    else:
        preamble = "import AppShell from '../../components/AppShell';\n" + preamble

# Add fetchAllPages helper - using explicit function syntax
fetch_helper_code = """
async function fetchAllPages<T>(url: string, options: RequestInit = {}): Promise<T[]> {
  let allResults: T[] = [];
  let nextUrl: string | null = url;

  while (nextUrl) {
    const res = await fetch(nextUrl, options);
    if (!res.ok) break;
    const json = await res.json();
    const data = json.data || json;
    const results = data.results || [];
    allResults = [...allResults, ...results];
    nextUrl = data.next;
  }
  return allResults;
}
"""

# Insert validation helper after imports, before styles
# Safest way: Find the end of last import again (in case we modified it)
last_import = [m.end() for m in re.finditer(r"import .*?;", preamble)]
if last_import:
    insert_pos = last_import[-1]
    preamble = preamble[:insert_pos] + "\n" + fetch_helper_code + "\n" + preamble[insert_pos:]
else:
    preamble = fetch_helper_code + "\n" + preamble

# 2. Logic Part
back_path_match = re.search(r"const backPath =", backup_content)
if not back_path_match:
    print("Could not find 'const backPath'")
    exit(1)

return_match_after_backpath = re.search(
    r"return \(\s*<AppShell>", backup_content[back_path_match.start() :]
)
if not return_match_after_backpath:
    print("Could not find return after backPath")
    exit(1)

return_index = back_path_match.start() + return_match_after_backpath.start()

logic_part = backup_content[component_start_index:return_index]

# 3. New Return - Full Implementation
new_return = """
  return (
    <AppShell>
      <div>
        <PageHeader
            title={
              <BreadcrumbContextSwitcher
                organisationOptions={organisationOptions}
                projectOptions={effectiveProjectOptions}
                currentOrganisationId={resolvedOrg?.id ? String(resolvedOrg.id) : undefined}
                currentProjectId={project?.id ? String(project.id) : undefined}
                onOrganisationChange={handleOrganisationSwitch}
                onProjectChange={handleProjectSwitch}
                homePath="/dashboard"
              />
            }
            breadcrumbs={[
              { label: 'Dashboard', onClick: () => navigate('/dashboard') },
              { label: 'Federations', onClick: () => navigate('/organisations') },
              { label: resolvedOrg?.name || 'Federation', onClick: () => navigate(`/organisations/${orgSlugOrId}`) },
              { label: 'Clubs', onClick: () => navigate(clubsListPath) },
              { label: project.name, current: true },
            ]}
            actions={
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="secondary" onClick={() => navigate(backPath)}>
                    Back
                </Button>
                <Button onClick={() => navigate(`${teamOrProjectDetailPath}/edit`)}>
                  Edit Project
                </Button>
              </div>
            }
            tabs={tabs.map(t => ({
              label: t.label,
              active: activeTab === t.id,
              onClick: () => setActiveTab(t.id),
              count: t.id === 'matches' && matchesCount !== null ? matchesCount : undefined
            }))}
        />

        <PageContent>
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                 <Card>
                   <div style={{ padding: '16px' }}>
                     <div style={{ fontSize: '14px', color: 'var(--app-muted-text)' }}>Status</div>
                     <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Badge variant="success">Active</Badge>
                     </div>
                   </div>
                 </Card>
                 <Card>
                   <div style={{ padding: '16px' }}>
                     <div style={{ fontSize: '14px', color: 'var(--app-muted-text)' }}>Members</div>
                     <div style={{ marginTop: '8px', fontSize: '24px', fontWeight: 600 }}>
                        {members.length}
                     </div>
                   </div>
                 </Card>
                 <Card>
                   <div style={{ padding: '16px' }}>
                     <div style={{ fontSize: '14px', color: 'var(--app-muted-text)' }}>Matches</div>
                     <div style={{ marginTop: '8px', fontSize: '24px', fontWeight: 600 }}>
                        {matchesCount ?? '-'}
                     </div>
                   </div>
                 </Card>
              </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                  <Card title="Recent Results">
                    {recentPlayedMatchesLoading ? (
                        <div style={{ padding: '20px' }}>Loading results...</div>
                    ) : recentPlayedMatches.length > 0 ? (
                        <Table style={compactTableStyle}>
                            <thead>
                                <tr>
                                    <th style={compactThStyle}>Date</th>
                                    <th style={compactThStyle}>Match</th>
                                    <th style={compactThStyle}>Result</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentPlayedMatches.map((match: any) => (
                                    <tr key={match.id}>
                                        <td style={compactTdStyle}>{new Date(match.start_time).toLocaleDateString()}</td>
                                        <td style={compactTextTdStyle}>
                                            <Link to={`/activities/${match.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                                                {match.name || 'Untitled Match'}
                                            </Link>
                                        </td>
                                        <td style={compactTdStyle}>
                                            <Badge variant={match.status === 'completed' ? 'neutral' : 'warning'}>{match.status}</Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    ) : (
                        <div style={{ padding: '20px', color: 'var(--app-muted-text)' }}>No recent matches played.</div>
                    )}
                  </Card>
               </div>
            </div>
          )}

          {activeTab === 'people' && (
             <Card>
                <div style={{ padding: '0' }}>
                   <MemberList projectId={project.slug || String(project.id)} initialMembers={members} />
                </div>
             </Card>
          )}

          {activeTab === 'hierarchy' && (
             <Card title={isLikelyTeam ? 'Seasons' : 'Teams / Projects'}>
               {isLikelyTeam ? (
                  seasonsLoading ? <div>Loading seasons...</div> : (
                    <Table style={compactTableStyle}>
                        <thead>
                            <tr>
                                <th style={compactThStyle}>Season Name</th>
                                <th style={compactThStyle}>Status</th>
                                <th style={compactThStyle}>Link</th>
                            </tr>
                        </thead>
                        <tbody>
                            {seasons.map((season: any) => (
                                <tr key={season.id}>
                                    <td style={compactTextTdStyle}>{season.name}</td>
                                    <td style={compactTdStyle}><Badge variant="neutral">{season.status || 'Active'}</Badge></td>
                                    <td style={compactTdStyle}>
                                        <Link to={`${seasonsPath}/${season.slug || season.id}`}>View</Link>
                                    </td>
                                </tr>
                            ))}
                             {seasons.length === 0 && (
                                <tr><td colSpan={3} style={{ padding: '20px', textAlign: 'center' }}>No seasons found.</td></tr>
                            )}
                        </tbody>
                    </Table>
                  )
               ) : (
                  childProjectsLoading ? <div>Loading teams...</div> : (
                     <Table style={compactTableStyle}>
                        <thead>
                            <tr>
                                <th style={compactThStyle}>Name</th>
                                <th style={compactThStyle}>Type</th>
                                <th style={compactThStyle}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {childProjects.map((child: any) => (
                                <tr key={child.id}>
                                    <td style={compactTextTdStyle}>{child.name}</td>
                                    <td style={compactTdStyle}>{child.type || 'Project'}</td>
                                    <td style={compactTdStyle}>
                                         <Link to={`/organisations/${orgSlugOrId}/projects/${child.slug || child.id}`}>View</Link>
                                    </td>
                                </tr>
                            ))}
                            {childProjects.length === 0 && (
                                <tr><td colSpan={3} style={{ padding: '20px', textAlign: 'center' }}>No child projects found.</td></tr>
                            )}
                        </tbody>
                    </Table>
                  )
               )}
             </Card>
          )}

          {activeTab === 'matches' && (
             <Card title="All Matches">
                {allMatchesLoading ? <div>Loading matches...</div> : (
                     <Table style={compactTableStyle}>
                        <thead>
                            <tr>
                                <th style={compactThStyle}>Date</th>
                                <th style={compactThStyle}>Name</th>
                                <th style={compactThStyle}>Location</th>
                                <th style={compactThStyle}>Format</th>
                                <th style={compactThStyle}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allMatches.map((m: any) => (
                                <tr key={m.id}>
                                    <td style={compactTdStyle}>{m.start_time ? new Date(m.start_time).toLocaleDateString() : '-'}</td>
                                    <td style={compactTextTdStyle}>{m.name}</td>
                                    <td style={compactTextTdStyle}>{m.location || '-'}</td>
                                    <td style={compactTdStyle}>{m.format || '-'}</td>
                                    <td style={compactTdStyle}>
                                        <Link to={`/activities/${m.id}`}>View</Link>
                                    </td>
                                </tr>
                            ))}
                            {allMatches.length === 0 && <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center' }}>No matches found.</td></tr>}
                        </tbody>
                    </Table>
                )}
             </Card>
          )}

          {activeTab === 'audit' && (
             <Card title="Audit Log">
                <Table style={compactTableStyle}>
                    <thead>
                        <tr>
                            <th style={compactThStyle}>Event</th>
                            <th style={compactThStyle}>User</th>
                            <th style={compactThStyle}>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentEvents.map((evt: any) => (
                            <tr key={evt.id}>
                                <td style={compactTextTdStyle}>{evt.action}</td>
                                <td style={compactTdStyle}>{evt.actor?.email || evt.actor_id}</td>
                                <td style={compactTdStyle}>{new Date(evt.created_at).toLocaleString()}</td>
                            </tr>
                        ))}
                         {recentEvents.length === 0 && <tr><td colSpan={3} style={{ padding: '20px', textAlign: 'center' }}>No recorded events.</td></tr>}
                    </tbody>
                </Table>
             </Card>
          )}
        </PageContent>
      </div>
    </AppShell>
  );
};

export default ProjectDetailPage;
"""

final_content = preamble + logic_part + new_return

with open(target_file_path, "w", encoding="utf-8") as f:
    f.write(final_content)

print("Successfully rebuilt ProjectDetailPage.tsx (Attempt 4)")

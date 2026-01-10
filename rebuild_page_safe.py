import os

backup_file_path = (
    r"c:\Users\brian\Documents\django-core\demo\src\pages\identity\ProjectDetailPage.tsx.bak"
)
target_file_path = (
    r"c:\Users\brian\Documents\django-core\demo\src\pages\identity\ProjectDetailPage.tsx"
)

with open(backup_file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find component start line
component_start_line = -1
for i, line in enumerate(lines):
    if "export const ProjectDetailPage" in line:
        component_start_line = i
        break

if component_start_line == -1:
    print("Component start not found")
    exit(1)

# Preamble is lines before component start
preamble_lines = lines[:component_start_line]

# Check for AppShell import
has_appshell = any("import AppShell" in line for line in preamble_lines)
if not has_appshell:
    # Find last import
    last_import_idx = -1
    for i, line in enumerate(preamble_lines):
        if line.strip().startswith("import "):
            last_import_idx = i

    if last_import_idx != -1:
        preamble_lines.insert(
            last_import_idx + 1, "import AppShell from '../../components/AppShell';\n"
        )
    else:
        preamble_lines.insert(0, "import AppShell from '../../components/AppShell';\n")

# Add fetchAllPages helper
fetch_helper_lines = [
    "\n",
    "async function fetchAllPages<T>(url: string, options: RequestInit = {}): Promise<T[]> {\n",
    "  let allResults: T[] = [];\n",
    "  let nextUrl: string | null = url;\n",
    "\n",
    "  while (nextUrl) {\n",
    "    const res = await fetch(nextUrl, options);\n",
    "    if (!res.ok) break;\n",
    "    const json = await res.json();\n",
    "    const data = json.data || json;\n",
    "    const results = data.results || [];\n",
    "    allResults = [...allResults, ...results];\n",
    "    nextUrl = data.next;\n",
    "  }\n",
    "  return allResults;\n",
    "}\n",
    "\n",
]

# Insert helper after last import
last_import_idx = -1
for i, line in enumerate(preamble_lines):
    if line.strip().startswith("import "):
        last_import_idx = i

if last_import_idx != -1:
    preamble_lines[last_import_idx + 1 : last_import_idx + 1] = fetch_helper_lines
else:
    preamble_lines[0:0] = fetch_helper_lines


# Logic Part
# From component_start_line until "const backPath =" + return
back_path_idx = -1
for i in range(component_start_line, len(lines)):
    if "const backPath =" in lines[i]:
        back_path_idx = i
        break

if back_path_idx == -1:
    print("backPath not found")
    exit(1)

# Find return after backPath
return_idx = -1
for i in range(back_path_idx, len(lines)):
    if "return (" in lines[i] and "<AppShell>" in lines[i + 1]:  # Heuristic based on backup
        return_idx = i
        break
    if "return (" in lines[i]:  # Simple check
        # Check next few lines for AppShell
        if any("<AppShell>" in lines[j] for j in range(i, min(i + 5, len(lines)))):
            return_idx = i
            break

if return_idx == -1:
    # Try just "return ("
    for i in range(back_path_idx, len(lines)):
        if "return (" in lines[i]:
            return_idx = i
            break

if return_idx == -1:
    print("Return statement not found")
    exit(1)

logic_lines = lines[component_start_line:return_idx]

# New Return
new_return_code = """
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

final_lines = preamble_lines + logic_lines + [new_return_code]

with open(target_file_path, "w", encoding="utf-8") as f:
    f.writelines(final_lines)

print("Successfully rebuilt ProjectDetailPage.tsx (Safe)")

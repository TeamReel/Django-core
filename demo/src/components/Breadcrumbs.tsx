import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, matchPath } from 'react-router-dom';
import { useAppSelection } from '../hooks/useAppSelection';
import { useContextSwitcher } from '@django-core/context-switcher';
import { BreadcrumbContextSwitcher, type BreadcrumbSwitcherOption } from '@django-core/page-templates';

export default function Breadcrumbs() {
  const location = useLocation();
  const navigate = useNavigate();
  const { context, organisations } = useContextSwitcher();
  const {
    orgSlug,
    clubSlugOrId, clubName,
    teamSlugOrId, teamName,
    seasonSlugOrId, seasonName,
    competitionSlugOrId, competitionName,
    matchId
  } = useAppSelection();

  const isOrganisationsRoute = location.pathname.startsWith('/organisations/');

  const clubDetailMatch =
    matchPath({ path: '/organisations/:orgId/:projectId', end: true }, location.pathname) ||
    matchPath({ path: '/:orgId/:projectId', end: true }, location.pathname);

  const teamDetailMatch =
    matchPath({ path: '/organisations/:orgId/:clubId/:projectId', end: true }, location.pathname) ||
    matchPath({ path: '/:orgId/:clubId/:projectId', end: true }, location.pathname);

  const orgDetailMatch =
    matchPath({ path: '/organisations/:id', end: true }, location.pathname) ||
    matchPath({ path: '/organisations/:orgId', end: true }, location.pathname) ||
    matchPath({ path: '/:orgId', end: true }, location.pathname);

  const isClubDetail = Boolean(clubDetailMatch && !teamDetailMatch);
  const isTeamDetail = Boolean(teamDetailMatch);

  const orgParam = String(
    (orgDetailMatch?.params as any)?.orgId || (orgDetailMatch?.params as any)?.id || ''
  ).trim();

  const reservedTopLevel = useMemo(
    () =>
      new Set(
        [
          'dashboard',
          'directory',
          'search',
          'matches',
          'clubs',
          'teams',
          'seasons',
          'competitions',
          'federations',
          'content',
          'studio',
          'docs',
          'constitution',
          'health',
          'permissions',
          'login',
          'register',
        ].map((s) => s.toLowerCase())
      ),
    []
  );

  const orgFromList = useMemo(() => {
    const key = orgParam.toLowerCase();
    if (!key) return undefined;
    return (organisations || []).find((o: any) => {
      const slug = String(o?.slug || '').toLowerCase();
      const id = String(o?.id || '').toLowerCase();
      return slug === key || id === key;
    });
  }, [organisations, orgParam]);

  const isOrgDetail = Boolean(
    orgDetailMatch &&
      !isClubDetail &&
      !isTeamDetail &&
      orgParam &&
      (!reservedTopLevel.has(orgParam.toLowerCase()) || Boolean(orgFromList))
  );

  const [clubOptions, setClubOptions] = useState<BreadcrumbSwitcherOption[]>([]);
  const [teamOptions, setTeamOptions] = useState<BreadcrumbSwitcherOption[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // For club/team detail pages: fetch switcher options (clubs under org; teams under club)
  useEffect(() => {
    const effectiveOrg = String(orgSlug || '').trim();
    if (!effectiveOrg) return;

    const fetchClubs = async () => {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const res = await fetch(
          `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(effectiveOrg)}/projects/?page_size=250&parent_project__isnull=true`,
          { headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include' }
        );
        if (!res.ok) return;
        const raw = await res.json();
        const data = raw?.data || raw;
        const results = data?.results || data?.data?.results || [];
        setClubOptions(
          (results || []).map((p: any) => ({
            id: String(p.id),
            label: String(p.name || p.slug || p.id),
            slug: String(p.slug || p.id),
          }))
        );
      } catch {
        // ignore
      }
    };

    fetchClubs();
  }, [orgSlug]);

  useEffect(() => {
    const effectiveOrg = String(orgSlug || '').trim();
    const effectiveClub = String(clubSlugOrId || '').trim();
    if (!isTeamDetail) return;
    if (!effectiveOrg || !effectiveClub) return;

    const fetchTeams = async () => {
      setLoadingTeams(true);
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        // Fetch child projects (teams) for this club.
        const res = await fetch(
          `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(effectiveOrg)}/projects/?page_size=500&parent_project=${encodeURIComponent(effectiveClub)}`,
          { headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include' }
        );
        if (!res.ok) return;
        const raw = await res.json();
        const data = raw?.data || raw;
        const results = data?.results || data?.data?.results || [];
        setTeamOptions(
          (results || []).map((p: any) => ({
            id: String(p.id),
            label: String(p.name || p.slug || p.id),
            slug: String(p.slug || p.id),
          }))
        );
      } catch {
        // ignore
      } finally {
        setLoadingTeams(false);
      }
    };

    fetchTeams();
  }, [isTeamDetail, orgSlug, clubSlugOrId]);

  // Build the context chain
  const items: Array<{ label: React.ReactNode; path: string; isLeaf?: boolean }> = [];

  const dash = { label: 'Dashboard', path: '/dashboard' };

  const orgPath = orgSlug
    ? (isOrganisationsRoute ? `/organisations/${orgSlug}` : `/${orgSlug}`)
    : '/dashboard';

  if (isOrgDetail) {
    const options: BreadcrumbSwitcherOption[] = (organisations || []).map((o: any) => ({
      id: String(o.id),
      label: String(o.name || o.slug || o.id),
      slug: String(o.slug || o.id),
    }));

    const resolvedCurrent = orgFromList || (organisations || []).find((o: any) => String(o?.id || '') === String((context as any)?.organisation?.id || ''));
    const currentId = String(resolvedCurrent?.id || (context as any)?.organisation?.id || orgParam || orgSlug || '').trim();

    const handleOrgSwitch = (option: BreadcrumbSwitcherOption) => {
      const next = String(option.slug || option.id);
      navigate(isOrganisationsRoute ? `/organisations/${next}` : `/${next}`);
    };

    const crumbs: Array<{ label: React.ReactNode; path: string }> = [
      { label: 'Dashboard', path: '/dashboard' },
      {
        label: (
          <BreadcrumbContextSwitcher
            currentId={currentId || String(orgParam || orgSlug || '')}
            options={options}
            onSelect={handleOrgSwitch}
            hasDropdown={options.length > 1}
            type="organisation"
            current
          />
        ),
        path: isOrganisationsRoute ? `/organisations/${orgParam || orgSlug}` : `/${orgParam || orgSlug}`,
      },
    ];

    return (
      <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center' }}>
        <ol
          style={{
            display: 'flex',
            listStyle: 'none',
            padding: 0,
            margin: 0,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {crumbs.map((item, index) => (
            <li key={`${index}:${item.path}`} style={{ display: 'flex', alignItems: 'center' }}>
              {index > 0 && (
                <span style={{ margin: '0 8px', color: 'var(--app-muted-text)', fontSize: '14px' }}>/</span>
              )}
              {typeof item.label === 'string' ? (
                <Link
                  to={item.path}
                  style={{
                    color: index === crumbs.length - 1 ? 'var(--app-text)' : 'var(--app-muted-text)',
                    textDecoration: 'none',
                    fontSize: '14px',
                    whiteSpace: 'nowrap',
                    fontWeight: index === crumbs.length - 1 ? 600 : 400,
                  }}
                >
                  {item.label}
                </Link>
              ) : (
                item.label
              )}
            </li>
          ))}
        </ol>
      </nav>
    );
  }

  // Detail pages first: render a canonical breadcrumb trail matching the actual page.
  if (isClubDetail || isTeamDetail) {
    items.push(dash);

    if (orgSlug) {
      const orgName = context?.organisation?.name || orgSlug;
      items.push({ label: orgName, path: orgPath });
    }

    if (isTeamDetail) {
      // Club crumb (static link)
      if (clubSlugOrId) {
        const clubPath = isOrganisationsRoute
          ? `/organisations/${orgSlug}/${clubSlugOrId}`
          : `/${orgSlug}/${clubSlugOrId}`;
        items.push({ label: clubName || clubSlugOrId, path: clubPath });
      }

      // Team crumb with switcher
      const currentTeamId = String(teamSlugOrId || '').trim();
      if (currentTeamId) {
        const teamPath = isOrganisationsRoute
          ? `/organisations/${orgSlug}/${clubSlugOrId}/${currentTeamId}`
          : `/${orgSlug}/${clubSlugOrId}/${currentTeamId}`;

        const options = [...teamOptions];
        if (!options.some((o) => String(o.slug || o.id) === currentTeamId)) {
          options.push({ id: currentTeamId, slug: currentTeamId, label: teamName || currentTeamId });
        }

        const handleTeamSwitch = (option: BreadcrumbSwitcherOption) => {
          const next = String(option.slug || option.id);
          navigate(isOrganisationsRoute ? `/organisations/${orgSlug}/${clubSlugOrId}/${next}` : `/${orgSlug}/${clubSlugOrId}/${next}`);
        };

        items.push({
          label: (
            <BreadcrumbContextSwitcher
              currentId={currentTeamId}
              options={options}
              onSelect={handleTeamSwitch}
              hasDropdown={!loadingTeams && options.length > 1}
              type="project"
              current
            />
          ),
          path: teamPath,
        });
      }

      return (
        <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center' }}>
          <ol
            style={{
              display: 'flex',
              listStyle: 'none',
              padding: 0,
              margin: 0,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            {items.map((item, index) => {
              const isLast = index === items.length - 1;
              return (
                <li key={`${index}:${item.path}`} style={{ display: 'flex', alignItems: 'center' }}>
                  {index > 0 && (
                    <span style={{ margin: '0 8px', color: 'var(--app-muted-text)', fontSize: '14px' }}>/</span>
                  )}
                  {typeof item.label === 'string' ? (
                    <Link
                      to={item.path}
                      style={{
                        color: isLast ? 'var(--app-text)' : 'var(--app-muted-text)',
                        textDecoration: 'none',
                        fontSize: '14px',
                        whiteSpace: 'nowrap',
                        fontWeight: isLast ? 600 : 400,
                      }}
                      aria-current={isLast ? 'page' : undefined}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    item.label
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      );
    }

    // Club detail
    const currentClubId = String(clubSlugOrId || '').trim();
    if (currentClubId) {
      const clubPath = isOrganisationsRoute ? `/organisations/${orgSlug}/${currentClubId}` : `/${orgSlug}/${currentClubId}`;
      const options = [...clubOptions];
      if (!options.some((o) => String(o.slug || o.id) === currentClubId)) {
        options.push({ id: currentClubId, slug: currentClubId, label: clubName || currentClubId });
      }
      const handleClubSwitch = (option: BreadcrumbSwitcherOption) => {
        const next = String(option.slug || option.id);
        navigate(isOrganisationsRoute ? `/organisations/${orgSlug}/${next}` : `/${orgSlug}/${next}`);
      };
      items.push({
        label: (
          <BreadcrumbContextSwitcher
            currentId={currentClubId}
            options={options}
            onSelect={handleClubSwitch}
            hasDropdown={options.length > 1}
            type="project"
            current
          />
        ),
        path: clubPath,
      });
    }

    return (
      <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center' }}>
        <ol
          style={{
            display: 'flex',
            listStyle: 'none',
            padding: 0,
            margin: 0,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li key={`${index}:${item.path}`} style={{ display: 'flex', alignItems: 'center' }}>
                {index > 0 && (
                  <span style={{ margin: '0 8px', color: 'var(--app-muted-text)', fontSize: '14px' }}>/</span>
                )}
                {typeof item.label === 'string' ? (
                  <Link
                    to={item.path}
                    style={{
                      color: isLast ? 'var(--app-text)' : 'var(--app-muted-text)',
                      textDecoration: 'none',
                      fontSize: '14px',
                      whiteSpace: 'nowrap',
                      fontWeight: isLast ? 600 : 400,
                    }}
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                ) : (
                  item.label
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }

  // Level 1: Club
  if (clubSlugOrId) {
    items.push({
        label: clubName || clubSlugOrId,
        path: `/organisations/${orgSlug}/projects/${clubSlugOrId}`
    });
  }

  // Level 2: Team
  if (teamSlugOrId) {
    items.push({
        label: teamName || teamSlugOrId,
        path: `/organisations/${orgSlug}/projects/${clubSlugOrId}/teams/${teamSlugOrId}`
    });
  }

  // Level 3: Season
  if (seasonSlugOrId) {
    items.push({
        label: seasonName || seasonSlugOrId,
        path: `/organisations/${orgSlug}/projects/${clubSlugOrId}/teams/${teamSlugOrId}/seasons/${seasonSlugOrId}`
    });
  }

  // Level 4: Competition
  if (competitionSlugOrId) {
    items.push({
        label: competitionName || competitionSlugOrId,
        path: `/organisations/${orgSlug}/projects/${clubSlugOrId}/teams/${teamSlugOrId}/seasons/${seasonSlugOrId}/competitions/${competitionSlugOrId}`
    });
  }

  // Level 5: Match
  if (matchId) {
    items.push({
        label: `Match ${matchId}`, // Todo: fetch match name/details if possible
        path: `/organisations/${orgSlug}/projects/${clubSlugOrId}/teams/${teamSlugOrId}/seasons/${seasonSlugOrId}/competitions/${competitionSlugOrId}/matches/${matchId}`
    });
  }

  // Handle "Members" leaf explicitly as requested
  // "Show 'Members' under Season context"
  if (seasonSlugOrId && location.pathname.endsWith('/members')) {
      items.push({
          label: 'Members',
          path: location.pathname, // Current page
          isLeaf: true
      });
  }

  // Work Hierarchy generic pages
  if (items.length === 0) {
      if (location.pathname === '/directory') items.push({ label: 'Directory', path: '/directory' });
      else if (location.pathname === '/federations') items.push({ label: 'Directory', path: '/directory' }, { label: 'Federations', path: '/federations' });
      else if (location.pathname === '/clubs') items.push({ label: 'Directory', path: '/directory' }, { label: 'Clubs', path: '/clubs' });
      else if (location.pathname === '/teams') items.push({ label: 'Directory', path: '/directory' }, { label: 'Teams', path: '/teams' });
      else if (location.pathname === '/seasons') items.push({ label: 'Directory', path: '/directory' }, { label: 'Seasons', path: '/seasons' });
      else if (location.pathname === '/competitions') items.push({ label: 'Directory', path: '/directory' }, { label: 'Competitions', path: '/competitions' });
      else if (location.pathname === '/matches') items.push({ label: 'Directory', path: '/directory' }, { label: 'Matches', path: '/matches' });
  }

  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center' }}>
      <ol style={{
          display: 'flex',
          listStyle: 'none',
          padding: 0,
          margin: 0,
          alignItems: 'center',
          flexWrap: 'wrap'
      }}>
        {items.map((item, index) => {
           const isLast = index === items.length - 1;
           return (
            <li key={item.path} style={{ display: 'flex', alignItems: 'center' }}>
                {index > 0 && (
                    <span style={{
                        margin: '0 8px',
                        color: 'var(--app-muted-text)',
                        fontSize: '14px'
                    }}>/</span>
                )}
                <Link
                    to={item.path}
                    style={{
                        color: isLast ? 'var(--app-text)' : 'var(--app-muted-text)',
                        textDecoration: 'none',
                        fontSize: '14px',
                        whiteSpace: 'nowrap',
                        fontWeight: isLast ? 600 : 400
                    }}
                    aria-current={isLast ? 'page' : undefined}
                >
                    {item.label}
                </Link>
            </li>
           );
        })}
      </ol>
    </nav>
  );
}

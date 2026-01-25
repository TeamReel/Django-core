import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, matchPath } from 'react-router-dom';
import { useAppSelection } from '../hooks/useAppSelection';
import { useContextSwitcher } from '@django-core/context-switcher';
import { BreadcrumbContextSwitcher, type BreadcrumbSwitcherOption } from '@django-core/page-templates';
import { fetchAllPages } from '../utils/fetchAllPages';
import { periodPathKey } from '../utils/periodPath';

const getPeriodType = (p: any): string => {
  const t = p?.type ?? p?.data?.type ?? p?.metadata?.type;
  return String(t || '').toLowerCase();
};

const getPeriodParentId = (p: any): string => {
  const parentId = p?.parent_period_id ?? p?.parent_period?.id ?? null;
  return parentId ? String(parentId) : '';
};

const isSeasonPeriod = (p: any): boolean => {
  const parentId = getPeriodParentId(p);
  if (parentId) return false;

  const type = getPeriodType(p);
  if (type === 'season') return true;
  if (['competition', 'league', 'cup', 'friendly', 'tournament', 'round'].includes(type)) return false;
  return true;
};

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

  const orgSubpageMatch =
    matchPath({ path: '/organisations/:orgId/:section', end: true }, location.pathname) ||
    matchPath({ path: '/:orgId/:section', end: true }, location.pathname);

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

  const isOrgLevelRoute = Boolean(orgDetailMatch && !isClubDetail && !isTeamDetail);
  const effectiveClubSlugOrId = isOrgLevelRoute ? '' : clubSlugOrId;
  const effectiveClubName = isOrgLevelRoute ? '' : clubName;
  const effectiveTeamSlugOrId = isOrgLevelRoute ? '' : teamSlugOrId;
  const effectiveTeamName = isOrgLevelRoute ? '' : teamName;
  const effectiveSeasonSlugOrId = isOrgLevelRoute ? '' : seasonSlugOrId;
  const effectiveSeasonName = isOrgLevelRoute ? '' : seasonName;
  const effectiveCompetitionSlugOrId = isOrgLevelRoute ? '' : competitionSlugOrId;
  const effectiveCompetitionName = isOrgLevelRoute ? '' : competitionName;
  const effectiveMatchId = isOrgLevelRoute ? '' : matchId;

  const orgSubpage = useMemo(() => {
    const orgId = String((orgSubpageMatch?.params as any)?.orgId || '').trim();
    const section = String((orgSubpageMatch?.params as any)?.section || '').trim().toLowerCase();
    const allowed = new Set(['clubs', 'teams', 'seasons', 'competitions', 'matches', 'users']);
    if (!orgId || !allowed.has(section)) return null;
    return { orgId, section };
  }, [orgSubpageMatch]);

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

  const [seasonOptions, setSeasonOptions] = useState<BreadcrumbSwitcherOption[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(false);

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
      setTeamOptions([]);
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

        // clubSlugOrId can be a slug; this endpoint filter expects an id.
        const resolvedClub = (clubOptions || []).find((o) => {
          const slug = String(o?.slug || '').trim();
          const id = String(o?.id || '').trim();
          return slug === effectiveClub || id === effectiveClub;
        });
        const clubIdForQuery = String(resolvedClub?.id || effectiveClub).trim();

        // Fetch child projects (teams) for this club.
        const res = await fetch(
          `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(effectiveOrg)}/projects/?page_size=1000&parent_project=${encodeURIComponent(clubIdForQuery)}`,
          { headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include' }
        );
        if (!res.ok) return;
        const raw = await res.json();
        const data = raw?.data || raw;
        const results = data?.results || data?.data?.results || [];

        // Defensive filtering: some backends ignore unknown parent_project filters (e.g. when passed a slug).
        const onlyThisClub = (Array.isArray(results) ? results : []).filter((p: any) => {
          const parent =
            p?.parent_id ??
            p?.parent_project_id ??
            (typeof p?.parent_project === 'object' ? p?.parent_project?.id : p?.parent_project) ??
            (typeof p?.parent === 'object' ? p?.parent?.id : p?.parent);
          const parentId = parent == null ? '' : String(typeof parent === 'object' ? parent.id : parent);
          return parentId && parentId === clubIdForQuery;
        });

        setTeamOptions(
          (onlyThisClub || []).map((p: any) => ({
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
  }, [isTeamDetail, orgSlug, clubSlugOrId, clubOptions]);

  // Season breadcrumb switcher (for season detail routes)
  useEffect(() => {
    const effectiveOrg = String(orgSlug || '').trim();
    const effectiveTeam = String(effectiveTeamSlugOrId || '').trim();
    const effectiveSeason = String(effectiveSeasonSlugOrId || '').trim();

    if (!effectiveOrg || !effectiveTeam || !effectiveSeason) {
      setSeasonOptions([]);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setLoadingSeasons(true);
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

        const projectRes = await fetch(
          `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(effectiveOrg)}/projects/${encodeURIComponent(effectiveTeam)}/`,
          { headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include' }
        );
        if (!projectRes.ok) return;
        const rawProject: any = await projectRes.json();
        const projectJson: any = rawProject?.data || rawProject;
        const projectId = String(projectJson?.id || '').trim();
        if (!projectId) return;

        const rootPeriodsUrl = `${apiBaseUrl}/api/v1/periods/?project_id=${encodeURIComponent(projectId)}&parent_id=null&page_size=500`;
        const rootPeriods = await fetchAllPages<any>(
          rootPeriodsUrl,
          { credentials: 'include' },
          { ttlMs: 60_000, cacheKey: `periods:root:breadcrumb:${projectId}` }
        );

        const seasons = (rootPeriods || []).filter(isSeasonPeriod);
        const opts: BreadcrumbSwitcherOption[] = (seasons || []).map((p: any) => ({
          id: String(p.id),
          label: String(p.name || p.slug || p.id),
          slug: periodPathKey(p) || String(p.id),
        }));

        if (!cancelled) setSeasonOptions(opts);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingSeasons(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [orgSlug, effectiveTeamSlugOrId, effectiveSeasonSlugOrId]);

  // Build the context chain
  const items: Array<{ label: React.ReactNode; path: string; isLeaf?: boolean }> = [];

  const dash = { label: 'Dashboard', path: '/dashboard' };

  const orgPath = orgSlug
    ? `/${orgSlug}`
    : '/dashboard';

  if (orgSubpage) {
    const options: BreadcrumbSwitcherOption[] = (organisations || []).map((o: any) => ({
      id: String(o.id),
      label: String(o.name || o.slug || o.id),
      slug: String(o.slug || o.id),
    }));

    const resolvedCurrent =
      (organisations || []).find((o: any) => String(o?.slug || '').toLowerCase() === orgSubpage.orgId.toLowerCase()) ||
      (organisations || []).find((o: any) => String(o?.id || '').toLowerCase() === orgSubpage.orgId.toLowerCase()) ||
      (organisations || []).find((o: any) => String(o?.id || '') === String((context as any)?.organisation?.id || ''));

    const currentId = String(resolvedCurrent?.id || (context as any)?.organisation?.id || orgSubpage.orgId || '').trim();

    const handleOrgSwitch = (option: BreadcrumbSwitcherOption) => {
      const next = String(option.slug || option.id);
      navigate(`/${next}${location.search || ''}`);
    };

    const orgPath = `/${encodeURIComponent(orgSubpage.orgId)}`;

    const crumbs: Array<{ label: React.ReactNode; path: string }> = [
      { label: 'Dashboard', path: '/dashboard' },
      {
        label: (
          <BreadcrumbContextSwitcher
            currentId={currentId || String(orgSubpage.orgId)}
            options={options}
            onSelect={handleOrgSwitch}
            hasDropdown={options.length > 1}
            type="organisation"
            current
          />
        ),
        path: orgPath,
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
      navigate(`/${next}${location.search || ''}`);
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
        path: `/${orgParam || orgSlug}`,
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
        const clubPath = `/${orgSlug}/${clubSlugOrId}`;
        items.push({ label: clubName || clubSlugOrId, path: clubPath });
      }

      // Team crumb with switcher
      const currentTeamId = String(teamSlugOrId || '').trim();
      if (currentTeamId) {
        const teamPath = `/${orgSlug}/${clubSlugOrId}/${currentTeamId}`;

        const options = [...teamOptions];
        if (!options.some((o) => String(o.slug || o.id) === currentTeamId)) {
          options.push({ id: currentTeamId, slug: currentTeamId, label: teamName || currentTeamId });
        }

        const handleTeamSwitch = (option: BreadcrumbSwitcherOption) => {
          const next = String(option.slug || option.id);
            navigate(`/${orgSlug}/${clubSlugOrId}/${next}${location.search || ''}`);
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
      const clubPath = `/${orgSlug}/${currentClubId}`;
      const options = [...clubOptions];
      if (!options.some((o) => String(o.slug || o.id) === currentClubId)) {
        options.push({ id: currentClubId, slug: currentClubId, label: clubName || currentClubId });
      }
      const handleClubSwitch = (option: BreadcrumbSwitcherOption) => {
        const next = String(option.slug || option.id);
        navigate(`/${orgSlug}/${next}${location.search || ''}`);
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
  if (effectiveClubSlugOrId) {
    items.push({
        label: effectiveClubName || effectiveClubSlugOrId,
        path: `/${orgSlug}/${effectiveClubSlugOrId}`
    });
  }

  // Level 2: Team
  if (effectiveTeamSlugOrId) {
    items.push({
        label: effectiveTeamName || effectiveTeamSlugOrId,
        path: `/${orgSlug}/${effectiveClubSlugOrId}/${effectiveTeamSlugOrId}`
    });
  }

  // Level 3: Season
  if (effectiveSeasonSlugOrId) {
    const seasonPath = isOrganisationsRoute
      ? `/organisations/${orgSlug}/projects/${effectiveClubSlugOrId}/teams/${effectiveTeamSlugOrId}/seasons/${effectiveSeasonSlugOrId}`
      : `/${orgSlug}/${effectiveClubSlugOrId}/${effectiveTeamSlugOrId}/${effectiveSeasonSlugOrId}`;

    const currentSeasonKey = String(effectiveSeasonSlugOrId || '').trim();
    const options = [...seasonOptions];
    if (currentSeasonKey && !options.some((o) => String(o.slug || o.id) === currentSeasonKey)) {
      options.push({ id: currentSeasonKey, slug: currentSeasonKey, label: effectiveSeasonName || currentSeasonKey });
    }

    const handleSeasonSwitch = (option: BreadcrumbSwitcherOption) => {
      const next = String(option.slug || option.id);
      const nextPath = isOrganisationsRoute
        ? `/organisations/${orgSlug}/projects/${effectiveClubSlugOrId}/teams/${effectiveTeamSlugOrId}/seasons/${next}`
        : `/${orgSlug}/${effectiveClubSlugOrId}/${effectiveTeamSlugOrId}/${next}`;
      navigate(`${nextPath}${location.search || ''}`);
    };

    const shouldRenderSwitcher =
      Boolean(currentSeasonKey) &&
      !effectiveCompetitionSlugOrId &&
      !effectiveMatchId;

    items.push({
      label: shouldRenderSwitcher ? (
        <BreadcrumbContextSwitcher
          currentId={currentSeasonKey}
          options={options}
          onSelect={handleSeasonSwitch}
          hasDropdown={!loadingSeasons && options.length > 1}
          type="project"
          current
        />
      ) : (
        effectiveSeasonName || currentSeasonKey
      ),
      path: seasonPath,
    });
  }

  // Level 4: Competition
  if (effectiveCompetitionSlugOrId) {
    items.push({
        label: effectiveCompetitionName || effectiveCompetitionSlugOrId,
        path: `/${orgSlug}/${effectiveClubSlugOrId}/${effectiveTeamSlugOrId}/${effectiveSeasonSlugOrId}/${effectiveCompetitionSlugOrId}`
    });
  }

  // Level 5: Match
  if (effectiveMatchId) {
    items.push({
        label: `Match ${effectiveMatchId}`, // Todo: fetch match name/details if possible
        path: `/organisations/${orgSlug}/projects/${effectiveClubSlugOrId}/teams/${effectiveTeamSlugOrId}/seasons/${effectiveSeasonSlugOrId}/competitions/${effectiveCompetitionSlugOrId}/matches/${effectiveMatchId}`
    });
  }

  // Handle "Members" leaf explicitly as requested
  // "Show 'Members' under Season context"
    if (effectiveSeasonSlugOrId && location.pathname.endsWith('/members')) {
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

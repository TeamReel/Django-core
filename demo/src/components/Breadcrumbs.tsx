/**
 * Breadcrumbs — Orchestrator component.
 * Uses useBreadcrumbsData for data fetching and BreadcrumbNav for rendering.
 * Handles route matching and builds crumbs arrays for each page type.
 */
import React, { useMemo } from 'react';
import { useLocation, useNavigate, matchPath } from 'react-router-dom';
import { useAppSelection } from '../hooks/useAppSelection';
import { useContextSwitcher } from '@django-core/context-switcher';
import { BreadcrumbContextSwitcher, type BreadcrumbSwitcherOption } from '@django-core/page-templates';
import { useBreadcrumbsData } from './useBreadcrumbsData';
import { BreadcrumbNav, type BreadcrumbItem } from './BreadcrumbNav';

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

  // ─── Route matching ───
  const userDetailMatch =
    matchPath({ path: '/users/:userId', end: true }, location.pathname) ||
    matchPath({ path: '/organisations/:orgId/users/:userId', end: true }, location.pathname);

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
    const orgId = String(orgSubpageMatch?.params?.orgId || '').trim();
    const section = String(orgSubpageMatch?.params?.section || '').trim().toLowerCase();
    const allowed = new Set(['clubs', 'teams', 'seasons', 'competitions', 'matches', 'users']);
    if (!orgId || !allowed.has(section)) return null;
    return { orgId, section };
  }, [orgSubpageMatch]);

  const orgParam = String(
    (orgDetailMatch?.params as Record<string, string | undefined>)?.orgId || (orgDetailMatch?.params as Record<string, string | undefined>)?.id || ''
  ).trim();

  const reservedTopLevel = useMemo(
    () => new Set(
      ['dashboard', 'directory', 'search', 'matches', 'users', 'clubs', 'teams',
       'seasons', 'competitions', 'federations', 'content', 'studio', 'docs',
       'constitution', 'health', 'permissions', 'login', 'register'].map((s) => s.toLowerCase())
    ), []
  );

  const orgFromList = useMemo(() => {
    const key = orgParam.toLowerCase();
    if (!key) return undefined;
    return (organisations || []).find((o) => {
      const slug = String(o?.slug || '').toLowerCase();
      const id = String(o?.id || '').toLowerCase();
      return slug === key || id === key;
    });
  }, [organisations, orgParam]);

  const isOrgDetail = Boolean(
    orgDetailMatch && !isClubDetail && !isTeamDetail && orgParam &&
    (!reservedTopLevel.has(orgParam.toLowerCase()) || Boolean(orgFromList))
  );

  // ─── Data hook ───
  const data = useBreadcrumbsData({
    orgSlug,
    clubSlugOrId,
    isTeamDetail,
    effectiveTeamSlugOrId,
    effectiveSeasonSlugOrId,
    effectiveCompetitionSlugOrId,
    effectiveMatchId,
    userDetailUserId: String(userDetailMatch?.params?.userId || '').trim(),
  });

  const orgPath = orgSlug ? `/${orgSlug}` : '/dashboard';

  // ═══════════════════════════════════════════
  // User detail route
  // ═══════════════════════════════════════════
  if (userDetailMatch?.params?.userId) {
    const isStandaloneUserRoute = location.pathname.startsWith('/users/');
    const currentUserId = String(userDetailMatch.params?.userId || '').trim();
    const ctxOrgKey = String(context?.organisation?.slug || context?.organisation?.id || '').trim();
    const ctxOrgName = String(context?.organisation?.name || '').trim();
    const options = [...data.userOptions];
    if (currentUserId && !options.some((o) => String(o.id) === currentUserId)) {
      options.push({ id: currentUserId, label: `User ${currentUserId}` });
    }
    const handleUserSwitch = (option: BreadcrumbSwitcherOption) => {
      navigate(`/users/${encodeURIComponent(String(option.id || '').trim())}${location.search || ''}`);
    };
    return (
      <BreadcrumbNav items={[
        { label: 'Dashboard', path: '/dashboard' },
        ...(!isStandaloneUserRoute && ctxOrgKey ? [{ label: ctxOrgName || ctxOrgKey, path: `/${ctxOrgKey}` }] : []),
        { label: 'Users', path: '/users' },
        { label: <BreadcrumbContextSwitcher currentId={currentUserId} options={options} onSelect={handleUserSwitch} hasDropdown={!data.loadingUsers && options.length > 1} type="user" current />, path: `/users/${currentUserId}` },
      ]} />
    );
  }

  // ═══════════════════════════════════════════
  // Org subpage (e.g. /bernt/clubs)
  // ═══════════════════════════════════════════
  if (orgSubpage) {
    const options: BreadcrumbSwitcherOption[] = (organisations || []).map((o) => ({
      id: String(o.id), label: String(o.name || o.slug || o.id), slug: String(o.slug || o.id),
    }));
    const resolvedCurrent =
      (organisations || []).find((o) => String(o?.slug || '').toLowerCase() === orgSubpage.orgId.toLowerCase()) ||
      (organisations || []).find((o) => String(o?.id || '').toLowerCase() === orgSubpage.orgId.toLowerCase()) ||
      (organisations || []).find((o) => String(o?.id || '') === String(context?.organisation?.id || ''));
    const currentId = String(resolvedCurrent?.id || context?.organisation?.id || orgSubpage.orgId || '').trim();
    const handleOrgSwitch = (option: BreadcrumbSwitcherOption) => {
      navigate(`/${String(option.slug || option.id)}${location.search || ''}`);
    };
    return (
      <BreadcrumbNav items={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: <BreadcrumbContextSwitcher currentId={currentId || String(orgSubpage.orgId)} options={options} onSelect={handleOrgSwitch} hasDropdown={options.length > 1} type="organisation" current />, path: `/${encodeURIComponent(orgSubpage.orgId)}` },
      ]} />
    );
  }

  // ═══════════════════════════════════════════
  // Org detail (e.g. /bernt)
  // ═══════════════════════════════════════════
  if (isOrgDetail) {
    const options: BreadcrumbSwitcherOption[] = (organisations || []).map((o) => ({
      id: String(o.id), label: String(o.name || o.slug || o.id), slug: String(o.slug || o.id),
    }));
    const resolvedCurrent = orgFromList || (organisations || []).find((o) => String(o?.id || '') === String(context?.organisation?.id || ''));
    const currentId = String(resolvedCurrent?.id || context?.organisation?.id || orgParam || orgSlug || '').trim();
    const handleOrgSwitch = (option: BreadcrumbSwitcherOption) => {
      navigate(`/${String(option.slug || option.id)}${location.search || ''}`);
    };
    return (
      <BreadcrumbNav items={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: <BreadcrumbContextSwitcher currentId={currentId || String(orgParam || orgSlug || '')} options={options} onSelect={handleOrgSwitch} hasDropdown={options.length > 1} type="organisation" current />, path: `/${orgParam || orgSlug}` },
      ]} />
    );
  }

  // ═══════════════════════════════════════════
  // Club / Team detail pages
  // ═══════════════════════════════════════════
  if (isClubDetail || isTeamDetail) {
    const items: BreadcrumbItem[] = [{ label: 'Dashboard', path: '/dashboard' }];
    if (orgSlug) items.push({ label: context?.organisation?.name || orgSlug, path: orgPath });

    if (isTeamDetail) {
      if (clubSlugOrId) items.push({ label: clubName || clubSlugOrId, path: `/${orgSlug}/${clubSlugOrId}` });
      const currentTeamId = String(teamSlugOrId || '').trim();
      if (currentTeamId) {
        const options = [...data.teamOptions];
        if (!options.some((o) => String(o.slug || o.id) === currentTeamId)) {
          options.push({ id: currentTeamId, slug: currentTeamId, label: teamName || currentTeamId });
        }
        const handleTeamSwitch = (option: BreadcrumbSwitcherOption) => {
          navigate(`/${orgSlug}/${clubSlugOrId}/${String(option.slug || option.id)}${location.search || ''}`);
        };
        items.push({
          label: <BreadcrumbContextSwitcher currentId={currentTeamId} options={options} onSelect={handleTeamSwitch} hasDropdown={!data.loadingTeams && options.length > 1} type="project" current />,
          path: `/${orgSlug}/${clubSlugOrId}/${currentTeamId}`,
        });
      }
      return <BreadcrumbNav items={items} />;
    }

    // Club detail
    const currentClubId = String(clubSlugOrId || '').trim();
    if (currentClubId) {
      const options = [...data.clubOptions];
      if (!options.some((o) => String(o.slug || o.id) === currentClubId)) {
        options.push({ id: currentClubId, slug: currentClubId, label: clubName || currentClubId });
      }
      const handleClubSwitch = (option: BreadcrumbSwitcherOption) => {
        navigate(`/${orgSlug}/${String(option.slug || option.id)}${location.search || ''}`);
      };
      items.push({
        label: <BreadcrumbContextSwitcher currentId={currentClubId} options={options} onSelect={handleClubSwitch} hasDropdown={options.length > 1} type="project" current />,
        path: `/${orgSlug}/${currentClubId}`,
      });
    }
    return <BreadcrumbNav items={items} />;
  }

  // ═══════════════════════════════════════════
  // Hierarchy pages (season → competition → member → match)
  // ═══════════════════════════════════════════
  const items: BreadcrumbItem[] = [{ label: 'Dashboard', path: '/dashboard' }];

  if (orgSlug) items.push({ label: context?.organisation?.name || orgSlug, path: orgPath });
  if (effectiveClubSlugOrId) items.push({ label: effectiveClubName || effectiveClubSlugOrId, path: `/${orgSlug}/${effectiveClubSlugOrId}` });
  if (effectiveTeamSlugOrId) items.push({ label: effectiveTeamName || effectiveTeamSlugOrId, path: `/${orgSlug}/${effectiveClubSlugOrId}/${effectiveTeamSlugOrId}` });

  // Level 3: Season
  if (effectiveSeasonSlugOrId) {
    const hrp = isOrganisationsRoute && location.pathname.includes('/projects/');
    const vor = isOrganisationsRoute && !hrp;
    const seasonPath = hrp
      ? `/organisations/${orgSlug}/projects/${effectiveClubSlugOrId}/teams/${effectiveTeamSlugOrId}/seasons/${effectiveSeasonSlugOrId}`
      : vor ? `/organisations/${orgSlug}/${effectiveClubSlugOrId}/${effectiveTeamSlugOrId}/${effectiveSeasonSlugOrId}`
      : `/${orgSlug}/${effectiveClubSlugOrId}/${effectiveTeamSlugOrId}/${effectiveSeasonSlugOrId}`;

    const currentSeasonKey = String(effectiveSeasonSlugOrId || '').trim();
    const shouldRenderSwitcher = Boolean(currentSeasonKey) && !effectiveCompetitionSlugOrId && !effectiveMatchId;

    if (shouldRenderSwitcher) {
      const options = [...data.seasonOptions];
      if (currentSeasonKey && !options.some((o) => String(o.slug || o.id) === currentSeasonKey)) {
        options.push({ id: currentSeasonKey, slug: currentSeasonKey, label: effectiveSeasonName || currentSeasonKey });
      }
      const handleSeasonSwitch = (option: BreadcrumbSwitcherOption) => {
        const next = hrp ? String(option.id) : String(option.slug || option.id);
        const nextPath = hrp ? `/organisations/${orgSlug}/projects/${effectiveClubSlugOrId}/teams/${effectiveTeamSlugOrId}/seasons/${next}`
          : vor ? `/organisations/${orgSlug}/${effectiveClubSlugOrId}/${effectiveTeamSlugOrId}/${next}`
          : `/${orgSlug}/${effectiveClubSlugOrId}/${effectiveTeamSlugOrId}/${next}`;
        navigate(`${nextPath}${location.search || ''}`);
      };
      items.push({
        label: <BreadcrumbContextSwitcher currentId={currentSeasonKey} options={options} onSelect={handleSeasonSwitch} hasDropdown={!data.loadingSeasons && options.length > 1} type="project" current />,
        path: seasonPath,
      });
    } else {
      items.push({ label: effectiveSeasonName || currentSeasonKey, path: seasonPath });
    }
  }

  // Level 4: Competition OR Member
  if (effectiveCompetitionSlugOrId) {
    const hrp = isOrganisationsRoute && location.pathname.includes('/projects/');
    const vor = isOrganisationsRoute && !hrp;
    const currentKey = String(effectiveCompetitionSlugOrId || '').trim();
    const segmentPath = hrp
      ? `/organisations/${orgSlug}/projects/${effectiveClubSlugOrId}/teams/${effectiveTeamSlugOrId}/seasons/${effectiveSeasonSlugOrId}/competitions/${effectiveCompetitionSlugOrId}`
      : vor ? `/organisations/${orgSlug}/${effectiveClubSlugOrId}/${effectiveTeamSlugOrId}/${effectiveSeasonSlugOrId}/${effectiveCompetitionSlugOrId}`
      : `/${orgSlug}/${effectiveClubSlugOrId}/${effectiveTeamSlugOrId}/${effectiveSeasonSlugOrId}/${effectiveCompetitionSlugOrId}`;

    if (data.isMemberDetailRoute) {
      const options = [...data.memberOptions];
      if (currentKey && !options.some((o) => String(o.id) === currentKey)) {
        options.push({ id: currentKey, slug: currentKey, label: data.currentMemberName || 'Member' });
      }
      const handleMemberSwitch = (option: BreadcrumbSwitcherOption) => {
        const next = String(option.id);
        const nextPath = hrp ? `/organisations/${orgSlug}/projects/${effectiveClubSlugOrId}/teams/${effectiveTeamSlugOrId}/seasons/${effectiveSeasonSlugOrId}/${next}`
          : vor ? `/organisations/${orgSlug}/${effectiveClubSlugOrId}/${effectiveTeamSlugOrId}/${effectiveSeasonSlugOrId}/${next}`
          : `/${orgSlug}/${effectiveClubSlugOrId}/${effectiveTeamSlugOrId}/${effectiveSeasonSlugOrId}/${next}`;
        navigate(`${nextPath}${location.search || ''}`);
      };
      items.push({ label: <BreadcrumbContextSwitcher currentId={currentKey} options={options} onSelect={handleMemberSwitch} hasDropdown={!data.loadingMembers && options.length > 1} type="user" current />, path: segmentPath });
    } else {
      const shouldRenderCompSwitcher = Boolean(currentKey) && !effectiveMatchId;
      if (shouldRenderCompSwitcher) {
        const options = [...data.competitionOptions];
        if (currentKey && !options.some((o) => String(o.slug || o.id) === currentKey)) {
          options.push({ id: currentKey, slug: currentKey, label: effectiveCompetitionName || currentKey });
        }
        const handleCompSwitch = (option: BreadcrumbSwitcherOption) => {
          const next = hrp ? String(option.id) : String(option.slug || option.id);
          const nextPath = hrp ? `/organisations/${orgSlug}/projects/${effectiveClubSlugOrId}/teams/${effectiveTeamSlugOrId}/seasons/${effectiveSeasonSlugOrId}/competitions/${next}`
            : vor ? `/organisations/${orgSlug}/${effectiveClubSlugOrId}/${effectiveTeamSlugOrId}/${effectiveSeasonSlugOrId}/${next}`
            : `/${orgSlug}/${effectiveClubSlugOrId}/${effectiveTeamSlugOrId}/${effectiveSeasonSlugOrId}/${next}`;
          navigate(`${nextPath}${location.search || ''}`);
        };
        items.push({ label: <BreadcrumbContextSwitcher currentId={currentKey} options={options} onSelect={handleCompSwitch} hasDropdown={!data.loadingCompetitions && options.length > 1} type="project" current />, path: segmentPath });
      } else {
        items.push({ label: effectiveCompetitionName || currentKey, path: segmentPath });
      }
    }
  }

  // Level 5: Match
  if (effectiveMatchId) {
    const hrp = isOrganisationsRoute && location.pathname.includes('/projects/');
    const vor = isOrganisationsRoute && !hrp;
    const matchPathStr = hrp
      ? `/organisations/${orgSlug}/projects/${effectiveClubSlugOrId}/teams/${effectiveTeamSlugOrId}/seasons/${effectiveSeasonSlugOrId}/competitions/${effectiveCompetitionSlugOrId}/matches/${effectiveMatchId}`
      : vor ? `/organisations/${orgSlug}/${effectiveClubSlugOrId}/${effectiveTeamSlugOrId}/${effectiveSeasonSlugOrId}/${effectiveCompetitionSlugOrId}/${effectiveMatchId}`
      : `/${orgSlug}/${effectiveClubSlugOrId}/${effectiveTeamSlugOrId}/${effectiveSeasonSlugOrId}/${effectiveCompetitionSlugOrId}/${effectiveMatchId}`;

    const currentMatchKey = String(effectiveMatchId || '').trim();
    const options = [...data.matchOptions];
    if (currentMatchKey && !options.some((o) => String(o.slug || o.id) === currentMatchKey)) {
      options.push({ id: currentMatchKey, slug: currentMatchKey, label: `Match ${currentMatchKey}` });
    }
    const handleMatchSwitch = (option: BreadcrumbSwitcherOption) => {
      const next = hrp ? String(option.id) : String(option.slug || option.id);
      const nextPath = hrp
        ? `/organisations/${orgSlug}/projects/${effectiveClubSlugOrId}/teams/${effectiveTeamSlugOrId}/seasons/${effectiveSeasonSlugOrId}/competitions/${effectiveCompetitionSlugOrId}/matches/${next}`
        : vor ? `/organisations/${orgSlug}/${effectiveClubSlugOrId}/${effectiveTeamSlugOrId}/${effectiveSeasonSlugOrId}/${effectiveCompetitionSlugOrId}/${next}`
        : `/${orgSlug}/${effectiveClubSlugOrId}/${effectiveTeamSlugOrId}/${effectiveSeasonSlugOrId}/${effectiveCompetitionSlugOrId}/${next}`;
      navigate(`${nextPath}${location.search || ''}`);
    };
    items.push({ label: <BreadcrumbContextSwitcher currentId={currentMatchKey} options={options} onSelect={handleMatchSwitch} hasDropdown={!data.loadingMatches && options.length > 1} type="project" current />, path: matchPathStr });
  }

  // Members leaf
  if (effectiveSeasonSlugOrId && location.pathname.endsWith('/members')) {
    items.push({ label: 'Members', path: location.pathname, isLeaf: true });
  }

  // Fallback pages
  if (items.length <= 1) {
    const p = location.pathname;
    if (p === '/directory') items.push({ label: 'Directory', path: '/directory' });
    else if (p === '/federations') { items.push({ label: 'Directory', path: '/directory' }); items.push({ label: 'Federations', path: '/federations' }); }
    else if (p === '/clubs') { items.push({ label: 'Directory', path: '/directory' }); items.push({ label: 'Clubs', path: '/clubs' }); }
    else if (p === '/teams') { items.push({ label: 'Directory', path: '/directory' }); items.push({ label: 'Teams', path: '/teams' }); }
    else if (p === '/seasons') { items.push({ label: 'Directory', path: '/directory' }); items.push({ label: 'Seasons', path: '/seasons' }); }
    else if (p === '/competitions') { items.push({ label: 'Directory', path: '/directory' }); items.push({ label: 'Competitions', path: '/competitions' }); }
    else if (p === '/matches') { items.push({ label: 'Directory', path: '/directory' }); items.push({ label: 'Matches', path: '/matches' }); }
    else if (p.startsWith('/profile')) items.push({ label: 'Preferences', path: '/preferences?tab=profile' });
    else if (p.startsWith('/notifications')) items.push({ label: 'Notifications', path: '/notifications' });
    else if (p.startsWith('/credits')) items.push({ label: 'My Wallet', path: '/credits' });
    else if (p.startsWith('/settings')) items.push({ label: 'Settings', path: '/settings' });
    else if (p.startsWith('/analytics')) items.push({ label: 'Analytics', path: '/analytics' });
    else if (p.startsWith('/content-templates')) items.push({ label: 'Content Templates', path: '/content-templates' });
  }

  if (items.length <= 1) return null; // Only Dashboard → nothing useful
  return <BreadcrumbNav items={items} />;
}

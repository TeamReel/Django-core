/**
 * routes.test.ts — Unit tests for type-safe route helpers
 */
import { describe, it, expect } from 'vitest';
import { routes } from '../routes';

describe('routes', () => {
  // ── Static routes ──────────────────────────────────────────────────
  describe('static routes', () => {
    it('returns /dashboard', () => {
      expect(routes.dashboard()).toBe('/dashboard');
    });

    it('returns /recents', () => {
      expect(routes.recents()).toBe('/recents');
    });

    it('returns /favorites', () => {
      expect(routes.favorites()).toBe('/favorites');
    });

    it('returns /login', () => {
      expect(routes.login()).toBe('/login');
    });

    it('returns /register', () => {
      expect(routes.register()).toBe('/register');
    });

    it('returns /content', () => {
      expect(routes.content()).toBe('/content');
    });

    it('returns /medialib', () => {
      expect(routes.medialib()).toBe('/medialib');
    });

    it('returns /profile', () => {
      expect(routes.profile()).toBe('/profile');
    });

    it('returns /settings', () => {
      expect(routes.settings()).toBe('/settings');
    });

    it('returns /health', () => {
      expect(routes.health()).toBe('/health');
    });

    it('returns /docs', () => {
      expect(routes.docs()).toBe('/docs');
    });

    it('returns /permissions', () => {
      expect(routes.permissions()).toBe('/permissions');
    });

    it('returns /clubs with no params', () => {
      expect(routes.clubs()).toBe('/clubs');
    });
  });

  // ── Query-param routes ─────────────────────────────────────────────
  describe('query-param routes', () => {
    it('search with no params', () => {
      expect(routes.search()).toBe('/search');
    });

    it('search with q param', () => {
      expect(routes.search({ q: 'test' })).toBe('/search?q=test');
    });

    it('search with q and types', () => {
      const url = routes.search({ q: 'hello', types: 'match' });
      expect(url).toContain('/search?');
      expect(url).toContain('q=hello');
      expect(url).toContain('types=match');
    });

    it('directory with no params', () => {
      expect(routes.directory()).toBe('/directory');
    });

    it('directory with tab', () => {
      expect(routes.directory({ tab: 'clubs' })).toBe('/directory?tab=clubs');
    });

    it('directory with tab and orgId', () => {
      const url = routes.directory({ tab: 'clubs', orgId: 'abc' });
      expect(url).toContain('/directory?');
      expect(url).toContain('tab=clubs');
      expect(url).toContain('org_id=abc');
    });

    it('studio with no params', () => {
      expect(routes.studio()).toBe('/studio');
    });

    it('studio with tab', () => {
      expect(routes.studio({ tab: 'library' })).toBe('/studio?tab=library');
    });

    it('approvals with tab', () => {
      expect(routes.approvals({ tab: 'video' })).toBe('/approvals?tab=video');
    });

    it('preferences with tab', () => {
      expect(routes.preferences({ tab: 'profile' })).toBe('/preferences?tab=profile');
    });

    it('clubs with orgId', () => {
      expect(routes.clubs({ orgId: 'knvb' })).toBe('/clubs?org_id=knvb');
    });
  });

  // ── Organisation routes ────────────────────────────────────────────
  describe('organisation routes', () => {
    it('orgDetail', () => {
      expect(routes.orgDetail({ orgId: 'knvb' })).toBe('/knvb');
    });

    it('orgClubs', () => {
      expect(routes.orgClubs({ orgId: 'knvb' })).toBe('/knvb/clubs');
    });

    it('orgTeams', () => {
      expect(routes.orgTeams({ orgId: 'knvb' })).toBe('/knvb/teams');
    });

    it('orgSeasons', () => {
      expect(routes.orgSeasons({ orgId: 'knvb' })).toBe('/knvb/seasons');
    });

    it('orgCompetitions', () => {
      expect(routes.orgCompetitions({ orgId: 'knvb' })).toBe('/knvb/competitions');
    });

    it('orgMatches', () => {
      expect(routes.orgMatches({ orgId: 'knvb' })).toBe('/knvb/matches');
    });

    it('orgUsers', () => {
      expect(routes.orgUsers({ orgId: 'knvb' })).toBe('/knvb/users');
    });

    it('orgHierarchy', () => {
      expect(routes.orgHierarchy({ orgId: 'knvb' })).toBe('/knvb?tab=hierarchy');
    });
  });

  // ── /organisations/ prefix routes (R2: canonical or exception) ───────
  describe('/organisations/ prefix routes', () => {
    it('orgDetailLegacy — now generates canonical URL', () => {
      expect(routes.orgDetailLegacy({ orgId: 'knvb' })).toBe('/knvb');
    });

    it('orgProjects', () => {
      expect(routes.orgProjects({ orgId: 'knvb' })).toBe('/organisations/knvb/projects');
    });

    it('orgProjectDetailLegacy — now generates canonical URL', () => {
      expect(routes.orgProjectDetailLegacy({ orgId: 'knvb', projectId: 'fc-utrecht' }))
        .toBe('/knvb/projects/fc-utrecht');
    });

    it('orgProjectCreate', () => {
      expect(routes.orgProjectCreate({ orgId: 'knvb' }))
        .toBe('/organisations/knvb/projects/create');
    });

    it('orgProjectEdit', () => {
      expect(routes.orgProjectEdit({ orgId: 'knvb', projectId: 'fc-utrecht' }))
        .toBe('/organisations/knvb/projects/fc-utrecht/edit');
    });

    it('orgMemberDetail', () => {
      expect(routes.orgMemberDetail({ orgId: 'knvb', memberId: '123' }))
        .toBe('/organisations/knvb/members/123');
    });

    it('orgCreate', () => {
      expect(routes.orgCreate()).toBe('/organisations/create');
    });

    it('orgEdit', () => {
      expect(routes.orgEdit({ orgId: 'knvb' })).toBe('/organisations/knvb/edit');
    });
  });

  // ── Hierarchy (vanity) routes ──────────────────────────────────────
  describe('hierarchy routes', () => {
    it('club', () => {
      expect(routes.club({ orgId: 'knvb', clubId: 'fc-utrecht' }))
        .toBe('/knvb/fc-utrecht');
    });

    it('team', () => {
      expect(routes.team({ orgId: 'knvb', clubId: 'fc-utrecht', projectId: 'u19' }))
        .toBe('/knvb/fc-utrecht/u19');
    });

    it('teamSeasons', () => {
      expect(routes.teamSeasons({ orgId: 'knvb', clubId: 'fc-utrecht', projectId: 'u19' }))
        .toBe('/knvb/fc-utrecht/u19/seasons');
    });

    it('season', () => {
      expect(routes.season({
        orgId: 'knvb', clubId: 'fc-utrecht', projectId: 'u19', seasonId: '2025-26',
      })).toBe('/knvb/fc-utrecht/u19/2025-26');
    });

    it('seasonWithTab', () => {
      expect(routes.seasonWithTab({
        orgId: 'knvb', clubId: 'fc-utrecht', projectId: 'u19', seasonId: '2025-26', tab: 'squad',
      })).toBe('/knvb/fc-utrecht/u19/2025-26?tab=squad');
    });

    it('competition', () => {
      expect(routes.competition({
        orgId: 'knvb', clubId: 'fc-utrecht', projectId: 'u19',
        seasonId: '2025-26', competitionId: 'eredivisie',
      })).toBe('/knvb/fc-utrecht/u19/2025-26/eredivisie');
    });

    it('match', () => {
      expect(routes.match({
        orgId: 'knvb', clubId: 'fc-utrecht', projectId: 'u19',
        seasonId: '2025-26', competitionId: 'eredivisie', matchId: 'speelronde-12',
      })).toBe('/knvb/fc-utrecht/u19/2025-26/eredivisie/speelronde-12');
    });

    it('member', () => {
      expect(routes.member({
        orgId: 'knvb', clubId: 'fc-utrecht', projectId: 'u19',
        seasonId: '2025-26', memberId: 'abc-123',
      })).toBe('/knvb/fc-utrecht/u19/2025-26/members/abc-123');
    });
  });

  // ── Project hierarchy routes ───────────────────────────────────────
  describe('project hierarchy routes', () => {
    it('projectSeasons', () => {
      expect(routes.projectSeasons({ orgId: 'knvb', projectId: 'u19' }))
        .toBe('/knvb/projects/u19/seasons');
    });

    it('projectSeason', () => {
      expect(routes.projectSeason({ orgId: 'knvb', projectId: 'u19', seasonId: '2025-26' }))
        .toBe('/knvb/projects/u19/2025-26');
    });

    it('projectCompetition', () => {
      expect(routes.projectCompetition({
        orgId: 'knvb', projectId: 'u19', seasonId: '2025-26', competitionId: 'eredivisie',
      })).toBe('/knvb/projects/u19/2025-26/eredivisie');
    });

    it('projectMatch', () => {
      expect(routes.projectMatch({
        orgId: 'knvb', projectId: 'u19', seasonId: '2025-26',
        competitionId: 'eredivisie', matchId: 'sr-12',
      })).toBe('/knvb/projects/u19/2025-26/eredivisie/sr-12');
    });
  });

  // ── Match routes ───────────────────────────────────────────────────
  describe('match routes', () => {
    it('matchById', () => {
      expect(routes.matchById({ matchId: 'abc' })).toBe('/matches/abc');
    });

    it('matchWithTab', () => {
      expect(routes.matchWithTab({ matchId: 'abc', tab: 'content' }))
        .toBe('/matches/abc?tab=content');
    });
  });

  // ── User routes ────────────────────────────────────────────────────
  describe('user routes', () => {
    it('userDetail', () => {
      expect(routes.userDetail({ userId: '123' })).toBe('/users/123');
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────────
  describe('edge cases', () => {
    it('encodes special characters in slugs', () => {
      expect(routes.orgDetail({ orgId: 'my org' })).toBe('/my%20org');
    });

    it('trims whitespace from segments', () => {
      expect(routes.orgDetail({ orgId: '  knvb  ' })).toBe('/knvb');
    });

    it('handles empty string slugs', () => {
      expect(routes.orgDetail({ orgId: '' })).toBe('/');
    });

    it('ignores undefined query params', () => {
      expect(routes.search({ q: undefined })).toBe('/search');
    });

    it('ignores null query params', () => {
      expect(routes.directory({ tab: null as unknown as string })).toBe('/directory');
    });
  });
});

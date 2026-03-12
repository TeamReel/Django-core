import { describe, it, expect } from 'vitest';
import { resolveHierarchyRedirect } from '../appRedirects';

describe('resolveHierarchyRedirect', () => {
  describe('trailing tab segments', () => {
    it('strips /seasons and sets tab=seasons', () => {
      const result = resolveHierarchyRedirect('/knvb/fc-utrecht/u19/seasons');
      expect(result).toEqual({ path: '/knvb/fc-utrecht/u19', tab: 'seasons' });
    });

    it('strips /squad and sets tab=squad for season-level (4 segments)', () => {
      const result = resolveHierarchyRedirect('/knvb/fc-utrecht/u19/2024/squad');
      expect(result).toEqual({ path: '/knvb/fc-utrecht/u19/2024', tab: 'squad' });
    });

    it('strips /squad and sets tab=users for competition-level (5 segments)', () => {
      const result = resolveHierarchyRedirect('/knvb/fc-utrecht/u19/2024/eredivisie/squad');
      expect(result).toEqual({ path: '/knvb/fc-utrecht/u19/2024/eredivisie', tab: 'users' });
    });

    it('strips /matches and sets tab=matches', () => {
      const result = resolveHierarchyRedirect('/knvb/fc-utrecht/u19/2024/eredivisie/matches');
      expect(result).toEqual({ path: '/knvb/fc-utrecht/u19/2024/eredivisie', tab: 'matches' });
    });

    it('strips /hierarchy and sets tab=hierarchy', () => {
      const result = resolveHierarchyRedirect('/knvb/hierarchy');
      expect(result).toEqual({ path: '/knvb', tab: 'hierarchy' });
    });
  });

  describe('team project-paths', () => {
    it('reshapes /projects/:clubId/teams/:projectId to /:clubId/:projectId', () => {
      const result = resolveHierarchyRedirect('/knvb/projects/fc-utrecht/teams/u19');
      expect(result).toEqual({ path: '/knvb/fc-utrecht/u19', tab: undefined });
    });

    it('reshapes /projects/.../teams/... with trailing /seasons', () => {
      const result = resolveHierarchyRedirect('/knvb/projects/fc-utrecht/teams/u19/seasons');
      expect(result).toEqual({ path: '/knvb/fc-utrecht/u19', tab: 'seasons' });
    });
  });

  describe('explicit narrative segments', () => {
    it('strips /seasons/ segment (canonical uses positional)', () => {
      const result = resolveHierarchyRedirect('/knvb/fc-utrecht/u19/seasons/2024');
      expect(result).toEqual({ path: '/knvb/fc-utrecht/u19/2024', tab: undefined });
    });

    it('strips /competitions/ segment and applies 5-segment rule', () => {
      // After stripping /competitions/, we get 5 segments which triggers tab=competitions
      const result = resolveHierarchyRedirect('/knvb/fc-utrecht/u19/2024/competitions/eredivisie');
      expect(result).toEqual({ path: '/knvb/fc-utrecht/u19/2024', tab: 'competitions' });
    });

    it('strips /matches/ segment', () => {
      const result = resolveHierarchyRedirect('/knvb/fc-utrecht/u19/2024/eredivisie/matches/abc123');
      expect(result).toEqual({ path: '/knvb/fc-utrecht/u19/2024/eredivisie/abc123', tab: undefined });
    });
  });

  describe('5-segment vanity paths (competition depth)', () => {
    it('converts 5-segment vanity path to season?tab=competitions', () => {
      const result = resolveHierarchyRedirect('/knvb/fc-utrecht/u19/2024/eredivisie');
      expect(result).toEqual({ path: '/knvb/fc-utrecht/u19/2024', tab: 'competitions' });
    });
  });

  describe('canonical paths (no changes)', () => {
    it('leaves 3-segment team path unchanged', () => {
      const result = resolveHierarchyRedirect('/knvb/fc-utrecht/u19');
      expect(result).toEqual({ path: '/knvb/fc-utrecht/u19', tab: undefined });
    });

    it('leaves 4-segment season path unchanged', () => {
      const result = resolveHierarchyRedirect('/knvb/fc-utrecht/u19/2024');
      expect(result).toEqual({ path: '/knvb/fc-utrecht/u19/2024', tab: undefined });
    });

    it('leaves 6-segment match path unchanged', () => {
      const result = resolveHierarchyRedirect('/knvb/fc-utrecht/u19/2024/eredivisie/match123');
      expect(result).toEqual({ path: '/knvb/fc-utrecht/u19/2024/eredivisie/match123', tab: undefined });
    });
  });
});

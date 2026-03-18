/**
 * Sidebar Panel B "work" section — navigation page builders.
 *
 * Dashboard, directory, federation (subpages & detail), and user detail panels.
 */
import {
    LayoutDashboard, Globe, Shield, Shirt, CalendarDays, Trophy, Timer,
    Users, Sparkles, Settings, Palette, Star, Film,
    LineChart, BookOpen, Scroll, ClipboardCheck, Fingerprint,
} from 'lucide-react';
import type { PanelBResult } from './sidebarPanelBWork.types';
import { makeTabUrl, makeOrgSectionUrl } from './sidebarPanelBWork.types';
import { routes } from '../routes';

/* ── Dashboard / Recents / Favorites ────────────────────────────── */

export function buildDashboardSection(): PanelBResult {
    return {
        title: 'Overview',
        items: [
            { label: 'Dashboard', path: routes.dashboard(), icon: LayoutDashboard },
            { label: 'Recent', path: '/recents', icon: Timer },
            { label: 'Favorieten beheren', path: '/favorites', icon: Star },
        ],
        isActive: true,
    };
}

/* ── Directory ──────────────────────────────────────────────────── */

export function buildDirectorySection(): PanelBResult {
    return {
        title: 'Directory',
        items: [
            { label: 'Federaties', path: '/directory?tab=federations', icon: Globe },
            { label: 'Clubs', path: '/directory?tab=clubs', icon: Shield },
            { label: 'Teams', path: '/directory?tab=teams', icon: Shirt },
            { label: 'Seizoenen', path: '/directory?tab=seasons', icon: CalendarDays },
            { label: 'Competities', path: '/directory?tab=competitions', icon: Trophy },
            { label: 'Wedstrijden', path: '/directory?tab=matches', icon: Timer },
            { label: 'Gebruikers', path: '/directory?tab=users', icon: Users },
            { label: 'Content', path: '/directory?tab=content', icon: Sparkles },
            { label: 'Alle content', path: '/directory?tab=all-content', icon: Film },
        ],
        isActive: true,
    };
}

/* ── Federation subpages ────────────────────────────────────────── */

export function buildFederationSubpagesSection(orgId: string): PanelBResult {
    return {
        title: 'Federatie',
        items: [
            { label: 'Overzicht', path: makeOrgSectionUrl(orgId, 'overview'), icon: LayoutDashboard },
            { label: 'Hiërarchie', path: makeOrgSectionUrl(orgId, 'hierarchy'), icon: Globe },
            { label: 'Clubs', path: makeOrgSectionUrl(orgId, 'clubs'), icon: Shield },
            { label: 'Teams', path: makeOrgSectionUrl(orgId, 'teams'), icon: Shirt },
            { label: 'Seizoenen', path: makeOrgSectionUrl(orgId, 'seasons'), icon: CalendarDays },
            { label: 'Competities', path: makeOrgSectionUrl(orgId, 'competitions'), icon: Trophy },
            { label: 'Wedstrijden', path: makeOrgSectionUrl(orgId, 'matches'), icon: Timer },
            { label: 'Leden', path: makeOrgSectionUrl(orgId, 'users'), icon: Users },
            { label: 'Workflow', path: makeOrgSectionUrl(orgId, 'workflow'), icon: ClipboardCheck },
            { label: 'Identiteit', path: makeOrgSectionUrl(orgId, 'identity'), icon: Palette },
            { label: 'Instellingen', path: makeOrgSectionUrl(orgId, 'settings'), icon: Settings },
        ],
        isActive: true,
    };
}

/* ── Federation detail ──────────────────────────────────────────── */

export function buildFederationDetailSection(baseUrl: string): PanelBResult {
    return {
        title: 'Federatie',
        items: [
            { label: 'Overzicht', path: makeTabUrl(baseUrl, 'overview'), icon: LayoutDashboard },
            { label: 'Hiërarchie', path: makeTabUrl(baseUrl, 'hierarchy'), icon: Globe },
            { label: 'Clubs', path: makeTabUrl(baseUrl, 'clubs'), icon: Shield },
            { label: 'Teams', path: makeTabUrl(baseUrl, 'teams'), icon: Shirt },
            { label: 'Seizoenen', path: makeTabUrl(baseUrl, 'seasons'), icon: CalendarDays },
            { label: 'Competities', path: makeTabUrl(baseUrl, 'competitions'), icon: Trophy },
            { label: 'Wedstrijden', path: makeTabUrl(baseUrl, 'matches'), icon: Timer },
            { label: 'Leden', path: makeTabUrl(baseUrl, 'users'), icon: Users },
            { label: 'Workflow', path: makeTabUrl(baseUrl, 'workflow'), icon: ClipboardCheck },
            { label: 'Identiteit', path: makeTabUrl(baseUrl, 'identity'), icon: Palette },
            { label: 'Audit', path: makeTabUrl(baseUrl, 'audit'), icon: Scroll },
            { label: 'Bestuur', path: makeTabUrl(baseUrl, 'governance'), icon: BookOpen },
            { label: 'Operaties', path: makeTabUrl(baseUrl, 'operations'), icon: Settings },
            { label: 'Instellingen', path: makeTabUrl(baseUrl, 'settings'), icon: Settings },
        ],
        isActive: true,
    };
}

/* ── User detail ────────────────────────────────────────────────── */

export function buildUserDetailSection(baseUrl: string): PanelBResult {
    return {
        title: 'User',
        items: [
            { label: 'Overview', path: makeTabUrl(baseUrl, 'overview'), icon: LayoutDashboard },
            { label: 'Workflow', path: makeTabUrl(baseUrl, 'workflow'), icon: ClipboardCheck },
            { label: 'Identity', path: makeTabUrl(baseUrl, 'identity'), icon: Fingerprint },
            { label: 'Hierarchy', path: makeTabUrl(baseUrl, 'hierarchy'), icon: Globe },
            { label: 'Federations', path: makeTabUrl(baseUrl, 'federations'), icon: Globe },
            { label: 'Clubs', path: makeTabUrl(baseUrl, 'clubs'), icon: Shield },
            { label: 'Teams', path: makeTabUrl(baseUrl, 'teams'), icon: Shirt },
            { label: 'Seasons', path: makeTabUrl(baseUrl, 'seasons'), icon: CalendarDays },
            { label: 'Competitions', path: makeTabUrl(baseUrl, 'competitions'), icon: Trophy },
            { label: 'Matches', path: makeTabUrl(baseUrl, 'matches'), icon: Timer },
            { label: 'Transactions', path: makeTabUrl(baseUrl, 'transactions'), icon: Scroll },
            { label: 'Balance', path: makeTabUrl(baseUrl, 'balance'), icon: LineChart },
        ],
        isActive: true,
    };
}
